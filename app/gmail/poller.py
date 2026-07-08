"""
Phase 1 uses simple polling (unread-inbox search) instead of Gmail push
notifications, because push requires a public HTTPS endpoint + Pub/Sub setup
that a Termux/phone deployment can't host. Polling every 30-60s is more than
fast enough for a personal inbox and needs zero extra infra.

Gmail is intentionally NOT required for the process to start. If
credentials.json/token.json are missing or invalid, this loop logs the
problem, records it in app.core.status.gmail_status (visible via GET
/ready), and retries with capped exponential backoff — it never raises out
of poll_loop() and never takes the API/dashboard down with it.
"""
import asyncio

from app.gmail.client import GmailClient
from app.core.database import get_session
from app.core.models import Email
from app.core.logger import log_event
from app.core.status import gmail_status
from app.workflows.pipeline import process_email
from config.config import settings

_MIN_BACKOFF = 5
_MAX_BACKOFF = 300  # cap retries at 5 minutes apart, no point hammering harder than that


def _get_client() -> GmailClient | None:
    """Try to construct a GmailClient. Returns None (never raises) if Gmail
    isn't configured or the token is invalid — callers decide how to wait
    and retry."""
    try:
        client = GmailClient()
        gmail_status.mark_success()
        return client
    except Exception as exc:
        gmail_status.mark_failure(str(exc))
        return None


async def poll_loop():
    log_event("poller", f"Starting poll loop, interval={settings.gmail_poll_interval_seconds}s")

    client: GmailClient | None = None
    backoff = _MIN_BACKOFF

    while True:
        if client is None:
            client = _get_client()
            if client is None:
                log_event(
                    "poller",
                    f"Gmail not available ({gmail_status.last_error}) — the API and "
                    f"dashboard still work normally. Retrying in {backoff}s. "
                    "Run `python -m app.gmail.auth` if you haven't completed OAuth2 yet.",
                    level="warning",
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, _MAX_BACKOFF)
                continue
            backoff = _MIN_BACKOFF  # reset once we successfully connect

        try:
            await poll_once(client)
            gmail_status.mark_success()
        except Exception as exc:
            # A failure here (token expired mid-run, network blip, Gmail API
            # error) shouldn't kill the loop — drop the client and let the
            # top of the loop reconnect with backoff.
            gmail_status.mark_failure(str(exc))
            log_event("poller", f"Poll cycle failed, will reconnect: {exc}", level="error")
            client = None
            await asyncio.sleep(_MIN_BACKOFF)
            continue

        await asyncio.sleep(settings.gmail_poll_interval_seconds)


async def poll_once(client: GmailClient):
    message_ids = client.list_new_message_ids()
    if not message_ids:
        return

    with get_session() as session:
        known_ids = {
            row.gmail_id for row in
            session.query(Email.gmail_id).filter(Email.gmail_id.in_(message_ids)).all()
        }

    new_ids = [mid for mid in message_ids if mid not in known_ids]
    if not new_ids:
        return

    log_event("poller", f"Found {len(new_ids)} new message(s)")

    for message_id in new_ids:
        try:
            parsed = client.get_message(message_id)
            await process_email(client, parsed)
        except Exception as exc:
            # One bad message must never stop the rest of the batch from
            # being processed.
            log_event("poller", f"Failed processing message {message_id}: {exc}", level="error")


if __name__ == "__main__":
    asyncio.run(poll_loop())
