<div align="center">

<img src="./assets/header-typing.svg" alt="SYJ Mail Intelligence AI" width="900"/>

# 📬 SYJ Mail Intelligence AI

### Autonomous AI Email Assistant for Gmail — Model-Agnostic · Self-Hosted · Production-Hardened

**Your inbox, triaged and drafted by AI that runs entirely on your own hardware — no OpenAI, no vendor lock-in, no API bill.**

[![Phase 1](https://img.shields.io/badge/Phase%201-Core%20Pipeline-brightgreen?style=flat-square)](#-where-this-stands)
[![Phase 2](https://img.shields.io/badge/Phase%202-Dashboard-brightgreen?style=flat-square)](#-where-this-stands)
[![Phase 3](https://img.shields.io/badge/Phase%203-Production%20Hardened-brightgreen?style=flat-square)](#-where-this-stands)
[![Phase 3.1](https://img.shields.io/badge/Phase%203.1-Reliability%20Pass-brightgreen?style=flat-square)](#-where-this-stands)
[![Tests](https://img.shields.io/badge/tests-19%20passing-2EA44F?style=flat-square)](#-testing)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#-license)
[![Platform](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Termux-7C3AED?style=flat-square)](#-quick-start)

[Features](#-what-this-is) • [Architecture](#️-architecture) • [Quick Start](#-quick-start) • [Production Guide](#️-making-it-production-ready) • [Security](#-security) • [Author](#-behind-the-code)

</div>

---

## 📖 What This Is

SYJ Mail Intelligence AI watches your Gmail inbox, **classifies** every message, **scores it for importance**, **summarizes** it, and **drafts a reply in your own writing style** — then auto-sends it only above a confidence threshold *you* control. Everything else waits for your one-tap approval.

It's **model-agnostic by design** — there's no OpenAI dependency anywhere in the stack. It runs entirely against local, open-weight models through [Ollama](https://ollama.com) (DeepSeek V3/R1, Qwen 3, Qwen Coder, Mistral, Llama 3), and swapping providers is a config change, not a code change.

This isn't a weekend script — it's shipped through four real phases (core pipeline → dashboard → production hardening → an audit-driven reliability pass), each tested against live infrastructure rather than assumed to work.

<div align="center">
<img src="./assets/stat-cards.svg" alt="Project stats" width="880"/>
</div>

> 🎬 **Demo:** drop a short screen recording at `assets/demo.gif` (1280×720, <10s, showing an email arriving → getting classified → a reply drafted) and reference it here as `![SYJ Mail Intelligence AI demo](./assets/demo.gif)`. Skipped in this README rather than linking a placeholder that doesn't exist yet.

---

## ✨ Key Features

- 🧠 **AI email classification** — 22 business-relevant categories (`Urgent`, `Client`, `Invoice`, `Security Alert`, `Phishing`, `Meeting`, and more), tuned to avoid the classic false-urgency trap of marketing copy
- 📊 **Importance scoring** — 1–100 score with plain-English reasoning and automatic deadline detection
- ✍️ **Style-aware reply generation** — drafts in *your* writing style, with echo/paraphrase detection that forces a stricter regeneration before ever falling back to a safe template
- ✅ **Confidence-gated approval workflow** — auto-send, Gmail draft, or manual review, decided in plain Python (not just prompted), so a model can't talk its way past your thresholds
- 📬 **Full Gmail integration** — polling, thread detection, draft creation, sending, archiving, read-state sync
- 🔔 **Telegram notifications** — with Markdown-escaping so special characters never silently break a message
- 🖥️ **Next.js dashboard** — inbox, approval queue, contact intelligence, analytics, live prompt editor, and system logs, JWT-authenticated end to end
- 🔐 **Production-grade security** — API-key auth on every route, a server-side proxy so the key never touches the browser, rate limiting, and Postgres isolated on an internal network
- 🧩 **Truly model-agnostic** — swap `LLM_MODEL` in `.env` to run DeepSeek, Qwen, Mistral, or Llama — zero code changes
- 📱 **Runs anywhere** — Windows, Linux, macOS, and natively in Termux on Android

---

## 🧭 Where This Stands

| Phase | Status | What Shipped |
|---|:---:|---|
| **Phase 1** | ✅ | Core pipeline — Gmail polling, classification, importance scoring, Telegram notifications, style-learned reply drafting, the 95%/80% approval workflow. Termux-runnable, SQLite by default. |
| **Phase 2** | ✅ | Next.js dashboard — Inbox, Important, Approval Queue, Notifications, Analytics, Contacts, Prompt Editor, Logs, Settings. |
| **Phase 3** | ✅ | Production hardening — API-key auth, server-side dashboard proxy, rate limiting, Postgres + Alembic, Docker Compose + Nginx/HTTPS, systemd path, GitHub Actions CI, pytest suite. |
| **Phase 3.1** | ✅ | Audit-driven reliability pass — see below. |

<details>
<summary><strong>🔍 What Phase 3.1 actually fixed</strong> (click to expand)</summary>
<br>

- Gmail is **no longer a hard dependency to start** — the API and dashboard run fully with zero Gmail credentials
- The poller **reconnects with capped backoff** instead of crashing outright
- A single `GET /ready` endpoint reports real DB + Gmail readiness
- The AI provider is a **true singleton**, reusing one persistent HTTP connection instead of one per call
- Prompt edits from the dashboard **take effect without a restart**
- A failing AI call at any stage **degrades to a safe default** and flags the email `needs_manual_review`
- Telegram notifications **escape Markdown special characters** instead of silently failing

Covered by `tests/test_pipeline_resilience.py` and `tests/test_provider_singleton.py`.
</details>

<details>
<summary><strong>🚧 Not yet built</strong> (by design, not by accident)</summary>
<br>

- RAG over past sent emails
- Redis/Celery for higher-throughput async processing
- Multi-Gmail-account support
- WhatsApp/Slack/Discord notification channels
- A live Model Manager UI (today: `.env` + restart)
</details>

---

## 🏗️ Architecture

```mermaid
flowchart TD
    A[📥 Gmail API<br/>OAuth2 Poller] -->|new message| B[⚙️ Pipeline Orchestrator]

    B --> C[🏷️ Classifier<br/>category · confidence · reason]
    B --> D[📊 Importance Scorer<br/>1-100 · sender rep · deadlines]
    B --> E[📝 Summarizer<br/>1-line · detailed · action items]

    C --> F[✍️ Reply Generator<br/>style profile + tone selection]
    D --> F
    E --> F

    F --> G{Confidence Router}
    G -->|"≥ 95%"| H[🚀 Auto-Send<br/>via Gmail API]
    G -->|"80–94%"| I[📋 Gmail Draft<br/>+ Telegram approval request]
    G -->|"< 80%"| J[🗂️ Manual Review<br/>dashboard only]

    H --> K[🔔 Telegram Notification]
    I --> K
    J --> K

    K --> L[(🗄️ Postgres / SQLite)]
    L --> M[🌐 FastAPI REST Backend]
    M --> N[🖥️ Next.js Dashboard<br/>JWT-authenticated]

    style A fill:#4285F4,color:#fff
    style H fill:#2EA44F,color:#fff
    style I fill:#F59E0B,color:#fff
    style J fill:#EF4444,color:#fff
    style N fill:#7C3AED,color:#fff
```

**Every AI stage runs in its own try/except.** A failure in classification, scoring, summarization, or reply generation never drops the email — it falls back to a safe default, flags the message for manual review, and logs the exact failure reason.

### Request flow (dashboard → backend)

```mermaid
sequenceDiagram
    participant Browser
    participant Dashboard as Next.js Server Proxy
    participant API as FastAPI Backend
    participant DB as Postgres / SQLite

    Browser->>Dashboard: Request (no API key attached)
    Dashboard->>API: Forwarded request + X-API-Key (server-side only)
    API->>API: Verify key
    API->>DB: Query
    DB-->>API: Result
    API-->>Dashboard: JSON response
    Dashboard-->>Browser: JSON response
```

The API key **never reaches client-side JavaScript** — see [Security](#-security) for why this matters.

---

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Alembic, Uvicorn |
| **AI / LLM** | Ollama — DeepSeek V3/R1, Qwen 2.5/3, Qwen Coder, Mistral, Llama 3 (fully swappable) |
| **Frontend** | Next.js 14+, React, TypeScript, Tailwind CSS |
| **Database** | SQLite (dev) → PostgreSQL + Alembic (production) |
| **Auth** | JWT (HTTP-only cookies) + API-key auth, Google OAuth2 (Gmail) |
| **Notifications** | Telegram Bot API |
| **Deployment** | Docker Compose + Nginx/HTTPS, or systemd (non-Docker), GitHub Actions CI |

---

## 📋 Requirements

| Requirement | Version / Notes |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ (for the dashboard) |
| Ollama | Latest — local LLM inference |
| RAM | 8 GB minimum · 16 GB+ recommended for 14B-class models |
| Disk | ~10 GB free for models |
| Gmail account | With API access enabled via Google Cloud Console |

---

## 🚀 Quick Start

*Local development — SQLite, no auth required.*

**1. Clone and set up the backend**

```bash
git clone https://github.com/SHalimoosavi/syj-mail-intelligence-ai.git
cd syj-mail-intelligence-ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

**2. Add Gmail credentials**

Go to Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID → Desktop app**, download the file, and place it in the project root as `credentials.json`.

**3. Run the one-time OAuth flow, then start the backend**

```bash
python -m app.gmail.auth    # one-time OAuth2 flow
python main.py              # starts the poller + API on :8000
```

**4. Start the dashboard** (in a second terminal)

```bash
cd dashboard
npm install
cp .env.local.example .env.local
npm run dev                 # dashboard on :3000
```

**5. Verify it's running**

```bash
curl http://localhost:8000/health
```

You should get a `200 OK`. Open `http://localhost:3000` for the dashboard.

<details>
<summary><strong>📱 Running in Termux (Android)</strong></summary>
<br>

```bash
pkg update && pkg upgrade -y
pkg install python git nodejs -y
bash scripts/setup_termux.sh
```

Then follow the same steps as Quick Start above. If your phone can't comfortably run a 7B+ model, point `OLLAMA_HOST` at a LAN or Tailscale machine — most people do this, since Android backgrounding also makes Termux unsuitable for true 24/7 operation. See [Making It Production-Ready](#️-making-it-production-ready) for a proper deployment path.

> **Note:** `next build` isn't currently supported on Android/Termux (the SWC binary isn't available for `android/arm64`). `next dev` and `npx tsc --noEmit` both work fine — run `next build` on Vercel, GitHub Actions, Docker, or WSL2.
</details>

---

## 🛠️ Making It Production-Ready

A step-by-step checklist, in the order you'd actually run it.

### 1️⃣ Generate an API key and enable production mode

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Put the output in `.env` as `API_KEY=...` and set `ENVIRONMENT=production`. Without this, **the backend refuses to start** — since it can send email on your behalf, it must never be reachable unauthenticated. Add the same key to `dashboard/.env.local` as `BACKEND_API_KEY`; the browser never sees it, only the dashboard's own server-side proxy does.

### 2️⃣ Move to Postgres

```bash
# create a database, then:
DATABASE_URL=postgresql://user:pass@host/dbname
alembic upgrade head
```

Run `alembic upgrade head` on every deploy after a model change, and `alembic revision --autogenerate -m "describe the change"` to create the next migration.

### 3️⃣ Deploy — pick one

| Option | Best for |
|---|---|
| 🐳 **Docker Compose** (`deploy/README.md`) | Postgres + backend + dashboard + Nginx in one `docker compose up -d`, HTTPS via Certbot |
| ⚙️ **systemd, no Docker** (`deploy/README-systemd.md`) | Same result, managed as three systemd units |

Both put Nginx as the public entry point; neither exposes FastAPI or Postgres directly to the internet.

### 4️⃣ Set up CI

`.github/workflows/ci.yml` runs on every push: backend tests against a real Postgres service container, an Alembic migration check, and a full dashboard `npm run build`. Nothing merges if any of those fail.

### 5️⃣ Configure log retention

`scripts/prune_logs.py` prunes `logs` table rows older than N days (default 30). Both deploy paths install it as a scheduled job.

---

## 🔒 Security

| Mechanism | What It Prevents |
|---|---|
| `X-API-Key` required on every route except `/health` | Unauthenticated access to a service that can send email on your behalf |
| Server-side dashboard proxy (`BACKEND_API_KEY`, never `NEXT_PUBLIC_`) | The API key ever reaching client-side JavaScript |
| CORS locked to `CORS_ALLOW_ORIGINS` | Unauthorized browser-based clients |
| Rate limiting on approve/reject routes (`slowapi`) | Abuse of the approval endpoints |
| Path-traversal-safe `/prompts/{name}` routes | Arbitrary filesystem access via prompt names |
| Postgres on an internal Docker network | Direct external access to the database |
| OAuth2-only Gmail auth, tokens never committed | Plaintext credential exposure |

**Recommended:** `chmod 600 .env token.json credentials.json` on any host you deploy to.

---

## 🩺 Health vs. Readiness

| Endpoint | Auth | Purpose |
|---|:---:|---|
| `GET /health` | None | Liveness only — "is the process running." |
| `GET /ready` | None | Readiness — runs a real DB query and reports Gmail's connection state. Returns `503` if the database is unreachable. |

Use `/ready` for Docker/systemd health checks and load balancer probes; use `/health` where you want a lightweight "process alive" check with no DB round-trip.

---

## 🧪 Testing

```bash
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v
```

**19 tests**, covering:

- ✅ Approval-threshold logic (auto-send vs. approval-queue vs. draft-only, including exact boundaries)
- ✅ API-key enforcement end-to-end
- ✅ AI-provider singleton behavior
- ✅ Per-stage AI failure isolation in the pipeline
- ✅ Telegram Markdown escaping

Runs against SQLite locally and against real Postgres in CI.

---

## ⚙️ Configuration — Swapping Models

```env
LLM_PROVIDER=ollama
LLM_MODEL=deepseek-r1:14b        # or qwen2.5:14b, qwen2.5-coder:14b, mistral, llama3.1
LLM_FALLBACK_MODEL=qwen2.5:7b    # used if the primary model errors or times out
```

No OpenAI dependency exists anywhere in the codebase — every model runs locally through Ollama.

---

## ✅ Approval Workflow

| Confidence | Action |
|:---:|---|
| **≥ 95%** | Auto-send reply via Gmail API |
| **80–94%** | Draft created, Telegram approval request sent, waits for your review |
| **< 80%** | Draft only, saved to the database, never sent, never touches Gmail |

Enforced in plain Python (`app/workflows/pipeline.py::_handle_reply_confidence`) — not just prompted — so a model misreporting its own confidence can't bypass it.

---

## 🗺️ Roadmap

1. 🔎 RAG over past sent emails (`sqlite-vec` or Chroma, Ollama embeddings — no OpenAI)
2. ⚡ Redis + Celery for real async/concurrent processing at higher volume
3. 📧 Multi-Gmail-account support
4. 💬 WhatsApp / Slack / Discord / Desktop notification channels
5. 🎛️ Live Model Manager in the dashboard (swap `LLM_MODEL` without a restart)

---

## 👤 Behind the Code

<div align="center">

### Syed Ali Hasan Moosavi
**Founder & Managing Director — Sayanjali Nexus Private Limited**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/SHalimoosavi)
[![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://shalimoosavi.github.io/moosavi/)
[![X](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/SHAliMoosavi)

</div>

A solo, full-stack technical founder building across AI/SaaS, cybersecurity, blockchain, and business automation — end to end, from backend architecture to deployment to the docs you're reading right now. Core stack: **Python, FastAPI, Next.js, React, TypeScript, PostgreSQL, Docker.**

This project reflects a broader building philosophy: no phase is marked "done" until it's been run against real infrastructure — a live Postgres instance, a live Docker-equivalent stack, an actual `main.py` run with credentials deliberately removed. If this README says something is tested, it's because it was tested.

---

## 🧰 Other Tools & Projects by SYJ

| Project | What It Is |
|---|---|
| **[SYJ GST Invoice Reconciliation](https://github.com/SHalimoosavi/SYJ-GST-Reconciliation)** | Production-ready GST invoice reconciliation engine — duplicate detection, GSTIN matching, multi-sheet Excel reporting. 137 tests, ~90% coverage. |
| **SYJ NexusIntel AI** | Multi-tenant enterprise SaaS — CRM, revenue intelligence, RBAC, subscriptions, audit logging. |
| **SYJ Media Tools** | Social media downloader — GitHub Pages frontend, FastAPI + yt-dlp backend. |
| **Sayanjali OSINT — Sentinel Intelligence** | Threat intelligence aggregation from VirusTotal, Shodan, AbuseIPDB, AlienVault OTX. |
| **NexusRank AI** | AI-powered SEO/GEO SaaS — async FastAPI backend, multi-provider AI integration, Stripe billing. |
| **Real Estate CRM SaaS** | Multi-tenant AI-powered CRM with WhatsApp automation. |
| **SYJ MOMENTUM** | Unified B2B automation — WhatsApp, LinkedIn outreach, review monitoring, GST compliance. |

Full, up-to-date list: [github.com/SHalimoosavi?tab=repositories](https://github.com/SHalimoosavi?tab=repositories)

---

## 📄 License

MIT License — see [`LICENSE`](./LICENSE).

<div align="center">

---

**Model-agnostic. Self-hosted. Actually tested against real infrastructure.**

Built to run anywhere. Shipped like a product.

</div>
