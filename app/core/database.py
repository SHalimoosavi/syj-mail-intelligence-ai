import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config.config import settings

os.makedirs("data", exist_ok=True)

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def init_db():
    """SQLite (Phase 1 default, Termux-friendly): create tables directly —
    no migration ceremony needed for a single-file dev database.

    Postgres (production): rely on Alembic instead (see migrations/, run
    `alembic upgrade head` before starting the app). Skipping create_all()
    here is deliberate — if a migration is missing, you want a clear error
    the moment the app tries to use that table, not a schema that silently
    diverged from what migrations/versions/ says it should be."""
    from app.core import models  # noqa: F401  (register models on Base)
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
