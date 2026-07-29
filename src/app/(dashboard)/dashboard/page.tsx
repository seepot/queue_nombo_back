import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import KaunterDashboardClient from "./KaunterDashboardClient";
import PrinterDashboardClient from "./PrinterDashboardClient";
import QRDisplayClient from "./QRDisplayClient";
import AdminTransactionChart from "./AdminTransactionChart";

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
  };
}

// ==================== KETUA CAWANGAN (level_akses = 2) ====================
async function getKCStats(idCawangan: string) {
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tbl = getTiketTable(idCawangan);

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

  // Transaksi Perkhidmatan - grouped by service
  const transaksiPerkhidmatan = await prisma.$queryRawUnsafe<
    Array<{
      keterangan: string | null;
      bilangan: bigint;
      biltunggu: bigint;
      bilselesai: bigint;
    }>
  >(
    `SELECT c.keterangan, COUNT(*) AS bilangan,
            COUNT(CASE WHEN status_tiket = 0 THEN 1 END) AS biltunggu,
            COUNT(CASE WHEN status_tiket > 0 THEN 1 END) AS bilselesai
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

  return {
    transaksiKaunter: transaksiKaunter.map((r) => ({
      kaunter: r.kaunter,
      bilangan: Number(r.bilangan),
      no_terakhir: r.no_terakhir,
      masa: r.masa,
    })),
    transaksiPerkhidmatan: transaksiPerkhidmatan.map((r) => ({
      keterangan: r.keterangan || "-",
      bilangan: Number(r.bilangan),
      biltunggu: Number(r.biltunggu),
      bilselesai: Number(r.bilselesai),
    })),
    statusData: statusData.map((r) => ({
      status: r.status_tiket,
      bilangan: Number(r.bilangan),
    })),
    jumlahKeseluruhan: Number(totalResult[0]?.count ?? 0),
    tarikh: todayStr,
    transaksiSesi: transaksiSesi.map((r) => ({
      sesi: r.sesi,
      bilangan: Number(r.bilangan),
    })),
    hadPelanggan: hadPelanggan.map((r) => ({
      keterangan: r.keterangan || "-",
      had_pelanggan1: r.had_pelanggan1 || 0,
      had_pelanggan2: r.had_pelanggan2 || 0,
      had_pelanggan3: r.had_pelanggan3 || 0,
    })),
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
    Array<{ no_tiket: number; transid: string; status_tiket: number }>
  >(
    `SELECT no_tiket, transid, status_tiket FROM ${tbl}
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
     WHERE a.cawangan = ? AND DATE(a.tarikh) = ?
     GROUP BY a.kumpulan_perkhidmatan`,
    idCawangan,
    todayStr
  );

  return {
    currentTicket: currentTicket[0] || null,
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
};

// ==================== PAGE COMPONENT ====================
export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const level = session.user.levelAkses;

  // ---------- ADMIN HQ ----------
  if (level === "1") {
    const stats = await getAdminStats();

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

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Admin HQ</h1>
          <p className="text-gray-500 mt-1">Ringkasan keseluruhan sistem JPJeQ</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
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
        </div>
      </div>
    );
  }

  // ---------- KETUA CAWANGAN ----------
  if (level === "2") {
    const stats = await getKCStats(session.user.idCawangan);

    const STATUS_COLORS: Record<number, string> = {
      0: "bg-gray-100 text-gray-700",
      1: "bg-blue-500 text-white",
      2: "bg-cyan-500 text-white",
      3: "bg-yellow-400 text-white",
      4: "bg-green-500 text-white",
      5: "bg-red-500 text-white",
    };

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Ringkasan aktiviti untuk {session.user.namaCawangan}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaksi Kaunter */}
            <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Transaksi Kaunter</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Bil.</th>
                      <th className="px-4 py-2 text-left">Kaunter</th>
                      <th className="px-4 py-2 text-left">Bilangan</th>
                      <th className="px-4 py-2 text-left">Nombor Terakhir</th>
                      <th className="px-4 py-2 text-left">Masa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.transaksiKaunter.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">
                          {row.kaunter == null ? "Menunggu Giliran" : row.kaunter}
                        </td>
                        <td className="px-4 py-2">{row.bilangan}</td>
                        <td className="px-4 py-2">{row.no_terakhir || "-"}</td>
                        <td className="px-4 py-2">
                          {row.masa ? String(row.masa).match(/T(\d{2}:\d{2})/)?.[1] || "-" : "-"}
                        </td>
                      </tr>
                    ))}
                    {stats.transaksiKaunter.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                          Tiada transaksi hari ini
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Bil.</th>
                      <th className="px-4 py-2 text-left">Perkhidmatan</th>
                      <th className="px-4 py-2 text-left">Jumlah</th>
                      <th className="px-4 py-2 text-left">Bil Selesai</th>
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
                        <td className="px-4 py-2">{row.biltunggu}</td>
                      </tr>
                    ))}
                    {stats.transaksiPerkhidmatan.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
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
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Perkhidmatan</th>
                      <th className="px-3 py-2 text-center">Sesi 1</th>
                      <th className="px-3 py-2 text-center">Sesi 2</th>
                      <th className="px-3 py-2 text-center">Sesi 3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.hadPelanggan.map((had, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium">{had.keterangan}</td>
                        <td className="px-3 py-2 text-center">{had.had_pelanggan1}</td>
                        <td className="px-3 py-2 text-center">{had.had_pelanggan2}</td>
                        <td className="px-3 py-2 text-center">{had.had_pelanggan3}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2">Jumlah</td>
                      {[1, 2, 3].map((sesi) => {
                        const sesiData = stats.transaksiSesi.find((s) => s.sesi === sesi);
                        return (
                          <td key={sesi} className="px-3 py-2 text-center">
                            {sesiData?.bilangan || 0}
                          </td>
                        );
                      })}
                    </tr>
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
      <QRDisplayClient
        qrImage={qrImage}
        namaCawangan={cawangan?.namaCawangan || ""}
      />
    );
  }

  // ---------- STAFF KAUNTER ----------
  const stats = await getStaffStats(
    session.user.idCawangan,
    session.user.noKaunter
  );

  return (
    <KaunterDashboardClient
      noKaunter={session.user.noKaunter || "-"}
      seksyen={session.user.seksyen || "-"}
      namaCawangan={session.user.namaCawangan}
      initialStats={JSON.parse(JSON.stringify(stats))}
    />
  );
}
