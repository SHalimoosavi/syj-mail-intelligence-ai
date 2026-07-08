"""
The `logs` table grows one row per pipeline step, per email, forever. Run
this periodically (daily cron / systemd timer) to keep it bounded.

Usage: python -m scripts.prune_logs --days 30
"""
import argparse
from datetime import timedelta

from app.core.database import get_session, init_db
from app.core.models import Log
from app.core.time_utils import utcnow


def prune_logs(days: int) -> int:
    init_db()
    cutoff = utcnow() - timedelta(days=days)
    with get_session() as session:
        deleted = session.query(Log).filter(Log.created_at < cutoff).delete()
        return deleted


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=30, help="Delete log rows older than this many days")
    args = parser.parse_args()

    count = prune_logs(args.days)
    print(f"Deleted {count} log entries older than {args.days} days")
