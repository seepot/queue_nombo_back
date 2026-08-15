import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "2") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const zon = String(body.zon || "").trim();
  const catatan = String(body.catatan || "").trim();

  if (!zon || !catatan) {
    return NextResponse.json(
      { error: "Zon/Aras dan catatan diperlukan" },
      { status: 400 }
    );
  }

  await prisma.zon.create({
    data: {
      cawangan: session.user.idCawangan,
      zon,
      catatan,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "2") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const id = Number(body.id);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Zon tidak sah" }, { status: 400 });
  }

  await prisma.zon.deleteMany({
    where: {
      id,
      cawangan: session.user.idCawangan,
    },
  });

  return NextResponse.json({ success: true });
}
