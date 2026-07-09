"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";

import { Topbar } from "@/components/Topbar";
import {
  CategoryBadge,
  PriorityBadge,
  ReviewBadge,
} from "@/components/Badge";
import { SignalMeter } from "@/components/SignalMeter";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api, type EmailSummary } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function sortNewest(a: EmailSummary, b: EmailSummary) {
  return (
    new Date(b.received_at).getTime() -
    new Date(a.received_at).getTime()
  );
}

export default function ManualReviewPage() {
  const [search, setSearch] = useState("");

  const poll = usePolling(
    () => api.emails({ limit: 500 }),
    POLL_INTERVAL_MS
  );

  const emails = useMemo(() => {
    if (!poll.data) return [];

    return poll.data
      .filter((email) => email.needs_manual_review)
      .filter((email) => {
        if (!search.trim()) return true;

        const q = search.toLowerCase();

        return (
          email.sender.toLowerCase().includes(q) ||
          email.subject.toLowerCase().includes(q) ||
          email.category.toLowerCase().includes(q)
        );
      })
      .sort(sortNewest);
  }, [poll.data, search]);

  return (
    <div>

      <Topbar
        title="Manual Review Queue"
        description="Emails requiring human review because at least one AI pipeline stage reported an error."
      />

      <div className="border-b border-border bg-base px-8 py-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <ShieldAlert className="h-5 w-5 text-danger" />

              <h2 className="font-display text-lg font-semibold text-text">
                AI Exception Queue
              </h2>

            </div>

            <p className="mt-1 text-sm text-muted">
              These emails completed ingestion but require manual verification.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div className="relative">

              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sender, subject or category..."
                className="w-72 rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none transition focus:border-signal-mid"
              />

            </div>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm text-text transition hover:bg-surface2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

          </div>

        </div>

      </div>

      <div className="px-8 py-6">

        {poll.error && !poll.data && (
          <ErrorState message={poll.error} />
        )}

        {!poll.error &&
          !poll.loading &&
          emails.length === 0 && (
            <EmptyState
              title="Review queue is empty"
              description="No emails currently require manual intervention."
            />
        )}

        {!poll.error && emails.length > 0 && (

          <div className="overflow-hidden rounded-lg border border-border">

            <table className="w-full text-left text-sm">

              <thead>

                <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted">

                  <th className="px-4 py-3 font-mono font-normal">
                    Sender
                  </th>

                  <th className="px-4 py-3 font-mono font-normal">
                    Subject
                  </th>

                  <th className="px-4 py-3 font-mono font-normal">
                    Category
                  </th>

                  <th className="px-4 py-3 font-mono font-normal">
                    Priority
                  </th>

                  <th className="px-4 py-3 font-mono font-normal">
                    Score
                  </th>

                  <th className="px-4 py-3 font-mono font-normal">
                    Received
                  </th>

                  <th className="px-4 py-3 font-mono font-normal text-right">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {emails.map((email) => (

                  <tr
                    key={email.id}
                    className="border-b border-border last:border-0 hover:bg-surface/60"
                  >

                    <td className="px-4 py-4 align-top">

                      <div className="max-w-[220px]">

                        <div className="truncate font-medium text-text">
                          {email.sender}
                        </div>

                        <div className="mt-1 text-xs text-muted">
                          {timeAgo(email.received_at)}
                        </div>

                      </div>

                    </td>

                    <td className="px-4 py-4 align-top">

                      <div className="max-w-[420px]">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="truncate font-medium text-text">
                            {email.subject}
                          </span>

                          <ReviewBadge />

                        </div>

                        <p className="mt-2 text-xs text-muted">

                          This email was flagged because one or more AI
                          processing stages reported an exception. Review the
                          details before approving any reply.

                        </p>

                      </div>

                    </td>

                    <td className="px-4 py-4 align-top">

                      <CategoryBadge
                        category={email.category}
                      />

                    </td>

                    <td className="px-4 py-4 align-top">

                      <PriorityBadge
                        priority={email.priority}
                      />

                    </td>

                    <td className="px-4 py-4 align-top">

                      <SignalMeter
                        value={email.importance_score}
                        size="sm"
                        label={`Importance ${email.importance_score}`}
                      />

                    </td>

                    <td className="px-4 py-4 align-top">

                      <div className="font-mono text-xs text-muted">
                        {timeAgo(email.received_at)}
                      </div>

                    </td>

                    <td className="px-4 py-4 align-top text-right">

                      <Link
                        href={`/inbox/${email.id}`}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text transition hover:border-signal-mid hover:bg-surface2"
                      >
                        View Details

                        <ArrowRight className="h-4 w-4" />

                      </Link>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {!poll.loading && poll.connected && emails.length > 0 && (

          <div className="mt-6 rounded-lg border border-border bg-surface p-6">

            <div className="flex items-center gap-2">

              <AlertTriangle className="h-5 w-5 text-danger" />

              <h3 className="font-display text-lg font-semibold text-text">
                Manual Review Guidance
              </h3>

            </div>

            <p className="mt-3 text-sm leading-7 text-muted">

              Every email listed above completed ingestion successfully but at
              least one AI stage reported an exception. Before approving any
              generated reply, open the email and verify the original message,
              AI summary, reasoning, and suggested response.

            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <div className="rounded-md border border-border bg-base p-4">

                <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                  Typical causes
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text">

                  <li>Large or malformed email body</li>

                  <li>LLM timeout during processing</li>

                  <li>Unexpected model response format</li>

                  <li>Summary generation failure</li>

                  <li>Reply generation failure</li>

                </ul>

              </div>

              <div className="rounded-md border border-border bg-base p-4">

                <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                  Operator checklist
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text">

                  <li>Review the original email carefully.</li>

                  <li>Validate category and priority.</li>

                  <li>Confirm the importance score.</li>

                  <li>Read AI reasoning before approving.</li>

                  <li>Approve only when the reply is accurate.</li>

                </ul>

              </div>

            </div>

          </div>

        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4">

          <div>

            <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Queue Status
            </p>

            <p className="mt-1 text-sm text-text">
              {emails.length} email{emails.length === 1 ? "" : "s"} currently require manual review.
            </p>

          </div>

          <div className="text-right">

            <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Backend Connection
            </p>

            <p
              className={`mt-1 text-sm font-medium ${
                poll.connected
                  ? "text-success"
                  : "text-danger"
              }`}
            >
              {poll.connected
                ? "Connected"
                : "Disconnected"}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}
