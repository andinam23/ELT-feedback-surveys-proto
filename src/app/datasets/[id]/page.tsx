import Link from "next/link";
import { notFound } from "next/navigation";
import { computeAllTeacherStats } from "@/lib/analysis";
import { getDataset, getResponses, getUnassignedGroups } from "@/lib/datasets";
import { listSummaries } from "@/lib/summaries";
import { formatDate } from "@/lib/util";
import UnassignedPanel from "./UnassignedPanel";
import GenerateAllSummaries from "./GenerateAllSummaries";

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const datasetId = Number(id);
  const dataset = getDataset(datasetId);
  if (!dataset) notFound();

  const responses = getResponses(datasetId);
  const teacherStats = computeAllTeacherStats(responses, dataset.ratingQuestions);
  const unassignedGroups = getUnassignedGroups(datasetId);
  const summaries = listSummaries(datasetId);
  const summarizedNames = new Set(summaries.map((s) => s.teacherName));
  const pendingCount = teacherStats.filter((t) => !summarizedNames.has(t.teacherName)).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-black/50 hover:underline dark:text-white/50">
            ← All datasets
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{dataset.termLabel}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {dataset.sourceFilename} · {dataset.responseCount} responses ·{" "}
            {dataset.teacherCount} teachers · uploaded {formatDate(dataset.uploadedAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/datasets/${datasetId}/executive`}
            className="rounded border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Executive report
          </Link>
          <a
            href={`/api/datasets/${datasetId}/export/excel`}
            className="rounded border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Export Excel workbook
          </a>
        </div>
      </div>

      <UnassignedPanel datasetId={datasetId} groups={unassignedGroups} />

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Per-teacher averages
          </h2>
          <GenerateAllSummaries
            datasetId={datasetId}
            pendingCount={pendingCount}
            totalTeachers={teacherStats.length}
          />
        </div>
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/5 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Teacher</th>
                <th className="px-3 py-2 font-medium text-right">Responses</th>
                <th className="px-3 py-2 font-medium text-right">Classes</th>
                <th className="px-3 py-2 font-medium text-right">Avg score</th>
                <th className="px-3 py-2 font-medium text-right">Spread (SD)</th>
                <th className="px-3 py-2 font-medium text-right">AI summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {teacherStats.map((t) => {
                const s = summaries.find((x) => x.teacherName === t.teacherName);
                return (
                  <tr key={t.teacherName} className="hover:bg-black/[.02] dark:hover:bg-white/[.03]">
                    <td className="px-3 py-2">
                      <Link
                        href={`/datasets/${datasetId}/teachers/${encodeURIComponent(t.teacherName)}`}
                        className="hover:underline"
                      >
                        {t.teacherName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right">{t.responseCount}</td>
                    <td className="px-3 py-2 text-right">{t.classCount}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      <span
                        className={
                          t.overallAverage < 3.5
                            ? "text-red-600 dark:text-red-400"
                            : t.overallAverage < 4.3
                              ? "text-amber-600 dark:text-amber-400"
                              : ""
                        }
                      >
                        {t.overallAverage.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-black/60 dark:text-white/60">
                      {t.overallStdDev.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {s ? (
                        s.flaggedConcerns.length > 0 ? (
                          <span className="text-red-600 dark:text-red-400" title="Has flagged concerns">
                            ⚑ flagged
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">✓ done</span>
                        )
                      ) : (
                        <span className="text-black/30 dark:text-white/30">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          Spread (SD) is the standard deviation of individual ratings within that teacher&apos;s
          responses — a high spread alongside a decent average can mean opinions are split,
          worth a closer look at the comments.
        </p>
      </section>
    </main>
  );
}
