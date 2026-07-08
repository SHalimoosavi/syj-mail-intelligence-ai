"use client";

import { Topbar } from "@/components/Topbar";
import { ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

export default function AnalyticsPage() {
  const { data, error, loading } = usePolling(() => api.analyticsSummary(), 10000);

  return (
    <div>
      <Topbar title="Analytics" description="How the assistant has triaged your inbox so far." />

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!loading && !error && data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Total emails" value={data.total_emails} />
              <StatCard label="Important" value={data.important_emails} accent="mid" />
              <StatCard label="Avg. importance" value={data.avg_importance_score} accent="mid" />
              <StatCard label="Notifications sent" value={data.notifications_sent} accent="success" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BreakdownCard title="By category" entries={data.by_category} />
              <BreakdownCard title="Drafts by status" entries={data.drafts_by_status} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "mid" | "success";
}) {
  const color = accent === "mid" ? "#E8A33D" : accent === "success" ? "#3FA796" : "#DCE1E8";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function BreakdownCard({ title, entries }: { title: string; entries: Record<string, number> }) {
  const sorted = Object.entries(entries).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(([, v]) => v), 1);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted">{title}</p>
      {sorted.length === 0 && <p className="text-xs text-muted">No data yet.</p>}
      <div className="space-y-2">
        {sorted.map(([key, count]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs text-text">{key}</span>
            <div className="h-2 flex-1 rounded-full bg-base">
              <div
                className="h-2 rounded-full bg-signal-mid"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-xs text-muted">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
