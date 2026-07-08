"use client";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

const LEVEL_COLOR: Record<string, string> = {
  info: "#8A93A3",
  warning: "#E8A33D",
  error: "#D6524A",
};

export default function LogsPage() {
  const { data: logs, error, loading } = usePolling(() => api.logs(200), 4000);

  return (
    <div>
      <Topbar title="Logs" description="Every pipeline decision, in order — classifier, poller, reply generator, notifications." />

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!error && !loading && logs?.length === 0 && (
          <EmptyState
            title="No log entries yet"
            description="Once main.py starts polling and processing mail, every step gets logged here."
          />
        )}

        {!error && logs && logs.length > 0 && (
          <div className="rounded-lg border border-border bg-[#080A0F] p-4 font-mono text-xs leading-relaxed">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 border-b border-border/50 py-1.5 last:border-0">
                <span className="shrink-0 text-muted">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
                <span
                  className="w-16 shrink-0 uppercase"
                  style={{ color: LEVEL_COLOR[log.level] || "#8A93A3" }}
                >
                  {log.level}
                </span>
                <span className="w-32 shrink-0 text-signal-mid">{log.source}</span>
                <span className="text-text">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
