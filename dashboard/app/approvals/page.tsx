"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { SignalMeter } from "@/components/SignalMeter";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api, Draft } from "@/lib/api";
import { Check, X, Loader2 } from "lucide-react";

export default function ApprovalsPage() {
  const { data: drafts, error, loading } = usePolling(() => api.pendingDrafts(), 4000);
  const [actioning, setActioning] = useState<Record<number, "approve" | "reject" | undefined>>({});
  const [localHidden, setLocalHidden] = useState<Set<number>>(new Set());

  async function handleApprove(draft: Draft) {
    setActioning((s) => ({ ...s, [draft.id]: "approve" }));
    try {
      await api.approveDraft(draft.id);
      setLocalHidden((s) => new Set(s).add(draft.id));
    } catch {
      // usePolling's next tick will surface a connection error if the backend is down
    } finally {
      setActioning((s) => ({ ...s, [draft.id]: undefined }));
    }
  }

  async function handleReject(draft: Draft) {
    setActioning((s) => ({ ...s, [draft.id]: "reject" }));
    try {
      await api.rejectDraft(draft.id);
      setLocalHidden((s) => new Set(s).add(draft.id));
    } catch {
      // as above
    } finally {
      setActioning((s) => ({ ...s, [draft.id]: undefined }));
    }
  }

  const visibleDrafts = (drafts || []).filter((d) => !localHidden.has(d.id));

  return (
    <div>
      <Topbar
        title="Approval Queue"
        description="Drafts with 80-94% confidence sit here — below auto-send, above discard. Approve to send as-is, or reject to keep it as a draft only."
      />

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!error && !loading && visibleDrafts.length === 0 && (
          <EmptyState
            title="Queue is empty"
            description="High-confidence replies send automatically; low-confidence ones stay as drafts without needing your review. This queue is only the in-between cases."
          />
        )}

        <div className="space-y-4">
          {visibleDrafts.map((draft) => (
            <div key={draft.id} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs uppercase tracking-wide text-muted">
                    Reply subject
                  </p>
                  <p className="mt-1 text-sm text-text">{draft.reply_subject}</p>
                </div>
                <SignalMeter value={draft.confidence} label="Reply confidence" />
              </div>

              <div className="mt-4 rounded-md border border-border bg-base p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {draft.reply_body}
                </p>
              </div>

              {draft.reasoning && (
                <p className="mt-3 font-mono text-xs italic text-muted">— {draft.reasoning}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleApprove(draft)}
                  disabled={!!actioning[draft.id]}
                  className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
                >
                  {actioning[draft.id] === "approve" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Approve &amp; send
                </button>
                <button
                  onClick={() => handleReject(draft)}
                  disabled={!!actioning[draft.id]}
                  className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
                >
                  {actioning[draft.id] === "reject" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <X size={14} />
                  )}
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
