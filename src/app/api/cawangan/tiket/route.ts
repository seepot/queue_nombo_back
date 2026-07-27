import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const negeri = searchParams.get("negeri");
  const cawangan = searchParams.get("cawangan");

  if (!negeri) {
    return NextResponse.json({ error: "Negeri diperlukan" }, { status: 400 });
  }

  const pattern = cawangan || `01${negeri}%`;
  const data = await prisma.$queryRawUnsafe<
    Array<{
      cawangan: string;
      nama_cawangan: string;
      keterangan: string | null;
      had_pelanggan1: number | null;
      sesi1: bigint | null;
      had_pelanggan2: number | null;
      sesi2: bigint | null;
      had_pelanggan3: number | null;
      sesi3: bigint | null;
    }>
  >(
    cawangan
      ? `SELECT * FROM 04_vw_status_tiket WHERE cawangan = ?`
      : `SELECT * FROM 04_vw_status_tiket WHERE cawangan LIKE ?`,
    pattern
  );

  return NextResponse.json({
    data: data.map((r) => ({
      cawangan: r.cawangan,
      nama_cawangan: r.nama_cawangan,
      keterangan: r.keterangan,
      had_pelanggan1: Number(r.had_pelanggan1 || 0),
      sesi1: r.sesi1 != null ? Number(r.sesi1) : null,
      had_pelanggan2: Number(r.had_pelanggan2 || 0),
      sesi2: r.sesi2 != null ? Number(r.sesi2) : null,
      had_pelanggan3: Number(r.had_pelanggan3 || 0),
      sesi3: r.sesi3 != null ? Number(r.sesi3) : null,
    })),
  });
}
