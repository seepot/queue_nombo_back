import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cawangan = session.user.idCawangan;

  const kumpulan = await prisma.kumpulanPerkhidmatan.findMany({
    where: { idCawangan: cawangan },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(kumpulan);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const cawangan = session.user.idCawangan;

  const kumpulan = await prisma.kumpulanPerkhidmatan.create({
    data: {
      idPerkhidmatan: body.idPerkhidmatan || "",
      idCawangan: cawangan,
      keterangan: body.keterangan,
      noSiri: Number(body.noSiri) || 0,
      noTerkini: Number(body.noSiri) || 0,
      kategori: 2,
      ispelbagai: body.isPelbagai ? Number(body.isPelbagai) : 0,
      createDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json(kumpulan, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Build update data - only include fields that are provided
  const data: Record<string, unknown> = {};
  if (body.keterangan !== undefined) data.keterangan = body.keterangan;
  if (body.noSiri !== undefined && body.noSiri !== "") data.noSiri = Number(body.noSiri);
  if (body.idPerkhidmatan !== undefined) data.idPerkhidmatan = body.idPerkhidmatan;
  if (body.status != null) data.status = Number(body.status);

  const kumpulan = await prisma.kumpulanPerkhidmatan.update({
    where: { id: body.id },
    data,
  });

  return NextResponse.json(kumpulan);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  await prisma.kumpulanPerkhidmatan.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
