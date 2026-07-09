"use client";

import {
  Activity,
  Bot,
  BrainCircuit,
  Database,
  Gauge,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-3 last:border-0">

      <span className="text-sm text-muted">
        {label}
      </span>

      <span className="max-w-[60%] break-all text-right font-mono text-sm text-text">
        {value}
      </span>

    </div>
  );
}

export default function SettingsPage() {

  const poll = usePolling(
    () => api.settings(),
    POLL_INTERVAL_MS
  );

  const settings = poll.data;

  return (

    <div>

      <Topbar
        title="System Settings"
        description="Current runtime configuration and AI execution environment."
      />

      <div className="px-8 py-6">

        {poll.loading && !settings && (

          <div className="space-y-4">

            {Array.from({ length: 6 }).map((_, index) => (

              <div
                key={index}
                className="h-28 animate-pulse rounded-lg border border-border bg-surface"
              />

            ))}

          </div>

        )}

        {poll.error && !settings && (
          <ErrorState message={poll.error} />
        )}

        {!poll.loading && !poll.error && !settings && (

          <EmptyState
            title="No configuration available"
            description="The backend did not return any runtime configuration."
          />

        )}

        {settings && (

          <div className="space-y-6">

            <div className="grid gap-4 lg:grid-cols-4">

              <div className="rounded-lg border border-border bg-surface p-5">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Environment
                  </span>

                  <ShieldCheck className="h-5 w-5 text-success" />

                </div>

                <div className="mt-4 font-display text-2xl font-bold text-text">
                  {settings.environment}
                </div>

              </div>

              <div className="rounded-lg border border-border bg-surface p-5">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    AI Provider
                  </span>

                  <Bot className="h-5 w-5 text-signal-mid" />

                </div>

                <div className="mt-4 font-display text-xl font-bold text-text">
                  {settings.llm_provider}
                </div>

              </div>

              <div className="rounded-lg border border-border bg-surface p-5">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Gmail
                  </span>

                  <Mail className="h-5 w-5 text-success" />

                </div>

                <div
                  className={`mt-4 font-display text-xl font-bold ${
                    settings.gmail.connected
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  {settings.gmail.connected
                    ? "Connected"
                    : "Offline"}
                </div>

              </div>

              <div className="rounded-lg border border-border bg-surface p-5">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Telegram
                  </span>

                  <Send className="h-5 w-5 text-signal-mid" />

                </div>

                <div
                  className={`mt-4 font-display text-xl font-bold ${
                    settings.telegram_configured
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  {settings.telegram_configured
                    ? "Configured"
                    : "Disabled"}
                </div>

              </div>

            </div>

            <div className="grid gap-6 lg:grid-cols-2">

              <div className="rounded-lg border border-border bg-surface p-6">

                <div className="mb-5 flex items-center gap-3">

                  <BrainCircuit className="h-5 w-5 text-signal-mid" />

                  <h2 className="font-display text-lg font-semibold text-text">
                    AI Configuration
                  </h2>

                </div>

                <InfoRow
                  label="Provider"
                  value={settings.llm_provider}
                />

                <InfoRow
                  label="Primary Model"
                  value={settings.llm_model}
                />

                <InfoRow
                  label="Fallback Model"
                  value={settings.llm_fallback_model}
                />

                <InfoRow
                  label="Ollama Host"
                  value={settings.ollama_host}
                />

              </div>

              <div className="rounded-lg border border-border bg-surface p-6">

                <div className="mb-5 flex items-center gap-3">

                  <Gauge className="h-5 w-5 text-success" />

                  <h2 className="font-display text-lg font-semibold text-text">
                    AI Thresholds
                  </h2>

                </div>

                <InfoRow
                  label="Auto Send"
                  value={`${settings.auto_send_threshold}%`}
                />

                <InfoRow
                  label="Approval Required"
                  value={`${settings.approval_threshold}%`}
                />

                <InfoRow
                  label="Notify Threshold"
                  value={`${settings.importance_notify_threshold}%`}
                />

                <InfoRow
                  label="Polling Interval"
                  value={`${settings.gmail_poll_interval_seconds}s`}
                />

              </div>

            </div>

            <div className="grid gap-6 lg:grid-cols-2">

              <div className="rounded-lg border border-border bg-surface p-6">

                <div className="mb-5 flex items-center gap-3">

                  <Mail className="h-5 w-5 text-success" />

                  <h2 className="font-display text-lg font-semibold text-text">
                    Gmail Status
                  </h2>

                </div>

                <InfoRow
                  label="Connected"
                  value={
                    settings.gmail.connected
                      ? "Yes"
                      : "No"
                  }
                />

                <InfoRow
                  label="Consecutive Failures"
                  value={settings.gmail.consecutive_failures}
                />

                <InfoRow
                  label="Last Successful Sync"
                  value={
                    settings.gmail.last_success_at ??
                    "Never"
                  }
                />

                <InfoRow
                  label="Last Attempt"
                  value={
                    settings.gmail.last_attempt_at ??
                    "Never"
                  }
                />

                <InfoRow
                  label="Last Error"
                  value={
                    settings.gmail.last_error ??
                    "None"
                  }
                />

              </div>

              <div className="rounded-lg border border-border bg-surface p-6">

                <div className="mb-5 flex items-center gap-3">

                  <Database className="h-5 w-5 text-signal-mid" />

                  <h2 className="font-display text-lg font-semibold text-text">
                    Runtime Configuration
                  </h2>

                </div>

                <InfoRow
                  label="Database"
                  value={settings.database_url}
                />

                <InfoRow
                  label="Environment"
                  value={settings.environment}
                />

                <InfoRow
                  label="Telegram"
                  value={
                    settings.telegram_configured
                      ? "Configured"
                      : "Disabled"
                  }
                />

                <InfoRow
                  label="Refresh Interval"
                  value={`${POLL_INTERVAL_MS / 1000}s`}
                />

              </div>

            </div>

            <div className="grid gap-6 lg:grid-cols-2">

              <div className="rounded-lg border border-border bg-surface p-6">

                <div className="mb-5 flex items-center gap-3">

                  <Activity className="h-5 w-5 text-success" />

                  <h2 className="font-display text-lg font-semibold text-text">
                    Runtime Status
                  </h2>

                </div>

                <div className="space-y-4">

                  <div className="flex items-center justify-between rounded-lg border border-border bg-base px-4 py-3">

                    <span className="text-sm text-muted">
                      Backend Connection
                    </span>

                    <span
                      className={`font-mono text-xs uppercase ${
                        poll.connected
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {poll.connected
                        ? "Connected"
                        : "Disconnected"}
                    </span>

                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-base px-4 py-3">

                    <span className="text-sm text-muted">
                      Auto Refresh
                    </span>

                    <span className="font-mono text-xs text-text">
                      Every {POLL_INTERVAL_MS / 1000}s
                    </span>

                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-base px-4 py-3">

                    <span className="text-sm text-muted">
                      Gmail Poll Interval
                    </span>

                    <span className="font-mono text-xs text-text">
                      {settings.gmail_poll_interval_seconds}s
                    </span>

                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-base px-4 py-3">

                    <span className="text-sm text-muted">
                      Notification Channel
                    </span>

                    <span className="font-mono text-xs text-text">
                      Telegram
                    </span>

                  </div>

                </div>

              </div>

              <div className="rounded-lg border border-border bg-surface p-6">

                <div className="mb-5 flex items-center gap-3">

                  <RefreshCw className="h-5 w-5 text-signal-mid" />

                  <h2 className="font-display text-lg font-semibold text-text">
                    Prompt Management
                  </h2>

                </div>

                <p className="text-sm leading-6 text-muted">
                  Prompt files are stored on the backend and can be edited
                  without rebuilding the application. Changes take effect on
                  subsequent AI requests while preserving the existing backend
                  architecture.
                </p>

                <div className="mt-6 grid gap-3">

                  <button
                    onClick={() => window.location.assign("/prompts")}
                    className="rounded-lg border border-border bg-base px-4 py-3 text-left transition hover:bg-surface2"
                  >
                    <p className="font-medium text-text">
                      Prompt Editor
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      View and modify AI prompt templates.
                    </p>
                  </button>

                  <button
                    onClick={() => window.location.assign("/logs")}
                    className="rounded-lg border border-border bg-base px-4 py-3 text-left transition hover:bg-surface2"
                  >
                    <p className="font-medium text-text">
                      System Logs
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Review backend events and operational history.
                    </p>
                  </button>

                  <button
                    onClick={() => window.location.assign("/dashboard")}
                    className="rounded-lg border border-border bg-base px-4 py-3 text-left transition hover:bg-surface2"
                  >
                    <p className="font-medium text-text">
                      Executive Dashboard
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Return to the executive overview.
                    </p>
                  </button>

                </div>

              </div>

            </div>

            {poll.error && settings && (

              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">

                <p className="font-mono text-[11px] uppercase tracking-wide text-danger">
                  Connection Warning
                </p>

                <p className="mt-2 text-sm text-muted">
                  Unable to refresh configuration from the backend.
                  Displaying the most recently synchronized settings.
                </p>

              </div>

            )}

            <div className="rounded-lg border border-border bg-surface p-6">

              <div className="mb-5 flex items-center gap-3">

                <ShieldCheck className="h-5 w-5 text-success" />

                <h2 className="font-display text-lg font-semibold text-text">
                  System Summary
                </h2>

              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <div className="rounded-lg border border-border bg-base p-4">

                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    AI Stack
                  </p>

                  <p className="mt-3 text-sm text-text">
                    <strong>Provider:</strong> {settings.llm_provider}
                  </p>

                  <p className="mt-2 text-sm text-text">
                    <strong>Primary:</strong> {settings.llm_model}
                  </p>

                  <p className="mt-2 text-sm text-text">
                    <strong>Fallback:</strong> {settings.llm_fallback_model}
                  </p>

                </div>

                <div className="rounded-lg border border-border bg-base p-4">

                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    Services
                  </p>

                  <div className="mt-3 space-y-2">

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-muted">
                        Gmail
                      </span>

                      <span
                        className={
                          settings.gmail.connected
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {settings.gmail.connected
                          ? "Connected"
                          : "Offline"}
                      </span>

                    </div>

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-muted">
                        Telegram
                      </span>

                      <span
                        className={
                          settings.telegram_configured
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {settings.telegram_configured
                          ? "Configured"
                          : "Disabled"}
                      </span>

                    </div>

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-muted">
                        Dashboard API
                      </span>

                      <span
                        className={
                          poll.connected
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {poll.connected
                          ? "Online"
                          : "Offline"}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              <div className="mt-6 rounded-lg border border-border bg-base p-4">

                <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                  Production Notes
                </p>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">

                  <li>
                    • Configuration is loaded directly from the FastAPI backend.
                  </li>

                  <li>
                    • All dashboard requests pass through the secure Next.js API proxy.
                  </li>

                  <li>
                    • API keys never reach the browser.
                  </li>

                  <li>
                    • Runtime configuration updates require only backend changes;
                    frontend rebuilds are unnecessary.
                  </li>

                  <li>
                    • This page refreshes automatically every{" "}
                    {POLL_INTERVAL_MS / 1000} seconds.
                  </li>

                </ul>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}
