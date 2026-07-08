import httpx

from app.notifications.base import NotificationChannel
from app.core.logger import log_event
from config.config import settings


class TelegramChannel(NotificationChannel):
    """Chosen as the first notification channel because it needs zero extra
    infra (no app store review, no webhook server) — just a bot token from
    @BotFather and your chat ID. WhatsApp/Slack/Discord/Desktop/Email land in
    Phase 2 behind the same NotificationChannel interface."""

    def __init__(self):
        self.token = settings.telegram_bot_token
        self.chat_id = settings.telegram_chat_id

    async def send(self, text: str) -> bool:
        if not self.token or not self.chat_id:
            log_event("telegram", "Telegram not configured, skipping notification", level="warning")
            return False

        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, json={
                    "chat_id": self.chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                })
                if resp.status_code == 400:
                    # Most likely cause: something still slipped through
                    # unescaped and broke Telegram's Markdown parser. Retry
                    # once as plain text rather than losing the notification
                    # entirely — better an unformatted alert than none.
                    log_event(
                        "telegram",
                        f"Markdown send rejected (400): {resp.text[:200]} — retrying as plain text",
                        level="warning",
                    )
                    resp = await client.post(url, json={"chat_id": self.chat_id, "text": text})
                resp.raise_for_status()
            return True
        except Exception as exc:
            log_event("telegram", f"Failed to send notification: {exc}", level="error")
            return False
