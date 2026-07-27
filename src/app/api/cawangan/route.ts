import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Superadmin sees all branches
  if (session.user.levelAkses === "1") {
    const cawangan = await prisma.cawangan.findMany({
      orderBy: { namaCawangan: "asc" },
    });
    return NextResponse.json(cawangan);
  }

  // Others see only their branch
  const cawangan = await prisma.cawangan.findMany({
    where: { idCawangan: session.user.idCawangan },
  });
  return NextResponse.json(cawangan);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const cawangan = await prisma.cawangan.create({
    data: {
      idCawangan: body.idCawangan,
      namaCawangan: body.namaCawangan || body.idCawangan,
      alamat1: body.alamat1 || body.alamat || null,
      negeri: body.negeri || null,
      noTelefon: body.noTelefon || null,
      no_faks: body.noFaks || null,
      latitud: body.latitud || null,
      longitud: body.longitud || null,
      flag: body.giliran || "1",
      create_date: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json(cawangan, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const cawangan = await prisma.cawangan.update({
    where: { id: body.id },
    data: {
      namaCawangan: body.namaCawangan,
      alamat1: body.alamat1 || null,
      alamat2: body.alamat2 || null,
      alamat3: body.alamat3 || null,
      alamat4: body.alamat4 || null,
      negeri: body.negeri || null,
      noTelefon: body.noTelefon || null,
      no_faks: body.no_faks || null,
      latitud: body.latitud || null,
      longitud: body.longitud || null,
      flag: body.flag !== undefined ? body.flag : undefined,
    },
  });

  return NextResponse.json(cawangan);
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

  await prisma.cawangan.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
