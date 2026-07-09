"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  ShieldAlert,
  CheckSquare,
  Bell,
  BarChart3,
  Users,
  Terminal,
  Settings,
  FileEdit,
  ChevronRight,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Executive overview",
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: Inbox,
    description: "Processed emails",
  },
  {
    href: "/manual-review",
    label: "Manual Review",
    icon: ShieldAlert,
    description: "AI exceptions",
  },
  {
    href: "/approvals",
    label: "Approval Queue",
    icon: CheckSquare,
    description: "Pending replies",
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    description: "Delivery history",
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Business intelligence",
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Users,
    description: "Relationship database",
  },
  {
    href: "/prompts",
    label: "Prompt Editor",
    icon: FileEdit,
    description: "AI prompt management",
  },
  {
    href: "/logs",
    label: "System Logs",
    icon: Terminal,
    description: "Runtime events",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Platform configuration",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-border bg-surface">

      <div className="border-b border-border px-6 py-6">

        <div className="font-display text-lg font-semibold text-text">
          SYJ Mail Intelligence AI
        </div>

        <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
          Signal Console
        </div>

      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

        {NAV_ITEMS.map((item) => {

          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          return (

            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between rounded-lg border px-4 py-3 transition-all duration-200 ${
                active
                  ? "border-signal-mid/40 bg-surface2 shadow-panel"
                  : "border-transparent hover:border-border hover:bg-surface2/70"
              }`}
            >

              <div className="flex min-w-0 items-center gap-3">

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
                    active
                      ? "border-signal-mid/30 bg-signal-mid/10"
                      : "border-border bg-base group-hover:border-signal-mid/20"
                  }`}
                >

                  <Icon
                    size={18}
                    strokeWidth={1.9}
                    className={
                      active
                        ? "text-signal-mid"
                        : "text-muted group-hover:text-text"
                    }
                  />

                </div>

                <div className="min-w-0">

                  <div
                    className={`truncate font-medium ${
                      active
                        ? "text-text"
                        : "text-muted group-hover:text-text"
                    }`}
                  >
                    {item.label}
                  </div>

                  <div className="truncate text-[11px] text-muted">
                    {item.description}
                  </div>

                </div>

              </div>

              <ChevronRight
                size={16}
                className={`transition-all ${
                  active
                    ? "translate-x-0 text-signal-mid"
                    : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-muted"
                }`}
              />

            </Link>

          );

        })}
      </nav>

      <div className="border-t border-border p-4">

        <div className="rounded-lg border border-border bg-base p-4">

          <div className="flex items-center justify-between">

            <div>

              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                System
              </p>

              <p className="mt-1 text-sm font-medium text-text">
                Backend Status
              </p>

            </div>

            <span className="flex h-3 w-3">

              <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-success opacity-30" />

              <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />

            </span>

          </div>

          <div className="mt-4 space-y-3">

            <div className="flex items-center justify-between">

              <span className="text-xs text-muted">
                Environment
              </span>

              <span className="font-mono text-xs text-success">
                Production
              </span>

            </div>

            <div className="flex items-center justify-between">

              <span className="text-xs text-muted">
                Frontend
              </span>

              <span className="font-mono text-xs text-text">
                Next.js 14
              </span>

            </div>

            <div className="flex items-center justify-between">

              <span className="text-xs text-muted">
                Backend
              </span>

              <span className="font-mono text-xs text-text">
                FastAPI
              </span>

            </div>

            <div className="flex items-center justify-between">

              <span className="text-xs text-muted">
                AI Engine
              </span>

              <span className="font-mono text-xs text-text">
                Ollama
              </span>

            </div>

            <div className="flex items-center justify-between">

              <span className="text-xs text-muted">
                Database
              </span>

              <span className="font-mono text-xs text-text">
                SQLite
              </span>

            </div>

          </div>

        </div>

      </div>

      <div className="border-t border-border bg-surface px-5 py-4">

        <div className="flex items-center justify-between">

          <div>

            <div className="font-display text-sm font-semibold text-text">
              SAYANJALI NEXUS
            </div>

            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
              SYJ Mail Intelligence AI
            </div>

          </div>

          <div className="rounded-md border border-success/30 bg-success/10 px-2 py-1">

            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-success">
              v1.0.0
            </span>

          </div>

        </div>

        <div className="mt-4 rounded-md border border-border bg-base px-3 py-2">

          <div className="flex items-center justify-between">

            <span className="text-[11px] text-muted">
              Build
            </span>

            <span className="font-mono text-[11px] text-text">
              Production
            </span>

          </div>

          <div className="mt-2 flex items-center justify-between">

            <span className="text-[11px] text-muted">
              Framework
            </span>

            <span className="font-mono text-[11px] text-text">
              Next.js + FastAPI
            </span>

          </div>

          <div className="mt-2 flex items-center justify-between">

            <span className="text-[11px] text-muted">
              Platform
            </span>

            <span className="font-mono text-[11px] text-text">
              Railway / Vercel
            </span>

          </div>

        </div>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          © 2026 SAYANJALI NEXUS PRIVATE LIMITED
        </p>

      </div>

    </aside>

  );

}
