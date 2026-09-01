import { NextRequest, NextResponse } from "next/server";
import { assignTeacherToResponses, getUnassignedGroups } from "@/lib/datasets";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json({ groups: await getUnassignedGroups(Number(id)) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { responseIds: number[]; teacherName: string };
  if (!Array.isArray(body.responseIds) || body.responseIds.length === 0) {
    return NextResponse.json({ error: "responseIds required" }, { status: 400 });
  }
  if (!body.teacherName || !body.teacherName.trim()) {
    return NextResponse.json({ error: "teacherName required" }, { status: 400 });
  }
  await assignTeacherToResponses(body.responseIds, body.teacherName);
  return NextResponse.json({ ok: true });
}
