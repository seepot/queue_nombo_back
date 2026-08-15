import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "2") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const radius = body.radius === "" || body.radius == null ? null : Number(body.radius);

  if (radius != null && (!Number.isFinite(radius) || radius < 0)) {
    return NextResponse.json({ error: "Radius tidak sah" }, { status: 400 });
  }

  await prisma.cawangan.updateMany({
    where: { idCawangan: session.user.idCawangan },
    data: {
      latitud: body.latitud ? String(body.latitud).trim() : null,
      longitud: body.longitud ? String(body.longitud).trim() : null,
      radius,
    },
  });

  return NextResponse.json({ success: true });
}
