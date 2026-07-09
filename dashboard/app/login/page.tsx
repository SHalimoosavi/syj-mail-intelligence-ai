"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next =
    searchParams.get("next") || "/dashboard";

  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((c) => c.startsWith("token="));

    if (token) {
      router.replace(next);
    }
  }, [router, next]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
        }),
      });

      if (!res.ok) {
        throw new Error(
          "Invalid API key.",
        );
      }

      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6">

      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-panel">

        <div className="border-b border-border px-8 py-8">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-signal-mid/30 bg-signal-mid/10">

            <ShieldCheck className="h-7 w-7 text-signal-mid" />

          </div>

          <h1 className="mt-5 text-center font-display text-2xl font-bold text-text">
            SYJ Mail Intelligence AI
          </h1>

          <p className="mt-2 text-center text-sm text-muted">
            Authenticate to access the Executive Dashboard.
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 px-8 py-8"
        >

          <div>

            <label
              htmlFor="apiKey"
              className="mb-2 block font-mono text-[11px] uppercase tracking-[0.25em] text-muted"
            >
              Backend API Key
            </label>

            <div className="relative">

              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />

              <input
                id="apiKey"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your backend API key"
                className="w-full rounded-lg border border-border bg-base py-3 pl-12 pr-4 text-sm text-text outline-none transition focus:border-signal-mid"
                required
              />

            </div>

            <p className="mt-2 text-xs text-muted">
              This key is validated by the backend and is never stored in
              browser local storage.
            </p>

          </div>

          {error && (

            <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">

              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" />

              <div>

                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-danger">
                  Authentication Failed
                </p>

                <p className="mt-1 text-sm text-muted">
                  {error}
                </p>

              </div>

            </div>

          )}

          <button
            type="submit"
            disabled={loading || apiKey.trim().length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 font-medium text-success transition hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading ? (

              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Authenticating...
              </>

            ) : (

              <>
                <ShieldCheck className="h-5 w-5" />
                Sign In
              </>

            )}

          </button>

          <div className="rounded-lg border border-border bg-base p-5">

            <div className="flex items-center gap-2">

              <ShieldCheck className="h-5 w-5 text-success" />

              <h2 className="font-display text-base font-semibold text-text">
                Security Information
              </h2>

            </div>

            <div className="mt-4 space-y-3 text-sm text-muted">

              <p>
                This dashboard never exposes your backend API key to client-side
                JavaScript beyond this authentication request.
              </p>

              <p>
                All subsequent requests are routed through the secure backend
                proxy, which injects the server-side API key before forwarding
                requests to FastAPI.
              </p>

              <p>
                Authentication is enforced by Next.js middleware before any
                protected page is rendered.
              </p>

            </div>

          </div>

          <div className="rounded-lg border border-border bg-base p-5">

            <div className="flex items-center gap-2">

              <Lock className="h-5 w-5 text-signal-mid" />

              <h2 className="font-display text-base font-semibold text-text">
                Deployment Notes
              </h2>

            </div>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">

              <li>
                Frontend: Next.js App Router
              </li>

              <li>
                Backend: FastAPI
              </li>

              <li>
                AI Engine: Ollama
              </li>

              <li>
                Database: SQLite
              </li>

              <li>
                Deployment: Vercel + Railway
              </li>

            </ul>

          </div>

          <div className="rounded-lg border border-border bg-base p-5">

            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
              Redirect After Login
            </p>

            <p className="mt-2 break-all font-mono text-xs text-text">
              {next}
            </p>

          </div>

        </form>

        <div className="border-t border-border px-8 py-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="font-display text-sm font-semibold text-text">
                SAYANJALI NEXUS
              </p>

              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                SYJ Mail Intelligence AI
              </p>

            </div>

            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-1">

              <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-success">
                v1.0.0
              </span>

            </div>

          </div>

          <div className="mt-4 grid gap-3 text-xs text-muted sm:grid-cols-2">

            <div>

              <p className="font-mono uppercase tracking-wide">
                Framework
              </p>

              <p className="mt-1 text-text">
                Next.js App Router
              </p>

            </div>

            <div>

              <p className="font-mono uppercase tracking-wide">
                Backend
              </p>

              <p className="mt-1 text-text">
                FastAPI + Ollama
              </p>

            </div>

            <div>

              <p className="font-mono uppercase tracking-wide">
                Security
              </p>

              <p className="mt-1 text-text">
                API Key Authentication
              </p>

            </div>

            <div>

              <p className="font-mono uppercase tracking-wide">
                Version
              </p>

              <p className="mt-1 text-text">
                Production Build
              </p>

            </div>

          </div>

          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
            © 2026 SAYANJALI NEXUS PRIVATE LIMITED
          </p>

        </div>

      </div>

    </main>

  );

}
