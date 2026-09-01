import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDataset } from "@/lib/datasets";
import { computeExecutiveStats } from "@/lib/executiveReport";
import { getExecutiveReport } from "@/lib/executiveReports";
import { ExecutivePdfDocument } from "@/lib/export/ExecutivePdfDocument";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const datasetId = Number(id);
  const dataset = getDataset(datasetId);
  if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

  const stats = computeExecutiveStats(datasetId);
  const report = getExecutiveReport(datasetId);

  const buffer = await renderToBuffer(
    ExecutivePdfDocument({ termLabel: dataset.termLabel, stats, report }),
  );
  const filename = `Executive_Report_${dataset.termLabel.replace(/[^a-z0-9]+/gi, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
