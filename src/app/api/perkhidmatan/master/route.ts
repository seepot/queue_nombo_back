import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  await prisma.perkhidmatan.create({
    data: { keterangan: body.keterangan },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  await prisma.perkhidmatan.update({
    where: { id: body.id },
    data: { keterangan: body.keterangan },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  }

  await prisma.perkhidmatan.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
