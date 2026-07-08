import re
from abc import ABC, abstractmethod


class NotificationChannel(ABC):
    @abstractmethod
    async def send(self, text: str) -> bool:
        """Send a notification. Return True on success. Implementations should
        not raise — log and return False instead, so one channel failing never
        breaks the pipeline."""
        raise NotImplementedError


# Telegram's legacy "Markdown" parse mode treats these as special. Email
# subjects/senders/bodies routinely contain them (e.g. "Re: [URGENT] *sale*
# ends today!" or a sender like "Dept_Head <x@y.com>"), and one unescaped
# character makes the whole sendMessage call fail with a 400 — silently
# dropping a notification the user needed.
_MARKDOWN_SPECIAL_CHARS = re.compile(r"([_*`\[\]])")


def escape_markdown(text: str) -> str:
    """Escape user-controlled text before interpolating it into a Markdown
    message. Only escapes what legacy Markdown (parse_mode="Markdown")
    treats as special — we don't use MarkdownV2's larger escape set."""
    return _MARKDOWN_SPECIAL_CHARS.sub(r"\\\1", text)


def format_notification(
    sender: str, subject: str, category: str, priority: str,
    importance_score: int, one_line_summary: str, suggested_reply: str | None,
) -> str:
    lines = [
        f"📩 *New {priority} priority email* ({escape_markdown(category)})",
        f"From: {escape_markdown(sender)}",
        f"Subject: {escape_markdown(subject)}",
        f"Importance: {importance_score}/100",
        f"Summary: {escape_markdown(one_line_summary)}",
    ]
    if suggested_reply:
        lines.append(f"\nSuggested reply:\n{escape_markdown(suggested_reply[:500])}")
    return "\n".join(lines)
