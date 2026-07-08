# SYJ Mail Intelligence AI

Autonomous AI email assistant for Gmail. Classifies incoming mail, scores importance,
notifies you instantly, drafts replies in your writing style, and auto-sends only
above a configurable confidence threshold. Model-agnostic (no OpenAI GPT) — runs
against local open-weight models via **Ollama** (DeepSeek V3/R1, Qwen 3, Qwen Coder,
Mistral, Llama 3) with the provider swappable through config.

## Where this stands

- **Phase 1** ✅ — core pipeline: Gmail polling, classification, importance
  scoring, Telegram notifications, style-learned reply drafting, the 95/80%
  approval workflow. Termux-runnable, SQLite by default.
- **Phase 2** ✅ — Next.js dashboard: Inbox, Important, Approval Queue,
  Notifications, Analytics, Contacts, Prompt Editor, Logs, Settings. See
  `dashboard/README.md`.
- **Phase 3** ✅ — production hardening: API-key auth on every route, a
  server-side dashboard proxy so the key never reaches the browser, rate
  limiting, Postgres + Alembic migrations, Docker Compose + Nginx/HTTPS, a
  non-Docker systemd path, GitHub Actions CI, and a pytest suite — tested
  against a live Postgres instance and a live Docker-equivalent run while
  building it, not just written and hoped for.
- **Phase 3.1** ✅ — audit-driven reliability pass: Gmail is no longer a
  hard dependency to start (the API/dashboard work fully with zero Gmail
  credentials — verified live), the poller reconnects with capped backoff
  instead of crashing, a single `GET /ready` endpoint reports real DB+Gmail
  readiness, the AI provider is a true singleton reusing one persistent
  HTTP connection instead of opening a new one per call, prompt edits from
  the dashboard now actually take effect without a restart (they didn't
  before — the old code read prompt files once at import time), a failing
  AI call at any pipeline stage degrades to safe defaults and flags the
  email `needs_manual_review` instead of losing it or crashing the poll
  cycle (visible in the dashboard Inbox), and Telegram notifications escape
  Markdown special characters instead of silently failing to send. All of
  this is covered by `tests/test_pipeline_resilience.py` and
  `tests/test_provider_singleton.py`, and the Gmail-optional startup was
  verified by actually running `main.py` with credentials.json removed.
- **Not yet built**: RAG over past sent emails, Redis/Celery for
  higher-throughput async processing, multi-Gmail-account support,
  WhatsApp/Slack/Discord notification channels, a live Model Manager UI
  (today `LLM_MODEL` is `.env` + restart, not dashboard-editable).

## Architecture

```
Gmail API (OAuth2) --poll--> poller.py --> pipeline.py
                                              |
                    +-------------------------+-------------------------+
                    |                         |                         |
              classifier.py            importance score           summarizer.py
              (category, priority,      (1-100, sender rep,       (1-line, short,
               confidence, reason)       keywords, thread          detailed, action
                    |                     history, deadlines)       items, deadlines)
                    +-------------------------+-------------------------+
                                              |
                                     reply_generator.py
                                     (style_learner.py profile
                                      + tone selection)
                                              |
                          confidence >=95%  |  80-94%  |  <80%
                          auto-send via     |  notify  |  draft
                          Gmail API         |  + ask   |  only,
                                            |  approval|  no send
                                              |
                                     notifications/telegram.py
                                     (sender, subject, AI summary,
                                      priority, suggested reply)
```

Dashboard requests never hit the backend directly from the browser — they go
`browser → dashboard's own /api/backend/* proxy (attaches the key server-side)
→ FastAPI (verifies the key) → Postgres/SQLite`. See "Security" below.

## Quick start (local development, SQLite, no auth)

```bash
git clone https://github.com/SHalimoosavi/syj-mail-intelligence-ai.git
cd syj-mail-intelligence-ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # defaults are fine for local dev

python -m app.gmail.auth    # one-time OAuth2 flow (needs credentials.json — see below)
python main.py              # starts the poller + API on :8000

# in another terminal
cd dashboard
npm install
cp .env.local.example .env.local
npm run dev                 # dashboard on :3000
```

`credentials.json`: Google Cloud Console → APIs & Services → Credentials →
Create OAuth client ID → Desktop app → download → place in project root.

### Running in Termux

```bash
pkg update && pkg upgrade -y
pkg install python git nodejs -y
bash scripts/setup_termux.sh
```
Then follow the same steps as Quick Start above. Point `OLLAMA_HOST` at a
LAN/Tailscale machine if your phone can't run a 7B+ model itself — most
people do this, since Android backgrounding also means Termux isn't suitable
for true 24/7 operation anyway (see Deployment below for that).

## Making it production-ready — step by step

This is the checklist this update actually implements, in the order you'd do it:

### 1. Generate an API key and turn on production mode

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
Put the output in `.env` as `API_KEY=...` and set `ENVIRONMENT=production`.
Without this, **the backend refuses to start** (see `config/config.py`) — it
can send email on your behalf, so it must never be reachable unauthenticated.
Put the same key in `dashboard/.env.local` as `BACKEND_API_KEY` — the browser
never sees it; only the dashboard's own server does (`app/api/backend/[...path]/route.ts`).

### 2. Move to Postgres

```bash
# create a database, then:
DATABASE_URL=postgresql://user:pass@host/dbname
alembic upgrade head
```
`migrations/` contains the initial schema, generated and tested against a
real Postgres 16 instance. Run `alembic upgrade head` on every deploy after a
model change (`app/core/models.py`), then `alembic revision --autogenerate -m
"describe the change"` to create the next migration.

### 3. Deploy — pick one

- **Docker Compose** (`deploy/README.md`) — Postgres + backend + dashboard +
  nginx in one `docker compose up -d`, with HTTPS via certbot.
- **systemd, no Docker** (`deploy/README-systemd.md`) — same result, managed
  as three systemd units instead of containers.

Both configure Nginx as the public entry point; neither exposes FastAPI or
Postgres directly to the internet.

### 4. Set up CI

`.github/workflows/ci.yml` runs on every push: backend tests against a real
Postgres service container, Alembic migration check, and a full dashboard
`npm run build`. Nothing merges if any of those fail.

### 5. Log retention

`scripts/prune_logs.py` deletes `logs` table rows older than N days (default
30). Both deploy paths install it as a weekly job (systemd timer or your own
cron in the Docker case — see `deploy/README.md`).

## Security

- **Every route requires `X-API-Key` except `/health`** (`app/core/auth.py`).
  In development with no key set, requests are allowed through with a loud
  warning; in production, a missing/wrong key is a 401 and the app won't even
  boot without a key configured.
- **The dashboard never exposes the key to the browser.** `lib/api.ts` calls
  its own `/api/backend/*` route, which is a Next.js server-side handler that
  attaches `BACKEND_API_KEY` (no `NEXT_PUBLIC_` prefix, never bundled to
  client JS) before forwarding to FastAPI.
- **CORS** is locked to `CORS_ALLOW_ORIGINS` (default `http://localhost:3000`)
  — irrelevant to the dashboard itself (server-to-server, no browser CORS),
  only matters if you build another browser-based client against this API.
- **Rate limiting**: `/drafts/{id}/approve` and `/drafts/{id}/reject` are
  capped at `RATE_LIMIT_PER_MINUTE` (default 30) per client IP via `slowapi`.
- **Path-traversal-safe prompt routes**: `/prompts/{name}` only accepts the
  four known prompt names, never an arbitrary filesystem path.
- **Postgres isolated on an internal Docker network** — not reachable from
  outside the compose stack at all (see `docker-compose.yml`'s `internal`
  network).
- OAuth2 token cached locally (`token.json`), never committed. `.env` never
  committed. No plaintext Gmail password anywhere — Gmail API is OAuth2-only.
- Recommend: `chmod 600 .env token.json credentials.json` on any host.

## Health vs. readiness

- `GET /health` — liveness only, unauthenticated. "Is the process running."
- `GET /ready` — readiness, unauthenticated. Checks the database with a real
  query and reports Gmail's connection state (`app/core/status.py`). Returns
  503 if the database is unreachable; Gmail being disconnected is reported
  but doesn't fail readiness, since the dashboard and all read endpoints work
  fine without it — only live mail processing needs Gmail. Use `/ready` for
  Docker/systemd health checks and load balancer probes; use `/health` only
  where you specifically want "process alive" with no DB round-trip.

## Testing

```bash
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v
```
19 tests: approval-threshold logic (auto-send vs. approval-queue vs.
draft-only, including the exact boundary), API-key enforcement end-to-end,
AI-provider singleton behavior, per-stage AI failure isolation in the
pipeline, and Telegram Markdown escaping. Runs against SQLite locally by
default, against real Postgres in CI (and was run against both while
building this).

## Configuration — model swapping

```
LLM_PROVIDER=ollama
LLM_MODEL=deepseek-r1:14b        # or qwen2.5:14b, qwen2.5-coder:14b, mistral, llama3.1
LLM_FALLBACK_MODEL=qwen2.5:7b    # used if primary model errors/times out
```

## Approval workflow (per spec)

| Confidence | Action |
|---|---|
| ≥ 95% | Auto-send reply via Gmail API |
| 80–94% | Draft created, Telegram approval request sent, waits for your review in the dashboard |
| < 80% | Draft only, saved to `drafts` table, never sent, never touches Gmail |

Enforced in plain Python in `app/workflows/pipeline.py::_handle_reply_confidence`
— not just prompted — so a model misreporting its own confidence can't bypass
it. Covered by `tests/test_approval_thresholds.py`.

## Roadmap beyond this

1. RAG over past sent emails (`sqlite-vec` or Chroma, embeddings via Ollama —
   no OpenAI)
2. Redis + Celery for real async/concurrent processing at higher volume
3. Multi-Gmail-account support
4. WhatsApp/Slack/Discord/Desktop notification channels
5. Live Model Manager in the dashboard (swap `LLM_MODEL` without `.env` + restart)

## License

MIT — this is your project, SAYANJALI NEXUS.
