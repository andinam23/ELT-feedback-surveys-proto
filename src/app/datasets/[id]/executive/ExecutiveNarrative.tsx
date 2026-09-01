"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExecutiveReport } from "@/lib/types";

export default function ExecutiveNarrative({
  datasetId,
  initialReport,
}: {
  datasetId: number;
  initialReport: ExecutiveReport | null;
}) {
  const router = useRouter();
  const [report, setReport] = useState(initialReport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (report && !confirm("Regenerate the executive narrative?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/datasets/${datasetId}/executive`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate.");
      setReport(data.report);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-black/10 p-5 dark:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
          Overview
        </h2>
        <button
          onClick={generate}
          disabled={busy}
          className="text-xs text-black/50 hover:underline disabled:opacity-40 dark:text-white/50"
        >
          {busy ? "Working..." : report ? "Regenerate" : "Generate AI overview"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
      {report ? (
        <>
          <p className="mt-2 text-sm">{report.narrative}</p>
          <ul className="mt-3 space-y-1.5">
            {report.keyTakeaways.map((t, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-black/30 dark:text-white/30">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          No AI overview yet — generate a written summary of overall trends and key
          takeaways from the stats below.
        </p>
      )}
    </section>
  );
}
