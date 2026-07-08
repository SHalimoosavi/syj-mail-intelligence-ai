"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { CategoryBadge, PriorityBadge } from "@/components/Badge";
import { SignalMeter } from "@/components/SignalMeter";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

export default function ImportantPage() {
  const [threshold, setThreshold] = useState(70);
  const { data: emails, error, loading } = usePolling(
    () => api.importantEmails(threshold, 100),
    5000
  );

  return (
    <div>
      <Topbar
        title="Important"
        description="Emails that crossed the importance threshold and triggered (or would trigger) a notification."
      />

      <div className="flex items-center gap-4 border-b border-border px-8 py-4">
        <label className="font-mono text-[11px] uppercase tracking-wide text-muted">
          Threshold
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-48 accent-[#E8A33D]"
        />
        <span className="font-mono text-sm text-signal-mid">{threshold}</span>
      </div>

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!error && !loading && emails?.length === 0 && (
          <EmptyState
            title="Nothing above this threshold"
            description="Lower the threshold slider, or wait for the next poll cycle to bring in new mail."
          />
        )}

        {!error && emails && emails.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className="rounded-lg border border-border bg-surface p-4 shadow-panel"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">{email.subject}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted">{email.sender}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <CategoryBadge category={email.category} />
                  <PriorityBadge priority={email.priority} />
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <SignalMeter value={email.importance_score} label="Importance score" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
