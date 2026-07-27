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
  const { hari, remove } = body;

  if (remove) {
    // Remove hari cuti
    await prisma.hariCuti.deleteMany({
      where: { cawangan, namaHari: hari },
    });
  } else {
    // Add hari cuti
    await prisma.hariCuti.create({
      data: {
        cawangan,
        namaHari: hari,
      },
    });
  }

  return NextResponse.json({ success: true });
}
