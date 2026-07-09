"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bell,
  BrainCircuit,
  Database,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import {
  api,
  AnalyticsSummary,
  Draft,
  EmailSummary,
  ReadyStatus,
  SettingsView,
} from "@/lib/api";

type DashboardState = {
  analytics: AnalyticsSummary | null;
  ready: ReadyStatus | null;
  settings: SettingsView | null;
 important: EmailSummary[];
  drafts: Draft[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function priorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical":
      return "bg-danger/15 text-danger border-danger/30";

    case "high":
      return "bg-signal-high/15 text-signal-high border-signal-high/30";

    case "medium":
      return "bg-signal-mid/15 text-signal-mid border-signal-mid/30";

    default:
      return "bg-success/15 text-success border-success/30";
  }
}

function statusColor(ok: boolean) {
  return ok
    ? "text-success border-success/30 bg-success/10"
    : "text-danger border-danger/30 bg-danger/10";
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-xl font-semibold text-text">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-1 text-sm text-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-6 py-5 shadow-panel">
        <Loader2 className="h-5 w-5 animate-spin text-signal-mid" />
        <span className="text-sm text-text">
          Loading executive dashboard...
        </span>
      </div>
    </div>
  );
}

function ErrorScreen({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-6">
      <div className="max-w-lg rounded-lg border border-danger/30 bg-surface p-8">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-danger" />

          <h2 className="font-display text-lg font-semibold text-text">
            Dashboard unavailable
          </h2>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted">
          {message}
        </p>

        <button
          onClick={retry}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-border bg-surface2 px-4 py-2 text-sm text-text transition hover:bg-border"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">
          {title}
        </span>

        {icon}
      </div>

      <div className="mt-4 font-display text-3xl font-bold text-text">
        {value}
      </div>
    </div>
  );
}

function HealthCard({
  title,
  ok,
  value,
}: {
  title: string;
  ok: boolean;
  value: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${statusColor(ok)}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {title}
        </span>

        {ok ? (
          <ShieldCheck className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
      </div>

      <div className="mt-3 text-xs break-all opacity-90">
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    analytics: null,
    ready: null,
    settings: null,
    important: [],
    drafts: [],
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const [
        analytics,
        ready,
        settings,
        important,
        drafts,
      ] = await Promise.all([
        api.analyticsSummary(),
        api.ready(),
        api.settings(),
        api.importantEmails(),
        api.pendingDrafts(),
      ]);

      setState({
        analytics,
        ready,
        settings,
        important,
        drafts,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !state.analytics || !state.ready || !state.settings) {
    return (
      <ErrorScreen
        message={error ?? "Unknown error."}
        retry={loadDashboard}
      />
    );
  }

  const {
    analytics,
    ready,
    settings,
    important,
    drafts,
  } = state;

  return (
    <div className="min-h-screen bg-base">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-text">
              Executive Dashboard
            </h1>

            <p className="mt-2 text-sm text-muted">
              Real-time operational overview of SYJ Mail Intelligence AI.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface2 px-4 py-2 text-sm text-text transition hover:bg-border"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-6 py-8">

        <section>
          <SectionTitle
            title="Key Performance Indicators"
            subtitle="High-level operational metrics."
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

            <MetricCard
              title="Emails Processed"
              value={formatNumber(analytics.total_emails)}
              icon={<Mail className="h-6 w-6 text-signal-mid" />}
            />

            <MetricCard
              title="Important Emails"
              value={formatNumber(analytics.important_emails)}
              icon={<TrendingUp className="h-6 w-6 text-danger" />}
            />

            <MetricCard
              title="Average Importance"
              value={`${analytics.avg_importance_score}`}
              icon={<Activity className="h-6 w-6 text-success" />}
            />

            <MetricCard
              title="Notifications Sent"
              value={formatNumber(analytics.notifications_sent)}
              icon={<Bell className="h-6 w-6 text-signal-mid" />}
            />

          </div>
        </section>

        <section>

          <SectionTitle
            title="System Health"
            subtitle="Current backend runtime status."
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

            <HealthCard
              title="Database"
              ok={ready.database === "ok"}
              value={
                ready.database === "ok"
                  ? "Healthy"
                  : ready.database_error ?? "Unavailable"
              }
            />

            <HealthCard
              title="Gmail"
              ok={settings.gmail.connected}
              value={
                settings.gmail.connected
                  ? "Connected"
                  : settings.gmail.last_error ?? "Disconnected"
              }
            />

            <HealthCard
              title="LLM"
              ok={true}
              value={settings.llm_model}
            />

            <HealthCard
              title="Provider"
              ok={true}
              value={settings.llm_provider}
            />

          </div>
        </section>

        <section>

          <SectionTitle
            title="Category Distribution"
            subtitle="Processed email categories."
          />

          <div className="rounded-lg border border-border bg-surface p-6 shadow-panel">

            {Object.keys(analytics.by_category).length === 0 ? (

              <div className="text-sm text-muted">
                No category statistics available.
              </div>

            ) : (

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                {Object.entries(analytics.by_category).map(
                  ([category, count]) => (
                    <div
                      key={category}
                      className="rounded-md border border-border bg-base p-4"
                    >
                      <div className="flex items-center justify-between">

                        <div className="font-medium text-text">
                          {category}
                        </div>

                        <BrainCircuit className="h-5 w-5 text-signal-mid" />

                      </div>

                      <div className="mt-4 font-display text-3xl font-bold text-text">
                        {count}
                      </div>

                    </div>
                  )
                )}

              </div>

            )}

          </div>

        </section>

        <section className="grid gap-6 lg:grid-cols-2">

          <div className="rounded-lg border border-border bg-surface p-6 shadow-panel">

            <SectionTitle
              title="Important Emails"
              subtitle="Highest-priority messages requiring attention."
            />

            {important.length === 0 ? (

              <div className="py-8 text-center text-sm text-muted">
                No important emails found.
              </div>

            ) : (

              <div className="space-y-3">

                {important.slice(0, 8).map((email) => (

                  <Link
                    key={email.id}
                    href={`/inbox/${email.id}`}
                    className="block rounded-md border border-border bg-base p-4 transition hover:border-signal-mid hover:bg-surface2"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0 flex-1">

                        <div className="truncate font-medium text-text">
                          {email.subject}
                        </div>

                        <div className="mt-1 truncate text-xs text-muted">
                          {email.sender}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">

                          <span className="rounded border border-border px-2 py-1 text-xs">
                            {email.category}
                          </span>

                          <span
                            className={`rounded border px-2 py-1 text-xs ${priorityColor(
                              email.priority
                            )}`}
                          >
                            {email.priority}
                          </span>

                        </div>

                      </div>

                      <div className="text-right">

                        <div className="font-display text-2xl font-bold text-danger">
                          {email.importance_score}
                        </div>

                        <div className="text-[11px] uppercase tracking-wider text-muted">
                          Score
                        </div>

                      </div>

                    </div>

                  </Link>

                ))}

              </div>

            )}

          </div>

          <div className="rounded-lg border border-border bg-surface p-6 shadow-panel">

            <SectionTitle
              title="Approval Queue"
              subtitle="Draft replies waiting for approval."
            />

            {drafts.length === 0 ? (

              <div className="py-8 text-center text-sm text-muted">
                No pending approval requests.
              </div>

            ) : (

              <div className="space-y-3">

                {drafts.slice(0, 8).map((draft) => (

                  <Link
                    key={draft.id}
                    href="/approvals"
                    className="block rounded-md border border-border bg-base p-4 transition hover:border-signal-mid hover:bg-surface2"
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <div className="font-medium text-text">
                          {draft.reply_subject}
                        </div>

                        <div className="mt-1 text-xs text-muted">
                          Confidence: {draft.confidence}%
                        </div>

                      </div>

                      <Sparkles className="h-5 w-5 text-signal-mid" />

                    </div>

                  </Link>

                ))}

              </div>

            )}

          </div>

        </section>

        <section>

          <SectionTitle
            title="Draft Status Overview"
            subtitle="Current draft pipeline distribution."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {Object.entries(analytics.drafts_by_status).map(
              ([status, total]) => (

                <div
                  key={status}
                  className="rounded-lg border border-border bg-surface p-5 shadow-panel"
                >

                  <div className="text-sm uppercase tracking-wide text-muted">
                    {status.replace("_", " ")}
                  </div>

                  <div className="mt-3 font-display text-3xl font-bold text-text">
                    {total}
                  </div>

                </div>

              )
            )}

          </div>

        </section>

        <section>

          <SectionTitle
            title="Runtime Configuration"
            subtitle="Current backend execution environment."
          />

          <div className="grid gap-5 lg:grid-cols-2">

            <div className="rounded-lg border border-border bg-surface p-6 shadow-panel">

              <div className="mb-4 flex items-center gap-2">

                <Database className="h-5 w-5 text-signal-mid" />

                <span className="font-medium text-text">
                  AI Configuration
                </span>

              </div>

              <dl className="space-y-4 text-sm">

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Provider</dt>
                  <dd className="font-mono text-text">
                    {settings.llm_provider}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Primary Model</dt>
                  <dd className="font-mono text-text">
                    {settings.llm_model}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Fallback Model</dt>
                  <dd className="font-mono text-text">
                    {settings.llm_fallback_model}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Auto Send</dt>
                  <dd className="font-mono text-text">
                    {settings.auto_send_threshold}%
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Approval</dt>
                  <dd className="font-mono text-text">
                    {settings.approval_threshold}%
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Notify</dt>
                  <dd className="font-mono text-text">
                    {settings.importance_notify_threshold}%
                  </dd>
                </div>

              </dl>

            </div>

            <div className="rounded-lg border border-border bg-surface p-6 shadow-panel">

              <div className="mb-4 flex items-center gap-2">

                <Activity className="h-5 w-5 text-success" />

                <span className="font-medium text-text">
                  Runtime Status
                </span>

              </div>

              <dl className="space-y-4 text-sm">

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Environment</dt>
                  <dd className="font-mono text-text">
                    {settings.environment}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Ollama Host</dt>
                  <dd className="font-mono text-text break-all">
                    {settings.ollama_host}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Poll Interval</dt>
                  <dd className="font-mono text-text">
                    {settings.gmail_poll_interval_seconds}s
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Telegram</dt>
                  <dd
                    className={
                      settings.telegram_configured
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {settings.telegram_configured
                      ? "Configured"
                      : "Not Configured"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Database</dt>
                  <dd className="font-mono text-text">
                    {ready.database}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Last Gmail Sync</dt>
                  <dd className="font-mono text-text text-right">
                    {settings.gmail.last_success_at
                      ? formatDate(settings.gmail.last_success_at)
                      : "Never"}
                  </dd>
                </div>

              </dl>

            </div>

          </div>

        </section>

      </div>

    </div>
  );
}
