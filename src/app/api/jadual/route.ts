import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Register new jadual tugasan
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { kakitangan, kaunter, tarikhmula, tarikhakhir } = body;

  if (!kakitangan || !kaunter || !tarikhmula || !tarikhakhir) {
    return NextResponse.json(
      { error: "Sila lengkapkan semua maklumat" },
      { status: 400 }
    );
  }

  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);

  await prisma.jadualTugasan.create({
    data: {
      nokp: kakitangan,
      idKaunter: Number(kaunter),
      idCawangan: session.user.idCawangan,
      tarikhMula: new Date(tarikhmula),
      tarikhTamat: new Date(tarikhakhir),
      statusAktif: 1,
      createDate: now,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE: Remove jadual tugasan
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

  await prisma.jadualTugasan.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
