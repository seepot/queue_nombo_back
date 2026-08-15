import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import KalendarAdminFilter from "./KalendarAdminFilter";
import KalendarTemujanjiClient from "./KalendarTemujanjiClient";

interface PageProps {
  searchParams?: Promise<{
    cawangan?: string;
    negeri?: string;
    tarikh?: string;
    view?: string;
  }>;
}

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

function todayMalaysia() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00+08:00`);
}

function toDateString(value: Date) {
  return new Date(value.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateRange(tarikh: string, view: string) {
  const selected = toDate(tarikh);

  if (view === "mingguan") {
    const day = selected.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = addDays(selected, mondayOffset);
    const end = addDays(start, 6);
    return { start: toDateString(start), end: toDateString(end) };
  }

  if (view === "bulanan") {
    const start = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
    return { start: toDateString(start), end: toDateString(end) };
  }

  return { start: tarikh, end: tarikh };
}

function buildUrl(view: string, tarikh: string) {
  return `/temujanji/kalendar?view=${view}&tarikh=${tarikh}`;
}

export default async function KalendarTemujanjiPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) return null;

  const params = searchParams ? await searchParams : {};
  const tarikh = params.tarikh || todayMalaysia();
  const view = ["harian", "mingguan", "bulanan"].includes(params.view || "")
    ? params.view || "harian"
    : "harian";
  const range = getDateRange(tarikh, view);
  const isAdminHq = session.user.levelAkses === "1";
  const selectedNegeri = isAdminHq ? params.negeri || "" : "";
  const selectedCawangan = isAdminHq
    ? params.cawangan || ""
    : session.user.idCawangan;
  const cawanganCondition = selectedCawangan
    ? "tm.cawangan = ?"
    : selectedNegeri
      ? "SUBSTRING(tm.cawangan, 3, 2) = ?"
      : "1 = 1";
  const cawanganParams = selectedCawangan
    ? [selectedCawangan]
    : selectedNegeri
      ? [selectedNegeri]
      : [];

  const [cawangan, cawanganList, ringkasanSlot, temujanji] = await Promise.all([
    prisma.cawangan.findFirst({
      where: selectedCawangan ? { idCawangan: selectedCawangan } : undefined,
      select: { namaCawangan: true },
    }),
    isAdminHq
      ? prisma.cawangan.findMany({
          orderBy: [{ negeri: "asc" }, { namaCawangan: "asc" }],
          select: {
            idCawangan: true,
            namaCawangan: true,
            negeri: true,
          },
        })
      : Promise.resolve([]),
    prisma.$queryRawUnsafe<
      Array<{
        id: number;
        tarikh: string | null;
        masa: string | null;
        kump_perkhidmatan: string | null;
        keterangan: string | null;
        bilangan: number | null;
        bil_tlh_isi: number | null;
        status: number | null;
      }>
    >(
      `SELECT
         tm.id,
         tm.tarikh,
         tm.masa,
         tm.kump_perkhidmatan,
         kp.keterangan,
         tm.bilangan,
         tm.bil_tlh_isi,
         tm.status
       FROM tempahan_masa tm
       LEFT JOIN kumpulan_perkhidmatan kp ON tm.kump_perkhidmatan = kp.id
       WHERE ${cawanganCondition} AND tm.tarikh BETWEEN ? AND ?
       ORDER BY tm.tarikh ASC, tm.masa ASC, tm.id ASC`,
      ...cawanganParams,
      range.start,
      range.end
    ),
    prisma.$queryRawUnsafe<
      Array<{
        id: number;
        tempahan_masa_id: number | null;
        masa: string | null;
        nama: string | null;
        nopengenalan: string | null;
        notelefon: string | null;
        emel: string | null;
        tujuan_transaksi: string | null;
        is_pending: number | null;
        keterangan: string | null;
        tarikh: string | null;
        urusniaga: number | null;
        kategori: number | null;
      }>
    >(
      `SELECT
         tl.id,
         tl.tempahan_masa_id,
         tm.masa,
         tl.nama,
         tl.nopengenalan,
         tl.notelefon,
         tl.emel,
         tl.tujuan_transaksi,
         tl.is_pending,
         kp.keterangan,
         tm.tarikh,
         tl.urusniaga,
         tl.kategori
       FROM tempahan_list tl
       INNER JOIN tempahan_masa tm ON tm.id = tl.tempahan_masa_id
       LEFT JOIN kumpulan_perkhidmatan kp ON tm.kump_perkhidmatan = kp.id
       WHERE ${cawanganCondition} AND tl.cawangan = tm.cawangan AND tm.tarikh BETWEEN ? AND ?
       ORDER BY tm.tarikh ASC, tm.masa ASC, tl.id ASC`,
      ...cawanganParams,
      range.start,
      range.end
    ),
  ]);

  const jumlahSlot = ringkasanSlot.length;
  const jumlahKuota = ringkasanSlot.reduce(
    (sum, row) => sum + Number(row.bilangan || 0),
    0
  );
  const jumlahDiisi = ringkasanSlot.reduce(
    (sum, row) => sum + Number(row.bil_tlh_isi || 0),
    0
  );
  const jumlahTemujanji = temujanji.filter((row) => row.nama).length;
  const ringkasanTarikh = ringkasanSlot.reduce<
    Record<string, { tarikh: string; slot: number; kuota: number; diisi: number }>
  >((acc, row) => {
    const key = String((row as { tarikh?: string | null }).tarikh || tarikh);
    acc[key] ||= { tarikh: key, slot: 0, kuota: 0, diisi: 0 };
    acc[key].slot += 1;
    acc[key].kuota += Number(row.bilangan || 0);
    acc[key].diisi += Number(row.bil_tlh_isi || 0);
    return acc;
  }, {});
  const ringkasanHarian = Object.values(ringkasanTarikh).sort((a, b) =>
    a.tarikh.localeCompare(b.tarikh)
  );
  const viewLabel =
    view === "mingguan" ? "mingguan" : view === "bulanan" ? "bulanan" : "harian";
  const cawanganLabel = selectedCawangan
    ? cawangan?.namaCawangan || selectedCawangan
    : selectedNegeri
      ? NEGERI_LIST.find((item) => item.code === selectedNegeri)?.name || selectedNegeri
      : isAdminHq
        ? "Semua Cawangan"
        : cawangan?.namaCawangan;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Kalendar Temujanji</h1>
        <p className="mt-1 text-gray-500">
          Senarai penjadualan temujanji {viewLabel} untuk {cawanganLabel}
        </p>
      </div>

      {isAdminHq && (
        <KalendarAdminFilter
          branches={cawanganList}
          selectedBranch={selectedCawangan}
          selectedDate={tarikh}
          selectedState={selectedNegeri}
          selectedView={view}
          states={NEGERI_LIST}
        />
      )}

      <form className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["harian", "Harian"],
            ["mingguan", "Mingguan"],
            ["bulanan", "Bulanan"],
          ].map(([key, label]) => (
            <a
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              href={buildUrl(key, tarikh)}
              key={key}
            >
              {label}
            </a>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <input name="view" type="hidden" value={view} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tarikh
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              defaultValue={tarikh}
              name="tarikh"
              type="date"
            />
          </div>
          <button
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            type="submit"
          >
            Papar
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Paparan: {range.start} hingga {range.end}
        </p>
      </form>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-700">Jumlah Slot</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{jumlahSlot}</p>
        </div>
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
          <p className="text-xs font-medium text-purple-700">Kuota Slot</p>
          <p className="mt-1 text-2xl font-bold text-purple-700">{jumlahKuota}</p>
        </div>
        <div className="rounded-lg border border-green-100 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-700">Telah Diisi</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{jumlahDiisi}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700">Temujanji</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{jumlahTemujanji}</p>
        </div>
      </div>

      {view !== "harian" && (
        <div className="mb-6 overflow-hidden rounded-xl border border-orange-300 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-bold text-gray-800">Ringkasan Mengikut Hari</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Tarikh</th>
                  <th className="px-4 py-2 text-center">Slot</th>
                  <th className="px-4 py-2 text-center">Kuota</th>
                  <th className="px-4 py-2 text-center">Diisi</th>
                  <th className="px-4 py-2 text-center">Baki</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ringkasanHarian.map((row) => (
                  <tr className="hover:bg-gray-50" key={row.tarikh}>
                    <td className="px-4 py-2 font-medium">{row.tarikh}</td>
                    <td className="px-4 py-2 text-center">{row.slot}</td>
                    <td className="px-4 py-2 text-center">{row.kuota}</td>
                    <td className="px-4 py-2 text-center">{row.diisi}</td>
                    <td className="px-4 py-2 text-center">
                      {Math.max(row.kuota - row.diisi, 0)}
                    </td>
                  </tr>
                ))}
                {ringkasanHarian.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Tiada slot untuk julat ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <KalendarTemujanjiClient
        canEdit={!isAdminHq}
        ringkasanSlot={ringkasanSlot.map((row) => ({
          ...row,
          id: Number(row.id),
          bilangan: Number(row.bilangan || 0),
          bil_tlh_isi: Number(row.bil_tlh_isi || 0),
          status: row.status == null ? null : Number(row.status),
        }))}
        temujanji={temujanji.map((row) => ({
          ...row,
          id: Number(row.id),
          tempahan_masa_id:
            row.tempahan_masa_id == null ? null : Number(row.tempahan_masa_id),
          is_pending: row.is_pending == null ? null : Number(row.is_pending),
          urusniaga: row.urusniaga == null ? null : Number(row.urusniaga),
          kategori: row.kategori == null ? null : Number(row.kategori),
        }))}
        view={view}
      />
    </div>
  );
}
