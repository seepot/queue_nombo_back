import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getTiketTable(cawangan: string): string {
  return `tiket_${cawangan.substring(2, 4)}`;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idCawangan = session.user.idCawangan;
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tbl = getTiketTable(idCawangan);

  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayCode = days[now.getDay()];
  const currentTime = now.toISOString().slice(11, 19);

  const sessionResult = await prisma.$queryRawUnsafe<Array<{ sesi: number }>>(
    `SELECT sesi FROM waktu_operasi WHERE cawangan = ? AND ? BETWEEN waktu_mula AND waktu_tamat AND status_aktif = 1 AND nama_hari = ? LIMIT 1`,
    idCawangan,
    currentTime,
    dayCode
  );
  const sesi = sessionResult[0]?.sesi || 1;

  const services = await prisma.$queryRawUnsafe<
    Array<{
      id: bigint;
      keterangan: string | null;
      id_cawangan: string | null;
      no_siri: number;
      no_terkini: number;
      had: number | null;
      bilTiket: bigint;
      bilMenunggu: bigint;
    }>
  >(
    `SELECT kp.id, kp.keterangan, kp.id_cawangan, kp.no_siri, kp.no_terkini,
            hp.had_pelanggan1 as had,
            (SELECT COUNT(*) FROM ${tbl} WHERE cawangan = ? AND perkhidmatan_khas = kp.id AND DATE(tarikh) = ? AND sesi = ?) as bilTiket,
            (SELECT COUNT(*) FROM ${tbl} WHERE cawangan = ? AND perkhidmatan_khas = kp.id AND DATE(tarikh) = ? AND status_tiket = 0) as bilMenunggu
     FROM kumpulan_perkhidmatan kp
     LEFT JOIN had_pelanggan hp ON hp.kumpulan_perkhidmatan = kp.id AND hp.cawangan = ?
     WHERE kp.id_cawangan = ? AND kp.status = 1
     ORDER BY kp.no_siri`,
    idCawangan, todayStr, sesi,
    idCawangan, todayStr,
    idCawangan,
    idCawangan
  );

  return NextResponse.json({
    sesi,
    services: services.map((s) => ({
      id: Number(s.id),
      keterangan: s.keterangan || "-",
      idCawangan: s.id_cawangan || idCawangan,
      noSiri: s.no_siri,
      noTerkini: s.no_terkini,
      had: Number(s.had || 0),
      bilTiket: Number(s.bilTiket || 0),
      kuota: Math.max(0, Number(s.had || 0) - Number(s.bilTiket || 0)),
      bilMenunggu: Number(s.bilMenunggu || 0),
    })),
  });
}
