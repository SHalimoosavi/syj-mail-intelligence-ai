const CATEGORY_COLORS: Record<string, string> = {
  Urgent: "#D6524A",
  Important: "#E8A33D",
  Client: "#5AC8C8",
  Business: "#5AC8C8",
  Finance: "#E8A33D",
  Invoice: "#E8A33D",
  Payment: "#3FA796",
  "Security Alert": "#D6524A",
  "Support Ticket": "#5AC8C8",
  Meeting: "#5AC8C8",
  "Job Opportunity": "#3FA796",
  Spam: "#5A6273",
  Scam: "#D6524A",
  Phishing: "#D6524A",
  Newsletter: "#5A6273",
  Promotion: "#5A6273",
};

function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] || "#8A93A3";
}

export function CategoryBadge({ category }: { category: string }) {
  const color = colorForCategory(category);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide"
      style={{ borderColor: `${color}55`, color, backgroundColor: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {category}
    </span>
  );
}

const PRIORITY_ORDER: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function PriorityBadge({ priority }: { priority: string }) {
  const color =
    priority === "Critical" ? "#D6524A" :
    priority === "High" ? "#E8A33D" :
    priority === "Medium" ? "#5AC8C8" : "#8A93A3";
  return (
    <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color }}>
      {"▮".repeat(PRIORITY_ORDER[priority] || 1)}
      {"▯".repeat(4 - (PRIORITY_ORDER[priority] || 1))} {priority}
    </span>
  );
}

export function ReviewBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide"
      style={{ borderColor: "#D6524A55", color: "#D6524A", backgroundColor: "#D6524A14" }}
      title="AI processing failed for at least one stage on this email — it's showing fallback defaults"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#D6524A]" />
      Needs review
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: "#E8A33D", label: "Awaiting approval" },
    approved: { color: "#3FA796", label: "Approved" },
    rejected: { color: "#5A6273", label: "Rejected" },
    auto_sent: { color: "#3FA796", label: "Auto-sent" },
    sent: { color: "#3FA796", label: "Sent" },
  };
  const { color, label } = map[status] || { color: "#8A93A3", label: status };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px]"
      style={{ borderColor: `${color}55`, color, backgroundColor: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
