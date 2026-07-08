"""
A single, process-wide record of whether Gmail is currently reachable. The
poller updates this every cycle; the API's /ready endpoint and the dashboard
Settings page read it. Nothing else should need to know Gmail's state.
"""
from dataclasses import dataclass
from typing import Optional

from app.core.time_utils import utcnow
from datetime import datetime


@dataclass
class GmailStatus:
    connected: bool = False
    last_error: Optional[str] = None
    last_success_at: Optional[datetime] = None
    last_attempt_at: Optional[datetime] = None
    consecutive_failures: int = 0

    def mark_success(self):
        self.connected = True
        self.last_error = None
        self.last_success_at = utcnow()
        self.last_attempt_at = self.last_success_at
        self.consecutive_failures = 0

    def mark_failure(self, error: str):
        self.connected = False
        self.last_error = error
        self.last_attempt_at = utcnow()
        self.consecutive_failures += 1

    def as_dict(self) -> dict:
        return {
            "connected": self.connected,
            "last_error": self.last_error,
            "last_success_at": self.last_success_at.isoformat() if self.last_success_at else None,
            "last_attempt_at": self.last_attempt_at.isoformat() if self.last_attempt_at else None,
            "consecutive_failures": self.consecutive_failures,
        }


gmail_status = GmailStatus()
