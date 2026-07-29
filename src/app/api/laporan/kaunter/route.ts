import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper: extract HH:MM:SS from ISO time string or Date object
function formatTime(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    const h = String(val.getUTCHours()).padStart(2, "0");
    const m = String(val.getUTCMinutes()).padStart(2, "0");
    const s = String(val.getUTCSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  const str = String(val);
  const match = str.match(/T(\d{2}:\d{2}:\d{2})/);
  if (match) return match[1];
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) return str;
  const dateMatch = str.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (dateMatch) return `${dateMatch[1]}:${dateMatch[2]}:${dateMatch[3]}`;
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cawangan = searchParams.get("cawangan") || session.user.idCawangan;
  const dari = searchParams.get("dari");
  const hingga = searchParams.get("hingga");
  const jenis = searchParams.get("jenis") || "1";

  if (!dari || !hingga) {
    return NextResponse.json({ error: "Tarikh diperlukan" }, { status: 400 });
  }

  if (!cawangan || cawangan === "000000") {
    return NextResponse.json({ error: "Sila pilih cawangan" }, { status: 400 });
  }

  if (jenis === "1") {
    const data = await prisma.$queryRawUnsafe<
      Array<{
        tarikh: Date | null;
        kaunter: string | null;
        bil_tiket: bigint;
        bil_selesai: bigint;
        bil_batal: bigint;
        bil_lain: bigint;
        purata_masa_menunggu: unknown;
        purata_masa_layanan: unknown;
        masa_menunggu_terlama: unknown;
        masa_layanan_terlama: unknown;
        jumlah_masa_keseluruhan: unknown;
      }>
    >(
      `SELECT tarikh, kaunter,
              SUM(bil_tiket) AS bil_tiket,
              SUM(bil_selesai) AS bil_selesai,
              SUM(bil_batal) AS bil_batal,
              SUM(bil_lain) AS bil_lain,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_menunggu))) AS purata_masa_menunggu,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_layanan))) AS purata_masa_layanan,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_menunggu_terlama))) AS masa_menunggu_terlama,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_layanan_terlama))) AS masa_layanan_terlama,
              SEC_TO_TIME(SUM(TIME_TO_SEC(jumlah_masa_keseluruhan))) AS jumlah_masa_keseluruhan
       FROM kaunter_stat
       WHERE tarikh BETWEEN ? AND ? AND cawangan = ?
       GROUP BY tarikh, kaunter
       ORDER BY tarikh, kaunter ASC`,
      dari,
      hingga,
      cawangan
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Harian Mengikut Kaunter",
      data: data.map((r) => ({
        tarikh: r.tarikh ? new Date(r.tarikh).toISOString().slice(0, 10) : null,
        kaunter: r.kaunter || "",
        bil_tiket: Number(r.bil_tiket || 0),
        bil_selesai: Number(r.bil_selesai || 0),
        bil_batal: Number(r.bil_batal || 0),
        bil_lain: Number(r.bil_lain || 0),
        purata_masa_menunggu: formatTime(r.purata_masa_menunggu),
        purata_masa_layanan: formatTime(r.purata_masa_layanan),
        masa_menunggu_terlama: formatTime(r.masa_menunggu_terlama),
        masa_layanan_terlama: formatTime(r.masa_layanan_terlama),
        jumlah_masa_keseluruhan: formatTime(r.jumlah_masa_keseluruhan),
      })),
    });
  }

  if (jenis === "2") {
    const data = await prisma.$queryRawUnsafe<
      Array<{
        bulan: bigint;
        tahun: bigint;
        kaunter: string | null;
        bil_tiket: bigint;
        bil_selesai: bigint;
        bil_batal: bigint;
        bil_lain: bigint;
        purata_masa_menunggu: unknown;
        purata_masa_layanan: unknown;
        masa_menunggu_terlama: unknown;
        masa_layanan_terlama: unknown;
        jumlah_masa_keseluruhan: unknown;
      }>
    >(
      `SELECT CAST(MONTH(tarikh) AS UNSIGNED) AS bulan, CAST(YEAR(tarikh) AS UNSIGNED) AS tahun,
              kaunter,
              SUM(bil_tiket) AS bil_tiket,
              SUM(bil_selesai) AS bil_selesai,
              SUM(bil_batal) AS bil_batal,
              SUM(bil_lain) AS bil_lain,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_menunggu))) AS purata_masa_menunggu,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_layanan))) AS purata_masa_layanan,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_menunggu_terlama))) AS masa_menunggu_terlama,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_layanan_terlama))) AS masa_layanan_terlama,
              SEC_TO_TIME(SUM(TIME_TO_SEC(jumlah_masa_keseluruhan))) AS jumlah_masa_keseluruhan
       FROM kaunter_stat
       WHERE tarikh BETWEEN ? AND ? AND cawangan = ?
       GROUP BY bulan, tahun, kaunter
       ORDER BY tahun, bulan, kaunter ASC`,
      dari,
      hingga,
      cawangan
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Bulanan Mengikut Kaunter",
      data: data.map((r) => ({
        bulan: Number(r.bulan),
        tahun: Number(r.tahun),
        kaunter: r.kaunter || "",
        bil_tiket: Number(r.bil_tiket || 0),
        bil_selesai: Number(r.bil_selesai || 0),
        bil_batal: Number(r.bil_batal || 0),
        bil_lain: Number(r.bil_lain || 0),
        purata_masa_menunggu: formatTime(r.purata_masa_menunggu),
        purata_masa_layanan: formatTime(r.purata_masa_layanan),
        masa_menunggu_terlama: formatTime(r.masa_menunggu_terlama),
        masa_layanan_terlama: formatTime(r.masa_layanan_terlama),
        jumlah_masa_keseluruhan: formatTime(r.jumlah_masa_keseluruhan),
      })),
    });
  }

  if (jenis === "3") {
    const data = await prisma.$queryRawUnsafe<
      Array<{
        tahun: bigint;
        kaunter: string | null;
        bil_tiket: bigint;
        bil_selesai: bigint;
        bil_batal: bigint;
        bil_lain: bigint;
        purata_masa_menunggu: unknown;
        purata_masa_layanan: unknown;
        masa_menunggu_terlama: unknown;
        masa_layanan_terlama: unknown;
        jumlah_masa_keseluruhan: unknown;
      }>
    >(
      `SELECT CAST(YEAR(tarikh) AS UNSIGNED) AS tahun,
              kaunter,
              SUM(bil_tiket) AS bil_tiket,
              SUM(bil_selesai) AS bil_selesai,
              SUM(bil_batal) AS bil_batal,
              SUM(bil_lain) AS bil_lain,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_menunggu))) AS purata_masa_menunggu,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_layanan))) AS purata_masa_layanan,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_menunggu_terlama))) AS masa_menunggu_terlama,
              SEC_TO_TIME(MAX(TIME_TO_SEC(masa_layanan_terlama))) AS masa_layanan_terlama,
              SEC_TO_TIME(SUM(TIME_TO_SEC(jumlah_masa_keseluruhan))) AS jumlah_masa_keseluruhan
       FROM kaunter_stat
       WHERE tarikh BETWEEN ? AND ? AND cawangan = ?
       GROUP BY tahun, kaunter
       ORDER BY tahun, kaunter ASC`,
      dari,
      hingga,
      cawangan
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Tahunan Mengikut Kaunter",
      data: data.map((r) => ({
        tahun: Number(r.tahun),
        kaunter: r.kaunter || "",
        bil_tiket: Number(r.bil_tiket || 0),
        bil_selesai: Number(r.bil_selesai || 0),
        bil_batal: Number(r.bil_batal || 0),
        bil_lain: Number(r.bil_lain || 0),
        purata_masa_menunggu: formatTime(r.purata_masa_menunggu),
        purata_masa_layanan: formatTime(r.purata_masa_layanan),
        masa_menunggu_terlama: formatTime(r.masa_menunggu_terlama),
        masa_layanan_terlama: formatTime(r.masa_layanan_terlama),
        jumlah_masa_keseluruhan: formatTime(r.jumlah_masa_keseluruhan),
      })),
    });
  }

  return NextResponse.json({ error: "Jenis laporan tidak sah" }, { status: 400 });
}
