import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const idCawangan = session.user.idCawangan;

  await prisma.cawangan.updateMany({
    where: { idCawangan },
    data: {
      alamat1: body.alamat1 || null,
      alamat2: body.alamat2 || null,
      alamat3: body.alamat3 || null,
      alamat4: body.alamat4 || null,
      noTelefon: body.noTelefon || null,
      noFaks: body.noFaks || body.no_faks || null,
      radius: body.radius != null ? Number(body.radius) : null,
    },
  });

  return NextResponse.json({ success: true });
}
