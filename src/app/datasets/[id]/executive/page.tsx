import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataset } from "@/lib/datasets";
import { computeExecutiveStats } from "@/lib/executiveReport";
import { getExecutiveReport } from "@/lib/executiveReports";
import ExecutiveNarrative from "./ExecutiveNarrative";

export default async function ExecutivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const datasetId = Number(id);
  const dataset = getDataset(datasetId);
  if (!dataset) notFound();

  const stats = computeExecutiveStats(datasetId);
  const report = getExecutiveReport(datasetId);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/datasets/${datasetId}`}
            className="text-xs text-black/50 hover:underline dark:text-white/50"
          >
            ← {dataset.termLabel}
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Executive Report</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{dataset.termLabel}</p>
        </div>
        <a
          href={`/api/datasets/${datasetId}/executive/export/pdf`}
          className="shrink-0 rounded border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Export PDF
        </a>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-2xl font-semibold">{stats.totalResponses}</p>
          <p className="text-xs text-black/50 dark:text-white/50">Responses</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-2xl font-semibold">{stats.totalTeachers}</p>
          <p className="text-xs text-black/50 dark:text-white/50">Teachers</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-2xl font-semibold">{stats.overallAverage.toFixed(2)}</p>
          <p className="text-xs text-black/50 dark:text-white/50">Overall average / 5</p>
        </div>
      </div>

      <ExecutiveNarrative datasetId={datasetId} initialReport={report} />

      <section className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
            Top-performing categories
          </h2>
          <div className="space-y-1.5">
            {stats.topCategories.map((c) => (
              <div key={c.question} className="flex justify-between gap-2 text-sm">
                <span className="truncate" title={c.question}>
                  {c.question}
                </span>
                <span className="font-medium shrink-0">{c.average.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
            Lowest-scoring categories
          </h2>
          <div className="space-y-1.5">
            {stats.bottomCategories.map((c) => (
              <div key={c.question} className="flex justify-between gap-2 text-sm">
                <span className="truncate" title={c.question}>
                  {c.question}
                </span>
                <span className="font-medium shrink-0">{c.average.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
            Top teachers
          </h2>
          <div className="space-y-1.5">
            {stats.topTeachers.map((t) => (
              <div key={t.teacherName} className="flex justify-between gap-2 text-sm">
                <Link
                  href={`/datasets/${datasetId}/teachers/${encodeURIComponent(t.teacherName)}`}
                  className="truncate hover:underline"
                >
                  {t.teacherName}
                </Link>
                <span className="font-medium shrink-0">{t.overallAverage.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
            Lowest teachers
          </h2>
          <div className="space-y-1.5">
            {stats.bottomTeachers.map((t) => (
              <div key={t.teacherName} className="flex justify-between gap-2 text-sm">
                <Link
                  href={`/datasets/${datasetId}/teachers/${encodeURIComponent(t.teacherName)}`}
                  className="truncate hover:underline"
                >
                  {t.teacherName}
                </Link>
                <span className="font-medium shrink-0">{t.overallAverage.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {stats.flaggedTeachers.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-red-600 dark:text-red-400 mb-3">
            Flagged for attention ({stats.flaggedTeachers.length})
          </h2>
          <div className="space-y-2">
            {stats.flaggedTeachers.map((f) => (
              <div
                key={f.teacherName}
                className="rounded border border-red-300 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20"
              >
                <Link
                  href={`/datasets/${datasetId}/teachers/${encodeURIComponent(f.teacherName)}`}
                  className="text-sm font-medium text-red-800 hover:underline dark:text-red-300"
                >
                  {f.teacherName} — avg {f.overallAverage.toFixed(2)}
                </Link>
                <ul className="mt-1 space-y-0.5">
                  {f.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-red-700 dark:text-red-400">
                      • {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
          Term-over-term comparison
        </h2>
        {stats.termComparison ? (
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-black/5 dark:bg-white/5 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium text-right">
                    {stats.termComparison.previousTermLabel}
                  </th>
                  <th className="px-3 py-2 font-medium text-right">{dataset.termLabel}</th>
                  <th className="px-3 py-2 font-medium text-right">Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                <tr className="font-medium">
                  <td className="px-3 py-2">Overall</td>
                  <td className="px-3 py-2 text-right">
                    {stats.termComparison.overallPrevious.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {stats.termComparison.overallCurrent.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${stats.termComparison.overallDelta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {stats.termComparison.overallDelta >= 0 ? "+" : ""}
                    {stats.termComparison.overallDelta.toFixed(2)}
                  </td>
                </tr>
                {stats.termComparison.categories.map((c) => (
                  <tr key={c.question}>
                    <td className="px-3 py-2 truncate max-w-xs" title={c.question}>
                      {c.question}
                    </td>
                    <td className="px-3 py-2 text-right">{c.previous?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{c.current?.toFixed(2) ?? "—"}</td>
                    <td
                      className={`px-3 py-2 text-right ${
                        c.delta === null
                          ? "text-black/30 dark:text-white/30"
                          : c.delta >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {c.delta !== null ? `${c.delta >= 0 ? "+" : ""}${c.delta.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-black/50 dark:text-white/50">
            No earlier term uploaded yet — this comparison appears once you upload a second
            term&apos;s dataset.
          </p>
        )}
      </section>
    </main>
  );
}
