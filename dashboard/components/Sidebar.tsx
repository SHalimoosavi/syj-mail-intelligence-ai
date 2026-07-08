"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox, Radar, CheckSquare, Bell, BarChart3,
  Users, Terminal, Settings as SettingsIcon, FileEdit,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/important", label: "Important", icon: Radar },
  { href: "/approvals", label: "Approval Queue", icon: CheckSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/prompts", label: "Prompt Editor", icon: FileEdit },
  { href: "/logs", label: "Logs", icon: Terminal },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-5 py-5">
        <div className="font-display text-sm font-semibold tracking-tight text-text">
          SYJ Mail Intelligence
        </div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
          Signal Console
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-surface2 text-text"
                  : "text-muted hover:bg-surface2/60 hover:text-text"
              }`}
            >
              <Icon size={16} strokeWidth={1.75} className={active ? "text-signal-mid" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4 font-mono text-[10px] text-muted">
        SAYANJALI NEXUS
      </div>
    </aside>
  );
}
