import { NextRequest, NextResponse } from "next/server";
import { getDataset, getResponses } from "@/lib/datasets";
import { listSummaries } from "@/lib/summaries";
import { buildDatasetWorkbook } from "@/lib/export/excel";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const datasetId = Number(id);
  const dataset = await getDataset(datasetId);
  if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

  const responses = await getResponses(datasetId);
  const summaries = new Map((await listSummaries(datasetId)).map((s) => [s.teacherName, s]));

  const buffer = await buildDatasetWorkbook(dataset, responses, summaries);
  const filename = `${dataset.termLabel.replace(/[^a-z0-9]+/gi, "_")}_feedback.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
