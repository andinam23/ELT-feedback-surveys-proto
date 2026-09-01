import { NextRequest, NextResponse } from "next/server";
import { computeExecutiveStats } from "@/lib/executiveReport";
import { getExecutiveReport, saveExecutiveReport } from "@/lib/executiveReports";
import { listSummaries } from "@/lib/summaries";
import { analyzeExecutiveReport } from "@/lib/ai/executiveAnalysis";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const datasetId = Number(id);
  const stats = await computeExecutiveStats(datasetId);
  const report = await getExecutiveReport(datasetId);
  return NextResponse.json({ stats, report });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const datasetId = Number(id);

  try {
    const stats = await computeExecutiveStats(datasetId);
    const summaries = await listSummaries(datasetId);
    const analysis = await analyzeExecutiveReport(stats, summaries);
    const report = await saveExecutiveReport(datasetId, analysis);
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
