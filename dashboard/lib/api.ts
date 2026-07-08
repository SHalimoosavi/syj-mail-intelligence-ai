// All requests go through this app's own /api/backend/* proxy (see
// app/api/backend/[...path]/route.ts), which attaches the backend API key
// server-side. The browser never sees NEXT_PUBLIC_API_BASE_URL or any key —
// that env var no longer exists on purpose.
const API_BASE = "/api/backend";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Types (mirror app/api/main.py response shapes) ----

export interface EmailSummary {
  id: number;
  gmail_id: string;
  sender: string;
  subject: string;
  category: string;
  priority: string;
  importance_score: number;
  processed: boolean;
  auto_action: string | null;
  received_at: string;
  needs_manual_review: boolean;
}

export interface EmailDetail extends EmailSummary {
  body_text: string;
  classification_reason: string;
  importance_reason: string;
  ai_error_detail: string | null;
  summary: {
    one_line: string;
    short: string;
    detailed: string;
    action_items: string[];
    deadlines: string[];
    requested_tasks: string[];
  } | null;
  drafts: Draft[];
}

export interface Draft {
  id: number;
  email_id: number;
  reply_subject: string;
  reply_body: string;
  confidence: number;
  reasoning: string;
  status: "pending" | "approved" | "rejected" | "auto_sent" | "sent";
}

export interface NotificationRecord {
  id: number;
  email_id: number;
  channel: string;
  delivered: boolean;
  sent_at: string;
}

export interface ContactRecord {
  email: string;
  name: string | null;
  message_count: number;
  is_client: boolean;
}

export interface LogRecord {
  level: string;
  source: string;
  message: string;
  created_at: string;
}

export interface AnalyticsSummary {
  total_emails: number;
  important_emails: number;
  avg_importance_score: number;
  notifications_sent: number;
  by_category: Record<string, number>;
  drafts_by_status: Record<string, number>;
}

export interface SettingsView {
  environment: string;
  llm_provider: string;
  llm_model: string;
  llm_fallback_model: string;
  ollama_host: string;
  auto_send_threshold: number;
  approval_threshold: number;
  importance_notify_threshold: number;
  gmail_poll_interval_seconds: number;
  database_url: string;
  telegram_configured: boolean;
  gmail: {
    connected: boolean;
    last_error: string | null;
    last_success_at: string | null;
    last_attempt_at: string | null;
    consecutive_failures: number;
  };
}

export interface ReadyStatus {
  database: string;
  database_error: string | null;
  gmail: SettingsView["gmail"];
}

export interface PromptFile {
  name: string;
  filename: string;
  content: string;
}

// ---- API surface ----

export const api = {
  health: () => request<{ status: string }>("/health"),
  ready: () => request<ReadyStatus>("/ready"),

  emails: (params?: { category?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<EmailSummary[]>(`/emails${suffix}`);
  },

  importantEmails: (threshold = 70, limit = 50) =>
    request<EmailSummary[]>(`/emails/important?threshold=${threshold}&limit=${limit}`),

  emailDetail: (id: number) => request<EmailDetail>(`/emails/${id}`),

  drafts: (status?: string) =>
    request<Draft[]>(`/drafts${status ? `?status=${status}` : ""}`),

  pendingDrafts: () => request<Draft[]>("/drafts/pending"),

  approveDraft: (id: number) =>
    request<{ status: string; draft_id: number }>(`/drafts/${id}/approve`, { method: "POST" }),

  rejectDraft: (id: number) =>
    request<{ status: string; draft_id: number }>(`/drafts/${id}/reject`, { method: "POST" }),

  notifications: (limit = 50) =>
    request<NotificationRecord[]>(`/notifications?limit=${limit}`),

  contacts: (limit = 100) => request<ContactRecord[]>(`/contacts?limit=${limit}`),

  logs: (limit = 100) => request<LogRecord[]>(`/logs?limit=${limit}`),

  analyticsSummary: () => request<AnalyticsSummary>("/analytics/summary"),

  settings: () => request<SettingsView>("/settings"),

  prompts: () => request<PromptFile[]>("/prompts"),

  updatePrompt: (name: string, content: string) =>
    request<{ name: string; saved: boolean }>(`/prompts/${name}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
};
