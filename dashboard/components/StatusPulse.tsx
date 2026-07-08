"use client";

import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

/**
 * Reflects real readiness (GET /ready: database + Gmail), not just process
 * liveness. Three states, not two — the API being reachable but Gmail being
 * disconnected is a normal, non-broken state (see app/gmail/poller.py's
 * lazy reconnect) and shouldn't look identical to "backend is down".
 */
export function StatusPulse() {
  const { data, connected } = usePolling(() => api.ready(), 8000);

  const backendDown = !connected;
  const dbDown = connected && data?.database !== "ok";
  const gmailDown = connected && data?.database === "ok" && !data?.gmail.connected;

  const color = backendDown || dbDown ? "bg-danger" : gmailDown ? "bg-signal-mid" : "bg-success";
  const label = backendDown
    ? "Backend unreachable"
    : dbDown
    ? "Database unreachable"
    : gmailDown
    ? "Gmail disconnected"
    : "All systems connected";

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface2 px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${color} ${!backendDown && !dbDown ? "" : "animate-ping"}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
