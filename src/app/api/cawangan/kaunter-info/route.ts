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

  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tbl = `tiket_${negeri}`;
  const pattern = cawangan || `01${negeri}%`;

  const data = await prisma.$queryRawUnsafe<
    Array<{
      nama_cawangan: string;
      keterangan: string | null;
      no_kaunter: string | null;
      bil_tiket: bigint;
    }>
  >(
    cawangan
      ? `SELECT c.nama_cawangan, kp.keterangan, k.no_kaunter, 
              (SELECT COUNT(*) FROM ${tbl} t WHERE t.cawangan = k.id_cawangan AND t.kaunter = k.no_kaunter AND DATE(t.tarikh) = ?) as bil_tiket
         FROM kaunter k
         INNER JOIN cawangan c ON k.id_cawangan = c.id_cawangan
         LEFT JOIN kumpulan_perkhidmatan kp ON k.id_perkhidmatan_kumpulan = kp.id
         WHERE k.id_cawangan = ?
         ORDER BY c.nama_cawangan, CAST(k.no_kaunter AS UNSIGNED)`
      : `SELECT c.nama_cawangan, kp.keterangan, k.no_kaunter,
              (SELECT COUNT(*) FROM ${tbl} t WHERE t.cawangan = k.id_cawangan AND t.kaunter = k.no_kaunter AND DATE(t.tarikh) = ?) as bil_tiket
         FROM kaunter k
         INNER JOIN cawangan c ON k.id_cawangan = c.id_cawangan
         LEFT JOIN kumpulan_perkhidmatan kp ON k.id_perkhidmatan_kumpulan = kp.id
         WHERE k.id_cawangan LIKE ?
         ORDER BY c.nama_cawangan, CAST(k.no_kaunter AS UNSIGNED)`,
    todayStr,
    pattern
  );

  return NextResponse.json({
    data: data.map((r) => ({
      nama_cawangan: r.nama_cawangan,
      keterangan: r.keterangan,
      no_kaunter: r.no_kaunter,
      bil_tiket: Number(r.bil_tiket || 0),
    })),
  });
}
