"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GenerateAllSummaries({
  datasetId,
  pendingCount,
  totalTeachers,
}: {
  datasetId: number;
  pendingCount: number;
  totalTeachers: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function run(force: boolean) {
    if (
      force &&
      !confirm(`Regenerate AI summaries for all ${totalTeachers} teachers? This replaces existing ones (and any PD edits).`)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/datasets/${datasetId}/summaries/generate-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate summaries.");
      setResult(`Generated ${data.succeeded}/${data.total}${data.failed.length ? ` (${data.failed.length} failed)` : ""}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate summaries.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {pendingCount > 0 && (
        <button
          onClick={() => run(false)}
          disabled={busy}
          className="rounded bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {busy ? "Generating..." : `Generate AI summaries (${pendingCount} pending)`}
        </button>
      )}
      {totalTeachers > 0 && (
        <button
          onClick={() => run(true)}
          disabled={busy}
          className="text-xs text-black/50 hover:underline disabled:opacity-40 dark:text-white/50"
        >
          {busy ? "Working..." : "Regenerate all"}
        </button>
      )}
      {busy && (
        <span className="text-xs text-black/40 dark:text-white/40">
          This can take a while for many teachers — please wait.
        </span>
      )}
      {result && <span className="text-xs text-black/60 dark:text-white/60">{result}</span>}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
