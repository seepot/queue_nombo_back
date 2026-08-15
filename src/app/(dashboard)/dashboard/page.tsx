import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import KaunterDashboardClient from "./KaunterDashboardClient";
import PrinterDashboardClient from "./PrinterDashboardClient";
import QRDisplayClient from "./QRDisplayClient";
import AdminTransactionChart from "./AdminTransactionChart";
import AdminCancellationChart from "./AdminCancellationChart";
import DashboardAutoRefresh from "./DashboardAutoRefresh";
import KaunterCompletedChart from "./KaunterCompletedChart";
import AdminKaunterFilter from "./AdminKaunterFilter";

// Helper: derive per-branch tiket table name from cawangan id
// e.g. "0105041A" -> negeri code "05" -> "tiket_05"
function getTiketTable(cawangan: string): string {
  const negeri = cawangan.substring(2, 4);
  return `tiket_${negeri}`;
}

// ==================== ADMIN HQ (level_akses = 1) ====================
async function getAdminStats() {
  // Use latest available date from tiket_stat (stats may not be generated for today yet)
  const latestResult = await prisma.$queryRaw<Array<{ latest: Date | null }>>`
    SELECT MAX(tarikh) as latest FROM tiket_stat
  `;
  const latestDate = latestResult[0]?.latest;
  const todayStr = latestDate
    ? new Date(latestDate).toISOString().slice(0, 10)
    : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Get today's transaction count per state from tiket_stat
  const transaksiPerNegeri = await prisma.$queryRaw<
    Array<{ negeri: string; jumlah: bigint }>
  >`
    SELECT SUBSTRING(cawangan, 3, 2) as negeri, SUM(bil_tiket) as jumlah
    FROM tiket_stat WHERE tarikh = ${todayStr}
    GROUP BY SUBSTRING(cawangan, 3, 2)
  `;

  const transaksiPerCawangan = await prisma.$queryRaw<
    Array<{
      negeri: string;
      id_cawangan: string;
      nama_cawangan: string | null;
      jumlah: bigint;
    }>
  >`
    SELECT
      SUBSTRING(ts.cawangan, 3, 2) as negeri,
      ts.cawangan as id_cawangan,
      c.nama_cawangan,
      SUM(ts.bil_tiket) as jumlah
    FROM tiket_stat ts
    LEFT JOIN cawangan c ON c.id_cawangan = ts.cawangan
    WHERE ts.tarikh = ${todayStr}
    GROUP BY SUBSTRING(ts.cawangan, 3, 2), ts.cawangan, c.nama_cawangan
    ORDER BY SUBSTRING(ts.cawangan, 3, 2), jumlah DESC
  `;

  const batalPerNegeri = await prisma.$queryRaw<
    Array<{
      negeri: string;
      batal_kaunter: bigint | null;
      batal_pengguna: bigint | null;
    }>
  >`
    SELECT
      SUBSTRING(cawangan, 3, 2) as negeri,
      SUM(COALESCE(batal_kaunter, 0)) as batal_kaunter,
      SUM(COALESCE(batal_cust, 0)) as batal_pengguna
    FROM tiket_stat
    WHERE tarikh = ${todayStr}
    GROUP BY SUBSTRING(cawangan, 3, 2)
  `;

  const batalPerCawangan = await prisma.$queryRaw<
    Array<{
      negeri: string;
      id_cawangan: string;
      nama_cawangan: string | null;
      batal_kaunter: bigint | null;
      batal_pengguna: bigint | null;
    }>
  >`
    SELECT
      SUBSTRING(ts.cawangan, 3, 2) as negeri,
      ts.cawangan as id_cawangan,
      c.nama_cawangan,
      SUM(COALESCE(ts.batal_kaunter, 0)) as batal_kaunter,
      SUM(COALESCE(ts.batal_cust, 0)) as batal_pengguna
    FROM tiket_stat ts
    LEFT JOIN cawangan c ON c.id_cawangan = ts.cawangan
    WHERE ts.tarikh = ${todayStr}
    GROUP BY SUBSTRING(ts.cawangan, 3, 2), ts.cawangan, c.nama_cawangan
    ORDER BY SUBSTRING(ts.cawangan, 3, 2), batal_kaunter DESC, batal_pengguna DESC
  `;

  return {
    tarikh: todayStr,
    transaksiPerNegeri: transaksiPerNegeri.map((r) => ({
      negeri: r.negeri,
      jumlah: Number(r.jumlah),
    })),
    transaksiPerCawangan: transaksiPerCawangan.map((r) => ({
      negeri: r.negeri,
      idCawangan: r.id_cawangan,
      namaCawangan: r.nama_cawangan || r.id_cawangan,
      jumlah: Number(r.jumlah),
    })),
    batalPerNegeri: batalPerNegeri.map((r) => ({
      negeri: r.negeri,
      batalKaunter: Number(r.batal_kaunter || 0),
      batalPengguna: Number(r.batal_pengguna || 0),
    })),
    batalPerCawangan: batalPerCawangan.map((r) => ({
      negeri: r.negeri,
      idCawangan: r.id_cawangan,
      namaCawangan: r.nama_cawangan || r.id_cawangan,
      batalKaunter: Number(r.batal_kaunter || 0),
      batalPengguna: Number(r.batal_pengguna || 0),
    })),
  };
}

async function getAdminKaunterStats(idCawangan: string) {
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tbl = getTiketTable(idCawangan);

  const [
    transaksiKaunter,
    transaksiSelesaiKaunter,
    transaksiDipanggilKaunter,
    totalResult,
    purataMasaKaunter,
    transaksiKaunterLama,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<
      Array<{
        kaunter: number | null;
        bilangan: bigint;
        no_terakhir: number | null;
      }>
    >(
      `SELECT a.kaunter, COUNT(*) as bilangan,
              (SELECT no_tiket FROM ${tbl} b WHERE b.kaunter = a.kaunter AND b.cawangan = ? ORDER BY b.id DESC LIMIT 1) as no_terakhir
       FROM ${tbl} a
       WHERE a.cawangan = ? AND DATE(a.tarikh) = ?
       GROUP BY a.kaunter ORDER BY a.kaunter ASC`,
      idCawangan,
      idCawangan,
      todayStr
    ),
    prisma.$queryRawUnsafe<
      Array<{
        kaunter: number | null;
        bilangan: bigint;
        no_terakhir: number | null;
        purata_layanan_saat: number | null;
      }>
    >(
      `SELECT
         kaunter,
         COUNT(*) as bilangan,
         MAX(no_tiket) as no_terakhir,
         AVG(TIMESTAMPDIFF(SECOND, call_date, end_date)) as purata_layanan_saat
       FROM ${tbl}
       WHERE cawangan = ? AND DATE(tarikh) = ? AND status_tiket = 4
         AND call_date IS NOT NULL AND end_date IS NOT NULL
         AND end_date >= call_date
       GROUP BY kaunter ORDER BY kaunter ASC`,
      idCawangan,
      todayStr
    ),
    prisma.$queryRawUnsafe<Array<{ kaunter: number | null; bilangan: bigint }>>(
      `SELECT kaunter, COUNT(*) as bilangan
       FROM ${tbl}
       WHERE cawangan = ? AND DATE(tarikh) = ? AND status_tiket IN (1, 2)
       GROUP BY kaunter ORDER BY kaunter ASC`,
      idCawangan,
      todayStr
    ),
    prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM ${tbl} WHERE cawangan = ? AND DATE(tarikh) = ?`,
      idCawangan,
      todayStr
    ),
    prisma.$queryRawUnsafe<
      Array<{
        purata_menunggu_saat: number | null;
        purata_layanan_saat: number | null;
      }>
    >(
      `SELECT
         AVG(CASE
           WHEN call_date IS NOT NULL AND create_date IS NOT NULL
           THEN TIMESTAMPDIFF(SECOND, create_date, call_date)
         END) as purata_menunggu_saat,
         AVG(CASE
           WHEN status_tiket = 4 AND call_date IS NOT NULL AND end_date IS NOT NULL
             AND end_date >= call_date
           THEN TIMESTAMPDIFF(SECOND, call_date, end_date)
         END) as purata_layanan_saat
       FROM ${tbl}
       WHERE cawangan = ? AND DATE(tarikh) = ?`,
      idCawangan,
      todayStr
    ),
    prisma.$queryRawUnsafe<
      Array<{
        kaunter: string | null;
        no_giliran: number | null;
        kumpulan_perkhidmatan: string | null;
        call_time: string | null;
        end_time: string | null;
        masa_layanan_saat: number | null;
      }>
    >(
      `SELECT
         k.no_kaunter as kaunter,
         latest.no_tiket as no_giliran,
         kp.keterangan as kumpulan_perkhidmatan,
         DATE_FORMAT(latest.call_date, '%H:%i:%s') as call_time,
         DATE_FORMAT(latest.end_date, '%H:%i:%s') as end_time,
         TIMESTAMPDIFF(SECOND, latest.call_date, latest.end_date) as masa_layanan_saat
       FROM kaunter k
       INNER JOIN (
         SELECT t.*
         FROM ${tbl} t
         INNER JOIN (
           SELECT
             kaunter,
             MAX(TIMESTAMPDIFF(SECOND, call_date, end_date)) as max_masa_layanan_saat
           FROM ${tbl}
           WHERE cawangan = ? AND DATE(tarikh) = ? AND kaunter IS NOT NULL
             AND call_date IS NOT NULL AND end_date IS NOT NULL
             AND status_tiket = 4 AND end_date >= call_date
           GROUP BY kaunter
         ) x ON x.kaunter = t.kaunter
           AND x.max_masa_layanan_saat = TIMESTAMPDIFF(SECOND, t.call_date, t.end_date)
         WHERE t.cawangan = ? AND DATE(t.tarikh) = ?
           AND t.status_tiket = 4
           AND t.call_date IS NOT NULL AND t.end_date IS NOT NULL
           AND t.end_date >= t.call_date
       ) latest ON latest.kaunter = CAST(k.no_kaunter AS UNSIGNED)
       LEFT JOIN kumpulan_perkhidmatan kp
         ON kp.id = COALESCE(latest.kumpulan_perkhidmatan, k.id_perkhidmatan_kumpulan)
       WHERE k.id_cawangan = ? AND k.no_kaunter IS NOT NULL AND k.no_kaunter <> ''
       ORDER BY CAST(k.no_kaunter AS UNSIGNED), k.no_kaunter`,
      idCawangan,
      todayStr,
      idCawangan,
      todayStr,
      idCawangan
    ),
  ]);

  return {
    tarikh: todayStr,
    transaksiKaunter: transaksiKaunter.map((r) => ({
      kaunter: r.kaunter,
      bilangan: Number(r.bilangan),
      no_terakhir: r.no_terakhir,
    })),
    transaksiSelesaiKaunter: transaksiSelesaiKaunter.map((r) => ({
      kaunter: r.kaunter,
      bilangan: Number(r.bilangan),
      noTerakhir: r.no_terakhir,
      purataLayananSaat: Number(r.purata_layanan_saat || 0),
    })),
    transaksiDipanggilKaunter: transaksiDipanggilKaunter.map((r) => ({
      kaunter: r.kaunter,
      bilangan: Number(r.bilangan),
    })),
    transaksiKaunterLama: transaksiKaunterLama.map((r) => ({
      kaunter: r.kaunter,
      noGiliran: r.no_giliran,
      kumpulanPerkhidmatan: r.kumpulan_perkhidmatan || "-",
      callTime: r.call_time,
      endTime: r.end_time,
      masaLayananSaat: Number(r.masa_layanan_saat || 0),
    })),
    jumlahKeseluruhan: Number(totalResult[0]?.count ?? 0),
    purataMasaKaunter: {
      menungguSaat: Number(purataMasaKaunter[0]?.purata_menunggu_saat || 0),
      layananSaat: Number(purataMasaKaunter[0]?.purata_layanan_saat || 0),
    },
  };
}

// ==================== KETUA CAWANGAN (level_akses = 2) ====================
async function getKCStats(idCawangan: string) {
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tbl = getTiketTable(idCawangan);
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayCode = days[now.getDay()];

  // Transaksi Kaunter - grouped by kaunter with count, last ticket, last time
  const transaksiKaunter = await prisma.$queryRawUnsafe<
    Array<{
      kaunter: number | null;
      bilangan: bigint;
      no_terakhir: number | null;
      masa: Date | null;
    }>
  >(
    `SELECT a.kaunter, COUNT(*) as bilangan,
            (SELECT no_tiket FROM ${tbl} b WHERE b.kaunter = a.kaunter AND b.cawangan = ? ORDER BY b.id DESC LIMIT 1) as no_terakhir,
            (SELECT tarikh FROM ${tbl} b WHERE b.kaunter = a.kaunter AND b.cawangan = ? ORDER BY b.id DESC LIMIT 1) as masa
     FROM ${tbl} a WHERE a.cawangan = ? AND DATE(a.tarikh) = ?
     GROUP BY a.kaunter ORDER BY a.kaunter ASC`,
    idCawangan,
    idCawangan,
    idCawangan,
    todayStr
  );

  const transaksiKaunterLama = await prisma.$queryRawUnsafe<
    Array<{
      kaunter: string | null;
      no_giliran: number | null;
      kumpulan_perkhidmatan: string | null;
      call_time: string | null;
      end_time: string | null;
      masa_layanan_saat: number | null;
    }>
  >(
    `SELECT
       k.no_kaunter as kaunter,
       latest.no_tiket as no_giliran,
       kp.keterangan as kumpulan_perkhidmatan,
       DATE_FORMAT(latest.call_date, '%H:%i:%s') as call_time,
       DATE_FORMAT(latest.end_date, '%H:%i:%s') as end_time,
       CASE
         WHEN latest.call_date IS NOT NULL AND latest.end_date IS NOT NULL
         THEN TIMESTAMPDIFF(SECOND, latest.call_date, latest.end_date)
       END as masa_layanan_saat
     FROM kaunter k
     INNER JOIN (
       SELECT t.*
       FROM ${tbl} t
       INNER JOIN (
         SELECT
           kaunter,
           MAX(TIMESTAMPDIFF(SECOND, call_date, end_date)) as max_masa_layanan_saat
         FROM ${tbl}
         WHERE cawangan = ? AND DATE(tarikh) = ? AND kaunter IS NOT NULL
           AND call_date IS NOT NULL AND end_date IS NOT NULL
           AND status_tiket = 4 AND end_date >= call_date
         GROUP BY kaunter
       ) x ON x.kaunter = t.kaunter
         AND x.max_masa_layanan_saat = TIMESTAMPDIFF(SECOND, t.call_date, t.end_date)
       WHERE t.cawangan = ? AND DATE(t.tarikh) = ?
         AND t.status_tiket = 4
         AND t.call_date IS NOT NULL AND t.end_date IS NOT NULL
         AND t.end_date >= t.call_date
     ) latest ON latest.kaunter = CAST(k.no_kaunter AS UNSIGNED)
     LEFT JOIN kumpulan_perkhidmatan kp
       ON kp.id = COALESCE(latest.kumpulan_perkhidmatan, k.id_perkhidmatan_kumpulan)
     WHERE k.id_cawangan = ? AND k.no_kaunter IS NOT NULL AND k.no_kaunter <> ''
     ORDER BY CAST(k.no_kaunter AS UNSIGNED), k.no_kaunter`,
    idCawangan,
    todayStr,
    idCawangan,
    todayStr,
    idCawangan
  );

  // Transaksi Perkhidmatan - grouped by service
  const transaksiPerkhidmatan = await prisma.$queryRawUnsafe<
    Array<{
      keterangan: string | null;
      bilangan: bigint;
      biltunggu: bigint;
      bildipanggil: bigint;
      bilselesai: bigint;
      purata_layanan_saat: number | null;
    }>
  >(
    `SELECT c.keterangan, COUNT(*) AS bilangan,
            COUNT(CASE WHEN status_tiket = 0 THEN 1 END) AS biltunggu,
            COUNT(CASE WHEN status_tiket IN (1, 2) THEN 1 END) AS bildipanggil,
            COUNT(CASE WHEN status_tiket = 4 THEN 1 END) AS bilselesai,
            AVG(CASE
              WHEN status_tiket = 4 AND call_date IS NOT NULL AND end_date IS NOT NULL
              THEN TIMESTAMPDIFF(SECOND, call_date, end_date)
            END) AS purata_layanan_saat
     FROM ${tbl} a
     INNER JOIN kumpulan_perkhidmatan c ON a.kumpulan_perkhidmatan = c.id
     WHERE a.cawangan = ? AND DATE(a.tarikh) = ?
     GROUP BY a.kumpulan_perkhidmatan ORDER BY a.kumpulan_perkhidmatan ASC`,
    idCawangan,
    todayStr
  );

  // Status breakdown
  const statusData = await prisma.$queryRawUnsafe<
    Array<{ status_tiket: number; bilangan: bigint }>
  >(
    `SELECT status_tiket, COUNT(*) as bilangan FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ?
     GROUP BY status_tiket ORDER BY status_tiket`,
    idCawangan,
    todayStr
  );

  const transaksiBatal = await prisma.$queryRawUnsafe<
    Array<{ batal_oleh: number; bilangan: bigint }>
  >(
    `SELECT batal_oleh, COUNT(*) as bilangan FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ? AND status_tiket = 5 AND batal_oleh IN (1, 2)
     GROUP BY batal_oleh ORDER BY batal_oleh`,
    idCawangan,
    todayStr
  );

  const transaksiBatalKaunter = await prisma.$queryRawUnsafe<
    Array<{
      kaunter: number | null;
      batal_kaunter: bigint;
      batal_pengguna: bigint;
      jumlah: bigint;
    }>
  >(
    `SELECT
       kaunter,
       COUNT(CASE WHEN batal_oleh = 1 THEN 1 END) as batal_kaunter,
       COUNT(CASE WHEN batal_oleh = 2 THEN 1 END) as batal_pengguna,
       COUNT(*) as jumlah
     FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ? AND status_tiket = 5 AND batal_oleh IN (1, 2)
     GROUP BY kaunter ORDER BY kaunter ASC`,
    idCawangan,
    todayStr
  );

  const transaksiSelesaiKaunter = await prisma.$queryRawUnsafe<
    Array<{
      kaunter: number | null;
      bilangan: bigint;
      no_terakhir: number | null;
      masa_terakhir: Date | null;
      purata_layanan_saat: number | null;
    }>
  >(
    `SELECT
       kaunter,
       COUNT(*) as bilangan,
       MAX(no_tiket) as no_terakhir,
       MAX(end_date) as masa_terakhir,
       AVG(TIMESTAMPDIFF(SECOND, call_date, end_date)) as purata_layanan_saat
     FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ? AND status_tiket = 4
       AND call_date IS NOT NULL AND end_date IS NOT NULL
     GROUP BY kaunter ORDER BY kaunter ASC`,
    idCawangan,
    todayStr
  );

  const transaksiDipanggilKaunter = await prisma.$queryRawUnsafe<
    Array<{ kaunter: number | null; bilangan: bigint }>
  >(
    `SELECT kaunter, COUNT(*) as bilangan
     FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ? AND status_tiket IN (1, 2)
     GROUP BY kaunter ORDER BY kaunter ASC`,
    idCawangan,
    todayStr
  );

  const purataMasaKaunter = await prisma.$queryRawUnsafe<
    Array<{
      purata_menunggu_saat: number | null;
      purata_layanan_saat: number | null;
    }>
  >(
    `SELECT
       AVG(CASE
         WHEN call_date IS NOT NULL AND create_date IS NOT NULL
         THEN TIMESTAMPDIFF(SECOND, create_date, call_date)
       END) as purata_menunggu_saat,
       AVG(CASE
         WHEN status_tiket = 4 AND call_date IS NOT NULL AND end_date IS NOT NULL
         THEN TIMESTAMPDIFF(SECOND, call_date, end_date)
       END) as purata_layanan_saat
     FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ?`,
    idCawangan,
    todayStr
  );

  // Total
  const totalResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) as count FROM ${tbl} WHERE cawangan = ? AND DATE(tarikh) = ?`,
    idCawangan,
    todayStr
  );

  // Transaksi Mengikut Sesi
  const transaksiSesi = await prisma.$queryRawUnsafe<
    Array<{ sesi: number; bilangan: bigint }>
  >(
    `SELECT sesi, COUNT(*) as bilangan FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ?
     GROUP BY sesi ORDER BY sesi ASC`,
    idCawangan,
    todayStr
  );

  const transaksiSesiPerkhidmatan = await prisma.$queryRawUnsafe<
    Array<{
      kumpulan_perkhidmatan: number | null;
      sesi: number;
      bilangan: bigint;
    }>
  >(
    `SELECT kumpulan_perkhidmatan, sesi, COUNT(*) as bilangan FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ?
     GROUP BY kumpulan_perkhidmatan, sesi
     ORDER BY kumpulan_perkhidmatan ASC, sesi ASC`,
    idCawangan,
    todayStr
  );

  // Had pelanggan limits
  const hadPelanggan = await prisma.$queryRawUnsafe<
    Array<{
      keterangan: string | null;
      kumpulan_perkhidmatan: string | null;
      had_pelanggan1: number;
      had_pelanggan2: number;
      had_pelanggan3: number;
    }>
  >(
    `SELECT b.keterangan, a.kumpulan_perkhidmatan, a.had_pelanggan1, a.had_pelanggan2, a.had_pelanggan3
     FROM had_pelanggan a
     LEFT JOIN kumpulan_perkhidmatan b ON a.kumpulan_perkhidmatan = b.id
     WHERE a.cawangan = ?`,
    idCawangan
  );

  const sesiAktif = await prisma.$queryRawUnsafe<Array<{ sesi: number }>>(
    `SELECT DISTINCT sesi FROM waktu_operasi
     WHERE cawangan = ? AND nama_hari = ? AND status_aktif = 1 AND sesi IS NOT NULL
     ORDER BY sesi ASC`,
    idCawangan,
    dayCode
  );

  const cawanganInfo = await prisma.cawangan.findFirst({
    where: { idCawangan },
    select: { jenisLimit: true },
  });

  return {
    jenisLimit: cawanganInfo?.jenisLimit || 1,
    transaksiKaunter: transaksiKaunter.map((r) => ({
      kaunter: r.kaunter,
      bilangan: Number(r.bilangan),
      no_terakhir: r.no_terakhir,
      masa: r.masa,
    })),
    transaksiKaunterLama: transaksiKaunterLama.map((r) => ({
      kaunter: r.kaunter,
      noGiliran: r.no_giliran,
      kumpulanPerkhidmatan: r.kumpulan_perkhidmatan || "-",
      callTime: r.call_time,
      endTime: r.end_time,
      masaLayananSaat: Number(r.masa_layanan_saat || 0),
    })),
    transaksiPerkhidmatan: transaksiPerkhidmatan.map((r) => ({
      keterangan: r.keterangan || "-",
      bilangan: Number(r.bilangan),
      biltunggu: Number(r.biltunggu),
      bildipanggil: Number(r.bildipanggil),
      bilselesai: Number(r.bilselesai),
      purataLayananSaat: Number(r.purata_layanan_saat || 0),
    })),
    statusData: statusData.map((r) => ({
      status: r.status_tiket,
      bilangan: Number(r.bilangan),
    })),
    transaksiBatal: {
      batalKaunter:
        Number(
          transaksiBatal.find((r) => Number(r.batal_oleh) === 1)?.bilangan
        ) || 0,
      batalPengguna:
        Number(
          transaksiBatal.find((r) => Number(r.batal_oleh) === 2)?.bilangan
        ) || 0,
    },
    transaksiBatalKaunter: transaksiBatalKaunter.map((r) => ({
      kaunter: r.kaunter,
      batalKaunter: Number(r.batal_kaunter),
      batalPengguna: Number(r.batal_pengguna),
      jumlah: Number(r.jumlah),
    })),
    transaksiSelesaiKaunter: transaksiSelesaiKaunter.map((r) => ({
      kaunter: r.kaunter,
      bilangan: Number(r.bilangan),
      noTerakhir: r.no_terakhir,
      masaTerakhir: r.masa_terakhir,
      purataLayananSaat: Number(r.purata_layanan_saat || 0),
    })),
    transaksiDipanggilKaunter: transaksiDipanggilKaunter.map((r) => ({
      kaunter: r.kaunter,
      bilangan: Number(r.bilangan),
    })),
    purataMasaKaunter: {
      menungguSaat: Number(purataMasaKaunter[0]?.purata_menunggu_saat || 0),
      layananSaat: Number(purataMasaKaunter[0]?.purata_layanan_saat || 0),
    },
    jumlahKeseluruhan: Number(totalResult[0]?.count ?? 0),
    tarikh: todayStr,
    transaksiSesi: transaksiSesi.map((r) => ({
      sesi: r.sesi,
      bilangan: Number(r.bilangan),
    })),
    transaksiSesiPerkhidmatan: transaksiSesiPerkhidmatan.map((r) => ({
      kumpulanPerkhidmatan:
        r.kumpulan_perkhidmatan == null ? null : String(r.kumpulan_perkhidmatan),
      sesi: r.sesi,
      bilangan: Number(r.bilangan),
    })),
    hadPelanggan: hadPelanggan
      .filter((r) =>
        (cawanganInfo?.jenisLimit || 1) === 2
          ? r.kumpulan_perkhidmatan != null && r.kumpulan_perkhidmatan !== ""
          : r.kumpulan_perkhidmatan == null || r.kumpulan_perkhidmatan === ""
      )
      .map((r) => ({
      keterangan: r.keterangan || "-",
      kumpulanPerkhidmatan: r.kumpulan_perkhidmatan,
      had_pelanggan1: r.had_pelanggan1 || 0,
      had_pelanggan2: r.had_pelanggan2 || 0,
      had_pelanggan3: r.had_pelanggan3 || 0,
    })),
    sesiAktif: sesiAktif.map((r) => Number(r.sesi)).filter(Boolean),
  };
}

// ==================== PENCETAK TIKET (level_akses = 4) ====================
async function getPrinterStats(idCawangan: string) {
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tbl = getTiketTable(idCawangan);

  // Get current session
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

  // Get services with limits and counts
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

  return {
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
  };
}

// ==================== STAFF KAUNTER (level_akses = 3) ====================
async function getStaffStats(idCawangan: string, noKaunter: string | undefined) {
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const kaunterNum = noKaunter ? Number(noKaunter) : 0;
  const tbl = getTiketTable(idCawangan);

  // Current ticket being served at this counter (status 1=called, 2=recalled)
  const currentTicket = await prisma.$queryRawUnsafe<
    Array<{
      no_tiket: number;
      transid: string;
      status_tiket: number;
      call_date: Date | null;
      idle_minutes: number | null;
    }>
  >(
    `SELECT
       no_tiket,
       transid,
       status_tiket,
       call_date,
       TIMESTAMPDIFF(MINUTE, call_date, NOW()) as idle_minutes
     FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ?
     AND status_tiket IN (1, 2)
     ORDER BY call_date DESC LIMIT 1`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  // Waiting queue (status 0 = Baru, kaunter IS NULL)
  const waitingList = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; no_siri: number; sesi: number }>
  >(
    `SELECT no_tiket, no_siri, sesi FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ? AND status_tiket = 0 AND kaunter IS NULL
     ORDER BY id ASC LIMIT 20`,
    idCawangan,
    todayStr
  );

  // Cancelled tickets for this counter (status 5)
  const cancelledList = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; cancel_date: Date | null; status_tiket: number }>
  >(
    `SELECT no_tiket, cancel_date, status_tiket FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 5
     ORDER BY id DESC LIMIT 10`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  // Transferred tickets (status 3 = Pindahan, transferred to this counter)
  const transferredList = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; transfer_from: number; status_tiket: number }>
  >(
    `SELECT no_tiket, transfer_from, status_tiket FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 3
     ORDER BY id DESC LIMIT 10`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  // Total served by counter today
  const servedResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) as count FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 4`,
    idCawangan,
    kaunterNum,
    todayStr
  );
  const bilPelanggan = Number(servedResult[0]?.count ?? 0);

  // Waiting count not yet called
  const belumPanggil = waitingList.length;

  // No Terakhir - last completed ticket at this counter
  const lastTicket = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; end_date: Date | null; status_tiket: number }>
  >(
    `SELECT no_tiket, end_date, status_tiket FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 4
     ORDER BY end_date DESC LIMIT 5`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  // Nombor Pindah Perkhidmatan - tickets transferred with perkhidmatan_khas matching this counter's kumpulan
  const pindahPerkhidmatanList = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; keterangan: string | null; status_tiket: number }>
  >(
    `SELECT a.no_tiket, b.keterangan, a.status_tiket FROM ${tbl} a
     LEFT JOIN kumpulan_perkhidmatan b ON a.kumpulan_perkhidmatan = b.id
     WHERE a.cawangan = ? AND a.status_tiket = 6 AND DATE(a.tarikh) = ?
     AND a.transfer_from <> ?
     AND a.kaunter = ?
     ORDER BY a.id DESC LIMIT 10`,
    idCawangan,
    todayStr,
    kaunterNum,
    kaunterNum
  );

  // Bilangan Mengikut Perkhidmatan - count by service group today
  const bilanganPerkhidmatan = await prisma.$queryRawUnsafe<
    Array<{ bilangan: bigint; keterangan: string | null }>
  >(
    `SELECT COUNT(*) as bilangan, b.keterangan FROM ${tbl} a
     INNER JOIN kumpulan_perkhidmatan b ON a.kumpulan_perkhidmatan = b.id
     WHERE a.cawangan = ? AND a.kaunter = ? AND DATE(a.tarikh) = ?
     GROUP BY a.kumpulan_perkhidmatan`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  return {
    currentTicket: currentTicket[0]
      ? {
          ...currentTicket[0],
          idle_minutes: Number(currentTicket[0].idle_minutes || 0),
        }
      : null,
    waitingList,
    cancelledList,
    transferredList,
    bilPelanggan,
    belumPanggil,
    lastTicket,
    pindahPerkhidmatanList,
    bilanganPerkhidmatan: bilanganPerkhidmatan.map((r) => ({
      keterangan: r.keterangan || "Lain-lain",
      bilangan: Number(r.bilangan),
    })),
  };
}

// ==================== NEGERI NAMES ====================
const NEGERI_MAP: Record<string, string> = {
  "01": "Johor",
  "02": "Kedah",
  "03": "Kelantan",
  "04": "Melaka",
  "05": "Negeri Sembilan",
  "06": "Pahang",
  "07": "Pulau Pinang",
  "08": "Perak",
  "09": "Perlis",
  "10": "Selangor",
  "11": "Terengganu",
  "12": "Sabah",
  "13": "Sarawak",
  "14": "WP Kuala Lumpur",
  "15": "WP Labuan",
  "16": "WP Putrajaya",
};

const STATUS_MAP: Record<number, string> = {
  0: "Baru",
  1: "Panggilan",
  2: "Panggilan Semula",
  3: "Pindahan",
  4: "Selesai",
  5: "Batal",
  6: "Pindah",
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "-";

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) return `${hours}j ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};

const formatDbTime = (value: string | null | undefined) => value || "-";

// ==================== PAGE COMPONENT ====================
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ negeri?: string; cawangan?: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const level = session.user.levelAkses;
  const params = searchParams ? await searchParams : {};

  // ---------- ADMIN HQ ----------
  if (level === "1") {
    const selectedNegeri = params.negeri || "";
    const selectedCawangan = params.cawangan || "";
    const [stats, cawanganList, selectedKaunterStats] = await Promise.all([
      getAdminStats(),
      prisma.cawangan.findMany({
        where: selectedNegeri
          ? { idCawangan: { contains: selectedNegeri } }
          : undefined,
        orderBy: [{ negeri: "asc" }, { namaCawangan: "asc" }],
        select: {
          idCawangan: true,
          namaCawangan: true,
          negeri: true,
        },
      }),
      selectedCawangan ? getAdminKaunterStats(selectedCawangan) : null,
    ]);

    const NEGERI_LIST = [
      { code: "01", name: "Johor" },
      { code: "02", name: "Kedah" },
      { code: "03", name: "Kelantan" },
      { code: "04", name: "Melaka" },
      { code: "05", name: "Negeri Sembilan" },
      { code: "06", name: "Pahang" },
      { code: "07", name: "Pulau Pinang" },
      { code: "08", name: "Perak" },
      { code: "09", name: "Perlis" },
      { code: "10", name: "Selangor" },
      { code: "11", name: "Terengganu" },
      { code: "12", name: "Sabah" },
      { code: "13", name: "Sarawak" },
      { code: "14", name: "WP Kuala Lumpur" },
      { code: "15", name: "WP Labuan" },
      { code: "16", name: "WP Putrajaya" },
    ];

    const getTransaksi = (code: string) =>
      stats.transaksiPerNegeri.find((c) => c.negeri === code)?.jumlah || 0;

    const totalTransaksi = NEGERI_LIST.reduce((s, n) => s + getTransaksi(n.code), 0);
    const transaksiChartData = NEGERI_LIST.map((n) => ({
      code: n.code,
      negeri: n.name,
      transaksi: getTransaksi(n.code),
    }));
    const getBatal = (code: string) =>
      stats.batalPerNegeri.find((row) => row.negeri === code) || {
        batalKaunter: 0,
        batalPengguna: 0,
      };
    const totalBatalKaunter = NEGERI_LIST.reduce(
      (sum, n) => sum + getBatal(n.code).batalKaunter,
      0
    );
    const totalBatalPengguna = NEGERI_LIST.reduce(
      (sum, n) => sum + getBatal(n.code).batalPengguna,
      0
    );
    const batalChartData = NEGERI_LIST.map((n) => {
      const batal = getBatal(n.code);
      return {
        code: n.code,
        negeri: n.name,
        batalKaunter: batal.batalKaunter,
        batalPengguna: batal.batalPengguna,
      };
    });
    const selectedCawanganInfo = cawanganList.find(
      (cawangan) => cawangan.idCawangan === selectedCawangan
    );
    const adminJumlahSelesai =
      selectedKaunterStats?.transaksiSelesaiKaunter.reduce(
        (sum, row) => sum + row.bilangan,
        0
      ) || 0;
    const adminJumlahDipanggil =
      selectedKaunterStats?.transaksiDipanggilKaunter.reduce(
        (sum, row) => sum + row.bilangan,
        0
      ) || 0;
    const adminJumlahMenunggu =
      selectedKaunterStats?.transaksiKaunter.find((row) => row.kaunter == null)
        ?.bilangan || 0;
    const adminJumlahKaunterTerlibat =
      selectedKaunterStats?.transaksiKaunter.filter((row) => row.kaunter != null)
        .length || 0;
    const getAdminSelesaiKaunter = (kaunter: number | null) =>
      selectedKaunterStats?.transaksiSelesaiKaunter.find(
        (row) => row.kaunter === kaunter
      );
    const getAdminDipanggilKaunter = (kaunter: number | null) =>
      selectedKaunterStats?.transaksiDipanggilKaunter.find(
        (row) => row.kaunter === kaunter
      );
    const getAdminMasaLayananLamaKaunter = (kaunter: number | null) =>
      selectedKaunterStats?.transaksiKaunterLama.find(
        (row) => String(row.kaunter) === String(kaunter)
      );

    return (
      <div>
        <DashboardAutoRefresh />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Admin HQ</h1>
          <p className="text-gray-500 mt-1">Ringkasan keseluruhan sistem JPJeQ</p>
        </div>

        <AdminKaunterFilter
          branches={JSON.parse(JSON.stringify(cawanganList))}
          selectedBranch={selectedCawangan}
          selectedState={selectedNegeri}
          states={NEGERI_LIST}
        />

        <div className="grid grid-cols-1 gap-6">
          {selectedKaunterStats && (
            <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Transaksi Kaunter</h3>
                <p className="text-xs text-gray-400">
                  {selectedCawanganInfo?.namaCawangan || selectedCawangan} - Tarikh:{" "}
                  {selectedKaunterStats.tarikh}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-700">
                    Jumlah Transaksi
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    {selectedKaunterStats.jumlahKeseluruhan.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-700">
                    Jumlah Selesai
                  </p>
                  <p className="mt-1 text-2xl font-bold text-green-700">
                    {adminJumlahSelesai.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
                  <p className="text-xs font-medium text-cyan-700">
                    Sedang Dipanggil
                  </p>
                  <p className="mt-1 text-2xl font-bold text-cyan-700">
                    {adminJumlahDipanggil.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-600">
                    Kaunter Terlibat
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-800">
                    {adminJumlahKaunterTerlibat.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-700">
                    Menunggu Giliran
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">
                    {adminJumlahMenunggu.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                  <p className="text-xs font-medium text-purple-700">
                    Purata Pelanggan Menunggu
                  </p>
                  <p className="mt-1 text-2xl font-bold text-purple-700">
                    {formatDuration(selectedKaunterStats.purataMasaKaunter.menungguSaat)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs font-medium text-emerald-700">
                    Purata Masa Layanan
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {formatDuration(selectedKaunterStats.purataMasaKaunter.layananSaat)}
                  </p>
                </div>
              </div>

              <KaunterCompletedChart
                data={selectedKaunterStats.transaksiSelesaiKaunter.map((row) => ({
                  kaunter: row.kaunter == null ? "Tanpa Kaunter" : String(row.kaunter),
                  bilSelesai: row.bilangan,
                }))}
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Bil.</th>
                      <th className="px-4 py-2 text-left">Kaunter</th>
                      <th className="px-4 py-2 text-left">Bilangan</th>
                      <th className="px-4 py-2 text-left">Bil Selesai</th>
                      <th className="px-4 py-2 text-left">Sedang Dipanggil</th>
                      <th className="px-4 py-2 text-left">Purata Layanan</th>
                      <th className="px-4 py-2 text-left">Nombor Terakhir</th>
                      <th className="px-4 py-2 text-left">No Giliran Lama</th>
                      <th className="px-4 py-2 text-left">Kumpulan Perkhidmatan</th>
                      <th className="px-4 py-2 text-left">Call Time</th>
                      <th className="px-4 py-2 text-left">End Time</th>
                      <th className="px-4 py-2 text-left">Masa Layanan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedKaunterStats.transaksiKaunter.map((row, idx) => {
                      const selesai = getAdminSelesaiKaunter(row.kaunter);
                      const dipanggil = getAdminDipanggilKaunter(row.kaunter);
                      const layananLama = getAdminMasaLayananLamaKaunter(row.kaunter);

                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{idx + 1}</td>
                          <td className="px-4 py-2">
                            {row.kaunter == null ? "Menunggu Giliran" : row.kaunter}
                          </td>
                          <td className="px-4 py-2">{row.bilangan}</td>
                          <td className="px-4 py-2 font-semibold text-green-700">
                            {selesai?.bilangan.toLocaleString("ms-MY") || 0}
                          </td>
                          <td className="px-4 py-2 font-semibold text-cyan-700">
                            {dipanggil?.bilangan.toLocaleString("ms-MY") || 0}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-700">
                            {selesai
                              ? formatDuration(selesai.purataLayananSaat)
                              : "-"}
                          </td>
                          <td className="px-4 py-2">
                            {selesai?.noTerakhir || row.no_terakhir || "-"}
                          </td>
                          <td className="px-4 py-2">
                            {layananLama?.noGiliran || "-"}
                          </td>
                          <td className="px-4 py-2">
                            {layananLama?.kumpulanPerkhidmatan || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {formatDbTime(layananLama?.callTime)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {formatDbTime(layananLama?.endTime)}
                          </td>
                          <td className="px-4 py-2">
                            {layananLama
                              ? formatDuration(layananLama.masaLayananSaat)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                    {selectedKaunterStats.transaksiKaunter.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-4 text-center text-gray-400">
                          Tiada transaksi hari ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Jumlah Transaksi Mengikut Negeri */}
          <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Jumlah Transaksi</h3>
              <p className="text-xs text-gray-400">Tarikh: {stats.tarikh} — Jumlah keseluruhan: {totalTransaksi}</p>
            </div>
            <AdminTransactionChart
              branches={stats.transaksiPerCawangan}
              data={transaksiChartData}
              totalTransaksi={totalTransaksi}
            />
          </div>

          {/* Statistik Batal Mengikut Negeri */}
          <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Statistik Batal Semua Negeri</h3>
              <p className="text-xs text-gray-400">
                Tarikh: {stats.tarikh} - batal_oleh 1: Kaunter, batal_oleh 2: Pengguna
              </p>
            </div>
            <AdminCancellationChart
              branches={stats.batalPerCawangan}
              data={batalChartData}
              totalBatalKaunter={totalBatalKaunter}
              totalBatalPengguna={totalBatalPengguna}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---------- KETUA CAWANGAN ----------
  if (level === "2") {
    const stats = await getKCStats(session.user.idCawangan);
    const jumlahBatal =
      stats.transaksiBatal.batalKaunter + stats.transaksiBatal.batalPengguna;
    const jumlahSelesai = stats.transaksiSelesaiKaunter.reduce(
      (sum, row) => sum + row.bilangan,
      0
    );
    const jumlahDipanggil = stats.transaksiDipanggilKaunter.reduce(
      (sum, row) => sum + row.bilangan,
      0
    );
    const jumlahTransaksiKaunter = stats.transaksiKaunter.reduce(
      (sum, row) => sum + row.bilangan,
      0
    );
    const jumlahMenungguGiliran =
      stats.transaksiKaunter.find((row) => row.kaunter == null)?.bilangan || 0;
    const jumlahKaunterTerlibat = stats.transaksiKaunter.filter(
      (row) => row.kaunter != null
    ).length;
    const jumlahPerkhidmatan = stats.transaksiPerkhidmatan.reduce(
      (sum, row) => sum + row.bilangan,
      0
    );
    const jumlahPerkhidmatanSelesai = stats.transaksiPerkhidmatan.reduce(
      (sum, row) => sum + row.bilselesai,
      0
    );
    const jumlahPerkhidmatanDipanggil = stats.transaksiPerkhidmatan.reduce(
      (sum, row) => sum + row.bildipanggil,
      0
    );
    const jumlahPerkhidmatanMenunggu = stats.transaksiPerkhidmatan.reduce(
      (sum, row) => sum + row.biltunggu,
      0
    );
    const purataPerkhidmatanSaat =
      jumlahPerkhidmatanSelesai > 0
        ? stats.transaksiPerkhidmatan.reduce(
            (sum, row) => sum + row.purataLayananSaat * row.bilselesai,
            0
          ) / jumlahPerkhidmatanSelesai
        : 0;
    const getSelesaiKaunter = (kaunter: number | null) =>
      stats.transaksiSelesaiKaunter.find((row) => row.kaunter === kaunter);
    const getDipanggilKaunter = (kaunter: number | null) =>
      stats.transaksiDipanggilKaunter.find((row) => row.kaunter === kaunter);
    const getMasaLayananLamaKaunter = (kaunter: number | null) =>
      stats.transaksiKaunterLama.find(
        (row) => String(row.kaunter) === String(kaunter)
      );
    const getTotalHadSesi = (sesi: number) =>
      stats.hadPelanggan.reduce(
        (sum, had) =>
          sum +
          (sesi === 1
            ? had.had_pelanggan1
            : sesi === 2
              ? had.had_pelanggan2
          : had.had_pelanggan3),
        0
      );
    const getHadSesi = (
      had: { had_pelanggan1: number; had_pelanggan2: number; had_pelanggan3: number },
      sesi: number
    ) =>
      sesi === 1
        ? had.had_pelanggan1
        : sesi === 2
          ? had.had_pelanggan2
          : had.had_pelanggan3;
    const getGunaSesiPerkhidmatan = (
      kumpulanPerkhidmatan: string | null,
      sesi: number
    ) =>
      stats.transaksiSesiPerkhidmatan.find(
        (row) =>
          row.kumpulanPerkhidmatan === kumpulanPerkhidmatan &&
          row.sesi === sesi
      )?.bilangan || 0;
    const activeSesiList = [1, 2, 3].filter(
      (sesi) => stats.sesiAktif.includes(sesi) && getTotalHadSesi(sesi) > 0
    );
    const formatDuration = (seconds: number) => {
      if (!seconds) return "-";

      const totalSeconds = Math.round(seconds);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const remainingSeconds = totalSeconds % 60;

      if (hours > 0) return `${hours}j ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
      return `${remainingSeconds}s`;
    };
    const formatDbTime = (value: string | null | undefined) => value || "-";

    const STATUS_COLORS: Record<number, string> = {
      0: "bg-gray-100 text-gray-700",
      1: "bg-blue-500 text-white",
      2: "bg-cyan-500 text-white",
      3: "bg-yellow-400 text-white",
      4: "bg-green-500 text-white",
      5: "bg-red-500 text-white",
      6: "bg-purple-500 text-white",
    };

    return (
      <div>
        <DashboardAutoRefresh />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Ringkasan aktiviti untuk {session.user.namaCawangan}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-700">
              Jumlah Transaksi
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              {jumlahTransaksiKaunter.toLocaleString("ms-MY")}
            </p>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-3">
            <p className="text-xs font-medium text-green-700">
              Jumlah Selesai
            </p>
            <p className="mt-1 text-2xl font-bold text-green-700">
              {jumlahSelesai.toLocaleString("ms-MY")}
            </p>
          </div>
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
            <p className="text-xs font-medium text-cyan-700">
              Sedang Dipanggil
            </p>
            <p className="mt-1 text-2xl font-bold text-cyan-700">
              {jumlahDipanggil.toLocaleString("ms-MY")}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-600">
              Kaunter Terlibat
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-800">
              {jumlahKaunterTerlibat.toLocaleString("ms-MY")}
            </p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-700">
              Menunggu Giliran
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {jumlahMenungguGiliran.toLocaleString("ms-MY")}
            </p>
          </div>
          <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
            <p className="text-xs font-medium text-purple-700">
              Purata Pelanggan Menunggu
            </p>
            <p className="mt-1 text-2xl font-bold text-purple-700">
              {formatDuration(stats.purataMasaKaunter.menungguSaat)}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-700">
              Purata Masa Layanan
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {formatDuration(stats.purataMasaKaunter.layananSaat)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaksi Kaunter */}
            <div className="bg-white rounded-xl border border-orange-300 overflow-hidden lg:col-span-3">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Transaksi Kaunter</h3>
                <p className="text-xs text-gray-400">
                  Jumlah selesai: {jumlahSelesai.toLocaleString("ms-MY")}
                </p>
              </div>
              <KaunterCompletedChart
                data={stats.transaksiSelesaiKaunter.map((row) => ({
                  kaunter: row.kaunter == null ? "Tanpa Kaunter" : String(row.kaunter),
                  bilSelesai: row.bilangan,
                }))}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Bil.</th>
                      <th className="px-4 py-2 text-left">Kaunter</th>
                      <th className="px-4 py-2 text-left">Bilangan</th>
                      <th className="px-4 py-2 text-left">Bil Selesai</th>
                      <th className="px-4 py-2 text-left">Sedang Dipanggil</th>
                      <th className="px-4 py-2 text-left">Purata Layanan</th>
                      <th className="px-4 py-2 text-left">Nombor Terakhir</th>
                      <th className="px-4 py-2 text-left">No Giliran Lama</th>
                      <th className="px-4 py-2 text-left">Kumpulan Perkhidmatan</th>
                      <th className="px-4 py-2 text-left">Call Time</th>
                      <th className="px-4 py-2 text-left">End Time</th>
                      <th className="px-4 py-2 text-left">Masa Layanan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.transaksiKaunter.map((row, idx) => {
                      const selesai = getSelesaiKaunter(row.kaunter);
                      const dipanggil = getDipanggilKaunter(row.kaunter);
                      const layananLama = getMasaLayananLamaKaunter(row.kaunter);

                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{idx + 1}</td>
                          <td className="px-4 py-2">
                            {row.kaunter == null ? "Menunggu Giliran" : row.kaunter}
                          </td>
                          <td className="px-4 py-2">{row.bilangan}</td>
                          <td className="px-4 py-2 font-semibold text-green-700">
                            {selesai?.bilangan.toLocaleString("ms-MY") || 0}
                          </td>
                          <td className="px-4 py-2 font-semibold text-cyan-700">
                            {dipanggil?.bilangan.toLocaleString("ms-MY") || 0}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-700">
                            {selesai
                              ? formatDuration(selesai.purataLayananSaat)
                              : "-"}
                          </td>
                          <td className="px-4 py-2">
                            {selesai?.noTerakhir || row.no_terakhir || "-"}
                          </td>
                          <td className="px-4 py-2">
                            {layananLama?.noGiliran || "-"}
                          </td>
                          <td className="px-4 py-2">
                            {layananLama?.kumpulanPerkhidmatan || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {formatDbTime(layananLama?.callTime)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {formatDbTime(layananLama?.endTime)}
                          </td>
                          <td className="px-4 py-2">
                            {layananLama
                              ? formatDuration(layananLama.masaLayananSaat)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                    {stats.transaksiKaunter.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-4 text-center text-gray-400">
                          Tiada transaksi hari ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaksi Batal */}
            <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Transaksi Batal</h3>
                <p className="text-xs text-gray-400">
                  batal_oleh 1: Kaunter, batal_oleh 2: Pengguna
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-700">
                    Batal Kaunter
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-700">
                    {stats.transaksiBatal.batalKaunter.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-700">
                    Batal Pengguna
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">
                    {stats.transaksiBatal.batalPengguna.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-600">
                    Jumlah Batal
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-800">
                    {jumlahBatal.toLocaleString("ms-MY")}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="px-4 py-2 text-left">Bil.</th>
                      <th className="px-4 py-2 text-left">Kaunter</th>
                      <th className="px-4 py-2 text-center">Batal Kaunter</th>
                      <th className="px-4 py-2 text-center">Batal Pengguna</th>
                      <th className="px-4 py-2 text-center">Jumlah Batal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.transaksiBatalKaunter.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">
                          {row.kaunter == null
                            ? "Batal oleh Pengguna/Lain-lain"
                            : row.kaunter}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {row.batalKaunter.toLocaleString("ms-MY")}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {row.batalPengguna.toLocaleString("ms-MY")}
                        </td>
                        <td className="px-4 py-2 text-center font-semibold">
                          {row.jumlah.toLocaleString("ms-MY")}
                        </td>
                      </tr>
                    ))}
                    {stats.transaksiBatalKaunter.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-4 text-center text-gray-400"
                        >
                          Tiada transaksi batal hari ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaksi Perkhidmatan */}
            <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Transaksi Perkhidmatan</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-700">
                    Jumlah Transaksi
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    {jumlahPerkhidmatan.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-700">
                    Bil Selesai
                  </p>
                  <p className="mt-1 text-2xl font-bold text-green-700">
                    {jumlahPerkhidmatanSelesai.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
                  <p className="text-xs font-medium text-cyan-700">
                    Sedang Dipanggil
                  </p>
                  <p className="mt-1 text-2xl font-bold text-cyan-700">
                    {jumlahPerkhidmatanDipanggil.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-700">
                    Bil Menunggu
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">
                    {jumlahPerkhidmatanMenunggu.toLocaleString("ms-MY")}
                  </p>
                </div>
                <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                  <p className="text-xs font-medium text-purple-700">
                    Purata Layanan
                  </p>
                  <p className="mt-1 text-2xl font-bold text-purple-700">
                    {formatDuration(purataPerkhidmatanSaat)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-600">
                    Perkhidmatan
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-800">
                    {stats.transaksiPerkhidmatan.length.toLocaleString("ms-MY")}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Bil.</th>
                      <th className="px-4 py-2 text-left">Perkhidmatan</th>
                      <th className="px-4 py-2 text-left">Jumlah</th>
                      <th className="px-4 py-2 text-left">Bil Selesai</th>
                      <th className="px-4 py-2 text-left">Sedang Dipanggil</th>
                      <th className="px-4 py-2 text-left">Purata Layanan</th>
                      <th className="px-4 py-2 text-left">Bil Menunggu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.transaksiPerkhidmatan.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">{row.keterangan}</td>
                        <td className="px-4 py-2">{row.bilangan}</td>
                        <td className="px-4 py-2">{row.bilselesai}</td>
                        <td className="px-4 py-2">{row.bildipanggil}</td>
                        <td className="px-4 py-2">
                          {formatDuration(row.purataLayananSaat)}
                        </td>
                        <td className="px-4 py-2">{row.biltunggu}</td>
                      </tr>
                    ))}
                    {stats.transaksiPerkhidmatan.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-center text-gray-400">
                          Tiada transaksi hari ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Jumlah Keseluruhan Transaksi */}
            <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Jumlah Keseluruhan Transaksi</h3>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Tarikh</th>
                      <th className="px-3 py-2 text-left">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2">{stats.tarikh}</td>
                      <td className="px-3 py-2 font-bold text-lg">{stats.jumlahKeseluruhan}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Jumlah Transaksi (Mengikut Sesi) */}
            <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Jumlah Transaksi (Mengikut Sesi)</h3>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    {stats.jenisLimit === 2 ? (
                      <>
                        <tr>
                          <th className="px-3 py-2 text-left align-bottom">
                            Kump. Perkhidmatan
                          </th>
                          {activeSesiList.map((sesi) => (
                            <th
                              key={sesi}
                              className="px-3 py-2 text-center"
                              colSpan={3}
                            >
                              Sesi {sesi}
                            </th>
                          ))}
                        </tr>
                        <tr className="text-xs text-gray-500">
                          <th className="px-3 py-2" />
                          {activeSesiList.flatMap((sesi) => [
                            <th key={`${sesi}-kuota`} className="px-2 py-2 text-center">
                              Kuota
                            </th>,
                            <th key={`${sesi}-diambil`} className="px-2 py-2 text-center">
                              Diambil
                            </th>,
                            <th key={`${sesi}-baki`} className="px-2 py-2 text-center">
                              Baki
                            </th>,
                          ])}
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <th className="px-3 py-2 text-left">Kuota Cawangan</th>
                        {activeSesiList.map((sesi) => (
                          <th key={sesi} className="px-3 py-2 text-center">
                            Sesi {sesi}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y">
                    {activeSesiList.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-4 text-center text-gray-400"
                          colSpan={stats.jenisLimit === 2 ? 10 : 4}
                        >
                          Tiada sesi aktif
                        </td>
                      </tr>
                    ) : stats.jenisLimit === 2 ? (
                      <>
                        {stats.hadPelanggan.map((had, idx) => (
                          <tr key={`${had.kumpulanPerkhidmatan || idx}`}>
                            <td className="px-3 py-2 font-medium">
                              {had.keterangan}
                            </td>
                            {activeSesiList.flatMap((sesi) => {
                              const kuota = getHadSesi(had, sesi);
                              const diambil = getGunaSesiPerkhidmatan(
                                had.kumpulanPerkhidmatan,
                                sesi
                              );
                              const baki = Math.max(kuota - diambil, 0);

                              return [
                                <td
                                  key={`${had.kumpulanPerkhidmatan}-${sesi}-kuota`}
                                  className="px-2 py-2 text-center"
                                >
                                  {kuota.toLocaleString("ms-MY")}
                                </td>,
                                <td
                                  key={`${had.kumpulanPerkhidmatan}-${sesi}-diambil`}
                                  className="px-2 py-2 text-center"
                                >
                                  {diambil.toLocaleString("ms-MY")}
                                </td>,
                                <td
                                  key={`${had.kumpulanPerkhidmatan}-${sesi}-baki`}
                                  className="px-2 py-2 text-center font-semibold text-green-700"
                                >
                                  {baki.toLocaleString("ms-MY")}
                                </td>,
                              ];
                            })}
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-3 py-2">Jumlah</td>
                          {activeSesiList.flatMap((sesi) => {
                            const kuota = getTotalHadSesi(sesi);
                            const sesiData = stats.transaksiSesi.find(
                              (s) => s.sesi === sesi
                            );
                            const diambil = sesiData?.bilangan || 0;
                            const baki = Math.max(kuota - diambil, 0);

                            return [
                              <td key={`${sesi}-total-kuota`} className="px-2 py-2 text-center">
                                {kuota.toLocaleString("ms-MY")}
                              </td>,
                              <td key={`${sesi}-total-diambil`} className="px-2 py-2 text-center">
                                {diambil.toLocaleString("ms-MY")}
                              </td>,
                              <td
                                key={`${sesi}-total-baki`}
                                className="px-2 py-2 text-center text-green-700"
                              >
                                {baki.toLocaleString("ms-MY")}
                              </td>,
                            ];
                          })}
                        </tr>
                      </>
                    ) : (
                      ["Kuota", "Diambil", "Baki"].map((label) => (
                        <tr
                          key={label}
                          className={label === "Baki" ? "bg-green-50" : ""}
                        >
                          <td className="px-3 py-2 font-semibold">{label}</td>
                          {activeSesiList.map((sesi) => {
                            const totalHad = getTotalHadSesi(sesi);
                            const sesiData = stats.transaksiSesi.find(
                              (s) => s.sesi === sesi
                            );
                            const totalGuna = sesiData?.bilangan || 0;
                            const totalBaki = Math.max(totalHad - totalGuna, 0);
                            const value =
                              label === "Kuota"
                                ? totalHad
                                : label === "Diambil"
                                  ? totalGuna
                                  : totalBaki;

                            return (
                              <td
                                key={`${label}-${sesi}`}
                                className={`px-3 py-2 text-center ${
                                  label === "Baki"
                                    ? "font-bold text-green-700"
                                    : "font-medium"
                                }`}
                              >
                                {value.toLocaleString("ms-MY")}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Jumlah Transaksi (Status) */}
            <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Jumlah Transaksi (Status)</h3>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.statusData.map((row) => (
                      <tr
                        key={row.status}
                        className={STATUS_COLORS[row.status] || ""}
                      >
                        <td className="px-3 py-2">
                          {STATUS_MAP[row.status] || `Status ${row.status}`}
                        </td>
                        <td className="px-3 py-2 font-semibold">{row.bilangan}</td>
                      </tr>
                    ))}
                    {stats.statusData.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-gray-400">
                          Tiada data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PENCETAK TIKET ----------
  if (level === "4") {
    const stats = await getPrinterStats(session.user.idCawangan);

    return (
      <div>
        <DashboardAutoRefresh />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Jana Tiket</h1>
          <p className="text-gray-500 mt-1">{session.user.namaCawangan}</p>
        </div>
        <PrinterDashboardClient
          services={JSON.parse(JSON.stringify(stats.services))}
          sesi={stats.sesi}
          idCawangan={session.user.idCawangan}
        />
      </div>
    );
  }

  // ---------- QR CODE DISPLAY (level 5) ----------
  if (level === "5") {
    const cawangan = await prisma.cawangan.findFirst({
      where: { idCawangan: session.user.idCawangan },
    });

    const qrImage = cawangan?.gambarQr
      ? `data:image/png;base64,${cawangan.gambarQr}`
      : null;

    return (
      <>
        <DashboardAutoRefresh />
        <QRDisplayClient
          qrImage={qrImage}
          namaCawangan={cawangan?.namaCawangan || ""}
        />
      </>
    );
  }

  // ---------- STAFF KAUNTER ----------
  const stats = await getStaffStats(
    session.user.idCawangan,
    session.user.noKaunter
  );

  return (
    <>
      <DashboardAutoRefresh />
      <KaunterDashboardClient
        noKaunter={session.user.noKaunter || "-"}
        seksyen={session.user.seksyen || "-"}
        namaCawangan={session.user.namaCawangan}
        initialStats={JSON.parse(JSON.stringify(stats))}
      />
    </>
  );
}
