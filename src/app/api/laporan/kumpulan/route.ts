import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper: extract HH:MM:SS from ISO time string or return as-is
function formatTime(val: unknown): string | null {
  if (!val) return null;
  const str = String(val);
  // Prisma returns TIME as "1970-01-01T00:45:05.000Z"
  const match = str.match(/T(\d{2}:\d{2}:\d{2})/);
  if (match) return match[1];
  // Already in HH:MM:SS format
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) return str;
  return str;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cawangan = session.user.idCawangan;
  const dari = searchParams.get("dari");
  const hingga = searchParams.get("hingga");
  const jenis = searchParams.get("jenis") || "1";

  if (!dari || !hingga) {
    return NextResponse.json({ error: "Tarikh diperlukan" }, { status: 400 });
  }

  if (jenis === "1") {
    const data = await prisma.$queryRawUnsafe<
      Array<{
        tarikh: Date | null;
        keterangan: string | null;
        total_tiket: bigint;
        total_selesai: bigint;
        total_batal: bigint;
        total_lain: bigint;
        avg_menunggu: string | null;
        avg_layanan: string | null;
        max_menunggu: string | null;
        max_layanan: string | null;
        total_masa: string | null;
      }>
    >(
      `SELECT tarikh, keterangan,
              SUM(bil_tiket) AS total_tiket,
              SUM(bil_selesai) AS total_selesai,
              SUM(bil_batal) AS total_batal,
              SUM(bil_lain) AS total_lain,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_menunggu))) AS avg_menunggu,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_layanan))) AS avg_layanan,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_menunggu_terlama))) AS max_menunggu,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_layanan_terlama))) AS max_layanan,
              SEC_TO_TIME(SUM(TIME_TO_SEC(jumlah_masa_keseluruhan))) AS total_masa
       FROM perkhidmatan_stat
       WHERE tarikh BETWEEN ? AND ? AND cawangan = ?
       GROUP BY tarikh, keterangan
       ORDER BY tarikh, keterangan`,
      dari,
      hingga,
      cawangan
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Harian Mengikut Perkhidmatan",
      data: data.map((r) => ({
        tarikh: r.tarikh ? new Date(r.tarikh).toISOString().slice(0, 10) : null,
        keterangan: r.keterangan || "-",
        total_tiket: Number(r.total_tiket || 0),
        total_selesai: Number(r.total_selesai || 0),
        total_batal: Number(r.total_batal || 0),
        total_lain: Number(r.total_lain || 0),
        avg_menunggu: formatTime(r.avg_menunggu),
        avg_layanan: formatTime(r.avg_layanan),
        max_menunggu: formatTime(r.max_menunggu),
        max_layanan: formatTime(r.max_layanan),
        total_masa: formatTime(r.total_masa),
      })),
    });
  }

  if (jenis === "2") {
    const data = await prisma.$queryRawUnsafe<
      Array<{
        bulan: bigint;
        tahun: bigint;
        keterangan: string | null;
        total_tiket: bigint;
        total_selesai: bigint;
        total_batal: bigint;
        total_lain: bigint;
        avg_menunggu: string | null;
        avg_layanan: string | null;
        max_menunggu: string | null;
        max_layanan: string | null;
        total_masa: string | null;
      }>
    >(
      `SELECT CAST(MONTH(tarikh) AS UNSIGNED) AS bulan, CAST(YEAR(tarikh) AS UNSIGNED) AS tahun,
              keterangan,
              SUM(bil_tiket) AS total_tiket,
              SUM(bil_selesai) AS total_selesai,
              SUM(bil_batal) AS total_batal,
              SUM(bil_lain) AS total_lain,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_menunggu))) AS avg_menunggu,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_layanan))) AS avg_layanan,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_menunggu_terlama))) AS max_menunggu,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_layanan_terlama))) AS max_layanan,
              SEC_TO_TIME(SUM(TIME_TO_SEC(jumlah_masa_keseluruhan))) AS total_masa
       FROM perkhidmatan_stat
       WHERE tarikh BETWEEN ? AND ? AND cawangan = ?
       GROUP BY bulan, tahun, keterangan
       ORDER BY tahun, bulan, keterangan`,
      dari,
      hingga,
      cawangan
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Bulanan Mengikut Perkhidmatan",
      data: data.map((r) => ({
        bulan: Number(r.bulan),
        tahun: Number(r.tahun),
        keterangan: r.keterangan || "-",
        total_tiket: Number(r.total_tiket || 0),
        total_selesai: Number(r.total_selesai || 0),
        total_batal: Number(r.total_batal || 0),
        total_lain: Number(r.total_lain || 0),
        avg_menunggu: formatTime(r.avg_menunggu),
        avg_layanan: formatTime(r.avg_layanan),
        max_menunggu: formatTime(r.max_menunggu),
        max_layanan: formatTime(r.max_layanan),
        total_masa: formatTime(r.total_masa),
      })),
    });
  }

  if (jenis === "3") {
    const data = await prisma.$queryRawUnsafe<
      Array<{
        tahun: bigint;
        keterangan: string | null;
        total_tiket: bigint;
        total_selesai: bigint;
        total_batal: bigint;
        total_lain: bigint;
        avg_menunggu: string | null;
        avg_layanan: string | null;
        max_menunggu: string | null;
        max_layanan: string | null;
        total_masa: string | null;
      }>
    >(
      `SELECT CAST(YEAR(tarikh) AS UNSIGNED) AS tahun,
              keterangan,
              SUM(bil_tiket) AS total_tiket,
              SUM(bil_selesai) AS total_selesai,
              SUM(bil_batal) AS total_batal,
              SUM(bil_lain) AS total_lain,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_menunggu))) AS avg_menunggu,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_layanan))) AS avg_layanan,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_menunggu_terlama))) AS max_menunggu,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_layanan_terlama))) AS max_layanan,
              SEC_TO_TIME(SUM(TIME_TO_SEC(jumlah_masa_keseluruhan))) AS total_masa
       FROM perkhidmatan_stat
       WHERE tarikh BETWEEN ? AND ? AND cawangan = ?
       GROUP BY tahun, keterangan
       ORDER BY tahun, keterangan`,
      dari,
      hingga,
      cawangan
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Tahunan Mengikut Perkhidmatan",
      data: data.map((r) => ({
        tahun: Number(r.tahun),
        keterangan: r.keterangan || "-",
        total_tiket: Number(r.total_tiket || 0),
        total_selesai: Number(r.total_selesai || 0),
        total_batal: Number(r.total_batal || 0),
        total_lain: Number(r.total_lain || 0),
        avg_menunggu: formatTime(r.avg_menunggu),
        avg_layanan: formatTime(r.avg_layanan),
        max_menunggu: formatTime(r.max_menunggu),
        max_layanan: formatTime(r.max_layanan),
        total_masa: formatTime(r.total_masa),
      })),
    });
  }

  return NextResponse.json({ error: "Jenis laporan tidak sah" }, { status: 400 });
}
