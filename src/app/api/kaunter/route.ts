import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kaunters = await prisma.kaunter.findMany({
    where: { idCawangan: session.user.idCawangan },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(kaunters);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const kaunter = await prisma.kaunter.create({
    data: {
      noKaunter: body.noKaunter,
      idPerkhidmatanKumpulan: body.idPerkhidmatanKumpulan || null,
      idCawangan: session.user.idCawangan,
      susunanKeutamaan: body.susunanKeutamaan || null,
      zon: body.zon || null,
    },
  });

  return NextResponse.json(kaunter, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Find no_siri from kumpulan
  let noSiri: number | null = null;
  let namaKaunter = null;
  if (body.idPerkhidmatanKumpulan) {
    const kumpulan = await prisma.kumpulanPerkhidmatan.findUnique({
      where: { id: body.idPerkhidmatanKumpulan },
    });
    noSiri = kumpulan?.noSiri ?? null;
    namaKaunter = kumpulan?.keterangan || null;
  }

  const kaunter = await prisma.kaunter.update({
    where: { id: body.id },
    data: {
      noKaunter: body.noKaunter,
      idPerkhidmatanKumpulan: body.idPerkhidmatanKumpulan || null,
      susunanKeutamaan: body.susunanKeutamaan || null,
      noSiri,
      namaKaunter,
      zon: body.zon || null,
    },
  });

  return NextResponse.json(kaunter);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  await prisma.kaunter.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
