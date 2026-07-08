"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { ErrorState } from "@/components/EmptyState";
import { usePolling } from "@/lib/usePolling";
import { api, PromptFile } from "@/lib/api";
import { Save, Loader2, Check } from "lucide-react";

export default function PromptsPage() {
  const { data: prompts, error, loading } = usePolling(() => api.prompts(), 30000);
  const [selected, setSelected] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const active = prompts?.find((p) => p.name === selected) || prompts?.[0];

  useEffect(() => {
    if (active && selected === null) {
      setSelected(active.name);
      setDraftContent(active.content);
    }
  }, [active, selected]);

  function selectPrompt(p: PromptFile) {
    setSelected(p.name);
    setDraftContent(p.content);
    setSaved(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.updatePrompt(selected, draftContent);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Topbar
        title="Prompt Editor"
        description="Edits write directly to config/prompts/*.txt — the next email processed uses the new wording immediately, no restart needed."
      />

      <div className="px-8 py-6">
        {error && <ErrorState message={error} />}

        {!loading && !error && prompts && prompts.length > 0 && (
          <div className="grid grid-cols-[180px_1fr] gap-4">
            <div className="space-y-1">
              {prompts.map((p) => (
                <button
                  key={p.name}
                  onClick={() => selectPrompt(p)}
                  className={`w-full rounded-md px-3 py-2 text-left font-mono text-xs capitalize transition-colors ${
                    selected === p.name
                      ? "bg-surface2 text-text"
                      : "text-muted hover:bg-surface2/60 hover:text-text"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <textarea
                value={draftContent}
                onChange={(e) => {
                  setDraftContent(e.target.value);
                  setSaved(false);
                }}
                spellCheck={false}
                className="h-[480px] w-full resize-none rounded-md border border-border bg-[#080A0F] p-4 font-mono text-xs leading-relaxed text-text outline-none focus-visible:border-signal-mid"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-md border border-signal-mid/40 bg-signal-mid/10 px-3 py-1.5 text-xs font-medium text-signal-mid transition-colors hover:bg-signal-mid/20 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : saved ? (
                    <Check size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {saved ? "Saved" : "Save prompt"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
