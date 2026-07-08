"""
These tests exist because this threshold logic is the one thing in the
whole system that must never be wrong: it's what stops a model's own
confidence claim from directly causing an unwanted auto-send. Every branch
(auto-send, needs-approval, draft-only) and the boundary condition are
covered explicitly rather than trusted to "look right" in review.
"""
from unittest.mock import MagicMock

from app.core.database import get_session
from app.core.models import Email, Draft
from app.workflows.pipeline import _handle_reply_confidence


def _make_email(gmail_id: str) -> int:
    with get_session() as session:
        email = Email(
            gmail_id=gmail_id, thread_id="t1", sender="a@b.com", recipients="me@x.com",
            subject="Test", body_text="hi", body_html="", has_attachments=False,
            category="Client", priority="Medium", classification_confidence=80,
            classification_reason="", importance_score=50, importance_reason="",
        )
        session.add(email)
        session.flush()
        return email.id


def _parsed(gmail_id: str) -> dict:
    return {"thread_id": "t1", "sender": "a@b.com", "gmail_id": gmail_id}


def test_high_confidence_auto_sends(patch_setting):
    patch_setting("auto_send_threshold", 95)
    patch_setting("approval_threshold", 80)

    email_id = _make_email("auto-send-1")
    gmail_client = MagicMock()
    reply_result = {
        "reply_subject": "Re: Test", "reply_body": "Sure thing.",
        "confidence": 97, "reasoning": "clear question, clear answer",
    }

    draft_id = _handle_reply_confidence(gmail_client, email_id, _parsed("auto-send-1"), reply_result)

    gmail_client.send_reply.assert_called_once()
    gmail_client.create_draft.assert_not_called()
    with get_session() as session:
        assert session.get(Draft, draft_id).status == "auto_sent"


def test_mid_confidence_creates_draft_for_approval(patch_setting):
    patch_setting("auto_send_threshold", 95)
    patch_setting("approval_threshold", 80)

    email_id = _make_email("approval-1")
    gmail_client = MagicMock()
    reply_result = {
        "reply_subject": "Re: Test", "reply_body": "Let me check and get back to you.",
        "confidence": 85, "reasoning": "somewhat ambiguous ask",
    }

    draft_id = _handle_reply_confidence(gmail_client, email_id, _parsed("approval-1"), reply_result)

    gmail_client.send_reply.assert_not_called()
    gmail_client.create_draft.assert_called_once()
    with get_session() as session:
        assert session.get(Draft, draft_id).status == "pending"


def test_low_confidence_never_touches_gmail(patch_setting):
    patch_setting("auto_send_threshold", 95)
    patch_setting("approval_threshold", 80)

    email_id = _make_email("low-conf-1")
    gmail_client = MagicMock()
    reply_result = {
        "reply_subject": "Re: Test", "reply_body": "Not sure how to answer this.",
        "confidence": 40, "reasoning": "low confidence, ambiguous content",
    }

    draft_id = _handle_reply_confidence(gmail_client, email_id, _parsed("low-conf-1"), reply_result)

    gmail_client.send_reply.assert_not_called()
    gmail_client.create_draft.assert_not_called()
    with get_session() as session:
        draft = session.get(Draft, draft_id)
        assert draft.status == "pending"
        assert draft.confidence == 40


def test_threshold_boundary_is_inclusive(patch_setting):
    """Confidence exactly equal to auto_send_threshold should auto-send (the
    check is >=), not fall one point short of the configured bar."""
    patch_setting("auto_send_threshold", 95)
    patch_setting("approval_threshold", 80)

    email_id = _make_email("boundary-1")
    gmail_client = MagicMock()
    reply_result = {
        "reply_subject": "Re: Test", "reply_body": "Confirmed.",
        "confidence": 95, "reasoning": "",
    }

    _handle_reply_confidence(gmail_client, email_id, _parsed("boundary-1"), reply_result)
    gmail_client.send_reply.assert_called_once()


def test_one_point_below_auto_send_threshold_requires_approval(patch_setting):
    patch_setting("auto_send_threshold", 95)
    patch_setting("approval_threshold", 80)

    email_id = _make_email("boundary-2")
    gmail_client = MagicMock()
    reply_result = {
        "reply_subject": "Re: Test", "reply_body": "Confirmed, I think.",
        "confidence": 94, "reasoning": "",
    }

    _handle_reply_confidence(gmail_client, email_id, _parsed("boundary-2"), reply_result)
    gmail_client.send_reply.assert_not_called()
    gmail_client.create_draft.assert_called_once()
