"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api, type ContactRecord } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;
const FETCH_LIMIT = 200;

function ClientBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Client
    </span>
  );
}

export default function ContactsPage() {
  const poll = usePolling<ContactRecord[]>(
    () => api.contacts(FETCH_LIMIT),
    POLL_INTERVAL_MS
  );

  const [contacts, setContacts] = useState<ContactRecord[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (poll.data) setContacts(poll.data);
  }, [poll.data]);

  const filteredContacts = useMemo(() => {
    if (!contacts) return contacts;
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const hasNeverLoaded = contacts === null && poll.loading;
  const showFullPageError = !!poll.error && contacts === null;
  const showStaleBanner = !!poll.error && contacts !== null;

  return (
    <div>
      <Topbar
        title="Contacts"
        description="Everyone who's emailed you, ranked by message volume."
      />

      <div className="flex items-center gap-3 border-b border-border px-8 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-64 rounded-md border border-border bg-surface py-1.5 pl-8 pr-7 font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-signal-mid/50"
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

        {filteredContacts && (
          <span className="font-mono text-[11px] text-muted">
            {filteredContacts.length} contact
            {filteredContacts.length === 1 ? "" : "s"}
          </span>
        )}
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
          filteredContacts &&
          filteredContacts.length === 0 && (
            <EmptyState
              title={search ? "No matches" : "No contacts yet"}
              description={
                search
                  ? "Nothing matches your search."
                  : "Contacts are recorded automatically as emails come in."
              }
            />
          )}

        {!showFullPageError &&
          !hasNeverLoaded &&
          filteredContacts &&
          filteredContacts.length > 0 && (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden overflow-hidden rounded-lg border border-border md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted">
                      <th className="px-4 py-3 font-mono font-normal">
                        Name
                      </th>
                      <th className="px-4 py-3 font-mono font-normal">
                        Email
                      </th>
                      <th className="px-4 py-3 font-mono font-normal">
                        Messages
                      </th>
                      <th className="px-4 py-3 font-mono font-normal">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c) => (
                      <tr
                        key={c.email}
                        className="border-b border-border last:border-0 hover:bg-surface/60"
                      >
                        <td className="max-w-[200px] truncate px-4 py-3 text-text">
                          {c.name || (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="max-w-[240px] truncate px-4 py-3 font-mono text-xs text-muted">
                          {c.email}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text">
                          {c.message_count}
                        </td>
                        <td className="px-4 py-3">
                          {c.is_client && <ClientBadge />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {filteredContacts.map((c) => (
                  <div
                    key={c.email}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text">
                          {c.name || c.email}
                        </p>
                        {c.name && (
                          <p className="truncate font-mono text-xs text-muted">
                            {c.email}
                          </p>
                        )}
                      </div>
                      {c.is_client && <ClientBadge />}
                    </div>
                    <p className="mt-2 font-mono text-[11px] text-muted">
                      {c.message_count} message
                      {c.message_count === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
      </div>
    </div>
  );
}
