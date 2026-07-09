# SYJ Mail Intelligence AI

Local-first AI email intelligence: classification, prioritization, summarization, and reply generation, running entirely on infrastructure you control.

![Backend](https://img.shields.io/badge/backend-feature%20complete-2EA44F?style=flat-square)
![Frontend](https://img.shields.io/badge/frontend-beta-F59E0B?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-1F2A44?style=flat-square)
![Platform](https://img.shields.io/badge/built%20on-Termux%20%2F%20Android-7C3AED?style=flat-square)

Built by [Syed Ali Hasan Moosavi](#author) — [Sayanjali Nexus](#about-sayanjali-nexus)

---

## Why this exists

Most "AI inbox" tools route email through a third-party cloud model. This doesn't. Classification, importance scoring, summarization, and reply drafting all run locally through Ollama — the content of your email never leaves your own infrastructure. On top of that local reasoning pipeline sits a REST API and a dashboard: Gmail in, structured intelligence and drafted replies out, gated by a deterministic approval workflow that decides what gets auto-sent, drafted for review, or escalated to a human.

The entire system — backend, prompts, regression harness, and dashboard — is designed and built on an Android phone running Termux, with no desktop or cloud IDE in the loop. That constraint shaped the architecture: lightweight local models, a fast local SQLite store, and a pipeline that fails safe at every stage rather than assuming an always-on desktop environment.

---

## What's inside

### AI email classification
Each email is sorted into one of 22 business-relevant categories (`Urgent`, `Important`, `Client`, `Finance`, `Invoice`, `HR`, `Support Ticket`, `Security Alert`, `Phishing`, `Meeting`, and others), using a prompt tuned to avoid the most common classifier failure mode: mistaking urgency-flavored marketing language for genuine urgency.

### Importance scoring
A 1–100 importance score with plain-English reasoning and automatic deadline detection, normalized so malformed model output (stray `"null"` strings, non-English text) never reaches the database.

### AI summarization
One-line and detailed summaries, extracted action items, requested tasks, and detected deadlines — generated for every email that isn't auto-archived.

### AI reply generation
- Writing-style-aware draft generation via a local LLM
- Per-draft confidence scoring
- Echo prevention: a similarity check compares each generated reply against the source email; a paraphrased or echoed response triggers one regeneration with a stricter prompt before falling back to a safe, professional template
- Every path terminates in a safe, non-empty reply

### Approval workflow
Three configurable confidence thresholds route every drafted reply:
- **Auto-send** — high-confidence replies go out immediately
- **Gmail draft** — mid-confidence replies are created as Gmail drafts pending one-click approval
- **Manual review** — lower-confidence replies stay in the dashboard for editing

### Gmail integration
Polling, thread detection, draft creation, auto-reply sending, archiving, and read-state management via the Gmail API.

### Notifications
Telegram is live today. The notification layer is channel-agnostic and built to extend to Slack, Discord, Microsoft Teams, email, and generic webhooks.

### Dashboard (beta)
A Next.js 14 executive dashboard now sits on the FastAPI backend, authenticated via JWT with HTTP-only cookies and protected middleware:
- Inbox with live polling, priority badges, and category labels
- Email detail view with AI summaries, reasoning, and suggested replies
- Manual review and draft approval queues
- Contact intelligence, analytics, notification history, prompt editor, settings, and system logs

### REST API
A FastAPI backend exposing emails, drafts, contacts, notifications, analytics, logs, settings, and live prompt management — the same API the dashboard consumes.

---

## Architecture

```
                     Gmail Inbox
                          │
                          ▼
                   Gmail Poller
                          │
                          ▼
                  process_email()
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
 Classification      Importance       Summarization
        │                 │                 │
        └────────────┬────┴─────────────────┘
                      ▼
              SQLite Database
                      │
                      ▼
             Reply Generation
           (similarity-checked,
          regenerate-or-fallback)
                      │
                      ▼
         Approval Decision Engine
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
 Auto Send      Gmail Draft     Manual Review
                      │
                      ▼
             Notification System
                      │
                      ▼
            FastAPI REST Backend
                      │
                      ▼
      Next.js Dashboard (JWT-authenticated)
```

Every AI stage is wrapped in its own try/except. A failure in classification, importance scoring, summarization, or reply generation never drops the email or crashes the pipeline — it falls back to a safe default, flags the email for manual review, and logs the specific failure reason.

---

## Safety mechanisms

| Mechanism | What it prevents |
|---|---|
| Reply similarity detection | The model echoing or paraphrasing the incoming email instead of responding to it |
| Regenerate-then-fallback | One retry with a stricter prompt before falling back to a safe template |
| Deadline/null normalization | Inconsistent model output corrupting stored data |
| English-only enforcement | The model drifting into another language mid-response |
| `needs_manual_review` flagging | AI failures going unnoticed — every failure is logged and surfaced |
| Provider fallback | A single model outage taking down the pipeline (Qwen 14B → Qwen 7B) |
| JWT + HTTP-only cookies | Session hijacking and token exposure to client-side scripts |
| Server-side API proxy | Direct client exposure of the backend |

---

## Technology stack

**Backend** — Python 3.13+, FastAPI, SQLAlchemy, SQLite, Alembic, Uvicorn
**AI** — Ollama, Qwen2.5 14B (primary), Qwen2.5 7B (fallback)
**Frontend** — Next.js 14.2.35, React 18.3.1, TypeScript 5.6, Tailwind CSS, Lucide Icons
**Auth** — JWT (HTTP-only cookies), Google OAuth (Gmail)
**Notifications** — Telegram Bot API

---

## Project structure

```
app/
    ai/             # classifier, importance scorer, summarizer, reply generator
    api/            # FastAPI routes
    core/           # database, logger, models, time utils
    gmail/          # Gmail client, polling
    notifications/  # Telegram + notification abstraction
    workflows/      # process_email() pipeline orchestration

config/
    prompts/        # classify.txt, importance.txt, reply.txt — hot-reloaded, no restart needed
    config.py       # thresholds, categories, auto-handling rules

dashboard/          # Next.js frontend (JWT auth, executive UI)
tests/
scripts/
deploy/
data/
migrations/
```

---

## Installation (Termux / Android)

Backend development is native to Termux — no emulator or desktop required.

```bash
pkg update && pkg upgrade
pkg install python git clang rust sqlite nodejs build-essential
```

```bash
git clone <YOUR_REPOSITORY_URL>
cd syj-mail-intelligence-ai
```

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-termux.txt
```

Install Ollama for your platform, then pull the models:

```bash
ollama pull qwen2.5:14b
ollama pull qwen2.5:7b
```

**Gmail credentials** — place `credentials.json` and `token.json` in the project root (see Google Cloud Console for OAuth setup).

**Environment variables** — copy `.env.example` to `.env` and configure:

```env
ENVIRONMENT=development
DATABASE_URL=sqlite:///./data/syj_mail.db

LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
LLM_MODEL=qwen2.5:14b
LLM_FALLBACK_MODEL=qwen2.5:7b
LLM_TIMEOUT_SECONDS=60

AUTO_SEND_THRESHOLD=95
APPROVAL_THRESHOLD=80
IMPORTANCE_NOTIFY_THRESHOLD=70

GMAIL_CREDENTIALS_FILE=credentials.json
GMAIL_TOKEN_FILE=token.json
GMAIL_POLL_INTERVAL_SECONDS=60
GMAIL_USER_EMAIL=me

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

JWT_SECRET=
JWT_EXPIRY_MINUTES=60

API_HOST=0.0.0.0
API_PORT=8000
API_KEY=
CORS_ALLOW_ORIGINS=http://localhost:3000
RATE_LIMIT_PER_MINUTE=30
```

> `API_KEY` and `JWT_SECRET` are required in production — the app refuses to start with `ENVIRONMENT=production` and either unset, since this backend can send email and expose dashboard sessions on your behalf.

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

> Local production builds (`next build`) are not currently supported on Android/Termux — the required SWC binary isn't available for `android/arm64`. `npx tsc --noEmit` and `next dev` work fine in Termux; run `next build` on Vercel, Linux, GitHub Actions, Railway, Docker, or WSL2.

---

## Running the backend

```bash
python main.py
# or
uvicorn app.api.main:app --reload
```

Health check: `GET /health`

---

## Testing

```bash
pytest                                        # full suite
pytest tests/test_pipeline_resilience.py      # a specific test
```

### Regression suite

A 28-case regression suite validates classification accuracy, importance scoring, echo detection, similarity protection, and approval routing against representative real-world email types (critical outages, invoices, support tickets, GitHub notifications, marketing, personal mail, spam/phishing):

```bash
python run_regression.py
```

Results are written to a spreadsheet — classification accuracy, priority accuracy, reply quality, echo rate, and fallback rate are tracked against explicit targets before any release is considered production-ready.

---

## API reference

```
GET     /health
GET     /ready

POST    /auth/login
POST    /auth/logout

GET     /emails
GET     /emails/{id}
GET     /emails/important

GET     /drafts
GET     /drafts/pending
POST    /drafts/{id}/approve
POST    /drafts/{id}/reject

GET     /notifications
GET     /contacts
GET     /logs

GET     /analytics/summary

GET     /settings

GET     /prompts
GET     /prompts/{name}
PUT     /prompts/{name}
```

---

## Deployment

| Component | Recommended |
|---|---|
| Backend | Railway, VPS, Docker, Ubuntu Server |
| Dashboard | Vercel |
| AI inference | Local/self-hosted Ollama |
| Database | SQLite (dev) → PostgreSQL (planned) |

---

## Current status

**Backend** — feature complete, regression tested, prompt-hardened (echo prevention, false-urgency correction, English enforcement), approval workflow, Gmail integration, REST API.

**Dashboard** — beta. JWT authentication, protected routing, inbox, email detail view, manual review queue, draft approval, notifications, contacts, analytics, prompt management, settings, and logs are implemented and TypeScript-verified. No automated frontend test suite yet; end-to-end testing and performance tuning are planned ahead of v1.0.0.

**Current release:** `v1.0.0-beta1`

### Roadmap

- **v1.0.0** — production deployment, end-to-end testing, performance tuning, security review
- **v1.1.0** — editable reply drafts, retry workflow, prompt testing, dashboard charts
- **v1.2.0** — multi-user support, RBAC, user management
- **v2.0.0** — multi-tenant SaaS, org workspaces, API integrations

---

## Author

**Syed Ali Hasan Moosavi**
Founder & Managing Director, Sayanjali Nexus Private Limited — Hyderabad, Telangana, India

Full-stack builder and AI automation specialist working with SMEs, hospitals, logistics firms, and Gulf-based enterprises. Fluent in English, Urdu, Hindi, Telugu, and Arabic, with work experience across India, Qatar, and Saudi Arabia. Certified in AI Fundamentals (IBM SkillsBuild) and Claude 101 / AI Fluency (Anthropic).

Every part of this project — backend, prompts, regression harness, and dashboard — is built and shipped from an Android device running Termux.

### About Sayanjali Nexus

SYJ Mail Intelligence AI is one product in a wider ecosystem under Sayanjali Nexus, including:

- **NexusRank AI** — SEO/AEO/GEO ranking intelligence
- **Sayanjali OSINT** — unified CLI geolocation intelligence tool
- **SYJ Scholar AI** — Akhbari Shia hadith research platform with multilingual support
- **SYJ ONE** — unified project/brand hub
- **AI Zara Web Widget** — embeddable conversational AI widget
- **SYJ GitHub Optimizer** — GitHub profile and repo automation (Node.js / Octokit)
- **Sayanjali Cyberdeck** — terminal-style security dashboard (Python/Textual + React)

Client and family-business work under the same builder includes systems for M K Enterprises, Ace Livestock Farms, Alison Holidays, and Moosavi Farming.

---

## License

MIT License — see `LICENSE`.

---

## Contact

For collaboration or freelance systems work, reach out through the Sayanjali Nexus channels linked from the author's portfolio.
