import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cawangan = searchParams.get("cawangan");

  if (!cawangan) {
    return NextResponse.json({ error: "Cawangan diperlukan" }, { status: 400 });
  }

  const data = await prisma.kumpulanPerkhidmatan.findMany({
    where: { idCawangan: cawangan },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    data: data.map((k) => ({
      id: Number(k.id),
      keterangan: k.keterangan,
      noSiri: k.noSiri,
      noTerkini: k.noTerkini,
      status: k.status,
      idPerkhidmatan: k.idPerkhidmatan,
      idCawangan: k.idCawangan,
    })),
  });
}
