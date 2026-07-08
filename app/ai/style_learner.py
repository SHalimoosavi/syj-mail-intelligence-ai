"""
Learns the user's writing style from their Sent folder: greetings, closings,
average length, signature. Deliberately simple heuristics in Phase 1 (no LLM
call needed for this, keeps it fast and free) — never trains on spam/junk
since we only ever read the SENT label, which by definition the user wrote
themselves.

Run periodically (e.g. weekly) via: python -m app.ai.style_learner
"""
import re
from collections import Counter
from datetime import datetime
from app.core.time_utils import utcnow

from app.core.database import get_session
from app.core.models import StyleProfile
from app.core.logger import log_event
from app.gmail.client import GmailClient

GREETING_PATTERNS = [r"^hi\b", r"^hello\b", r"^dear\b", r"^hey\b"]
CLOSING_PATTERNS = [r"regards", r"best", r"thanks", r"sincerely", r"cheers"]


def _first_line(text: str) -> str:
    for line in text.splitlines():
        if line.strip():
            return line.strip().lower()
    return ""


def _last_lines(text: str, n: int = 4) -> str:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return "\n".join(lines[-n:]).lower()


def learn_style_from_sent(max_messages: int = 100):
    client = GmailClient()
    service = client.service

    results = service.users().messages().list(
        userId="me", labelIds=["SENT"], maxResults=max_messages
    ).execute()
    message_ids = [m["id"] for m in results.get("messages", [])]

    greetings, closings, lengths = Counter(), Counter(), []
    signature_candidate = ""

    for mid in message_ids:
        parsed = client.get_message(mid)
        body = parsed["body_text"]
        if not body:
            continue

        lengths.append(len(body.split()))

        first = _first_line(body)
        for pat in GREETING_PATTERNS:
            if re.search(pat, first):
                greetings[first.split(",")[0][:30]] += 1

        last = _last_lines(body)
        for pat in CLOSING_PATTERNS:
            if re.search(pat, last):
                closings[pat] += 1
                signature_candidate = last

    avg_len = int(sum(lengths) / len(lengths)) if lengths else 0

    with get_session() as session:
        profile = session.query(StyleProfile).first()
        if not profile:
            profile = StyleProfile()
            session.add(profile)

        profile.avg_length_words = avg_len
        profile.common_greetings = [g for g, _ in greetings.most_common(5)]
        profile.common_closings = [c for c, _ in closings.most_common(5)]
        profile.signature = signature_candidate
        profile.sample_count = len(lengths)
        profile.updated_at = utcnow()

    log_event("style_learner", f"Learned style from {len(lengths)} sent emails")


def get_style_profile_text() -> str:
    with get_session() as session:
        profile = session.query(StyleProfile).first()
        if not profile or profile.sample_count == 0:
            return "No style profile learned yet — write in a clear, professional default tone."

        return (
            f"Average reply length: ~{profile.avg_length_words} words. "
            f"Common greetings: {', '.join(profile.common_greetings) or 'none detected'}. "
            f"Common closings: {', '.join(profile.common_closings) or 'none detected'}. "
            f"Typical signature block: {profile.signature or 'none detected'}."
        )


if __name__ == "__main__":
    learn_style_from_sent()
