# SYJ Mail Intelligence — Dashboard

Next.js + TypeScript + Tailwind frontend for the backend in `../app/api/main.py`.

## Design

A signal-console aesthetic, not a generic SaaS admin — deep ink background,
Space Grotesk for headings, Inter for body text, JetBrains Mono for every
number (scores, timestamps, IDs). The one recurring visual idea is the
**signal meter** (`components/SignalMeter.tsx`): importance scores and reply
confidence both render as a row of ticks lighting up left-to-right, like a VU
meter or radar signal strength, instead of a generic rounded progress bar —
used everywhere a score appears so it always reads the same way at a glance.

## Pages

| Page | Route | Backed by |
|---|---|---|
| Inbox | `/inbox` | `GET /emails` |
| Important | `/important` | `GET /emails/important` |
| Approval Queue | `/approvals` | `GET /drafts/pending`, `POST /drafts/{id}/approve\|reject` |
| Notifications | `/notifications` | `GET /notifications` |
| Analytics | `/analytics` | `GET /analytics/summary` |
| Contacts | `/contacts` | `GET /contacts` |
| Prompt Editor | `/prompts` | `GET/PUT /prompts` — edits write straight to `config/prompts/*.txt` |
| Logs | `/logs` | `GET /logs` |
| Settings | `/settings` | `GET /settings` (read-only) |

Not yet built: a live Model Manager (swapping `LLM_MODEL` from the UI) and a
Memory browser (contacts page covers part of this already).

Data refreshes on a plain interval (`lib/usePolling.ts`, 4–15s depending on
page) rather than a websocket — deliberately, since it mirrors the backend's
own polling model and needs no extra infra.

## How requests reach the backend (security model)

The browser **never** talks to FastAPI directly. Every call in `lib/api.ts`
hits this app's own `/api/backend/*` route
(`app/api/backend/[...path]/route.ts`), a Next.js server-side handler that:

1. Reads `BACKEND_API_URL` and `BACKEND_API_KEY` from `process.env` — no
   `NEXT_PUBLIC_` prefix, so neither is ever bundled into client JS or
   visible in browser dev tools.
2. Forwards the request to FastAPI with `X-API-Key: $BACKEND_API_KEY` attached.
3. Streams the response back to the browser.

This is why the backend's CORS can stay locked down to `localhost:3000` (or
nothing) — there's no cross-origin browser request happening at all, just a
same-origin call from the browser to Next.js, then a server-to-server call
from Next.js to FastAPI.

## Setup

```bash
cd dashboard
npm install
cp .env.local.example .env.local
# Edit .env.local:
#   BACKEND_API_URL=http://localhost:8000
#   BACKEND_API_KEY=<same value as API_KEY in the backend's .env>
npm run dev                        # http://localhost:3000
```

For production:
```bash
npm run build
npm run start
```

Or via Docker — see `../deploy/README.md` (uses `dashboard/Dockerfile`,
which builds Next's standalone output).

## Running in Termux

Node runs fine in Termux (`pkg install nodejs`). If your backend runs on a
different device (e.g. Ollama needs more RAM than your phone has, so FastAPI
runs on a PC/VPS instead), set `BACKEND_API_URL` in `.env.local` to that
machine's address — the key still never leaves the server side.
