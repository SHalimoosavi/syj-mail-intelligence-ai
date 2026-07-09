"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Topbar } from "@/components/Topbar";
import {
  StatusBadge,
} from "@/components/Badge";
import { SignalMeter } from "@/components/SignalMeter";
import {
  EmptyState,
  ErrorState,
} from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import {
  api,
  type Draft,
} from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

export default function ApprovalsPage() {
  const poll = usePolling(
    () => api.pendingDrafts(),
    POLL_INTERVAL_MS
  );

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (poll.data) {
      setDrafts(poll.data);
    }
  }, [poll.data]);

  const refresh = useCallback(async () => {
    try {
      const latest = await api.pendingDrafts();
      setDrafts(latest);
    } catch {
      // polling already exposes connection errors
    }
  }, []);

  async function approveDraft(id: number) {
    setBusyId(id);
    setActionError(null);

    try {
      await api.approveDraft(id);
      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to approve draft."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function rejectDraft(id: number) {
    setBusyId(id);
    setActionError(null);

    try {
      await api.rejectDraft(id);
      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to reject draft."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>

      <Topbar
        title="Approval Queue"
        description="Review AI-generated replies before they are sent."
      />

      <div className="border-b border-border px-8 py-4">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="font-display text-lg font-semibold text-text">
              Pending Drafts
            </h2>

            <p className="mt-1 text-sm text-muted">
              Drafts waiting for human approval.
            </p>

          </div>

          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm text-text transition hover:bg-surface2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

        </div>

      </div>

      <div className="px-8 py-6">

        {actionError && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {actionError}
          </div>
        )}

        {poll.error && !poll.data && (
          <ErrorState message={poll.error} />
        )}

        {!poll.loading &&
          drafts.length === 0 &&
          !poll.error && (
            <EmptyState
              title="Approval queue empty"
              description="Every generated draft has already been processed."
            />
        )}

        {drafts.length > 0 && (

          <div className="space-y-4">

            {drafts.map((draft) => (

              <div
                key={draft.id}
                className="rounded-lg border border-border bg-surface shadow-panel"
              >

                <div className="border-b border-border px-5 py-4">

                  <div className="flex flex-wrap items-center justify-between gap-4">

                    <div>

                      <h3 className="font-display text-lg font-semibold text-text">
                        {draft.reply_subject}
                      </h3>

                      <p className="mt-1 font-mono text-xs text-muted">
                        Email ID #{draft.email_id}
                      </p>

                    </div>

                    <StatusBadge status={draft.status} />

                  </div>

                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-[1fr_280px]">

                  <div className="space-y-5">

                    <div>

                      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                        Suggested Reply
                      </p>

                      <div className="whitespace-pre-wrap rounded-md border border-border bg-base p-4 text-sm leading-7 text-text">
                        {draft.reply_body}
                      </div>

                    </div>

                    <div>

                      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                        AI Reasoning
                      </p>

                      <div className="rounded-md border border-border bg-base p-4 text-sm leading-7 text-muted">
                        {draft.reasoning}
                      </div>

                    </div>

                  </div>

                  <div className="flex flex-col gap-5">

                    <div className="rounded-md border border-border bg-base p-4">

                      <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted">
                        Confidence
                      </p>

                      <SignalMeter
                        value={draft.confidence}
                        label={`Confidence ${draft.confidence}`}
                      />

                    </div>

                    <div className="rounded-md border border-border bg-base p-4">

                      <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted">
                        Quick Actions
                      </p>

                      <div className="flex flex-col gap-3">

                        <button
                          onClick={() => approveDraft(draft.id)}
                          disabled={busyId === draft.id}
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-success/40 bg-success/10 px-4 py-2 text-sm text-success transition hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyId === draft.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}

                          {busyId === draft.id
                            ? "Approving..."
                            : "Approve & Send"}
                        </button>

                        <button
                          onClick={() => rejectDraft(draft.id)}
                          disabled={busyId === draft.id}
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger transition hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyId === draft.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}

                          {busyId === draft.id
                            ? "Rejecting..."
                            : "Reject"}
                        </button>

                        <Link
                          href={`/inbox/${draft.email_id}`}
                          className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm text-text transition hover:bg-surface2"
                        >
                          View Original Email
                        </Link>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

        <div className="mt-8 rounded-lg border border-border bg-surface px-5 py-4">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Queue Summary
              </p>

              <p className="mt-1 text-sm text-text">
                {drafts.length} pending draft{drafts.length === 1 ? "" : "s"} awaiting approval.
              </p>

            </div>

            <div className="text-right">

              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Backend Status
              </p>

              <p
                className={`mt-1 text-sm font-medium ${
                  poll.connected
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {poll.connected ? "Connected" : "Disconnected"}
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
