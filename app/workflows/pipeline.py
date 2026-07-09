"""
The core orchestration. Every new email flows through here, exactly once.

Safety guarantees:

1. AI failures never lose an email.
2. Every AI stage is isolated.
3. Every reply is validated before entering approval logic.
4. Extensive diagnostics are written during production validation.
"""

from app.ai.classifier import classify_email
from app.ai.importance import score_importance
from app.ai.reply_generator import generate_reply
from app.ai.summarizer import summarize_email

from app.core.database import get_session
from app.core.logger import log_event
from app.core.models import (
    Contact,
    Draft,
    Email,
    Notification,
    Summary,
)
from app.core.time_utils import utcnow

from app.notifications.base import format_notification
from app.notifications.telegram import TelegramChannel

from config.config import AUTO_RULES, settings


_FALLBACK_CLASSIFICATION = {
    "category": "Other",
    "priority": "Medium",
    "confidence": 0,
    "reason": "AI classification unavailable.",
}

_FALLBACK_IMPORTANCE = {
    "importance_score": 50,
    "deadline_detected": None,
    "reason": "AI importance scoring unavailable.",
}

_FALLBACK_SUMMARY = {
    "one_line_summary": "(summary unavailable)",
    "short_summary": "",
    "detailed_summary": "AI summarization unavailable.",
    "action_items": [],
    "deadlines": [],
    "requested_tasks": [],
}


async def process_email(gmail_client, parsed: dict):

    sender = parsed["sender"]
    subject = parsed["subject"]
    body = parsed["body_text"]

    ai_errors = []

    # ---------------------------------------------------------
    # Classification
    # ---------------------------------------------------------

    try:
        classification = await classify_email(
            sender,
            subject,
            body,
        )

    except Exception as exc:

        log_event(
            "pipeline",
            f"Classification failed for '{subject}': {exc}",
            level="error",
        )

        classification = dict(_FALLBACK_CLASSIFICATION)
        ai_errors.append(f"classify: {exc}")

    category = classification["category"]

    # ---------------------------------------------------------
    # Importance
    # ---------------------------------------------------------

    try:

        importance = await score_importance(
            sender=sender,
            subject=subject,
            body=body,
            category=category,
            is_thread_reply=_is_existing_thread(parsed["thread_id"]),
            has_attachments=parsed["has_attachments"],
        )

    except Exception as exc:

        log_event(
            "pipeline",
            f"Importance failed for '{subject}': {exc}",
            level="error",
        )

        importance = dict(_FALLBACK_IMPORTANCE)
        ai_errors.append(f"importance: {exc}")

    # ---------------------------------------------------------
    # Store Email
    # ---------------------------------------------------------

    with get_session() as session:

        email = Email(
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

        session.add(email)
        session.flush()

        email_id = email.id

        _update_contact(session, sender)

    log_event(
        "pipeline",
        (
            f"Processed '{subject}' "
            f"category={category} "
            f"importance={importance['importance_score']}"
        ),
        level="info",
    )

    auto_action = AUTO_RULES.get(category)

    # ---------------------------------------------------------
    # Summarization
    # ---------------------------------------------------------

    try:

        summary = await summarize_email(
            sender,
            subject,
            body,
        )

    except Exception as exc:

        log_event(
            "pipeline",
            f"Summarization failed for '{subject}': {exc}",
            level="error",
        )

        summary = dict(_FALLBACK_SUMMARY)
        ai_errors.append(f"summary: {exc}")

    with get_session() as session:

        session.add(
            Summary(
                email_id=email_id,
                one_line=summary["one_line_summary"],
                short=summary["short_summary"],
                detailed=summary["detailed_summary"],
                action_items=summary["action_items"],
                deadlines=summary["deadlines"],
                requested_tasks=summary["requested_tasks"],
            )
        )

        session.query(Email).filter_by(id=email_id).update(
            {
                "auto_action": auto_action,
            }
        )

    # ---------------------------------------------------------
    # Automatic handling
    # ---------------------------------------------------------

    if auto_action in ("archive", "ignore"):

        if auto_action == "archive":
            gmail_client.archive(parsed["gmail_id"])

        _mark_processed(email_id)
        return

    if auto_action == "summarize_only":
        _mark_processed(email_id)
        return

    should_notify = (
        importance["importance_score"]
        >= settings.importance_notify_threshold
        or auto_action == "notify_immediately"
    )

    # ---------------------------------------------------------
    # Reply generation
    # ---------------------------------------------------------

    reply_result = None

    if category not in (
        "Spam",
        "Scam",
        "Phishing",
        "Promotion",
        "Newsletter",
    ):

        try:

            reply_result = await generate_reply(
                sender,
                subject,
                body,
            )

            log_event(
                "pipeline",
                f"generate_reply() returned:\n{repr(reply_result)}",
                level="info",
            )

            if not isinstance(reply_result, dict):
                raise ValueError(
                    "generate_reply() returned a non-dictionary object."
                )

        except Exception as exc:

            log_event(
                "pipeline",
                f"Reply generation failed for '{subject}': {exc}",
                level="error",
            )

            ai_errors.append(f"reply: {exc}")

            with get_session() as session:

                current = (
                    session.query(Email)
                    .filter_by(id=email_id)
                    .first()
                )

                existing = (
                    current.ai_error_detail
                    if current
                    else None
                )

                session.query(Email).filter_by(id=email_id).update(
                    {
                        "needs_manual_review": True,
                        "ai_error_detail": (
                            (existing + "; " if existing else "")
                            + f"reply: {exc}"
                        ),
                    }
                )

            reply_result = None

    # ---------------------------------------------------------
    # Reply confidence handling / auto-send / draft creation
    # ---------------------------------------------------------

    draft_id = None

    if reply_result:
        draft_id = _handle_reply_confidence(
            gmail_client,
            email_id,
            parsed,
            reply_result,
        )

    # ---------------------------------------------------------
    # Notification
    # ---------------------------------------------------------

    if should_notify:

        await _notify(
            sender=sender,
            subject=subject,
            category=category,
            priority=classification["priority"],
            importance_score=importance["importance_score"],
            one_line_summary=summary["one_line_summary"],
            suggested_reply=(
                reply_result["reply_body"]
                if reply_result
                else None
            ),
            email_id=email_id,
        )

    # ---------------------------------------------------------
    # Archive after summary rule
    # ---------------------------------------------------------

    if auto_action == "archive_after_summary":
        gmail_client.archive(parsed["gmail_id"])

    _mark_processed(email_id)


def _handle_reply_confidence(
    gmail_client,
    email_id: int,
    parsed: dict,
    reply_result: dict,
) -> int:

    log_event(
        "pipeline",
        f"_handle_reply_confidence() called with:\n{repr(reply_result)}",
        level="info",
    )

    try:

        confidence = int(reply_result["confidence"])

        reply_subject = reply_result["reply_subject"].strip()

        reply_body = reply_result["reply_body"].strip()

        reasoning = reply_result["reasoning"].strip()

        with get_session() as session:

            draft = Draft(
                email_id=email_id,
                tone="Professional",
                reply_subject=reply_subject,
                reply_body=reply_body,
                confidence=confidence,
                reasoning=reasoning,
            )

            session.add(draft)
            session.flush()

            draft_id = draft.id

            log_event(
                "pipeline",
                f"Draft #{draft_id} created.",
                level="info",
            )

            # --------------------------------------------
            # Auto Send
            # --------------------------------------------

            if confidence >= settings.auto_send_threshold:

                gmail_client.send_reply(
                    thread_id=parsed["thread_id"],
                    to=parsed["sender"],
                    subject=reply_subject,
                    body=reply_body,
                    in_reply_to_gmail_id=parsed["gmail_id"],
                )

                draft.status = "auto_sent"
                draft.sent_at = utcnow()

                log_event(
                    "pipeline",
                    f"Reply auto-sent (confidence={confidence})",
                    level="info",
                )

            # --------------------------------------------
            # Approval Queue
            # --------------------------------------------

            elif confidence >= settings.approval_threshold:

                gmail_client.create_draft(
                    thread_id=parsed["thread_id"],
                    to=parsed["sender"],
                    subject=reply_subject,
                    body=reply_body,
                )

                draft.status = "pending"

                log_event(
                    "pipeline",
                    f"Gmail draft created (confidence={confidence})",
                    level="info",
                )

            # --------------------------------------------
            # Local Draft Only
            # --------------------------------------------

            else:

                draft.status = "pending"

                log_event(
                    "pipeline",
                    f"Stored local draft only (confidence={confidence})",
                    level="info",
                )

            session.commit()

            return draft_id

    except Exception as exc:

        import traceback

        log_event(
            "pipeline",
            "========== REPLY PIPELINE FAILURE ==========\n"
            f"Email ID: {email_id}\n"
            f"Exception: {type(exc).__name__}\n"
            f"{exc}\n\n"
            f"{traceback.format_exc()}",
            level="error",
        )

        with get_session() as session:

            current = (
                session.query(Email)
                .filter_by(id=email_id)
                .first()
            )

            existing = (
                current.ai_error_detail
                if current
                else None
            )

            session.query(Email).filter_by(id=email_id).update(
                {
                    "needs_manual_review": True,
                    "ai_error_detail": (
                        (existing + "; " if existing else "")
                        + f"_handle_reply_confidence: {exc}"
                    ),
                }
            )

            session.commit()

        raise


async def _notify(
    sender,
    subject,
    category,
    priority,
    importance_score,
    one_line_summary,
    suggested_reply,
    email_id,
):
    """
    Sends notification through configured channels.
    Notification failures never interrupt email processing.
    """

    try:

        text = format_notification(
            sender,
            subject,
            category,
            priority,
            importance_score,
            one_line_summary,
            suggested_reply,
        )

        channel = TelegramChannel()

        delivered = await channel.send(text)

    except Exception as exc:

        delivered = False

        log_event(
            "pipeline",
            f"Notification failed: {exc}",
            level="error",
        )

        text = f"Notification generation failed: {exc}"

    with get_session() as session:

        session.add(
            Notification(
                email_id=email_id,
                channel="telegram",
                payload=text,
                delivered=delivered,
            )
        )

        session.commit()


def _mark_processed(email_id: int):

    with get_session() as session:

        session.query(Email).filter_by(
            id=email_id
        ).update(
            {
                "processed": True,
            }
        )

        session.commit()


def _is_existing_thread(thread_id: str) -> bool:

    with get_session() as session:

        return (
            session.query(Email)
            .filter_by(thread_id=thread_id)
            .count()
            > 0
        )


def _update_contact(session, sender: str):

    if "<" in sender:
        address = (
            sender.split("<")[-1]
            .replace(">", "")
            .strip()
            .lower()
        )
    else:
        address = sender.lower()

    contact = (
        session.query(Contact)
        .filter_by(email_address=address)
        .first()
    )

    if contact is None:

        contact = Contact(
            email_address=address,
            message_count=0,
        )

        session.add(contact)

    contact.message_count = (contact.message_count or 0) + 1
    contact.last_contacted_at = utcnow()
