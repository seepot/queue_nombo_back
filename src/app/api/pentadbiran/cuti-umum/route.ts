import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const cawangan = session.user.idCawangan;

  await prisma.cutiUmum.create({
    data: {
      cawangan,
      tarikh1: new Date(body.tarikh),
      keterangan: body.keterangan || null,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
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

  await prisma.cutiUmum.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
