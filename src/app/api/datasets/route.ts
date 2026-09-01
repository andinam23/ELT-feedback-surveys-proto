import { NextRequest, NextResponse } from "next/server";
import { createDataset, listDatasets } from "@/lib/datasets";
import { parseFeedbackFile } from "@/lib/parseFeedback";

export async function GET() {
  return NextResponse.json({ datasets: await listDatasets() });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const termLabel = (form.get("termLabel") ?? "").toString().trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!termLabel) {
    return NextResponse.json({ error: "A term label is required." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseFeedbackFile(buffer, file.name);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (parsed.responses.length === 0) {
    return NextResponse.json(
      { error: "No response rows found in the file.", warnings: parsed.warnings },
      { status: 400 },
    );
  }

  const datasetId = await createDataset(termLabel, file.name, parsed);

  return NextResponse.json({
    datasetId,
    responseCount: parsed.responses.length,
    warnings: parsed.warnings,
  });
}
