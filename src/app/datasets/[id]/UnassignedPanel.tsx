"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Group = { className: string; teacherRaw: string; count: number; responseIds: number[] };

export default function UnassignedPanel({
  datasetId,
  groups,
}: {
  datasetId: number;
  groups: Group[];
}) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function assign(group: Group) {
    const teacherName = (names[group.className] ?? "").trim();
    if (!teacherName) return;
    setBusy(group.className);
    await fetch(`/api/datasets/${datasetId}/unassigned`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseIds: group.responseIds, teacherName }),
    });
    setBusy(null);
    router.refresh();
  }

  if (groups.length === 0) return null;

  return (
    <section className="rounded-lg border border-amber-400/50 bg-amber-50 p-4 dark:bg-amber-950/20">
      <h2 className="font-medium text-amber-800 dark:text-amber-300">
        {groups.reduce((sum, g) => sum + g.count, 0)} responses need a teacher assigned
      </h2>
      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 mb-3">
        These rows had a placeholder value (e.g. &ldquo;Portal Teacher&rdquo;) instead of a real
        teacher name. Enter the correct teacher for each class below — this updates every
        response in that class at once.
      </p>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.className} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate" title={g.className}>
              {g.className}
            </span>
            <span className="text-xs text-black/50 dark:text-white/50 shrink-0">
              {g.count} response{g.count === 1 ? "" : "s"}
            </span>
            <input
              type="text"
              placeholder="Teacher name"
              value={names[g.className] ?? ""}
              onChange={(e) => setNames((n) => ({ ...n, [g.className]: e.target.value }))}
              className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
            />
            <button
              onClick={() => assign(g)}
              disabled={busy === g.className || !(names[g.className] ?? "").trim()}
              className="rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              {busy === g.className ? "Saving..." : "Assign"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
