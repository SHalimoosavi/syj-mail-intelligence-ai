import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def log_event(source: str, message: str, level: str = "info", meta: dict | None = None):
    """Log to stdout immediately, and persist to the DB logs table (best-effort,
    never lets a logging failure break the pipeline)."""
    logger = logging.getLogger(source)
    getattr(logger, level, logger.info)(message)

    try:
        from app.core.database import get_session
        from app.core.models import Log

        with get_session() as session:
            session.add(Log(level=level, source=source, message=message, meta=meta or {}))
    except Exception:
        logger.warning("Failed to persist log entry to DB (non-fatal)")
