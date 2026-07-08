"use client";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";
import { Send, XCircle } from "lucide-react";

export default function NotificationsPage() {
  const { data: notifications, error, loading } = usePolling(() => api.notifications(100), 6000);

  return (
    <div>
      <Topbar
        title="Notifications"
        description="Every alert the assistant has sent out, and whether delivery succeeded."
      />

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!error && !loading && notifications?.length === 0 && (
          <EmptyState
            title="No notifications sent yet"
            description="Emails scoring above the importance threshold in Settings trigger a Telegram alert. Nothing has crossed it yet."
          />
        )}

        {!error && notifications && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {n.delivered ? (
                    <Send size={15} className="text-success" />
                  ) : (
                    <XCircle size={15} className="text-danger" />
                  )}
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">
                    {n.channel}
                  </span>
                  <span className="text-sm text-text">Email #{n.email_id}</span>
                </div>
                <span className="font-mono text-xs text-muted">
                  {new Date(n.sent_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
