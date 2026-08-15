"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Helper: extract HH:MM from ISO date string without timezone conversion
// DB stores local time (MYT), so we read the time portion directly
const IDLE_REMINDER_MS = 5 * 60 * 1000;
const IDLE_SNOOZE_MS = 60 * 1000;
const IDLE_REMINDER_MINUTES = IDLE_REMINDER_MS / 60000;

function formatTimeFromDB(dateStr: string | null): string {
  if (!dateStr) return "-";
  // dateStr is ISO like "2026-07-17T20:30:22.000Z" where 20:30 is already local time
  const match = dateStr.match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  return "-";
}

interface WaitingTicket {
  no_tiket: number;
  no_siri: number;
  sesi: number;
}

interface CancelledTicket {
  no_tiket: number;
  cancel_date: string | null;
  status_tiket: number;
}

interface TransferredTicket {
  no_tiket: number;
  transfer_from: number;
  status_tiket: number;
}

interface LastTicket {
  no_tiket: number;
  end_date: string | null;
  status_tiket: number;
}

interface PindahPerkhidmatan {
  no_tiket: number;
  keterangan: string | null;
  status_tiket: number;
}

interface BilanganPerkhidmatan {
  keterangan: string;
  bilangan: number;
}

interface StaffStats {
  currentTicket: {
    no_tiket: number;
    transid: string;
    status_tiket: number;
    call_date: string | null;
    idle_minutes: number | null;
  } | null;
  waitingList: WaitingTicket[];
  cancelledList: CancelledTicket[];
  transferredList: TransferredTicket[];
  bilPelanggan: number;
  belumPanggil: number;
  lastTicket: LastTicket[];
  pindahPerkhidmatanList: PindahPerkhidmatan[];
  bilanganPerkhidmatan: BilanganPerkhidmatan[];
}

interface Props {
  noKaunter: string;
  seksyen: string;
  namaCawangan: string;
  initialStats: StaffStats;
}

export default function KaunterDashboardClient({
  noKaunter,
  seksyen,
  namaCawangan,
  initialStats,
}: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<StaffStats>(initialStats);
  const [currentNo, setCurrentNo] = useState<number | null>(
    initialStats.currentTicket?.no_tiket ?? null
  );
  const [currentTransid, setCurrentTransid] = useState<string | null>(
    initialStats.currentTicket?.transid ?? null
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states for aktif_semula and pindah
  const [showAktifModal, setShowAktifModal] = useState(false);
  const [aktifNo, setAktifNo] = useState("");
  const [showPindahModal, setShowPindahModal] = useState(false);
  const [pindahKaunter, setPindahKaunter] = useState("");
  const [showIdleReminder, setShowIdleReminder] = useState(false);
  const [idleStartedAt, setIdleStartedAt] = useState<number | null>(
    initialStats.currentTicket?.call_date
      ? new Date(initialStats.currentTicket.call_date).getTime()
      : initialStats.currentTicket
        ? Date.now()
        : null
  );
  const [dbIdleMinutes, setDbIdleMinutes] = useState(
    initialStats.currentTicket?.idle_minutes ?? 0
  );

  // Auto-refresh: poll for new data every 5 seconds
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/kaunter/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          // Update current ticket from fresh data
          if (data.currentTicket) {
            setCurrentNo(data.currentTicket.no_tiket);
            setCurrentTransid(data.currentTicket.transid);
            setDbIdleMinutes(data.currentTicket.idle_minutes ?? 0);
          } else {
            setCurrentNo(null);
            setCurrentTransid(null);
            setDbIdleMinutes(0);
          }
        }
      } catch {
        // Silently fail - will retry on next interval
      }
    };

    pollInterval.current = setInterval(fetchStats, 5000);
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);

    if (!currentNo) {
      setShowIdleReminder(false);
      setIdleStartedAt(null);
      return;
    }

    setShowIdleReminder(false);
    const currentCallDate = stats.currentTicket?.call_date;
    const currentIdleMinutes = stats.currentTicket?.idle_minutes ?? dbIdleMinutes;
    setIdleStartedAt(currentCallDate ? new Date(currentCallDate).getTime() : Date.now());

    if (currentIdleMinutes >= IDLE_REMINDER_MINUTES) {
      setShowIdleReminder(true);
      return;
    }

    const remainingMs = Math.max(
      IDLE_REMINDER_MS - currentIdleMinutes * 60 * 1000,
      0
    );
    idleTimer.current = setTimeout(() => {
      setShowIdleReminder(true);
    }, remainingMs);

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [currentNo, dbIdleMinutes, stats.currentTicket]);

  const doAction = useCallback(
    async (action: string, extraBody: Record<string, unknown> = {}) => {
      setLoading(action);
      setError(null);
      try {
        const res = await fetch("/api/kaunter/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extraBody }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Ralat berlaku");
          return null;
        }
        return data;
      } catch {
        setError("Ralat rangkaian");
        return null;
      } finally {
        setLoading(null);
      }
    },
    []
  );

  const refreshPage = useCallback(() => {
    router.refresh();
  }, [router]);

  // SETERUSNYA - Call next ticket
  const handleSeterusnya = async () => {
    const data = await doAction("seterusnya");
    if (data?.success) {
      setCurrentNo(data.no_tiket);
      setCurrentTransid(data.transid);
      refreshPage();
    }
  };

  // PANGGIL SEMULA - Recall current ticket
  const handlePanggilSemula = async () => {
    if (!currentNo) {
      setError("Tiada tiket semasa untuk dipanggil semula");
      return;
    }
    const data = await doAction("panggil_semula", {
      no_tiket: currentNo,
      transid: currentTransid,
    });
    if (data?.success) {
      refreshPage();
    }
  };

  // AKTIF SEMULA - Reactivate a cancelled ticket
  const handleAktifSemula = async () => {
    if (!aktifNo) return;
    const data = await doAction("aktif_semula", { no_tiket: Number(aktifNo) });
    if (data?.success) {
      setCurrentNo(data.no_tiket);
      setShowAktifModal(false);
      setAktifNo("");
      refreshPage();
    }
  };

  // PINDAH - Transfer to another counter
  const handlePindah = async () => {
    if (!currentNo) {
      setError("Tiada tiket semasa untuk dipindahkan");
      return;
    }
    if (!pindahKaunter) return;
    const data = await doAction("pindah", {
      no_tiket: currentNo,
      kaunter_baru: pindahKaunter,
    });
    if (data?.success) {
      setCurrentNo(null);
      setCurrentTransid(null);
      setShowPindahModal(false);
      setPindahKaunter("");
      refreshPage();
    }
  };

  // SELESAI - Complete current ticket
  const handleSelesai = async () => {
    if (!currentNo) {
      setError("Tiada tiket semasa untuk diselesaikan");
      return;
    }
    const data = await doAction("selesai", { no_tiket: currentNo });
    if (data?.success) {
      setCurrentNo(null);
      setCurrentTransid(null);
      setShowIdleReminder(false);
      refreshPage();
    }
  };

  // BATAL - Cancel current ticket
  const handleBatal = async () => {
    if (!currentNo) {
      setError("Tiada tiket semasa untuk dibatalkan");
      return;
    }
    const data = await doAction("batal", { no_tiket: currentNo });
    if (data?.success) {
      setCurrentNo(null);
      setCurrentTransid(null);
      setShowIdleReminder(false);
      refreshPage();
    }
  };

  const handleIdleSnooze = () => {
    setShowIdleReminder(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (currentNo) setShowIdleReminder(true);
    }, IDLE_SNOOZE_MS);
  };

  const idleMinutes = idleStartedAt
    ? Math.max(1, Math.floor((Date.now() - idleStartedAt) / 60000))
    : 0;

  return (
    <div>
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {showIdleReminder && currentNo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800">
              Tiket Masih Sedang Dipanggil
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              No tiket <span className="font-bold text-gray-900">{currentNo}</span>{" "}
              sudah idle lebih kurang {idleMinutes} minit. Sila tekan
              <span className="font-semibold text-green-700"> Selesai</span> jika
              urusan sudah tamat atau
              <span className="font-semibold text-red-700"> Batal</span> jika
              pelanggan tidak diteruskan.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={handleSelesai}
                disabled={loading === "selesai"}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600 disabled:bg-green-300"
              >
                {loading === "selesai" ? "..." : "Selesai"}
              </button>
              <button
                onClick={handleBatal}
                disabled={loading === "batal"}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:bg-red-300"
              >
                {loading === "batal" ? "..." : "Batal"}
              </button>
              <button
                onClick={handleIdleSnooze}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-300"
              >
                Ingatkan Semula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header cards: Kaunter, Seksyen, Nombor Terkini */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border-2 border-blue-400 p-6 text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase">
            Kaunter
          </p>
          <p className="text-4xl font-bold text-gray-800 mt-2">
            {noKaunter || "-"}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-blue-400 p-6 text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase">
            Seksyen
          </p>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {seksyen || "-"}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-blue-400 p-6 text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase">
            Nombor Terkini
          </p>
          <p className="text-4xl font-bold text-gray-800 mt-2">
            {currentNo || "-"}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <button
          onClick={handleSeterusnya}
          disabled={loading === "seterusnya"}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg text-sm transition"
        >
          {loading === "seterusnya" ? "..." : "SETERUSNYA"}
        </button>
        <button
          onClick={handlePanggilSemula}
          disabled={loading === "panggil_semula" || !currentNo}
          className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-3 px-4 rounded-lg text-sm transition"
        >
          {loading === "panggil_semula" ? "..." : "PANGGIL SEMULA"}
        </button>
        <button
          onClick={() => setShowAktifModal(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-4 rounded-lg text-sm transition"
        >
          AKTIF SEMULA
        </button>
        <button
          onClick={() => {
            if (!currentNo) {
              setError("Tiada tiket semasa untuk dipindahkan");
              return;
            }
            setShowPindahModal(true);
          }}
          disabled={!currentNo}
          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-semibold py-3 px-4 rounded-lg text-sm transition"
        >
          PINDAH
        </button>
        <button
          onClick={handleSelesai}
          disabled={loading === "selesai" || !currentNo}
          className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 px-4 rounded-lg text-sm transition"
        >
          {loading === "selesai" ? "..." : "SELESAI"}
        </button>
        <button
          onClick={handleBatal}
          disabled={loading === "batal" || !currentNo}
          className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-3 px-4 rounded-lg text-sm transition"
        >
          {loading === "batal" ? "..." : "BATAL"}
        </button>
      </div>

      {/* Session & customer info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-lg font-bold text-gray-800">
            Bil. Pelanggan belum Dipanggil : {stats.belumPanggil}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-lg font-bold text-gray-800">
            Bil. Pelanggan: {stats.bilPelanggan}
          </p>
        </div>
      </div>

      {/* Queue tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nombor Menunggu */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-700 border-b-2 border-yellow-400 pb-2 mb-3">
            Nombor Menunggu
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-1">Bil</th>
                <th className="text-left py-1">Nombor</th>
                <th className="text-left py-1">Sesi</th>
              </tr>
            </thead>
            <tbody>
              {stats.waitingList.length > 0 ? (
                stats.waitingList.map((t, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1">{i + 1}</td>
                    <td className="py-1">{t.no_tiket}</td>
                    <td className="py-1">{t.sesi}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-gray-400 py-2 text-center">
                    Tiada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Nombor Pindah Kaunter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-700 border-b-2 border-orange-400 pb-2 mb-3">
            Nombor Pindah Kaunter
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-1">Nombor</th>
                <th className="text-left py-1">Dari Kaunter</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.transferredList.length > 0 ? (
                stats.transferredList.map((t, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1">{t.no_tiket}</td>
                    <td className="py-1">{t.transfer_from}</td>
                    <td className="py-1">Pindah</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-gray-400 py-2 text-center">
                    Tiada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Transaksi Batal */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-700 border-b-2 border-red-400 pb-2 mb-3">
            Transaksi Batal
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-1">Nombor</th>
                <th className="text-left py-1">Masa</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.cancelledList.length > 0 ? (
                stats.cancelledList.map((t, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1">{t.no_tiket}</td>
                    <td className="py-1">
                      {t.cancel_date
                        ? formatTimeFromDB(t.cancel_date)
                        : "-"}
                    </td>
                    <td className="py-1">Batal</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-gray-400 py-2 text-center">
                    Tiada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Second row: Nombor Pindah Perkhidmatan, No Terakhir, Bilangan Mengikut Perkhidmatan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Nombor Pindah Perkhidmatan */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-700 border-b-2 border-purple-400 pb-2 mb-3">
            Nombor Pindah Perkhidmatan
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-1">Nombor</th>
                <th className="text-left py-1">Dari Perkhidmatan</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.pindahPerkhidmatanList.length > 0 ? (
                stats.pindahPerkhidmatanList.map((t, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1">{t.no_tiket}</td>
                    <td className="py-1">{t.keterangan || "-"}</td>
                    <td className="py-1">Pindah</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-gray-400 py-2 text-center">
                    Tiada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* No Terakhir */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-700 border-b-2 border-green-400 pb-2 mb-3">
            No Terakhir
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-1">Nombor</th>
                <th className="text-left py-1">Masa</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.lastTicket.length > 0 ? (
                stats.lastTicket.map((t, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1">{t.no_tiket}</td>
                    <td className="py-1">
                      {t.end_date
                        ? formatTimeFromDB(t.end_date)
                        : "-"}
                    </td>
                    <td className="py-1">Selesai</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-gray-400 py-2 text-center">
                    Tiada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bilangan Mengikut Perkhidmatan */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-700 border-b-2 border-blue-400 pb-2 mb-3">
            Bilangan Mengikut Perkhidmatan
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-1">Bil</th>
                <th className="text-left py-1">Perkhidmatan</th>
                <th className="text-left py-1">Bilangan</th>
              </tr>
            </thead>
            <tbody>
              {stats.bilanganPerkhidmatan.length > 0 ? (
                <>
                  {stats.bilanganPerkhidmatan.map((item, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1">{i + 1}</td>
                      <td className="py-1">{item.keterangan}</td>
                      <td className="py-1">{item.bilangan}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-1"></td>
                    <td className="py-1">Jumlah</td>
                    <td className="py-1">
                      {stats.bilanganPerkhidmatan.reduce(
                        (sum, item) => sum + item.bilangan,
                        0
                      )}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={3} className="text-gray-400 py-2 text-center">
                    Tiada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aktif Semula Modal */}
      {showAktifModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Aktif Semula</h3>
            <p className="text-sm text-gray-600 mb-3">
              Masukkan nombor tiket yang ingin diaktifkan semula:
            </p>
            <input
              type="number"
              value={aktifNo}
              onChange={(e) => setAktifNo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Nombor tiket"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleAktifSemula}
                disabled={!aktifNo || loading === "aktif_semula"}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 text-white font-semibold py-2 rounded-lg text-sm"
              >
                {loading === "aktif_semula" ? "..." : "Aktifkan"}
              </button>
              <button
                onClick={() => {
                  setShowAktifModal(false);
                  setAktifNo("");
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pindah Modal */}
      {showPindahModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Pindah Kaunter</h3>
            <p className="text-sm text-gray-600 mb-1">
              Tiket: <span className="font-bold">{currentNo}</span>
            </p>
            <p className="text-sm text-gray-600 mb-3">
              Masukkan nombor kaunter tujuan:
            </p>
            <input
              type="number"
              value={pindahKaunter}
              onChange={(e) => setPindahKaunter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Nombor kaunter"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handlePindah}
                disabled={!pindahKaunter || loading === "pindah"}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-semibold py-2 rounded-lg text-sm"
              >
                {loading === "pindah" ? "..." : "Pindah"}
              </button>
              <button
                onClick={() => {
                  setShowPindahModal(false);
                  setPindahKaunter("");
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
