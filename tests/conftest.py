"""
Sets DATABASE_URL to a throwaway SQLite file before any app module is
imported, unless one is already set (CI sets a real Postgres URL for this
job — see .github/workflows/ci.yml — and this must not override that).
"""
import os
import tempfile
import pytest

_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp_db.name}")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("API_KEY", "")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "")
os.environ.setdefault("TELEGRAM_CHAT_ID", "")


@pytest.fixture(scope="session", autouse=True)
def _init_database():
    from app.core.database import init_db
    init_db()


@pytest.fixture
def patch_setting():
    """Temporarily override an attribute on the shared, frozen `settings`
    singleton (config.config.settings) for one test, then restore it.
    Needed because Settings is a frozen dataclass — normal monkeypatch.setattr
    would trip FrozenInstanceError, so this uses object.__setattr__ directly."""
    from config.config import settings
    originals = {}

    def _patch(name: str, value):
        if name not in originals:
            originals[name] = getattr(settings, name)
        object.__setattr__(settings, name, value)

    yield _patch

    for name, value in originals.items():
        object.__setattr__(settings, name, value)
