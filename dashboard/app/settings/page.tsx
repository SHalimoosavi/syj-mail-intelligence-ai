"use client";

import { Topbar } from "@/components/Topbar";
import { ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { data, error, loading } = usePolling(() => api.settings(), 15000);

  return (
    <div>
      <Topbar
        title="Settings"
        description="Read-only for now — change values in .env and restart the assistant to apply them."
      />

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!loading && !error && data && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="Model">
              <Row label="Provider" value={data.llm_provider} />
              <Row label="Primary model" value={data.llm_model} mono />
              <Row label="Fallback model" value={data.llm_fallback_model} mono />
              <Row label="Ollama host" value={data.ollama_host} mono />
            </Section>

            <Section title="Approval thresholds">
              <Row label="Auto-send at" value={`${data.auto_send_threshold}%`} />
              <Row label="Ask for approval at" value={`${data.approval_threshold}%`} />
              <Row label="Notify importance at" value={`${data.importance_notify_threshold}/100`} />
            </Section>

            <Section title="Gmail">
              <Row label="Poll interval" value={`${data.gmail_poll_interval_seconds}s`} />
              <Row
                label="Connection"
                value={data.gmail.connected ? "Connected" : `Disconnected${data.gmail.consecutive_failures ? ` (${data.gmail.consecutive_failures} retries)` : ""}`}
                highlight={data.gmail.connected ? "success" : "danger"}
              />
              {!data.gmail.connected && data.gmail.last_error && (
                <p className="pt-1 font-mono text-[11px] text-danger">{data.gmail.last_error}</p>
              )}
            </Section>

            <Section title="Infrastructure">
              <Row label="Database" value={data.database_url} mono />
              <Row
                label="Telegram"
                value={data.telegram_configured ? "Configured" : "Not configured"}
                highlight={data.telegram_configured ? "success" : "danger"}
              />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-wide text-muted">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "success" | "danger";
}) {
  const color = highlight === "success" ? "#3FA796" : highlight === "danger" ? "#D6524A" : "#DCE1E8";
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-sm"} style={{ color }}>
        {value}
      </span>
    </div>
  );
}
