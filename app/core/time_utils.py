from datetime import datetime, timezone


def utcnow() -> datetime:
    """Timezone-aware UTC now — datetime.utcnow() is deprecated as of
    Python 3.12 and slated for removal. Use this everywhere instead."""
    return datetime.now(timezone.utc)
