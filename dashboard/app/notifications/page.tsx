"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api, type NotificationRecord } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;
const FETCH_LIMIT = 100;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DeliveredBadge({ delivered }: { delivered: boolean }) {
  return delivered ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Delivered
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-danger">
      <span className="h-1.5 w-1.5 rounded-full bg-danger" />
      Failed
    </span>
  );
}

export default function NotificationsPage() {
  const poll = usePolling<NotificationRecord[]>(
    () => api.notifications(FETCH_LIMIT),
    POLL_INTERVAL_MS
  );

  const [notifications, setNotifications] = useState<
    NotificationRecord[] | null
  >(null);

  useEffect(() => {
    if (poll.data) setNotifications(poll.data);
  }, [poll.data]);

  const hasNeverLoaded = notifications === null && poll.loading;
  const showFullPageError = !!poll.error && notifications === null;
  const showStaleBanner = !!poll.error && notifications !== null;

  return (
    <div>
      <Topbar
        title="Notifications"
        description="Delivery log for every notification the assistant has sent."
      />

      <div className="px-8 py-6">
        {showFullPageError && <ErrorState message={poll.error!} />}

        {showStaleBanner && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 font-mono text-[11px] text-danger">
            Connection lost — showing last known data. {poll.error}
          </div>
        )}

        {hasNeverLoaded && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-lg border border-border bg-surface/50"
              />
            ))}
          </div>
        )}

        {!showFullPageError &&
          !hasNeverLoaded &&
          notifications &&
          notifications.length === 0 && (
            <EmptyState
              title="No notifications sent yet"
              description="Once an email crosses the importance-notify threshold, a notification will show up here."
            />
          )}

        {!showFullPageError &&
          !hasNeverLoaded &&
          notifications &&
          notifications.length > 0 && (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden overflow-hidden rounded-lg border border-border md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted">
                      <th className="px-4 py-3 font-mono font-normal">
                        Channel
                      </th>
                      <th className="px-4 py-3 font-mono font-normal">
                        Email
                      </th>
                      <th className="px-4 py-3 font-mono font-normal">
                        Status
                      </th>
                      <th className="px-4 py-3 font-mono font-normal">
                        Sent
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((n) => (
                      <tr
                        key={n.id}
                        className="border-b border-border last:border-0 hover:bg-surface/60"
                      >
                        <td className="px-4 py-3 text-text">
                          <span className="inline-flex items-center gap-1.5">
                            <Send className="h-3.5 w-3.5 text-muted" />
                            {n.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/inbox/${n.email_id}`}
                            className="font-mono text-xs text-muted underline decoration-border underline-offset-2 hover:text-text"
                          >
                            Email #{n.email_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <DeliveredBadge delivered={n.delivered} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                          {formatDate(n.sent_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm text-text">
                        <Send className="h-3.5 w-3.5 text-muted" />
                        {n.channel}
                      </span>
                      <DeliveredBadge delivered={n.delivered} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={`/inbox/${n.email_id}`}
                        className="font-mono text-xs text-muted underline decoration-border underline-offset-2 hover:text-text"
                      >
                        Email #{n.email_id}
                      </Link>
                      <span className="font-mono text-[10px] text-muted">
                        {formatDate(n.sent_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
      </div>
    </div>
  );
}
