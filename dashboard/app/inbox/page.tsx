"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { CategoryBadge, ReviewBadge } from "@/components/Badge";
import { SignalMeter } from "@/components/SignalMeter";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";
import { CATEGORIES } from "@/lib/constants";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function InboxPage() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { data: emails, error, loading } = usePolling(
    () => api.emails({ category, limit: 100 }),
    5000
  );

  return (
    <div>
      <Topbar
        title="Inbox"
        description="Every email the assistant has seen, newest first."
      />

      <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-8 py-3">
        <FilterChip label="All" active={!category} onClick={() => setCategory(undefined)} />
        {CATEGORIES.map((c) => (
          <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!error && !loading && emails?.length === 0 && (
          <EmptyState
            title="No emails yet"
            description="Once the poller in main.py picks up new inbox mail, it'll show up here within one poll cycle."
          />
        )}

        {!error && emails && emails.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-mono font-normal">Sender</th>
                  <th className="px-4 py-3 font-mono font-normal">Subject</th>
                  <th className="px-4 py-3 font-mono font-normal">Category</th>
                  <th className="px-4 py-3 font-mono font-normal">Importance</th>
                  <th className="px-4 py-3 font-mono font-normal">Received</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr
                    key={email.id}
                    className="border-b border-border last:border-0 hover:bg-surface/60"
                  >
                    <td className="max-w-[180px] truncate px-4 py-3 text-text">{email.sender}</td>
                    <td className="max-w-[320px] px-4 py-3 text-text">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{email.subject}</span>
                        {email.needs_manual_review && <ReviewBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={email.category} />
                    </td>
                    <td className="px-4 py-3">
                      <SignalMeter value={email.importance_score} size="sm" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                      {timeAgo(email.received_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
        active
          ? "border-signal-mid/50 bg-signal-mid/10 text-signal-mid"
          : "border-border text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}
