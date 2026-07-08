"""
Covers the two remaining audit findings that have observable behavior worth
locking in with a test: a failing AI call must degrade to safe defaults and
flag the email for manual review instead of losing it or crashing the poll
cycle, and Telegram messages must survive special characters in email
content without the whole notification silently failing.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.database import get_session
from app.core.models import Email
from app.notifications.base import escape_markdown, format_notification
from app.workflows.pipeline import process_email


def _parsed_email(gmail_id: str) -> dict:
    return {
        "gmail_id": gmail_id, "thread_id": "t-resilience", "sender": "a@b.com",
        "recipients": "me@x.com", "subject": "Test subject", "body_text": "hello",
        "body_html": "", "has_attachments": False,
    }


@pytest.mark.asyncio
async def test_classification_failure_falls_back_and_flags_for_review(patch_setting):
    patch_setting("importance_notify_threshold", 999)  # suppress notification path for this test
    gmail_client = MagicMock()

    with patch("app.workflows.pipeline.classify_email", new=AsyncMock(side_effect=TimeoutError("ollama down"))), \
         patch("app.workflows.pipeline.score_importance", new=AsyncMock(return_value={
             "importance_score": 40, "deadline_detected": None, "reason": "ok",
         })), \
         patch("app.workflows.pipeline.summarize_email", new=AsyncMock(return_value={
             "one_line_summary": "x", "short_summary": "x", "detailed_summary": "x",
             "action_items": [], "deadlines": [], "requested_tasks": [],
         })), \
         patch("app.workflows.pipeline.generate_reply", new=AsyncMock(return_value={
             "reply_subject": "Re: Test subject", "reply_body": "ok",
             "confidence": 10, "reasoning": "",
         })):
        await process_email(gmail_client, _parsed_email("resilience-1"))

    with get_session() as session:
        email = session.query(Email).filter_by(gmail_id="resilience-1").first()
        assert email is not None
        assert email.category == "Other"  # fallback, not a crash
        assert email.needs_manual_review is True
        assert "classify:" in email.ai_error_detail
        assert email.processed is True  # the cycle still completed


@pytest.mark.asyncio
async def test_reply_failure_still_saves_and_notifies_without_a_draft(patch_setting):
    patch_setting("importance_notify_threshold", 0)  # force notify path
    gmail_client = MagicMock()

    with patch("app.workflows.pipeline.classify_email", new=AsyncMock(return_value={
             "category": "Client", "priority": "High", "confidence": 90, "reason": "ok",
         })), \
         patch("app.workflows.pipeline.score_importance", new=AsyncMock(return_value={
             "importance_score": 95, "deadline_detected": None, "reason": "ok",
         })), \
         patch("app.workflows.pipeline.summarize_email", new=AsyncMock(return_value={
             "one_line_summary": "x", "short_summary": "x", "detailed_summary": "x",
             "action_items": [], "deadlines": [], "requested_tasks": [],
         })), \
         patch("app.workflows.pipeline.generate_reply", new=AsyncMock(side_effect=RuntimeError("model unreachable"))), \
         patch("app.workflows.pipeline.TelegramChannel") as mock_telegram_cls:
        mock_telegram_cls.return_value.send = AsyncMock(return_value=True)
        await process_email(gmail_client, _parsed_email("resilience-2"))

    gmail_client.send_reply.assert_not_called()
    gmail_client.create_draft.assert_not_called()
    with get_session() as session:
        email = session.query(Email).filter_by(gmail_id="resilience-2").first()
        assert email.needs_manual_review is True
        assert "reply:" in email.ai_error_detail
        assert email.processed is True
    mock_telegram_cls.return_value.send.assert_called_once()  # still got notified


def test_escape_markdown_neutralizes_special_characters():
    raw = "Re: [URGENT] *sale* ends today! Dept_Head `code`"
    escaped = escape_markdown(raw)
    for char in "_*`[]":
        assert f"\\{char}" in escaped or char not in raw.replace(f"\\{char}", "")
    # the escaped string must not contain an unescaped one of these chars
    import re
    assert re.search(r"(?<!\\)[_*`\[\]]", escaped) is None


def test_format_notification_produces_telegram_safe_text():
    text = format_notification(
        sender="Dept_Head <x@y.com>", subject="Re: [URGENT] *sale*",
        category="Finance", priority="High", importance_score=90,
        one_line_summary="Sale ends *today*", suggested_reply="Sure, [confirmed].",
    )
    import re
    # every line built from dynamic fields must have no unescaped specials;
    # the static "*New High priority email*" wrapper is intentionally exempt
    for line in text.splitlines():
        if line.startswith("📩"):
            continue
        assert re.search(r"(?<!\\)[_`\[\]]", line) is None
