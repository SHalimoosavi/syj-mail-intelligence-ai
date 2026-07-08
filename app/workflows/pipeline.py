"""
The core orchestration. Every new email flows through here, exactly once.

Two safety principles enforced in plain Python, never left to the model:
1. Approval thresholds — a model misreporting its own confidence can never
   cause an unwanted auto-send (see _handle_reply_confidence).
2. AI failure isolation — if the LLM is unreachable/times out/returns junk
   for one stage (classification, importance, summary, or reply), that
   failure is caught at the stage boundary, safe defaults are used, the
   email is flagged needs_manual_review=True, and processing continues.
   One bad AI call must never lose the email or crash the poll cycle.
"""
from app.ai.classifier import classify_email
from app.ai.importance import score_importance
from app.ai.summarizer import summarize_email
from app.ai.reply_generator import generate_reply
from app.core.database import get_session
from app.core.models import Email, Summary, Draft, Notification, Contact
from app.core.logger import log_event
from app.core.time_utils import utcnow
from app.notifications.telegram import TelegramChannel
from app.notifications.base import format_notification
from config.config import settings, AUTO_RULES

_FALLBACK_CLASSIFICATION = {
    "category": "Other", "priority": "Medium", "confidence": 0,
    "reason": "AI classification unavailable — needs manual review.",
}
_FALLBACK_IMPORTANCE = {
    "importance_score": 50, "deadline_detected": None,
    "reason": "AI importance scoring unavailable — defaulted to medium.",
}
_FALLBACK_SUMMARY = {
    "one_line_summary": "(summary unavailable)", "short_summary": "",
    "detailed_summary": "AI summarization failed for this email.",
    "action_items": [], "deadlines": [], "requested_tasks": [],
}


async def process_email(gmail_client, parsed: dict):
    sender, subject, body = parsed["sender"], parsed["subject"], parsed["body_text"]
    ai_errors: list[str] = []

    try:
        classification = await classify_email(sender, subject, body)
    except Exception as exc:
        log_event("pipeline", f"Classification failed for '{subject}': {exc}", level="error")
        classification = dict(_FALLBACK_CLASSIFICATION)
        ai_errors.append(f"classify: {exc}")

    category = classification["category"]
    is_thread_reply = _is_existing_thread(parsed["thread_id"])

    try:
        importance = await score_importance(
            sender, subject, body, category,
            is_thread_reply=is_thread_reply,
            has_attachments=parsed["has_attachments"],
        )
    except Exception as exc:
        log_event("pipeline", f"Importance scoring failed for '{subject}': {exc}", level="error")
        importance = dict(_FALLBACK_IMPORTANCE)
        ai_errors.append(f"importance: {exc}")

    with get_session() as session:
        email_row = Email(
            gmail_id=parsed["gmail_id"],
            thread_id=parsed["thread_id"],
            sender=sender,
            recipients=parsed["recipients"],
            subject=subject,
            body_text=body,
            body_html=parsed["body_html"],
            has_attachments=parsed["has_attachments"],
            category=category,
            priority=classification["priority"],
            classification_confidence=classification["confidence"],
            classification_reason=classification["reason"],
            importance_score=importance["importance_score"],
            importance_reason=importance["reason"],
            deadline_detected=importance.get("deadline_detected"),
            needs_manual_review=bool(ai_errors),
            ai_error_detail="; ".join(ai_errors) if ai_errors else None,
        )
        session.add(email_row)
        session.flush()
        email_id = email_row.id

        _update_contact(session, sender)
    # email_row is detached the moment its session closes (expire_on_commit
    # defaults to True) — its attributes can't be safely read again below.
    # Track anything we still need as plain local variables instead.

    log_event(
        "pipeline",
        f"Processed '{subject}' from {sender} -> category={category}, "
        f"importance={importance['importance_score']}"
        + (f" [needs_manual_review: {'; '.join(ai_errors)}]" if ai_errors else ""),
        level="warning" if ai_errors else "info",
    )

    auto_action = AUTO_RULES.get(category)

    try:
        summary = await summarize_email(sender, subject, body)
    except Exception as exc:
        log_event("pipeline", f"Summarization failed for '{subject}': {exc}", level="error")
        summary = dict(_FALLBACK_SUMMARY)

    with get_session() as session:
        session.add(Summary(
            email_id=email_id,
            one_line=summary["one_line_summary"],
            short=summary["short_summary"],
            detailed=summary["detailed_summary"],
            action_items=summary["action_items"],
            deadlines=summary["deadlines"],
            requested_tasks=summary["requested_tasks"],
        ))
        session.query(Email).filter_by(id=email_id).update({"auto_action": auto_action})

    if auto_action in ("archive", "ignore"):
        if auto_action == "archive":
            gmail_client.archive(parsed["gmail_id"])
        _mark_processed(email_id)
        return

    if auto_action == "summarize_only":
        _mark_processed(email_id)
        return

    should_notify = (
        importance["importance_score"] >= settings.importance_notify_threshold
        or auto_action == "notify_immediately"
    )

    reply_result = None
    if category not in ("Spam", "Scam", "Phishing", "Promotion", "Newsletter"):
        try:
            reply_result = await generate_reply(sender, subject, body)
        except Exception as exc:
            # No reply drafted this cycle — the email itself is still saved,
            # classified (or fallback-classified), and will still notify if
            # it's important. A missing draft is far safer than a bad one.
            log_event("pipeline", f"Reply generation failed for '{subject}': {exc}", level="error")
            with get_session() as session:
                current = session.query(Email).filter_by(id=email_id).first()
                existing_detail = current.ai_error_detail if current else None
                session.query(Email).filter_by(id=email_id).update({
                    "needs_manual_review": True,
                    "ai_error_detail": (
                        (existing_detail + "; " if existing_detail else "") + f"reply: {exc}"
                    ),
                })

    draft_id = None
    if reply_result:
        draft_id = _handle_reply_confidence(gmail_client, email_id, parsed, reply_result)

    if should_notify:
        await _notify(sender, subject, category, classification["priority"],
                       importance["importance_score"], summary["one_line_summary"],
                       reply_result["reply_body"] if reply_result else None,
                       email_id)

    if auto_action == "archive_after_summary":
        gmail_client.archive(parsed["gmail_id"])

    _mark_processed(email_id)


def _handle_reply_confidence(gmail_client, email_id: int, parsed: dict, reply_result: dict) -> int:
    confidence = reply_result["confidence"]

    with get_session() as session:
        draft = Draft(
            email_id=email_id,
            tone="Professional",
            reply_subject=reply_result["reply_subject"],
            reply_body=reply_result["reply_body"],
            confidence=confidence,
            reasoning=reply_result["reasoning"],
        )
        session.add(draft)
        session.flush()
        draft_id = draft.id

        if confidence >= settings.auto_send_threshold:
            gmail_client.send_reply(
                thread_id=parsed["thread_id"],
                to=parsed["sender"],
                subject=reply_result["reply_subject"],
                body=reply_result["reply_body"],
                in_reply_to_gmail_id=parsed["gmail_id"],
            )
            draft.status = "auto_sent"
            draft.sent_at = utcnow()
            log_event("pipeline", f"Auto-sent reply (confidence={confidence}%) for email {email_id}")

        elif confidence >= settings.approval_threshold:
            gmail_client.create_draft(
                thread_id=parsed["thread_id"], to=parsed["sender"],
                subject=reply_result["reply_subject"], body=reply_result["reply_body"],
            )
            draft.status = "pending"
            log_event("pipeline", f"Draft awaiting approval (confidence={confidence}%) for email {email_id}")

        else:
            draft.status = "pending"
            log_event("pipeline", f"Low-confidence draft only, no send (confidence={confidence}%) for email {email_id}")

        return draft_id


async def _notify(sender, subject, category, priority, importance_score, one_line_summary, suggested_reply, email_id):
    text = format_notification(sender, subject, category, priority, importance_score, one_line_summary, suggested_reply)
    channel = TelegramChannel()
    delivered = await channel.send(text)

    with get_session() as session:
        session.add(Notification(email_id=email_id, channel="telegram", payload=text, delivered=delivered))


def _mark_processed(email_id: int):
    with get_session() as session:
        session.query(Email).filter_by(id=email_id).update({"processed": True})


def _is_existing_thread(thread_id: str) -> bool:
    with get_session() as session:
        return session.query(Email).filter_by(thread_id=thread_id).count() > 0


def _update_contact(session, sender: str):
    address = sender.split("<")[-1].replace(">", "").strip().lower() if "<" in sender else sender.lower()
    contact = session.query(Contact).filter_by(email_address=address).first()
    if not contact:
        contact = Contact(email_address=address, message_count=0)
        session.add(contact)
    contact.message_count = (contact.message_count or 0) + 1
    contact.last_contacted_at = utcnow()
