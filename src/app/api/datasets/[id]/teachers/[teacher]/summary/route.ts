import { NextRequest, NextResponse } from "next/server";
import { computeTeacherStats } from "@/lib/analysis";
import { getDataset, getResponses } from "@/lib/datasets";
import { getTeacherSummary, saveTeacherSummary, updatePdActions } from "@/lib/summaries";
import { analyzeTeacherFeedback } from "@/lib/ai/teacherAnalysis";

type Params = { params: Promise<{ id: string; teacher: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id, teacher } = await params;
  const summary = await getTeacherSummary(Number(id), decodeURIComponent(teacher));
  return NextResponse.json({ summary });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id, teacher } = await params;
  const datasetId = Number(id);
  const teacherName = decodeURIComponent(teacher);

  const dataset = await getDataset(datasetId);
  if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

  const allResponses = await getResponses(datasetId);
  const responses = allResponses.filter(
    (r) => !r.isUnassigned && r.teacherName === teacherName,
  );
  if (responses.length === 0) {
    return NextResponse.json({ error: "No responses for this teacher" }, { status: 404 });
  }

  const stats = computeTeacherStats(teacherName, responses, dataset.ratingQuestions);

  try {
    const analysis = await analyzeTeacherFeedback(teacherName, stats.categories, responses);
    const summary = await saveTeacherSummary(datasetId, teacherName, analysis);
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, teacher } = await params;
  const body = (await req.json()) as { pdActions?: string[] };
  if (!Array.isArray(body.pdActions)) {
    return NextResponse.json({ error: "pdActions array required" }, { status: 400 });
  }
  const summary = await updatePdActions(
    Number(id),
    decodeURIComponent(teacher),
    body.pdActions.map((s) => s.trim()).filter(Boolean),
  );
  if (!summary) return NextResponse.json({ error: "Summary not found" }, { status: 404 });
  return NextResponse.json({ summary });
}
