import { NextResponse } from "next/server";
import { deleteDataset, getDataset } from "@/lib/datasets";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dataset = await getDataset(Number(id));
  if (!dataset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ dataset });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteDataset(Number(id));
  return NextResponse.json({ ok: true });
}
