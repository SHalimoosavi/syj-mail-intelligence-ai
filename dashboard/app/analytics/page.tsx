"use client";

import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BrainCircuit,
  Mail,
  PieChart,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { SignalMeter } from "@/components/SignalMeter";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function ChartBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const width = percentage(value, total);

  return (
    <div className="space-y-1">

      <div className="flex items-center justify-between">

        <span className="text-sm text-text">
          {label}
        </span>

        <span className="font-mono text-xs text-muted">
          {value}
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface2">

        <div
          className="h-full rounded-full bg-signal-mid transition-all"
          style={{ width: `${width}%` }}
        />

      </div>

    </div>
  );
}

export default function AnalyticsPage() {

  const analytics = usePolling(
    () => api.analyticsSummary(),
    POLL_INTERVAL_MS
  );

  const dashboard = usePolling(
    () => api.ready(),
    POLL_INTERVAL_MS
  );

  const stats = analytics.data;

  const categoryEntries = useMemo(() => {

    if (!stats) return [];

    return Object.entries(stats.by_category)
      .sort((a, b) => b[1] - a[1]);

  }, [stats]);

  const statusEntries = useMemo(() => {

    if (!stats) return [];

    return Object.entries(stats.drafts_by_status)
      .sort((a, b) => b[1] - a[1]);

  }, [stats]);

  const totalCategories = categoryEntries.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  if (analytics.loading && !stats) {

    return (

      <div>

        <Topbar
          title="Analytics"
          description="Loading operational metrics..."
        />

        <div className="space-y-4 px-8 py-6">

          {Array.from({ length: 8 }).map((_, i) => (

            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-border bg-surface"
            />

          ))}

        </div>

      </div>

    );

  }

  if (analytics.error && !stats) {

    return (

      <div>

        <Topbar
          title="Analytics"
          description="Operational intelligence"
        />

        <div className="px-8 py-6">

          <ErrorState
            message={analytics.error}
          />

        </div>

      </div>

    );

  }

  if (!stats) {

    return (

      <div>

        <Topbar
          title="Analytics"
          description="Operational intelligence"
        />

        <div className="px-8 py-6">

          <EmptyState
            title="No analytics available"
            description="The backend has not yet produced any analytics."
          />

        </div>

      </div>

    );

  }

  return (

    <div>

      <Topbar
        title="Analytics"
        description="Operational intelligence dashboard"
      />

      <div className="border-b border-border bg-base px-8 py-5">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="font-display text-xl font-semibold text-text">
              Executive Analytics
            </h2>

            <p className="mt-1 text-sm text-muted">
              Live operational insights refreshed every 5 seconds.
            </p>

          </div>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text hover:bg-surface2"
          >

            <RefreshCw className="h-4 w-4" />

            Refresh

          </button>

        </div>

      </div>

      <div className="space-y-8 px-8 py-6">

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-lg border border-border bg-surface p-5">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-muted">
                  Emails Processed
                </p>

                <h3 className="mt-3 font-display text-3xl font-bold text-text">
                  {formatNumber(stats.total_emails)}
                </h3>
              </div>

              <Mail className="h-8 w-8 text-signal-mid" />

            </div>

          </div>

          <div className="rounded-lg border border-border bg-surface p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-muted">
                  Important Emails
                </p>

                <h3 className="mt-3 font-display text-3xl font-bold text-danger">
                  {formatNumber(stats.important_emails)}
                </h3>

              </div>

              <TrendingUp className="h-8 w-8 text-danger" />

            </div>

          </div>

          <div className="rounded-lg border border-border bg-surface p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-muted">
                  Average Importance
                </p>

                <div className="mt-3">
                  <SignalMeter
                    value={stats.avg_importance_score}
                    label="Average importance score"
                  />
                </div>

              </div>

              <BrainCircuit className="h-8 w-8 text-success" />

            </div>

          </div>

          <div className="rounded-lg border border-border bg-surface p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-muted">
                  Notifications Sent
                </p>

                <h3 className="mt-3 font-display text-3xl font-bold text-text">
                  {formatNumber(stats.notifications_sent)}
                </h3>

              </div>

              <Bell className="h-8 w-8 text-signal-mid" />

            </div>

          </div>

        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          <div className="rounded-lg border border-border bg-surface p-6">

            <div className="mb-6 flex items-center gap-2">

              <PieChart className="h-5 w-5 text-signal-mid" />

              <h3 className="font-display text-lg font-semibold text-text">
                Email Categories
              </h3>

            </div>

            {categoryEntries.length === 0 ? (

              <EmptyState
                title="No category statistics"
                description="Email categories will appear after the AI processes mail."
              />

            ) : (

              <div className="space-y-5">

                {categoryEntries.map(([category, count]) => (

                  <ChartBar
                    key={category}
                    label={category}
                    value={count}
                    total={totalCategories}
                  />

                ))}

              </div>

            )}

          </div>

          <div className="rounded-lg border border-border bg-surface p-6">

            <div className="mb-6 flex items-center gap-2">

              <BarChart3 className="h-5 w-5 text-success" />

              <h3 className="font-display text-lg font-semibold text-text">
                Draft Pipeline
              </h3>

            </div>

            {statusEntries.length === 0 ? (

              <EmptyState
                title="No draft activity"
                description="Draft workflow statistics will appear once replies are generated."
              />

            ) : (

              <div className="space-y-5">

                {statusEntries.map(([status, count]) => (

                  <ChartBar
                    key={status}
                    label={status.replaceAll("_", " ")}
                    value={count}
                    total={stats.total_emails || 1}
                  />

                ))}

              </div>

            )}

          </div>

        </div>

        <div className="grid gap-6 xl:grid-cols-2">

          <div className="rounded-lg border border-border bg-surface p-6">

            <div className="mb-6 flex items-center gap-2">

              <Activity className="h-5 w-5 text-signal-mid" />

              <h3 className="font-display text-lg font-semibold text-text">
                Processing Overview
              </h3>

            </div>

            <div className="space-y-5">

              <div className="rounded-lg border border-border bg-base p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Important Email Ratio
                  </span>

                  <span className="font-mono text-sm text-text">
                    {percentage(
                      stats.important_emails,
                      stats.total_emails
                    )}
                    %
                  </span>

                </div>

                <div className="mt-3">

                  <SignalMeter
                    value={percentage(
                      stats.important_emails,
                      stats.total_emails
                    )}
                    label="Important email ratio"
                  />

                </div>

              </div>

              <div className="rounded-lg border border-border bg-base p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Notification Coverage
                  </span>

                  <span className="font-mono text-sm text-text">
                    {percentage(
                      stats.notifications_sent,
                      stats.important_emails || 1
                    )}
                    %
                  </span>

                </div>

                <div className="mt-3">

                  <SignalMeter
                    value={percentage(
                      stats.notifications_sent,
                      stats.important_emails || 1
                    )}
                    label="Notification coverage"
                  />

                </div>

              </div>

              <div className="rounded-lg border border-border bg-base p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Average AI Importance
                  </span>

                  <span className="font-mono text-sm text-text">
                    {stats.avg_importance_score}
                  </span>

                </div>

                <div className="mt-3">

                  <SignalMeter
                    value={stats.avg_importance_score}
                    label="Average AI score"
                  />

                </div>

              </div>

            </div>

          </div>

          <div className="rounded-lg border border-border bg-surface p-6">

            <div className="mb-6 flex items-center gap-2">

              <BrainCircuit className="h-5 w-5 text-success" />

              <h3 className="font-display text-lg font-semibold text-text">
                Backend Health
              </h3>

            </div>

            <div className="space-y-4">

              <div className="rounded-lg border border-border bg-base p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Database
                  </span>

                  <span
                    className={
                      dashboard.data?.database === "ok"
                        ? "font-mono text-success"
                        : "font-mono text-danger"
                    }
                  >
                    {dashboard.data?.database ?? "Unknown"}
                  </span>

                </div>

              </div>

              <div className="rounded-lg border border-border bg-base p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Gmail
                  </span>

                  <span
                    className={
                      dashboard.data?.gmail.connected
                        ? "font-mono text-success"
                        : "font-mono text-danger"
                    }
                  >
                    {dashboard.data?.gmail.connected
                      ? "Connected"
                      : "Disconnected"}
                  </span>

                </div>

              </div>

              <div className="rounded-lg border border-border bg-base p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Consecutive Failures
                  </span>

                  <span className="font-mono text-text">
                    {dashboard.data?.gmail.consecutive_failures ?? 0}
                  </span>

                </div>

              </div>

              <div className="rounded-lg border border-border bg-base p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Last Successful Sync
                  </span>

                  <span className="font-mono text-xs text-text">

                    {dashboard.data?.gmail.last_success_at
                      ? new Date(
                          dashboard.data.gmail.last_success_at
                        ).toLocaleString()
                      : "Never"}

                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

        <div className="rounded-lg border border-border bg-surface p-6">

          <div className="mb-6 flex items-center gap-2">

            <TrendingUp className="h-5 w-5 text-signal-mid" />

            <h3 className="font-display text-lg font-semibold text-text">
              Executive Summary
            </h3>

          </div>

          <div className="grid gap-5 lg:grid-cols-3">

            <div className="rounded-lg border border-border bg-base p-5">

              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Overall Activity
              </p>

              <p className="mt-3 text-sm leading-7 text-muted">

                The AI pipeline has processed
                <span className="font-semibold text-text">
                  {" "}
                  {formatNumber(stats.total_emails)}{" "}
                </span>
                emails with an average importance score of
                <span className="font-semibold text-text">
                  {" "}
                  {stats.avg_importance_score}
                </span>
                .

              </p>

            </div>

            <div className="rounded-lg border border-border bg-base p-5">

              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Priority Workload
              </p>

              <p className="mt-3 text-sm leading-7 text-muted">

                <span className="font-semibold text-danger">
                  {stats.important_emails}
                </span>{" "}
                messages were classified as important and

                <span className="font-semibold text-text">
                  {" "}
                  {stats.notifications_sent}
                </span>{" "}
                notifications have been delivered.

              </p>

            </div>

            <div className="rounded-lg border border-border bg-base p-5">

              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Operational Status
              </p>

              <p className="mt-3 text-sm leading-7 text-muted">

                {dashboard.connected
                  ? "Dashboard communication with the backend is healthy. Analytics are updating automatically every five seconds."
                  : "The dashboard is currently displaying cached information because the backend connection has been interrupted."}

              </p>

            </div>

          </div>

        </div>

        <div className="rounded-lg border border-border bg-surface p-6">

          <div className="mb-5 flex items-center gap-2">

            <BrainCircuit className="h-5 w-5 text-success" />

            <h3 className="font-display text-lg font-semibold text-text">
              Operational Recommendations
            </h3>

          </div>

          <div className="grid gap-4 lg:grid-cols-2">

            <div className="rounded-lg border border-border bg-base p-5">

              <h4 className="font-medium text-text">
                AI Performance
              </h4>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">

                <li>
                  Review manual-review emails daily.
                </li>

                <li>
                  Keep prompt templates under version control.
                </li>

                <li>
                  Run the regression suite before prompt updates.
                </li>

                <li>
                  Monitor unusually high importance scores.
                </li>

              </ul>

            </div>

            <div className="rounded-lg border border-border bg-base p-5">

              <h4 className="font-medium text-text">
                Operations
              </h4>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">

                <li>
                  Review pending approvals regularly.
                </li>

                <li>
                  Monitor Gmail connectivity.
                </li>

                <li>
                  Investigate repeated AI failures.
                </li>

                <li>
                  Archive processed notifications periodically.
                </li>

              </ul>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}
