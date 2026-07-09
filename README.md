# SYJ Mail Intelligence AI

**Local-first AI email intelligence — classification, prioritization, summarization, and reply generation, running entirely on your own infrastructure.**

![Status](https://img.shields.io/badge/backend-feature%20complete-F59E0B?style=flat-square)
![Status](https://img.shields.io/badge/frontend-in%20development-7C3AED?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-1F2A44?style=flat-square)
![Made with](https://img.shields.io/badge/built%20on-Termux%20%2F%20Android-F59E0B?style=flat-square)

Built by **[Syed Ali Hasan Moosavi](#author)** — [SAYANJALI NEXUS](#about-sayanjali-nexus)

---

## Why this exists

Most "AI inbox" tools route your email through someone else's cloud model. SYJ Mail Intelligence AI doesn't. Every classification, every importance score, every summary, and every drafted reply is generated locally through Ollama — nothing about the *content* of your email leaves your own infrastructure. What you get instead is a REST API and dashboard layer sitting on top of a fully local reasoning pipeline: Gmail in, structured intelligence and drafted replies out, with a deterministic approval workflow deciding what gets auto-sent, drafted for review, or escalated to you.

It was designed, built, and hardened entirely on an Android phone running Termux — no desktop, no cloud IDE. That constraint shaped the architecture: lightweight local models, a fast local SQLite store, and a pipeline that fails safe at every stage rather than assuming a always-on desktop environment.

---

## What's inside

### AI Email Classification
Every email is sorted into one of 22 business-relevant categories — `Urgent`, `Important`, `Client`, `Business`, `Personal`, `Finance`, `Invoice`, `Payment`, `HR`, `Marketing`, `Promotion`, `Newsletter`, `Support Ticket`, `GitHub`, `Security Alert`, `Job Opportunity`, `Social`, `Spam`, `Scam`, `Phishing`, `Meeting`, `Other` — using a prompt tuned specifically to avoid the most common failure mode of LLM classifiers: mistaking urgency-flavored *language* (marketing copy, "act now") for genuine urgency.

### Importance Scoring
Every email gets a 1–100 importance score, plain-English reasoning, and automatic deadline detection — normalized so malformed or inconsistent model output (stray `"null"` strings, non-English responses) never reaches the database.

### AI Summarization
One-line summary, short summary, detailed summary, extracted action items, requested tasks, and detected deadlines — generated for every email that isn't auto-archived or ignored.

### AI Reply Generation
- Writing-style-aware draft generation via a local LLM
- Confidence scoring per draft
- **Echo prevention**: a similarity check compares every generated reply against the original email; if the model paraphrases or echoes the sender instead of responding, it automatically regenerates once with a stricter instruction before falling back to a safe, professional template
- Never returns an empty or malformed reply — every path terminates in something safe to show a human

### Approval Workflow
Three configurable confidence thresholds decide what happens to every drafted reply:
- **Auto-send** — high-confidence replies go out immediately
- **Gmail draft** — mid-confidence replies are created as Gmail drafts awaiting one-click approval
- **Local review only** — lower-confidence replies stay in the dashboard for manual editing

### Gmail Integration
Polling, thread detection, draft creation, auto-reply sending, archiving, and read-state management — all through the Gmail API.

### Notifications
Telegram is live today; the notification layer is channel-agnostic and built to extend to Slack, Discord, Microsoft Teams, email, and generic webhooks.

### REST API
A FastAPI backend exposing emails, drafts, contacts, notifications, analytics, logs, settings, and live prompt management — the same API the upcoming Next.js dashboard consumes.

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
          Next.js Executive Dashboard
```

Every AI stage is wrapped in its own try/except. A failure in classification, importance scoring, summarization, or reply generation never loses the email or crashes the pipeline — it falls back to a safe default and flags the email for manual review, with the specific failure reason logged.

---

## Safety features

| Mechanism | What it prevents |
|---|---|
| **Reply similarity detection** | The AI echoing/paraphrasing the incoming email instead of responding to it |
| **Regenerate-then-fallback** | One retry with a stricter prompt before falling back to a safe template |
| **Deadline/null normalization** | Inconsistent model output (`"null"` string vs real `null`) corrupting stored data |
| **English-only enforcement** | The model drifting into another language mid-JSON-response |
| **`needs_manual_review` flagging** | Any AI failure silently going unnoticed — every failure is logged and surfaced |
| **Provider fallback** | A single model outage taking down the whole pipeline (Qwen 14B → Qwen 7B) |

---

## Technology stack

**Backend** — Python 3.13+, FastAPI, SQLAlchemy, SQLite, Alembic, Uvicorn
**AI** — Ollama, Qwen2.5 14B (primary), Qwen2.5 7B (fallback)
**Frontend** — Next.js, React, Tailwind CSS, shadcn/ui, Recharts, TanStack Table/Query
**Notifications** — Telegram Bot API
**Auth** — Google OAuth (Gmail)

---

## Project structure

```
app/
    ai/            # classifier, importance scorer, summarizer, reply generator
    api/           # FastAPI routes
    core/          # database, logger, models, time utils
    gmail/         # Gmail client, polling
    notifications/ # Telegram + notification abstraction
    workflows/      # process_email() pipeline orchestration

config/
    prompts/       # classify.txt, importance.txt, reply.txt — hot-reloaded, no restart needed
    config.py      # thresholds, categories, auto-handling rules

dashboard/         # Next.js frontend (in development)
tests/
scripts/
deploy/
data/
migrations/
```

---

## Installation (Termux / Android)

This project is developed and tested natively on Android via Termux — no emulator, no desktop required for backend work.

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

**Install Ollama** for your platform, then pull the models:

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

API_HOST=0.0.0.0
API_PORT=8000
API_KEY=
CORS_ALLOW_ORIGINS=http://localhost:3000
RATE_LIMIT_PER_MINUTE=30
```

> `API_KEY` is required in production — the app refuses to start with `ENVIRONMENT=production` and no key set, since this backend can send email on your behalf.

---

## Running it

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

Results are written to a spreadsheet for review — classification accuracy, priority accuracy, reply quality, echo rate, and fallback rate are tracked against explicit targets before any release is considered production-ready.

---

## API reference

```
GET     /health
GET     /ready

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

**Backend** — ✅ Feature complete · ✅ Regression tested · ✅ Prompt-hardened (echo prevention, false-urgency correction, English enforcement) · ✅ Approval workflow · ✅ Gmail integration · ✅ REST API

**Frontend** — 🚧 Executive dashboard in active development (Next.js — KPI dashboard, Gmail-style inbox, AI-assisted email detail view, manual review queue, prompt studio, analytics, regression center)

**Current release:** `v1.0.0-backend`

---

## Author

**Syed Ali Hasan Moosavi**
Founder & Managing Director, SAYANJALI NEXUS PRIVATE LIMITED — Hyderabad, Telangana, India

Full-stack builder, AI automation specialist, and freelance Enterprise Systems Architect serving SMEs, hospitals, logistics firms, and Gulf-based enterprises. Fluent in English, Urdu, Hindi, Telugu, and Arabic, with international work experience across India, Qatar, and Saudi Arabia. Certified in AI Fundamentals (IBM SkillsBuild) and Claude 101 / AI Fluency (Anthropic).

Every line of this project — backend, prompts, regression harness, and dashboard — is designed, written, and shipped from an Android device running Termux. That's not a limitation this project works around; it's the point.

### About SAYANJALI NEXUS

SYJ Mail Intelligence AI is one product in a wider open-source and commercial ecosystem under SAYANJALI NEXUS, including:

- **NexusRank AI** — SEO/AEO/GEO ranking intelligence
- **SAYANJALI OSINT** — unified CLI geolocation intelligence tool
- **SYJ Scholar AI** — Akhbari Shia hadith research platform ("Sayanjali: Wisdom of the 14") with strict theological constraints and multilingual support
- **SYJ ONE** — unified project/brand hub
- **AI Zara Web Widget** — embeddable conversational AI widget
- **SYJ GitHub Optimizer** — Node.js/Octokit-based GitHub profile and repo automation
- **SYJ Token** — planned utility payment layer across SAYANJALI business verticals on the forthcoming SAYANJALI Blockchain
- **SAYANJALI CYBERDECK** — terminal-style security dashboard (Python/Textual + React)

Client and family-business work under the same builder includes websites and systems for **M K Enterprises**, **Ace Livestock Farms**, **Alison Holidays**, and **Moosavi Farming**.

---

## License

MIT License — see `LICENSE`.

---

## Connect

Interested in the architecture, a collaboration, or freelance systems work? Reach out through the SAYANJALI NEXUS channels linked from the author's portfolio.
