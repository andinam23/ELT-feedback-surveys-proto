import Link from "next/link";
import { listDatasets } from "@/lib/datasets";
import { formatDate } from "@/lib/util";
import UploadForm from "./UploadForm";
import DeleteDatasetButton from "./DeleteDatasetButton";

// Reads live data on every request - must not be statically prerendered at
// build time (when no database connection is available yet).
export const dynamic = "force-dynamic";

export default async function Home() {
  const datasets = await listDatasets();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">ELT Feedback Tool</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          Upload a term&apos;s raw feedback spreadsheet to get per-teacher summaries, PD
          suggestions, and an executive report.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
          Upload a new dataset
        </h2>
        <UploadForm />
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-3">
          Uploaded datasets
        </h2>
        {datasets.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No datasets yet — upload a spreadsheet above to get started.
          </p>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10 rounded-lg border border-black/10 dark:border-white/15">
            {datasets.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <Link href={`/datasets/${d.id}`} className="font-medium hover:underline">
                    {d.termLabel}
                  </Link>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {d.sourceFilename} · {d.responseCount} responses · {d.teacherCount} teachers
                    {d.unassignedCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {" "}
                        · {d.unassignedCount} unassigned
                      </span>
                    )}
                    {" · "}
                    {formatDate(d.uploadedAt)}
                  </p>
                </div>
                <DeleteDatasetButton id={d.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
