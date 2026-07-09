"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  FileText,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { Topbar } from "@/components/Topbar";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { api, type PromptFile } from "@/lib/api";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [selected, setSelected] = useState<PromptFile | null>(null);

  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function loadPrompts() {
    try {
      setLoading(true);
      setError(null);

      const result = await api.prompts();

      setPrompts(result);

      if (result.length > 0) {
        setSelected(result[0]);
        setContent(result[0].content);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load prompts."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrompts();
  }, []);

  async function savePrompt() {
    if (!selected) return;

    try {
      setSaving(true);
      setStatus(null);

      await api.updatePrompt(
        selected.name,
        content
      );

      setPrompts((current) =>
        current.map((prompt) =>
          prompt.name === selected.name
            ? {
                ...prompt,
                content,
              }
            : prompt
        )
      );

      setSelected({
        ...selected,
        content,
      });

      setStatus("Prompt saved successfully.");
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Unable to save prompt."
      );
    } finally {
      setSaving(false);
    }
  }

  return (

    <div>

      <Topbar
        title="Prompt Management"
        description="View and edit AI prompt templates used throughout the backend."
      />

      <div className="border-b border-border bg-base px-8 py-5">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="font-display text-xl font-semibold text-text">
              AI Prompt Library
            </h2>

            <p className="mt-1 text-sm text-muted">
              Prompt updates are written directly to the backend.
            </p>

          </div>

          <button
            onClick={loadPrompts}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text transition hover:bg-surface2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

        </div>

      </div>

      <div className="px-8 py-6">

        {loading && (

          <div className="space-y-3">

            {Array.from({ length: 6 }).map((_, index) => (

              <div
                key={index}
                className="h-24 animate-pulse rounded-lg border border-border bg-surface"
              />

            ))}

          </div>

        )}

        {!loading && error && (
          <ErrorState message={error} />
        )}

        {!loading &&
          !error &&
          prompts.length === 0 && (

          <EmptyState
            title="No prompt files"
            description="The backend did not return any editable prompt templates."
          />

        )}

        {!loading &&
          !error &&
          prompts.length > 0 && (

          <div className="grid gap-6 lg:grid-cols-4">

            <div className="rounded-lg border border-border bg-surface">

              <div className="border-b border-border px-4 py-3">

                <h3 className="font-display text-lg font-semibold text-text">
                  Prompt Files
                </h3>

              </div>

              <div className="divide-y divide-border">

                {prompts.map((prompt) => (

                  <button
                    key={prompt.name}
                    type="button"
                    onClick={() => {
                      setSelected(prompt);
                      setContent(prompt.content);
                      setStatus(null);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-4 text-left transition ${
                      selected?.name === prompt.name
                        ? "bg-surface2"
                        : "hover:bg-surface2"
                    }`}
                  >

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <BrainCircuit className="h-4 w-4 text-signal-mid" />

                        <span className="truncate font-medium text-text">
                          {prompt.name}
                        </span>

                      </div>

                      <p className="mt-1 truncate font-mono text-xs text-muted">
                        {prompt.filename}
                      </p>

                    </div>

                    {selected?.name === prompt.name && (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}

                  </button>

                ))}

              </div>

            </div>

            <div className="lg:col-span-3">

              <div className="rounded-lg border border-border bg-surface">

                <div className="flex items-center justify-between border-b border-border px-6 py-4">

                  <div>

                    <h3 className="font-display text-lg font-semibold text-text">
                      {selected?.name ?? "Prompt"}
                    </h3>

                    <p className="mt-1 font-mono text-xs text-muted">
                      {selected?.filename}
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={savePrompt}
                    disabled={saving || !selected}
                    className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm text-success transition hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />

                    {saving ? "Saving..." : "Save Prompt"}

                  </button>

                </div>

                <div className="p-6">

                  <textarea
                    value={content}
                    onChange={(e) =>
                      setContent(e.target.value)
                    }
                    spellCheck={false}
                    className="min-h-[600px] w-full rounded-lg border border-border bg-base p-4 font-mono text-sm leading-7 text-text outline-none transition focus:border-signal-mid"
                  />

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">

                    <div className="rounded-lg border border-border bg-base p-4">

                      <div className="flex items-center gap-2">

                        <FileText className="h-4 w-4 text-signal-mid" />

                        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                          Statistics
                        </span>

                      </div>

                      <div className="mt-4 space-y-3">

                        <div className="flex items-center justify-between">

                          <span className="text-sm text-muted">
                            Characters
                          </span>

                          <span className="font-mono text-sm text-text">
                            {content.length}
                          </span>

                        </div>

                        <div className="flex items-center justify-between">

                          <span className="text-sm text-muted">
                            Words
                          </span>

                          <span className="font-mono text-sm text-text">
                            {
                              content.trim().length === 0
                                ? 0
                                : content.trim().split(/\s+/).length
                            }
                          </span>

                        </div>

                        <div className="flex items-center justify-between">

                          <span className="text-sm text-muted">
                            Lines
                          </span>

                          <span className="font-mono text-sm text-text">
                            {content.split("\n").length}
                          </span>

                        </div>

                      </div>

                    </div>

                    <div className="rounded-lg border border-border bg-base p-4 lg:col-span-2">

                      <div className="flex items-center gap-2">

                        <BrainCircuit className="h-4 w-4 text-signal-mid" />

                        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                          Prompt Information
                        </span>

                      </div>

                      <div className="mt-4 space-y-3 text-sm text-muted">

                        <p>
                          Prompt templates are stored on the backend and loaded
                          dynamically by the AI pipeline.
                        </p>

                        <p>
                          Editing a prompt updates the corresponding template
                          file without requiring a frontend rebuild.
                        </p>

                        <p>
                          Changes affect future AI requests only. Previously
                          processed emails remain unchanged.
                        </p>

                      </div>

                    </div>

                  </div>

                  {status && (

                    <div
                      className={`mt-6 flex items-start gap-3 rounded-lg border px-4 py-3 ${
                        status.toLowerCase().includes("saved")
                          ? "border-success/30 bg-success/10"
                          : "border-danger/30 bg-danger/10"
                      }`}
                    >

                      {status.toLowerCase().includes("saved") ? (

                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-success flex-shrink-0" />

                      ) : (

                        <AlertTriangle className="mt-0.5 h-5 w-5 text-danger flex-shrink-0" />

                      )}

                      <div>

                        <p
                          className={`font-mono text-[11px] uppercase tracking-wide ${
                            status.toLowerCase().includes("saved")
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          {status.toLowerCase().includes("saved")
                            ? "Save Successful"
                            : "Save Failed"}
                        </p>

                        <p className="mt-1 text-sm text-muted">
                          {status}
                        </p>

                      </div>

                    </div>

                  )}

                </div>

              </div>

            </div>

            <div className="mt-6 rounded-lg border border-border bg-surface p-6">

              <div className="flex items-center gap-3">

                <BrainCircuit className="h-5 w-5 text-signal-mid" />

                <h3 className="font-display text-lg font-semibold text-text">
                  Administrator Notes
                </h3>

              </div>

              <div className="mt-5 space-y-4 text-sm leading-7 text-muted">

                <p>
                  Prompt templates define the behavior of every AI stage
                  including classification, importance scoring,
                  summarization, and reply generation.
                </p>

                <p>
                  Keep prompts concise and deterministic. Small prompt
                  adjustments usually produce more predictable results than
                  large rewrites.
                </p>

                <p>
                  Test prompt changes using the backend regression suite
                  before deploying to production to ensure classification,
                  summaries, and reply quality remain consistent.
                </p>

                <p>
                  Prompt updates only affect future requests. Existing email
                  records, summaries, and generated drafts stored in the
                  database are not modified retroactively.
                </p>

              </div>

            </div>

            {error && (

              <div className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">

                <div className="flex items-start gap-3">

                  <AlertTriangle className="mt-0.5 h-5 w-5 text-danger flex-shrink-0" />

                  <div>

                    <p className="font-mono text-[11px] uppercase tracking-wide text-danger">
                      Backend Error
                    </p>

                    <p className="mt-1 text-sm text-muted">
                      {error}
                    </p>

                  </div>

                </div>

              </div>

            )}

          </div>

        )}

      </div>

    </div>

  );

}
