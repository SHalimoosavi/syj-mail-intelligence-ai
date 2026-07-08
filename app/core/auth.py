"""
Every route except /health depends on this. In development (ENVIRONMENT
unset or "development") with no API_KEY configured, it logs a loud warning
but allows requests through, so local setup isn't blocked on generating a
key immediately. In production, config.py already refuses to start without
an API_KEY — this dependency then enforces it on every request.
"""
from fastapi import Header, HTTPException

from config.config import settings

_warned = False


async def verify_api_key(x_api_key: str = Header(default="")):
    global _warned

    if not settings.api_key:
        if not _warned:
            import logging
            logging.getLogger("auth").warning(
                "API_KEY is not set — every endpoint is UNAUTHENTICATED. "
                "This is only acceptable on localhost during development. "
                "Set API_KEY in .env and ENVIRONMENT=production before "
                "exposing this backend beyond your own machine."
            )
            _warned = True
        return

    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Missing or invalid X-API-Key header")
