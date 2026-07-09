"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Info,
  Search,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function levelClasses(level: string) {
  switch (level.toUpperCase()) {
    case "ERROR":
      return {
        icon: ShieldAlert,
        badge:
          "border-danger/30 bg-danger/10 text-danger",
      };

    case "WARNING":
    case "WARN":
      return {
        icon: AlertTriangle,
        badge:
          "border-signal-mid/30 bg-signal-mid/10 text-signal-mid",
      };

    default:
      return {
        icon: Info,
        badge:
          "border-success/30 bg-success/10 text-success",
      };
  }
}

export default function LogsPage() {
  const poll = usePolling(
    () => api.logs(500),
    POLL_INTERVAL_MS
  );

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  const logs = poll.data ?? [];

  const sources = useMemo(() => {
    return [
      "ALL",
      ...Array.from(
        new Set(logs.map((log) => log.source))
      ).sort(),
    ];
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesSource =
        sourceFilter === "ALL" ||
        log.source === sourceFilter;

      const q = search.trim().toLowerCase();

      const matchesSearch =
        q.length === 0 ||
        log.message.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q);

      return matchesSource && matchesSearch;
    });
  }, [logs, sourceFilter, search]);

  return (
    <div>

      <Topbar
        title="System Logs"
        description="Live operational log stream from the SYJ Mail Intelligence backend."
      />

      <div className="border-b border-border bg-base px-8 py-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex flex-1 gap-3">

            <div className="relative flex-1">

              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search logs..."
                className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text outline-none transition focus:border-signal-mid"
              />

            </div>

            <select
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(e.target.value)
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
            >
              {sources.map((source) => (
                <option
                  key={source}
                  value={source}
                >
                  {source}
                </option>
              ))}
            </select>

          </div>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text transition hover:bg-surface2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

        </div>

      </div>

      <div className="space-y-6 px-8 py-6">

        <div className="grid gap-4 md:grid-cols-4">

          <div className="rounded-lg border border-border bg-surface p-5">

            <div className="flex items-center justify-between">

              <span className="text-sm text-muted">
                Total Logs
              </span>

              <Activity className="h-5 w-5 text-signal-mid" />

            </div>

            <div className="mt-4 font-display text-3xl font-bold text-text">
              {filtered.length}
            </div>

          </div>

          <div className="rounded-lg border border-border bg-surface p-5">

            <div className="flex items-center justify-between">

              <span className="text-sm text-muted">
                Errors
              </span>

              <ShieldAlert className="h-5 w-5 text-danger" />

            </div>

            <div className="mt-4 font-display text-3xl font-bold text-danger">
              {
                filtered.filter(
                  (l) =>
                    l.level.toUpperCase() === "ERROR"
                ).length
              }
            </div>

          </div>

          <div className="rounded-lg border border-border bg-surface p-5">

            <div className="flex items-center justify-between">

              <span className="text-sm text-muted">
                Warnings
              </span>

              <AlertTriangle className="h-5 w-5 text-signal-mid" />

            </div>

            <div className="mt-4 font-display text-3xl font-bold text-signal-mid">
              {
                filtered.filter((log) => {
                  const level = log.level.toUpperCase();
                  return level === "WARNING" || level === "WARN";
                }).length
              }
            </div>

          </div>

          <div className="rounded-lg border border-border bg-surface p-5">

            <div className="flex items-center justify-between">

              <span className="text-sm text-muted">
                Information
              </span>

              <Info className="h-5 w-5 text-success" />

            </div>

            <div className="mt-4 font-display text-3xl font-bold text-success">
              {
                filtered.filter((log) => {
                  const level = log.level.toUpperCase();
                  return (
                    level !== "ERROR" &&
                    level !== "WARNING" &&
                    level !== "WARN"
                  );
                }).length
              }
            </div>

          </div>

        </div>

        {poll.loading && !poll.data && (

          <div className="space-y-3">

            {Array.from({ length: 10 }).map((_, index) => (

              <div
                key={index}
                className="h-20 animate-pulse rounded-lg border border-border bg-surface"
              />

            ))}

          </div>

        )}

        {poll.error && !poll.data && (
          <ErrorState message={poll.error} />
        )}

        {!poll.loading &&
          !poll.error &&
          filtered.length === 0 && (

          <EmptyState
            title="No log entries"
            description="No backend events match the current filters."
          />

        )}

        {filtered.length > 0 && (

          <div className="overflow-hidden rounded-lg border border-border bg-surface">

            <div className="border-b border-border px-5 py-3">

              <h2 className="font-display text-lg font-semibold text-text">
                Live Event Stream
              </h2>

              <p className="mt-1 text-xs text-muted">
                Automatically refreshed every {POLL_INTERVAL_MS / 1000} seconds.
              </p>

            </div>

            <div className="divide-y divide-border">

              {filtered.map((log, index) => {

                const style = levelClasses(log.level);
                const Icon = style.icon;

                return (

                  <div
                    key={`${log.created_at}-${index}`}
                    className="flex gap-4 px-5 py-4 transition hover:bg-surface2"
                  >

                    <div className="mt-0.5">

                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border ${style.badge}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center justify-between gap-3">

                        <div className="flex items-center gap-2">

                          <span
                            className={`rounded-full border px-2 py-1 font-mono text-[11px] uppercase tracking-wide ${style.badge}`}
                          >
                            {log.level}
                          </span>

                          <span className="rounded-full border border-border bg-base px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-muted">
                            {log.source}
                          </span>

                        </div>

                        <span className="font-mono text-xs text-muted">
                          {formatDate(log.created_at)}
                        </span>

                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-text">
                        {log.message}
                      </p>

                    </div>

                  </div>

                );

              })}

            </div>

          </div>

        )}

        {poll.error && poll.data && (

          <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">

            <p className="font-mono text-[11px] uppercase tracking-wide text-danger">
              Connection Warning
            </p>

            <p className="mt-1 text-sm text-muted">
              Backend connectivity has been interrupted. Showing the most
              recently synchronized log entries until communication is
              restored.
            </p>

          </div>

        )}

        {!poll.loading && filtered.length > 0 && (

          <div className="grid gap-4 lg:grid-cols-2">

            <div className="rounded-lg border border-border bg-surface p-5">

              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Log Sources
              </p>

              <div className="mt-4 space-y-2">

                {sources
                  .filter((source) => source !== "ALL")
                  .map((source) => {

                    const count = filtered.filter(
                      (log) => log.source === source
                    ).length;

                    return (

                      <div
                        key={source}
                        className="flex items-center justify-between rounded-md border border-border bg-base px-3 py-2"
                      >

                        <span className="font-mono text-xs text-text">
                          {source}
                        </span>

                        <span className="font-display text-lg font-semibold text-text">
                          {count}
                        </span>

                      </div>

                    );

                  })}

                {sources.length <= 1 && (

                  <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted">
                    No log sources available.
                  </div>

                )}

              </div>

            </div>

            <div className="rounded-lg border border-border bg-surface p-5">

              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Operations Summary
              </p>

              <div className="mt-4 flex items-center gap-3">

                <div
                  className={`h-3 w-3 rounded-full ${
                    poll.connected ? "bg-success" : "bg-danger"
                  }`}
                />

                <span
                  className={
                    poll.connected
                      ? "text-sm text-success"
                      : "text-sm text-danger"
                  }
                >
                  {poll.connected
                    ? "Backend Connected"
                    : "Backend Disconnected"}
                </span>

              </div>

              <div className="mt-6 space-y-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Auto Refresh
                  </span>

                  <span className="font-mono text-sm text-text">
                    {POLL_INTERVAL_MS / 1000}s
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Displayed Entries
                  </span>

                  <span className="font-display text-lg font-semibold text-text">
                    {filtered.length}
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Available Sources
                  </span>

                  <span className="font-display text-lg font-semibold text-text">
                    {Math.max(sources.length - 1, 0)}
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-sm text-muted">
                    Active Filter
                  </span>

                  <span className="font-mono text-xs uppercase text-text">
                    {sourceFilter}
                  </span>

                </div>

              </div>

              <div className="mt-6 rounded-md border border-border bg-base p-3">

                <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                  Monitoring
                </p>

                <p className="mt-2 text-xs leading-6 text-muted">
                  The Operations Console automatically polls the backend every{" "}
                  {POLL_INTERVAL_MS / 1000} seconds. If connectivity is lost,
                  the latest synchronized log stream remains visible until the
                  backend becomes reachable again.
                </p>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}
