"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TeacherSummary } from "@/lib/types";

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  negative: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  mixed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function TeacherSummaryPanel({
  datasetId,
  teacherName,
  initialSummary,
}: {
  datasetId: number;
  teacherName: string;
  initialSummary: TeacherSummary | null;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdDraft, setPdDraft] = useState<string[]>(initialSummary?.pdActions ?? []);
  const [dirty, setDirty] = useState(false);

  const url = `/api/datasets/${datasetId}/teachers/${encodeURIComponent(teacherName)}/summary`;

  async function generate(force: boolean) {
    if (force && !confirm("Regenerate? This replaces the current summary and any PD edits.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate summary.");
      setSummary(data.summary);
      setPdDraft(data.summary.pdActions);
      setDirty(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate summary.");
    } finally {
      setBusy(false);
    }
  }

  async function savePdActions() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdActions: pdDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      setSummary(data.summary);
      setDirty(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  if (!summary) {
    return (
      <section className="rounded-lg border border-black/10 p-5 dark:border-white/15">
        <p className="text-sm text-black/60 dark:text-white/60 mb-3">
          No AI summary yet for {teacherName}.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
        <button
          onClick={() => generate(false)}
          disabled={busy}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {busy ? "Generating..." : "Generate AI summary"}
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-black/10 p-5 dark:border-white/15">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            AI summary
          </h2>
          <button
            onClick={() => generate(true)}
            disabled={busy}
            className="text-xs text-black/50 hover:underline disabled:opacity-40 dark:text-white/50"
          >
            {busy ? "Working..." : "Regenerate"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
        <p className="mt-2 text-sm">{summary.narrative}</p>

        {summary.themes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.themes.map((t, i) => (
              <span
                key={i}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${SENTIMENT_STYLE[t.sentiment] ?? ""}`}
              >
                {t.theme} <span className="opacity-60">×{t.mentions}</span>
              </span>
            ))}
          </div>
        )}

        {summary.flaggedConcerns.length > 0 && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
            <p className="text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
              Flagged concerns
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-red-800 dark:text-red-300">
              {summary.flaggedConcerns.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-black/10 p-5 dark:border-white/15">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            PD / action plan {summary.editedAt && <span className="normal-case text-black/30 dark:text-white/30">(edited)</span>}
          </h2>
        </div>
        <p className="mt-1 mb-3 text-xs text-black/40 dark:text-white/40">
          AI-drafted — review and edit the wording before it&apos;s finalized.
        </p>
        <div className="space-y-2">
          {pdDraft.map((action, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                value={action}
                onChange={(e) => {
                  const next = [...pdDraft];
                  next[i] = e.target.value;
                  setPdDraft(next);
                  setDirty(true);
                }}
                rows={2}
                className="flex-1 resize-y rounded border border-black/15 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
              />
              <button
                onClick={() => {
                  setPdDraft(pdDraft.filter((_, j) => j !== i));
                  setDirty(true);
                }}
                className="self-start text-xs text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => {
              setPdDraft([...pdDraft, ""]);
              setDirty(true);
            }}
            className="text-xs text-black/50 hover:underline dark:text-white/50"
          >
            + Add action
          </button>
          <button
            onClick={savePdActions}
            disabled={busy || !dirty}
            className="rounded bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {busy ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </section>
  );
}
