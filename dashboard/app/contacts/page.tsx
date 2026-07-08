"use client";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api } from "@/lib/api";

export default function ContactsPage() {
  const { data: contacts, error, loading } = usePolling(() => api.contacts(200), 10000);

  return (
    <div>
      <Topbar
        title="Contacts"
        description="Everyone the assistant has seen mail from or to, ranked by how often you correspond."
      />

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!error && !loading && contacts?.length === 0 && (
          <EmptyState
            title="No contacts learned yet"
            description="Contacts build up automatically as the assistant processes your inbox."
          />
        )}

        {!error && contacts && contacts.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-mono font-normal">Contact</th>
                  <th className="px-4 py-3 font-mono font-normal">Messages</th>
                  <th className="px-4 py-3 font-mono font-normal">Client</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.email} className="border-b border-border last:border-0 hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <div className="text-text">{c.name || c.email}</div>
                      {c.name && <div className="font-mono text-xs text-muted">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-signal-mid">{c.message_count}</td>
                    <td className="px-4 py-3">
                      {c.is_client ? (
                        <span className="font-mono text-xs text-success">Client</span>
                      ) : (
                        <span className="font-mono text-xs text-muted">—</span>
                      )}
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
