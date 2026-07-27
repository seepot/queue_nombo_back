import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.waktuMula !== undefined) {
    // Store as Time - create a Date with just the time portion
    data.waktuMula = body.waktuMula ? new Date(`1970-01-01T${body.waktuMula}:00.000Z`) : null;
  }
  if (body.waktuTamat !== undefined) {
    data.waktuTamat = body.waktuTamat ? new Date(`1970-01-01T${body.waktuTamat}:00.000Z`) : null;
  }
  if (body.sesi !== undefined) {
    data.sesi = body.sesi != null ? Number(body.sesi) : null;
  }
  if (body.statusAktif !== undefined) {
    data.statusAktif = Number(body.statusAktif);
  }

  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  data.updateDate = now;

  await prisma.waktuOperasi.update({
    where: { id: Number(id) },
    data,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  }

  await prisma.waktuOperasi.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
