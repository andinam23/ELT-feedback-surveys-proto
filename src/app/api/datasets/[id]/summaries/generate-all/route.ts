import { NextRequest, NextResponse } from "next/server";
import { computeAllTeacherStats } from "@/lib/analysis";
import { getDataset, getResponses } from "@/lib/datasets";
import { groupByTeacher } from "@/lib/analysis";
import { getTeacherSummary, saveTeacherSummary } from "@/lib/summaries";
import { analyzeTeacherFeedback } from "@/lib/ai/teacherAnalysis";
import { mapWithConcurrency } from "@/lib/concurrency";

const CONCURRENCY = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const datasetId = Number(id);
  const { force = false } = (await req.json().catch(() => ({}))) as { force?: boolean };

  const dataset = getDataset(datasetId);
  if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

  const responses = getResponses(datasetId);
  const grouped = groupByTeacher(responses);
  const allStats = computeAllTeacherStats(responses, dataset.ratingQuestions);
  const statsByTeacher = new Map(allStats.map((s) => [s.teacherName, s]));

  const teacherNames = Array.from(grouped.keys()).filter((name) => {
    if (force) return true;
    return !getTeacherSummary(datasetId, name);
  });

  const results = await mapWithConcurrency(teacherNames, CONCURRENCY, async (teacherName) => {
    const stats = statsByTeacher.get(teacherName)!;
    const teacherResponses = grouped.get(teacherName)!;
    try {
      const analysis = await analyzeTeacherFeedback(teacherName, stats.categories, teacherResponses);
      saveTeacherSummary(datasetId, teacherName, analysis);
      return { teacherName, ok: true as const };
    } catch (err) {
      return {
        teacherName,
        ok: false as const,
        error: err instanceof Error ? err.message : "AI analysis failed.",
      };
    }
  });

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({ succeeded, failed, total: teacherNames.length });
}
