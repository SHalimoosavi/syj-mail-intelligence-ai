"""
Minimal REST API over the pipeline's data — the backend for the Next.js
dashboard, and usable today via curl/Postman/a simple script.

SECURITY: every route except /health requires the X-API-Key header to match
API_KEY in .env (see app/core/auth.py). CORS is locked to CORS_ALLOW_ORIGINS
(default localhost:3000) — the dashboard itself doesn't rely on this at all,
since it proxies through its own Next.js server rather than calling this API
directly from the browser.

Run: uvicorn app.api.main:app --host 0.0.0.0 --port 8000
"""
from collections import Counter
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import func, text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.ai.provider import shutdown_provider
from app.core.database import get_session, init_db
from app.core.models import Email, Draft, Notification, Contact, Log, Summary
from app.core.auth import verify_api_key
from app.core.logger import log_event
from app.core.status import gmail_status
from app.gmail.client import GmailClient
from config.config import settings as app_settings

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if app_settings.environment != "production":
        log_event("api", "Starting in DEVELOPMENT mode — see app/core/auth.py before deploying")
    yield
    await shutdown_provider()


app = FastAPI(title="SYJ Mail Intelligence AI", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(app_settings.cors_allow_origins),
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# Every route below requires the API key, except /health (checked manually).
AUTH = Depends(verify_api_key)


@app.get("/health")
def health():
    """Liveness — deliberately unauthenticated. Answers 'is the process
    alive', nothing more. Used by Docker/systemd/uptime checks that
    shouldn't need a secret just to confirm the process is running."""
    return {"status": "ok"}


@app.get("/ready")
def ready():
    """Readiness — is this instance actually able to serve real traffic?
    Checks the database (hard requirement: every endpoint needs it) and
    reports Gmail's connection state (soft requirement: read endpoints and
    the dashboard work fine without Gmail; only live mail processing needs
    it). Also unauthenticated, for the same reason as /health — orchestrators
    checking readiness shouldn't need a secret either."""
    try:
        with get_session() as session:
            session.execute(text("SELECT 1"))
        db_ok = True
        db_error = None
    except Exception as exc:
        db_ok = False
        db_error = str(exc)

    body = {
        "database": "ok" if db_ok else "unreachable",
        "database_error": db_error,
        "gmail": gmail_status.as_dict(),
    }
    status_code = 200 if db_ok else 503
    return JSONResponse(content=body, status_code=status_code)


@app.get("/emails", dependencies=[AUTH])
def list_emails(category: str | None = None, limit: int = 50):
    with get_session() as session:
        query = session.query(Email).order_by(Email.received_at.desc())
        if category:
            query = query.filter(Email.category == category)
        rows = query.limit(min(limit, 500)).all()
        return [_email_to_dict(e) for e in rows]


@app.get("/emails/important", dependencies=[AUTH])
def important_emails(threshold: int = 70, limit: int = 50):
    with get_session() as session:
        rows = (
            session.query(Email)
            .filter(Email.importance_score >= threshold)
            .order_by(Email.importance_score.desc())
            .limit(min(limit, 500))
            .all()
        )
        return [_email_to_dict(e) for e in rows]


@app.get("/emails/{email_id}", dependencies=[AUTH])
def get_email(email_id: int):
    with get_session() as session:
        email = session.get(Email, email_id)
        if not email:
            raise HTTPException(404, "Email not found")
        summary = session.query(Summary).filter_by(email_id=email_id).first()
        drafts = session.query(Draft).filter_by(email_id=email_id).all()

        data = _email_to_dict(email)
        data["body_text"] = email.body_text
        data["classification_reason"] = email.classification_reason
        data["importance_reason"] = email.importance_reason
        data["ai_error_detail"] = email.ai_error_detail
        data["summary"] = {
            "one_line": summary.one_line, "short": summary.short,
            "detailed": summary.detailed, "action_items": summary.action_items,
            "deadlines": summary.deadlines, "requested_tasks": summary.requested_tasks,
        } if summary else None
        data["drafts"] = [_draft_to_dict(d) for d in drafts]
        return data


@app.get("/drafts", dependencies=[AUTH])
def list_drafts(status: str | None = None, limit: int = 100):
    with get_session() as session:
        query = session.query(Draft).order_by(Draft.created_at.desc())
        if status:
            query = query.filter(Draft.status == status)
        rows = query.limit(min(limit, 500)).all()
        return [_draft_to_dict(d) for d in rows]


@app.get("/drafts/pending", dependencies=[AUTH])
def pending_drafts():
    with get_session() as session:
        rows = session.query(Draft).filter(Draft.status == "pending").all()
        return [_draft_to_dict(d) for d in rows]


@app.post("/drafts/{draft_id}/approve", dependencies=[AUTH])
@limiter.limit(f"{app_settings.rate_limit_per_minute}/minute")
def approve_draft(request: Request, draft_id: int):
    with get_session() as session:
        draft = session.get(Draft, draft_id)
        if not draft:
            raise HTTPException(404, "Draft not found")
        email = session.get(Email, draft.email_id)

        client = GmailClient()
        client.send_reply(
            thread_id=email.thread_id, to=email.sender,
            subject=draft.reply_subject, body=draft.reply_body,
            in_reply_to_gmail_id=email.gmail_id,
        )
        draft.status = "sent"
        log_event("api", f"Draft {draft_id} approved and sent via dashboard")
        return {"status": "sent", "draft_id": draft_id}


@app.post("/drafts/{draft_id}/reject", dependencies=[AUTH])
@limiter.limit(f"{app_settings.rate_limit_per_minute}/minute")
def reject_draft(request: Request, draft_id: int):
    with get_session() as session:
        draft = session.get(Draft, draft_id)
        if not draft:
            raise HTTPException(404, "Draft not found")
        draft.status = "rejected"
        log_event("api", f"Draft {draft_id} rejected via dashboard")
        return {"status": "rejected", "draft_id": draft_id}


@app.get("/notifications", dependencies=[AUTH])
def list_notifications(limit: int = 50):
    with get_session() as session:
        rows = session.query(Notification).order_by(Notification.sent_at.desc()).limit(min(limit, 500)).all()
        return [
            {"id": n.id, "email_id": n.email_id, "channel": n.channel,
             "delivered": n.delivered, "sent_at": n.sent_at.isoformat()}
            for n in rows
        ]


@app.get("/contacts", dependencies=[AUTH])
def list_contacts(limit: int = 100):
    with get_session() as session:
        rows = session.query(Contact).order_by(Contact.message_count.desc()).limit(min(limit, 1000)).all()
        return [
            {"email": c.email_address, "name": c.display_name,
             "message_count": c.message_count, "is_client": c.is_client}
            for c in rows
        ]


@app.get("/logs", dependencies=[AUTH])
def list_logs(limit: int = 100):
    with get_session() as session:
        rows = session.query(Log).order_by(Log.created_at.desc()).limit(min(limit, 1000)).all()
        return [
            {"level": l.level, "source": l.source, "message": l.message,
             "created_at": l.created_at.isoformat()}
            for l in rows
        ]


@app.get("/analytics/summary", dependencies=[AUTH])
def analytics_summary():
    with get_session() as session:
        total = session.query(func.count(Email.id)).scalar() or 0
        category_rows = session.query(Email.category, func.count(Email.id)).group_by(Email.category).all()
        avg_importance = session.query(func.avg(Email.importance_score)).scalar()
        notifications_sent = session.query(func.count(Notification.id)).filter(Notification.delivered.is_(True)).scalar() or 0
        drafts_by_status = session.query(Draft.status, func.count(Draft.id)).group_by(Draft.status).all()
        important_count = session.query(func.count(Email.id)).filter(
            Email.importance_score >= app_settings.importance_notify_threshold
        ).scalar() or 0

        return {
            "total_emails": total,
            "important_emails": important_count,
            "avg_importance_score": round(avg_importance, 1) if avg_importance else 0,
            "notifications_sent": notifications_sent,
            "by_category": {cat or "Uncategorized": count for cat, count in category_rows},
            "drafts_by_status": {status or "unknown": count for status, count in drafts_by_status},
        }


@app.get("/settings", dependencies=[AUTH])
def get_settings():
    """Read-only view of non-secret config. Change values in .env and
    restart the assistant to apply them — there is deliberately no endpoint
    that writes these back, since several (DATABASE_URL, API_KEY) should
    never be editable from a web UI."""
    return {
        "environment": app_settings.environment,
        "llm_provider": app_settings.llm_provider,
        "llm_model": app_settings.llm_model,
        "llm_fallback_model": app_settings.llm_fallback_model,
        "ollama_host": app_settings.ollama_host,
        "auto_send_threshold": app_settings.auto_send_threshold,
        "approval_threshold": app_settings.approval_threshold,
        "importance_notify_threshold": app_settings.importance_notify_threshold,
        "gmail_poll_interval_seconds": app_settings.gmail_poll_interval_seconds,
        "database_url": app_settings.database_url.split("://")[0] + "://***",
        "telegram_configured": bool(app_settings.telegram_bot_token),
        "gmail": gmail_status.as_dict(),
    }


from pathlib import Path

from app.ai.prompts import PROMPTS_DIR
_ALLOWED_PROMPT_NAMES = {"classify", "importance", "summarize", "reply"}


class PromptUpdate(BaseModel):
    content: str


def _prompt_path(name: str) -> Path:
    # Names are constrained to a fixed allowlist so this can never be used
    # to read/write arbitrary files on the server via path traversal.
    if name not in _ALLOWED_PROMPT_NAMES:
        raise HTTPException(404, "Unknown prompt name")
    return PROMPTS_DIR / f"{name}.txt"


@app.get("/prompts", dependencies=[AUTH])
def list_prompts():
    if not PROMPTS_DIR.exists():
        return []
    return [
        {"name": f.stem, "filename": f.name, "content": f.read_text()}
        for f in sorted(PROMPTS_DIR.glob("*.txt"))
        if f.stem in _ALLOWED_PROMPT_NAMES
    ]


@app.get("/prompts/{name}", dependencies=[AUTH])
def get_prompt(name: str):
    path = _prompt_path(name)
    if not path.exists():
        raise HTTPException(404, "Prompt not found")
    return {"name": name, "filename": path.name, "content": path.read_text()}


@app.put("/prompts/{name}", dependencies=[AUTH])
def update_prompt(name: str, update: PromptUpdate):
    path = _prompt_path(name)
    if not path.exists():
        raise HTTPException(404, "Prompt not found")
    if len(update.content) > 20_000:
        raise HTTPException(413, "Prompt too large")
    path.write_text(update.content)
    log_event("api", f"Prompt '{name}' updated via dashboard")
    return {"name": name, "saved": True}


def _email_to_dict(e: Email) -> dict:
    return {
        "id": e.id, "gmail_id": e.gmail_id, "sender": e.sender, "subject": e.subject,
        "category": e.category, "priority": e.priority,
        "importance_score": e.importance_score, "processed": e.processed,
        "auto_action": e.auto_action, "received_at": e.received_at.isoformat(),
        "needs_manual_review": e.needs_manual_review,
    }


def _draft_to_dict(d: Draft) -> dict:
    return {
        "id": d.id, "email_id": d.email_id, "reply_subject": d.reply_subject,
        "reply_body": d.reply_body, "confidence": d.confidence,
        "reasoning": d.reasoning, "status": d.status,
    }
