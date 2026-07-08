"""
Runs the poller (background inbox monitoring) and the API server (for the
dashboard / manual approval) together in one process. Simple and
Termux-friendly — no separate worker/broker needed at this scale.

Gmail is NOT required to start. If credentials.json/token.json are missing
or invalid, the poller logs it and retries with backoff (see
app/gmail/poller.py) while the API and dashboard keep working normally —
you can browse history, edit prompts, and check /ready to see Gmail's
status without Gmail ever having connected.
"""
import asyncio
import signal
import threading

import uvicorn

from app.ai.provider import shutdown_provider
from app.core.database import init_db
from app.core.logger import log_event
from app.gmail.poller import poll_loop
from config.config import settings


def run_api():
    uvicorn.run("app.api.main:app", host=settings.api_host, port=settings.api_port, log_level="info")


async def main():
    init_db()
    log_event("main", "SYJ Mail Intelligence AI starting up")

    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _request_shutdown(sig_name: str):
        log_event("main", f"Received {sig_name}, shutting down gracefully")
        stop_event.set()

    # SIGTERM is what Docker/systemd send on stop; SIGINT is Ctrl+C. Both
    # should trigger the same clean shutdown path rather than an abrupt
    # kill mid-poll-cycle. (Windows doesn't support add_signal_handler for
    # SIGTERM the same way — fall back to letting KeyboardInterrupt handle
    # Ctrl+C there, which the outer try/except below still catches.)
    for sig, name in ((signal.SIGINT, "SIGINT"), (signal.SIGTERM, "SIGTERM")):
        try:
            loop.add_signal_handler(sig, lambda n=name: _request_shutdown(n))
        except NotImplementedError:
            pass  # Windows

    poller_task = asyncio.create_task(poll_loop())

    await stop_event.wait()

    poller_task.cancel()
    try:
        await poller_task
    except asyncio.CancelledError:
        pass

    await shutdown_provider()
    log_event("main", "Shutdown complete")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        # Belt-and-suspenders for platforms where the signal handler above
        # isn't available (e.g. Windows) — still exit cleanly rather than
        # printing a raw traceback.
        pass
