"""
Central configuration. Everything model- or threshold-related lives here so
swapping an LLM provider or changing approval thresholds never requires
touching pipeline logic.
"""
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


def _int(name: str, default: int) -> int:
    return int(os.getenv(name, default))


@dataclass(frozen=True)
class Settings:
    # Environment: "development" or "production". In production, API_KEY is
    # mandatory and every request (except /health) must present it.
    environment: str = os.getenv("ENVIRONMENT", "development")

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/syj_mail.db")

    # LLM
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    llm_model: str = os.getenv("LLM_MODEL", "qwen2.5:14b")
    llm_fallback_model: str = os.getenv("LLM_FALLBACK_MODEL", "qwen2.5:7b")
    llm_timeout_seconds: int = _int("LLM_TIMEOUT_SECONDS", 60)

    # Approval workflow thresholds (percent)
    auto_send_threshold: int = _int("AUTO_SEND_THRESHOLD", 95)
    approval_threshold: int = _int("APPROVAL_THRESHOLD", 80)
    importance_notify_threshold: int = _int("IMPORTANCE_NOTIFY_THRESHOLD", 70)

    # Gmail
    gmail_credentials_file: str = os.getenv("GMAIL_CREDENTIALS_FILE", "credentials.json")
    gmail_token_file: str = os.getenv("GMAIL_TOKEN_FILE", "token.json")
    gmail_poll_interval_seconds: int = _int("GMAIL_POLL_INTERVAL_SECONDS", 60)
    gmail_user_email: str = os.getenv("GMAIL_USER_EMAIL", "me")

    # Telegram
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # API
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = _int("API_PORT", 8000)

    # Security — API_KEY protects every route except /health. Generate one
    # with: python -c "import secrets; print(secrets.token_urlsafe(32))"
    api_key: str = os.getenv("API_KEY", "")
    # Comma-separated list of browser origins allowed to call this API
    # directly (cross-origin). The dashboard's own server-side proxy doesn't
    # need this — it calls the backend server-to-server, no browser CORS
    # involved. This only matters if something else calls the API from a
    # browser context.
    cors_allow_origins: tuple = tuple(
        o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000").split(",") if o.strip()
    )
    # Requests per minute per client IP for sensitive endpoints (approve/reject/send)
    rate_limit_per_minute: int = _int("RATE_LIMIT_PER_MINUTE", 30)


settings = Settings()

if settings.environment == "production" and not settings.api_key:
    raise RuntimeError(
        "ENVIRONMENT=production requires API_KEY to be set in .env — generate one with:\n"
        '  python -c "import secrets; print(secrets.token_urlsafe(32))"\n'
        "This backend can send email on your behalf; it must not be reachable without a key."
    )

CATEGORIES = [
    "Urgent", "Important", "Client", "Business", "Personal", "Finance",
    "Invoice", "Payment", "HR", "Marketing", "Promotion", "Newsletter",
    "Spam", "Scam", "Phishing", "Social", "Job Opportunity", "Meeting",
    "Support Ticket", "GitHub", "Security Alert", "Other",
]

# category -> default auto-handling rule (spec: "Auto Reply Rules")
AUTO_RULES = {
    "Newsletter": "archive",
    "Promotion": "ignore",
    "GitHub": "summarize_only",
    "Invoice": "notify_immediately",
    "Payment": "archive_after_summary",
    "Spam": "ignore",
    "Scam": "ignore",
    "Phishing": "ignore",
}

TONES = [
    "Professional", "Friendly", "Formal", "Casual",
    "Technical", "Customer Support", "Executive",
]
