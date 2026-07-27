import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper: extract HH:mm:ss from ISO time string or Date object
function formatTime(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    // Extract UTC time from Date object
    const h = String(val.getUTCHours()).padStart(2, "0");
    const m = String(val.getUTCMinutes()).padStart(2, "0");
    const s = String(val.getUTCSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  const str = String(val);
  const match = str.match(/T(\d{2}:\d{2}:\d{2})/);
  if (match) return match[1];
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) return str;
  // Try parsing as date string
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
  const cawangan = session.user.idCawangan;
  const dari = searchParams.get("dari");
  const hingga = searchParams.get("hingga");
  const jenis = searchParams.get("jenis") || "1";
  const isAdmin = session.user.levelAkses === "1";

  if (!dari || !hingga) {
    return NextResponse.json({ error: "Tarikh diperlukan" }, { status: 400 });
  }

  // Build WHERE clause - Admin sees all, KC sees own branch
  const cawanganFilter = isAdmin ? "" : "AND cawangan = ?";
  const cawanganParams = isAdmin ? [] : [cawangan];

  if (jenis === "1") {
    // Harian - daily report from tiket_stat
    const data = await prisma.$queryRawUnsafe<
      Array<{
        tarikh: Date | null;
        bil_tiket: bigint | null;
        bil_selesai: bigint | null;
        bil_batal: bigint | null;
        batal_cust: bigint | null;
        batal_kaunter: bigint | null;
        bil_lain: bigint | null;
        purata_masa_menunggu: string | null;
        purata_masa_layanan: string | null;
      }>
    >(
      `SELECT tarikh, SUM(bil_tiket) as bil_tiket, SUM(bil_selesai) as bil_selesai,
              SUM(bil_batal) as bil_batal, SUM(batal_cust) as batal_cust,
              SUM(batal_kaunter) as batal_kaunter, SUM(bil_lain) as bil_lain,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_menunggu))) as purata_masa_menunggu,
              SEC_TO_TIME(AVG(TIME_TO_SEC(purata_masa_layanan))) as purata_masa_layanan
       FROM tiket_stat
       WHERE tarikh BETWEEN ? AND ? ${cawanganFilter}
       GROUP BY tarikh
       ORDER BY tarikh`,
      dari,
      hingga,
      ...cawanganParams
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Harian",
      data: data.map((r) => ({
        tarikh: r.tarikh ? new Date(r.tarikh).toISOString().slice(0, 10) : null,
        bil_tiket: Number(r.bil_tiket || 0),
        bil_selesai: Number(r.bil_selesai || 0),
        bil_batal: Number(r.bil_batal || 0),
        batal_cust: Number(r.batal_cust || 0),
        batal_kaunter: Number(r.batal_kaunter || 0),
        bil_lain: Number(r.bil_lain || 0),
        purata_masa_menunggu: formatTime(r.purata_masa_menunggu),
        purata_masa_layanan: formatTime(r.purata_masa_layanan),
      })),
    });
  }

  if (jenis === "2") {
    // Bulanan - monthly aggregation
    const data = await prisma.$queryRawUnsafe<
      Array<{
        bulan: bigint;
        tahun: bigint;
        bil_tiket: bigint;
        bil_selesai: bigint;
        bil_batal: bigint;
        batal_cust: bigint;
        batal_kaunter: bigint;
        bil_lain: bigint;
      }>
    >(
      `SELECT CAST(MONTH(tarikh) AS UNSIGNED) AS bulan, CAST(YEAR(tarikh) AS UNSIGNED) AS tahun,
              SUM(bil_tiket) AS bil_tiket, SUM(bil_selesai) AS bil_selesai,
              SUM(bil_batal) AS bil_batal, SUM(batal_cust) AS batal_cust,
              SUM(batal_kaunter) AS batal_kaunter, SUM(bil_lain) AS bil_lain
       FROM tiket_stat
       WHERE tarikh BETWEEN ? AND ? ${cawanganFilter}
       GROUP BY bulan, tahun
       ORDER BY tahun, bulan`,
      dari,
      hingga,
      ...cawanganParams
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Bulanan",
      data: data.map((r) => ({
        bulan: Number(r.bulan),
        tahun: Number(r.tahun),
        bil_tiket: Number(r.bil_tiket),
        bil_selesai: Number(r.bil_selesai),
        bil_batal: Number(r.bil_batal),
        batal_cust: Number(r.batal_cust),
        batal_kaunter: Number(r.batal_kaunter),
        bil_lain: Number(r.bil_lain),
        purata_masa_menunggu: null,
        purata_masa_layanan: null,
      })),
    });
  }

  if (jenis === "3") {
    // Tahunan - yearly aggregation
    const data = await prisma.$queryRawUnsafe<
      Array<{
        tahun: bigint;
        bil_tiket: bigint;
        bil_selesai: bigint;
        bil_batal: bigint;
        batal_cust: bigint;
        batal_kaunter: bigint;
        bil_lain: bigint;
      }>
    >(
      `SELECT CAST(YEAR(tarikh) AS UNSIGNED) AS tahun,
              SUM(bil_tiket) AS bil_tiket, SUM(bil_selesai) AS bil_selesai,
              SUM(bil_batal) AS bil_batal, SUM(batal_cust) AS batal_cust,
              SUM(batal_kaunter) AS batal_kaunter, SUM(bil_lain) AS bil_lain
       FROM tiket_stat
       WHERE tarikh BETWEEN ? AND ? ${cawanganFilter}
       GROUP BY tahun
       ORDER BY tahun`,
      dari,
      hingga,
      ...cawanganParams
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Tahunan",
      data: data.map((r) => ({
        tahun: Number(r.tahun),
        bil_tiket: Number(r.bil_tiket),
        bil_selesai: Number(r.bil_selesai),
        bil_batal: Number(r.bil_batal),
        batal_cust: Number(r.batal_cust),
        batal_kaunter: Number(r.batal_kaunter),
        bil_lain: Number(r.bil_lain),
        purata_masa_menunggu: null,
        purata_masa_layanan: null,
      })),
    });
  }

  if (jenis === "4") {
    // Mengikut Jam - hourly report from tiket_stat_hour (single date)
    // Group by hour, sum tickets and cancelled
    const data = await prisma.$queryRawUnsafe<
      Array<{
        tarikh: Date | null;
        masa: string | null;
        jumlah_tiket: bigint;
        jumlah_batal: bigint;
      }>
    >(
      `SELECT tarikh, masa,
              SUM(CASE WHEN bil_tiket = 1 THEN jum ELSE 0 END) AS jumlah_tiket,
              SUM(CASE WHEN bil_tiket_batal_cust = 1 THEN jum ELSE 0 END) AS jumlah_batal
       FROM tiket_stat_hour
       WHERE tarikh = ? ${cawanganFilter} AND masa != ''
       GROUP BY tarikh, masa
       ORDER BY CAST(masa AS UNSIGNED) ASC`,
      dari,
      ...cawanganParams
    );

    return NextResponse.json({
      tajuk: "Laporan Transaksi Mengikut Jam",
      data: data.map((r) => ({
        tarikh: r.tarikh ? new Date(r.tarikh).toISOString().slice(0, 10) : null,
        masa: r.masa ? `${r.masa}:00` : "-",
        bil_tiket: Number(r.jumlah_tiket || 0),
        batal_cust: Number(r.jumlah_batal || 0),
        bil_selesai: 0,
        bil_batal: 0,
        batal_kaunter: 0,
        bil_lain: 0,
        purata_masa_menunggu: null,
        purata_masa_layanan: null,
      })),
    });
  }

  return NextResponse.json({ error: "Jenis laporan tidak sah" }, { status: 400 });
}
