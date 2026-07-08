import base64
import re
from email.mime.text import MIMEText
from typing import Optional

from googleapiclient.discovery import build
from tenacity import retry, stop_after_attempt, wait_exponential

from app.gmail.auth import get_credentials
from config.config import settings


class GmailClient:
    def __init__(self):
        creds = get_credentials()
        self.service = build("gmail", "v1", credentials=creds)

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=2, max=30))
    def list_new_message_ids(self, after_history_id: Optional[str] = None, max_results: int = 20) -> list[str]:
        """List recent unread inbox message IDs. Uses q= search rather than the
        history API for simplicity/robustness in Phase 1 (history API is more
        efficient but requires careful watermark bookkeeping — a good Phase 2
        upgrade once the core pipeline is validated)."""
        results = self.service.users().messages().list(
            userId=settings.gmail_user_email,
            labelIds=["INBOX", "UNREAD"],
            maxResults=max_results,
        ).execute()
        return [m["id"] for m in results.get("messages", [])]

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=2, max=30))
    def get_message(self, message_id: str) -> dict:
        raw = self.service.users().messages().get(
            userId=settings.gmail_user_email, id=message_id, format="full"
        ).execute()
        return self._parse_message(raw)

    def _parse_message(self, raw: dict) -> dict:
        headers = {h["name"].lower(): h["value"] for h in raw["payload"].get("headers", [])}
        body_text, body_html, has_attachments = self._extract_body(raw["payload"])

        return {
            "gmail_id": raw["id"],
            "thread_id": raw.get("threadId"),
            "sender": headers.get("from", ""),
            "recipients": headers.get("to", ""),
            "subject": headers.get("subject", "(no subject)"),
            "body_text": body_text,
            "body_html": body_html,
            "has_attachments": has_attachments,
            "label_ids": raw.get("labelIds", []),
        }

    def _extract_body(self, payload: dict) -> tuple[str, str, bool]:
        body_text, body_html, has_attachments = "", "", False

        def walk(part):
            nonlocal body_text, body_html, has_attachments
            mime_type = part.get("mimeType", "")
            filename = part.get("filename", "")
            if filename:
                has_attachments = True

            data = part.get("body", {}).get("data")
            if data:
                decoded = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
                if mime_type == "text/plain":
                    body_text += decoded
                elif mime_type == "text/html":
                    body_html += decoded

            for sub in part.get("parts", []) or []:
                walk(sub)

        walk(payload)
        if not body_text and body_html:
            body_text = re.sub("<[^<]+?>", " ", body_html)  # crude fallback strip
        return body_text.strip(), body_html.strip(), has_attachments

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=20))
    def send_reply(self, thread_id: str, to: str, subject: str, body: str, in_reply_to_gmail_id: str):
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return self.service.users().messages().send(
            userId=settings.gmail_user_email,
            body={"raw": raw, "threadId": thread_id},
        ).execute()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=20))
    def create_draft(self, thread_id: str, to: str, subject: str, body: str):
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return self.service.users().drafts().create(
            userId=settings.gmail_user_email,
            body={"message": {"raw": raw, "threadId": thread_id}},
        ).execute()

    def mark_read(self, message_id: str):
        self.service.users().messages().modify(
            userId=settings.gmail_user_email, id=message_id,
            body={"removeLabelIds": ["UNREAD"]},
        ).execute()

    def archive(self, message_id: str):
        self.service.users().messages().modify(
            userId=settings.gmail_user_email, id=message_id,
            body={"removeLabelIds": ["INBOX"]},
        ).execute()
