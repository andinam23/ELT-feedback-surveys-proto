import Link from "next/link";
import { notFound } from "next/navigation";
import { computeTeacherStats } from "@/lib/analysis";
import { getDataset, getResponses } from "@/lib/datasets";
import { getTeacherSummary } from "@/lib/summaries";
import TeacherSummaryPanel from "./TeacherSummaryPanel";

export default async function TeacherPage({
  params,
}: {
  params: Promise<{ id: string; teacher: string }>;
}) {
  const { id, teacher } = await params;
  const datasetId = Number(id);
  const teacherName = decodeURIComponent(teacher);

  const dataset = await getDataset(datasetId);
  if (!dataset) notFound();

  const allResponses = await getResponses(datasetId);
  const responses = allResponses.filter(
    (r) => !r.isUnassigned && r.teacherName === teacherName,
  );
  if (responses.length === 0) notFound();

  const stats = computeTeacherStats(teacherName, responses, dataset.ratingQuestions);
  const maxAvg = Math.max(...stats.categories.map((c) => c.average), 1);
  const summary = await getTeacherSummary(datasetId, teacherName);

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
          <h1 className="text-2xl font-semibold mt-1">{teacherName}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {stats.responseCount} responses across {stats.classCount} class
            {stats.classCount === 1 ? "" : "es"} · overall avg{" "}
            <span className="font-medium">{stats.overallAverage.toFixed(2)}</span> · spread{" "}
            {stats.overallStdDev.toFixed(2)}
          </p>
          <p className="text-xs text-black/40 dark:text-white/40 mt-1">
            {stats.classes.join(" · ")}
          </p>
        </div>
        <a
          href={`/api/datasets/${datasetId}/teachers/${encodeURIComponent(teacherName)}/export/pdf`}
          className="shrink-0 rounded border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Export PDF
        </a>
      </div>

      <TeacherSummaryPanel datasetId={datasetId} teacherName={teacherName} initialSummary={summary} />

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
          Rating categories
        </h2>
        <div className="space-y-2">
          {stats.categories.map((c) => (
            <div key={c.question} className="flex items-center gap-3 text-sm">
              <span className="w-64 shrink-0 truncate" title={c.question}>
                {c.question}
              </span>
              <div className="flex-1 h-2 rounded bg-black/5 dark:bg-white/10">
                <div
                  className="h-2 rounded bg-black dark:bg-white"
                  style={{ width: `${(c.average / maxAvg) * 100}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right tabular-nums">
                {c.average.toFixed(2)}{" "}
                <span className="text-black/40 dark:text-white/40">
                  (sd {c.stdDev.toFixed(2)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {dataset.commentQuestions.map((question) => {
        const entries = responses
          .map((r) => ({ className: r.className, text: r.comments[question] }))
          .filter((e) => !!e.text);
        if (entries.length === 0) return null;
        return (
          <section key={question}>
            <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
              {question} <span className="text-black/30 dark:text-white/30">({entries.length})</span>
            </h2>
            <ul className="space-y-2">
              {entries.map((e, i) => (
                <li
                  key={i}
                  className="rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                >
                  <p>{e.text}</p>
                  <p className="mt-1 text-xs text-black/40 dark:text-white/40">{e.className}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
