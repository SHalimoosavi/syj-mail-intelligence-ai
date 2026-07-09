"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

import { Topbar } from "@/components/Topbar";
import {
  CategoryBadge,
  PriorityBadge,
  ReviewBadge,
  StatusBadge,
} from "@/components/Badge";
import { SignalMeter } from "@/components/SignalMeter";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api, type EmailDetail, type Draft } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function EmailDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const emailId = Number(params.id);

  const poll = usePolling<EmailDetail>(
    () => api.emailDetail(emailId),
    POLL_INTERVAL_MS
  );

  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (poll.data) setDetail(poll.data);
  }, [poll.data]);

  const refetchNow = useCallback(async () => {
    try {
      const result = await api.emailDetail(emailId);
      setDetail(result);
    } catch {
      // poll.error already reflects the underlying connection state.
    }
  }, [emailId]);

  async function handleApprove(draft: Draft) {
    setActionLoading(draft.id);
    setActionError(null);
    try {
      await api.approveDraft(draft.id);
      await refetchNow();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to approve draft."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(draft: Draft) {
    setActionLoading(draft.id);
    setActionError(null);
    try {
      await api.rejectDraft(draft.id);
      await refetchNow();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to reject draft."
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (Number.isNaN(emailId)) {
    return (
      <div className="px-8 py-6">
        <ErrorState message="Invalid email id in URL." />
      </div>
    );
  }

  const hasNeverLoaded = detail === null && poll.loading;
  const showFullPageError = !!poll.error && detail === null;
  const showStaleBanner = !!poll.error && detail !== null;

  return (
    <div>
      <Topbar
        title={detail ? detail.subject : "Email"}
        description={detail ? `From ${detail.sender}` : undefined}
      />

      <div className="border-b border-border px-8 py-3">
        <button
          onClick={() => router.push("/inbox")}
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to inbox
        </button>
      </div>

      <div className="px-8 py-6">
        {showFullPageError && <ErrorState message={poll.error!} />}

        {showStaleBanner && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 font-mono text-[11px] text-danger">
            Connection lost — showing last known data. {poll.error}
          </div>
        )}

        {hasNeverLoaded && (
          <div className="flex flex-col gap-3">
            <div className="h-24 animate-pulse rounded-lg border border-border bg-surface/50" />
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="h-96 animate-pulse rounded-lg border border-border bg-surface/50" />
              <div className="h-96 animate-pulse rounded-lg border border-border bg-surface/50" />
            </div>
          </div>
        )}

        {!showFullPageError && !hasNeverLoaded && detail === null && (
          <EmptyState
            title="Email not found"
            description="This email may have been removed, or the id in the URL doesn't exist."
          />
        )}

        {!showFullPageError && !hasNeverLoaded && detail && (
          <div className="flex flex-col gap-4">
            {/* Header row: badges + metadata */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3">
              <CategoryBadge category={detail.category} />
              <PriorityBadge priority={detail.priority} />
              <SignalMeter
                value={detail.importance_score}
                size="sm"
                label={`Importance ${detail.importance_score} of 100`}
              />
              {detail.needs_manual_review && <ReviewBadge />}
              <span className="ml-auto font-mono text-[11px] text-muted">
                {formatDate(detail.received_at)}
              </span>
            </div>

            {detail.ai_error_detail && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-danger">
                    AI pipeline error on this email
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {detail.ai_error_detail}
                  </p>
                </div>
              </div>
            )}

            {actionError && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 font-mono text-[11px] text-danger">
                {actionError}
              </div>
            )}

            {/* Main 4-panel layout: left = original email, right = summary + reply */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              {/* Left panel: original email */}
              <div className="rounded-lg border border-border">
                <div className="border-b border-border bg-surface px-4 py-2.5">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    Original email
                  </p>
                </div>
                <div className="px-4 py-4">
                  <p className="mb-3 text-sm text-text">
                    <span className="text-muted">From: </span>
                    {detail.sender}
                  </p>
                  <p className="mb-4 text-sm text-text">
                    <span className="text-muted">Subject: </span>
                    {detail.subject}
                  </p>
                  <div className="whitespace-pre-wrap rounded-md border border-border bg-surface/40 p-3 text-sm text-text">
                    {detail.body_text}
                  </div>
                </div>
              </div>

              {/* Right column: AI summary + reply */}
              <div className="flex flex-col gap-4">
                {/* AI Summary panel */}
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border bg-surface px-4 py-2.5">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                      AI summary
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    {!detail.summary && (
                      <p className="text-xs text-muted">
                        No summary was generated for this email.
                      </p>
                    )}

                    {detail.summary && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                            One-line
                          </p>
                          <p className="text-sm text-text">
                            {detail.summary.one_line}
                          </p>
                        </div>

                        <div>
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                            Detailed
                          </p>
                          <p className="text-sm leading-relaxed text-text">
                            {detail.summary.detailed}
                          </p>
                        </div>

                        {detail.summary.action_items.length > 0 && (
                          <div>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                              Action items
                            </p>
                            <ul className="list-inside list-disc text-sm text-text">
                              {detail.summary.action_items.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {detail.summary.deadlines.length > 0 && (
                          <div>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                              Deadlines
                            </p>
                            <ul className="list-inside list-disc text-sm text-text">
                              {detail.summary.deadlines.map((d, i) => (
                                <li key={i}>{d}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {detail.summary.requested_tasks.length > 0 && (
                          <div>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                              Requested tasks
                            </p>
                            <ul className="list-inside list-disc text-sm text-text">
                              {detail.summary.requested_tasks.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                              Classification reasoning
                            </p>
                            <p className="text-xs text-muted">
                              {detail.classification_reason}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                              Importance reasoning
                            </p>
                            <p className="text-xs text-muted">
                              {detail.importance_reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply panel */}
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border bg-surface px-4 py-2.5">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                      Suggested reply
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    {detail.drafts.length === 0 && (
                      <p className="text-xs text-muted">
                        No reply was generated for this email (category may
                        exclude replies, or generation failed).
                      </p>
                    )}

                    {detail.drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge status={draft.status} />
                          <SignalMeter
                            value={draft.confidence}
                            size="sm"
                            label={`Confidence ${draft.confidence} of 100`}
                          />
                        </div>

                        <div>
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                            Subject
                          </p>
                          <p className="text-sm text-text">
                            {draft.reply_subject}
                          </p>
                        </div>

                        <div>
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                            Reply body
                          </p>
                          <div className="whitespace-pre-wrap rounded-md border border-border bg-surface/40 p-3 text-sm text-text">
                            {draft.reply_body}
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted">
                            Read-only for now — editing before send needs a
                            small backend addition (a save endpoint for
                            drafts) so an edit can't silently be dropped in
                            favor of the original text.
                          </p>
                        </div>

                        <div>
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                            AI reasoning
                          </p>
                          <p className="text-xs text-muted">
                            {draft.reasoning}
                          </p>
                        </div>

                        {draft.status === "pending" && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleApprove(draft)}
                              disabled={actionLoading === draft.id}
                              className="flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {actionLoading === draft.id
                                ? "Sending…"
                                : "Approve & send"}
                            </button>
                            <button
                              onClick={() => handleReject(draft)}
                              disabled={actionLoading === draft.id}
                              className="flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
