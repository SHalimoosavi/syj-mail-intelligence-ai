"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, X } from "lucide-react";

import { Topbar } from "@/components/Topbar";
import { CategoryBadge, PriorityBadge, ReviewBadge } from "@/components/Badge";
import { SignalMeter } from "@/components/SignalMeter";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api, type EmailSummary } from "@/lib/api";
import { CATEGORIES } from "@/lib/constants";

const POLL_INTERVAL_MS = 5000;
const INITIAL_LIMIT = 100;
const LOAD_MORE_STEP = 100;
const MAX_LIMIT = 500;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Derives a human label for what the pipeline actually did with an email,
 * from the real fields the API returns (auto_action / processed /
 * needs_manual_review) rather than a fabricated "confidence" field the
 * /emails endpoint doesn't send.
 */
function aiStatusLabel(email: EmailSummary): { label: string; color: string } {
  if (email.needs_manual_review) {
    return { label: "Needs review", color: "#D6524A" };
  }
  switch (email.auto_action) {
    case "archive":
      return { label: "Auto-archived", color: "#5A6273" };
    case "ignore":
      return { label: "Ignored", color: "#5A6273" };
    case "summarize_only":
      return { label: "Summarized", color: "#8A93A3" };
    case "notify_immediately":
      return { label: "Notified", color: "#E8A33D" };
    case "archive_after_summary":
      return { label: "Archived after summary", color: "#5A6273" };
    default:
      return email.processed
        ? { label: "Processed", color: "#3FA796" }
        : { label: "Processing…", color: "#8A93A3" };
  }
}

export default function InboxPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Background live updates every 5s, mirroring the backend's own polling
  // model (see usePolling.ts). Category/limit changes are picked up on the
  // NEXT tick automatically since fetcherRef always holds the latest
  // closure — but we don't want the user to wait up to 5s after clicking a
  // filter chip, so filter changes and manual refresh trigger an immediate
  // fetch below, merged into local `emails` state alongside the poll data.
  const poll = usePolling<EmailSummary[]>(
    () => api.emails({ category, limit }),
    POLL_INTERVAL_MS
  );

  const [emails, setEmails] = useState<EmailSummary[] | null>(null);

  useEffect(() => {
    if (poll.data) setEmails(poll.data);
  }, [poll.data]);

  const fetchNow = useCallback(async () => {
    setManualRefreshing(true);
    try {
      const result = await api.emails({ category, limit });
      setEmails(result);
    } catch {
      // poll.error will surface the connection state below; avoid a second
      // competing error state for the same underlying failure.
    } finally {
      setManualRefreshing(false);
    }
  }, [category, limit]);

  // Immediate fetch whenever the filter or page size changes, rather than
  // waiting for the next background poll tick.
  useEffect(() => {
    fetchNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, limit]);

  const filteredEmails = useMemo(() => {
    if (!emails) return emails;
    const q = search.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter(
      (e) =>
        e.sender.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q)
    );
  }, [emails, search]);

  const allVisibleSelected =
    !!filteredEmails &&
    filteredEmails.length > 0 &&
    filteredEmails.every((e) => selected.has(e.id));

  function toggleSelectAll() {
    if (!filteredEmails) return;
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filteredEmails.forEach((e) => next.delete(e.id));
        return next;
      }
      const next = new Set(prev);
      filteredEmails.forEach((e) => next.add(e.id));
      return next;
    });
  }

  function toggleSelectOne(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Keyboard shortcuts: "/" focuses search, "r" refreshes, Escape clears
  // search or selection. Ignored while typing in an input/textarea, except
  // Escape which should still work to blur/clear.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        if (search) setSearch("");
        else if (selected.size > 0) setSelected(new Set());
        (target as HTMLInputElement).blur?.();
        return;
      }

      if (isTyping) return;

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "r") {
        fetchNow();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [search, selected, fetchNow]);

  const hasNeverLoaded = emails === null && poll.loading;
  const showFullPageError = !!poll.error && emails === null;
  const showStaleBanner = !!poll.error && emails !== null;
  const canLoadMore = !!emails && emails.length >= limit && limit < MAX_LIMIT;

  return (
    <div>
      <Topbar
        title="Inbox"
        description="Every email the assistant has seen, newest first."
      />

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sender or subject… ( / )"
            className="w-56 rounded-md border border-border bg-surface py-1.5 pl-8 pr-7 font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-signal-mid/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={fetchNow}
          disabled={manualRefreshing}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-muted transition-colors hover:text-text disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${manualRefreshing ? "animate-spin" : ""}`}
          />
          Refresh ( r )
        </button>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-signal-mid/40 bg-signal-mid/10 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-signal-mid">
            {selected.size} selected
            <button
              onClick={() => setSelected(new Set())}
              className="text-signal-mid/70 hover:text-signal-mid"
            >
              Clear
            </button>
          </div>
        )}

        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              poll.connected ? "bg-[#3FA796]" : "bg-[#D6524A]"
            }`}
          />
          {poll.connected ? "Live · updates every 5s" : "Reconnecting…"}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-8 py-3">
        <FilterChip
          label="All"
          active={!category}
          onClick={() => setCategory(undefined)}
        />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={c}
            active={category === c}
            onClick={() => setCategory(c)}
          />
        ))}
      </div>

      <div className="px-8 py-6">
        {showFullPageError && <ErrorState message={poll.error!} />}

        {showStaleBanner && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 font-mono text-[11px] text-danger">
            Connection lost — showing last known data. {poll.error}
          </div>
        )}

        {hasNeverLoaded && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-lg border border-border bg-surface/50"
              />
            ))}
          </div>
        )}

        {!showFullPageError &&
          !hasNeverLoaded &&
          filteredEmails &&
          filteredEmails.length === 0 && (
            <EmptyState
              title={search ? "No matches" : "No emails yet"}
              description={
                search
                  ? "Nothing in the current view matches your search."
                  : "Once the poller in main.py picks up new inbox mail, it'll show up here within one poll cycle."
              }
            />
          )}

        {!showFullPageError &&
          !hasNeverLoaded &&
          filteredEmails &&
          filteredEmails.length > 0 && (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden overflow-hidden rounded-lg border border-border md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all visible emails"
                        />
                      </th>
                      <th className="px-4 py-3 font-mono font-normal">Sender</th>
                      <th className="px-4 py-3 font-mono font-normal">Subject</th>
                      <th className="px-4 py-3 font-mono font-normal">Category</th>
                      <th className="px-4 py-3 font-mono font-normal">Priority</th>
                      <th className="px-4 py-3 font-mono font-normal">Importance</th>
                      <th className="px-4 py-3 font-mono font-normal">AI Status</th>
                      <th className="px-4 py-3 font-mono font-normal">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmails.map((email) => {
                      const status = aiStatusLabel(email);
                      return (
                        <tr
                          key={email.id}
                          onClick={() => router.push(`/inbox/${email.id}`)}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-surface/60"
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(email.id)}
                              onChange={() => {}}
                              onClick={(e) => toggleSelectOne(email.id, e)}
                              aria-label={`Select email from ${email.sender}`}
                            />
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-text">
                            {email.sender}
                          </td>
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
                            <PriorityBadge priority={email.priority} />
                          </td>
                          <td className="px-4 py-3">
                            <SignalMeter value={email.importance_score} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="font-mono text-[11px] uppercase tracking-wide"
                              style={{ color: status.color }}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                            {timeAgo(email.received_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {filteredEmails.map((email) => {
                  const status = aiStatusLabel(email);
                  return (
                    <div
                      key={email.id}
                      onClick={() => router.push(`/inbox/${email.id}`)}
                      className="rounded-lg border border-border p-3 active:bg-surface/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-text">{email.sender}</p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {email.subject}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selected.has(email.id)}
                          onChange={() => {}}
                          onClick={(e) => toggleSelectOne(email.id, e)}
                          aria-label={`Select email from ${email.sender}`}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <CategoryBadge category={email.category} />
                        <PriorityBadge priority={email.priority} />
                        {email.needs_manual_review && <ReviewBadge />}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <SignalMeter value={email.importance_score} size="sm" />
                        <span className="font-mono text-[10px] text-muted">
                          {timeAgo(email.received_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canLoadMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() =>
                      setLimit((l) => Math.min(l + LOAD_MORE_STEP, MAX_LIMIT))
                    }
                    className="rounded-md border border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide text-muted transition-colors hover:text-text"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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
