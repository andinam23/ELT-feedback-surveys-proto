import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { computeTeacherStats } from "@/lib/analysis";
import { getDataset, getResponses } from "@/lib/datasets";
import { getTeacherSummary } from "@/lib/summaries";
import { TeacherPdfDocument } from "@/lib/export/TeacherPdfDocument";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; teacher: string }> },
) {
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
  const summary = await getTeacherSummary(datasetId, teacherName);

  const comments = dataset.commentQuestions.flatMap((question) =>
    responses
      .filter((r) => r.comments[question])
      .map((r) => ({ question, className: r.className, text: r.comments[question] })),
  );

  const buffer = await renderToBuffer(
    TeacherPdfDocument({ teacherName, termLabel: dataset.termLabel, stats, summary, comments }),
  );

  const filename = `${teacherName.replace(/[^a-z0-9]+/gi, "_")}_${dataset.termLabel.replace(/[^a-z0-9]+/gi, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
