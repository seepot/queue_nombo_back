"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";

interface CounterItem {
  id: number;
  noKaunter: string;
  perkhidmatan: string;
  idPerkhidmatanKumpulan: number | null;
  staffName: string | null;
  status: "serving" | "sla_warning" | "idle" | "closed";
  currentTicket: {
    noTiket: number;
    transid: string | null;
    callDate: string | null;
    masaPanggil: string | null;
    elapsedSeconds: number;
    catatan: string | null;
  } | null;
  lastCompletedTicket?: {
    noTiket: number;
    masaPanggil: string | null;
    masaSelesai: string | null;
    durasiSaat: number;
  } | null;
  stats: {
    totalServed: number;
    avgDurationSeconds: number;
    slaRate: number;
  };
}

interface BottleneckAlert {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
  serviceName: string;
  waitingCount: number;
  activeCounters: number;
  recommendation: string;
}

interface ServiceQueueItem {
  id: number;
  keterangan: string;
  bilMenunggu: number;
  avgWaitSeconds: number;
}

interface CommandData {
  timestamp: string;
  cawangan: string;
  summary: {
    totalServed: number;
    totalWaiting: number;
    activeCountersCount: number;
    totalCountersConfigured: number;
    branchSlaRate: number;
  };
  bottleneckAlerts: BottleneckAlert[];
  services: ServiceQueueItem[];
  counters: CounterItem[];
}

interface Props {
  namaCawangan: string;
}

export default function BranchCommandCenterClient({ namaCawangan }: Props) {
  const [data, setData] = useState<CommandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "serving" | "sla_warning" | "idle" | "closed"
  >("all");
  const [hideNoStaff, setHideNoStaff] = useState(true);

  // Live timer tick for accurate seconds
  const [nowSec, setNowSec] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/cawangan/live-monitoring");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initFetch = setTimeout(() => {
      fetchData();
      setNowSec(Date.now());
    }, 0);

    // Auto-refresh data every 6 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 6000);

    // Stopwatch tick every 1 second for live counters
    const clockInterval = setInterval(() => {
      setNowSec(Date.now());
    }, 1000);

    return () => {
      clearTimeout(initFetch);
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [fetchData]);

  const formatStopwatch = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getElapsedSeconds = (
    masaPanggilStr: string | null,
    fallback: number,
    _currentSec?: number | null
  ) => {
    if (masaPanggilStr) {
      const parts = masaPanggilStr.split(":").map(Number);
      if (parts.length >= 2) {
        const [h, m, s = 0] = parts;
        const now = _currentSec ? new Date(_currentSec) : new Date();
        const callTime = new Date(now);
        callTime.setHours(h, m, s, 0);
        const diff = Math.floor((now.getTime() - callTime.getTime()) / 1000);
        if (diff >= 0 && diff < 86400) {
          return diff;
        }
      }
    }
    return Math.max(0, fallback);
  };

  const filteredCounters = useMemo(() => {
    if (!data) return [];
    return data.counters.filter((c) => {
      const hasStaff = Boolean(c.staffName && c.staffName.trim() !== "");
      if (hideNoStaff && !hasStaff) {
        return false;
      }

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "serving" && (c.status === "serving" || c.status === "sla_warning")) ||
        (filterStatus === "sla_warning" && c.status === "sla_warning") ||
        (filterStatus === "idle" && c.status === "idle") ||
        (filterStatus === "closed" && c.status === "closed");

      const matchesSearch =
        searchQuery === "" ||
        c.noKaunter.includes(searchQuery) ||
        c.perkhidmatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.staffName && c.staffName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.currentTicket && String(c.currentTicket.noTiket).includes(searchQuery));

      return matchesFilter && matchesSearch;
    });
  }, [data, filterStatus, hideNoStaff, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Live Header Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm border border-blue-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
              Pusat Kawalan Operasi Langsung &bull; {namaCawangan}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">
            Matriks Pemantauan Kaunter Masa Nyata
          </h2>
          <p className="text-xs text-blue-200 mt-0.5">
            Kemas kini berterusan status kaunter, amaran kesesakan perkhidmatan, dan pematuhan SLA Piagam.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-[11px] text-blue-300 font-mono">
            {lastUpdated ? `Kemas kini: ${lastUpdated.toLocaleTimeString("ms-MY")}` : "Menyambung..."}
          </span>
          <button
            type="button"
            onClick={fetchData}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
            title="Muat Semula Sekarang"
          >
            <span>🔄</span> Segar Semula
          </button>
        </div>
      </div>

      {/* Top 4 Executive Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Pelanggan Selesai</span>
            <span className="text-xl">👥</span>
          </div>
          <p className="mt-2 text-3xl sm:text-4xl font-black text-emerald-600">
            {data ? data.summary.totalServed : "-"}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Jumlah transaksi lengkap hari ini
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Menunggu di Ruang Legar</span>
            <span className="text-xl">⏳</span>
          </div>
          <p className="mt-2 text-3xl sm:text-4xl font-black text-blue-950">
            {data ? data.summary.totalWaiting : "-"}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Pelanggan dalam barisan menunggu
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Kaunter Beroperasi</span>
            <span className="text-xl">🖥️</span>
          </div>
          <p className="mt-2 text-3xl sm:text-4xl font-black text-indigo-600 font-mono">
            {data ? `${data.summary.activeCountersCount} / ${data.summary.totalCountersConfigured}` : "-"}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Kaunter aktif melayan / dibuka
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Kadar SLA Cawangan</span>
            <span className="text-xl">🏆</span>
          </div>
          <p
            className={`mt-2 text-3xl sm:text-4xl font-black ${
              (data?.summary.branchSlaRate ?? 100) >= 85
                ? "text-emerald-600"
                : (data?.summary.branchSlaRate ?? 100) >= 70
                ? "text-amber-600"
                : "text-rose-600"
            }`}
          >
            {data ? `${data.summary.branchSlaRate}%` : "-"}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Pematuhan masa layanan &le; 10 min
          </span>
        </div>
      </div>

      {/* Smart Bottleneck Alert Box */}
      {data?.bottleneckAlerts && data.bottleneckAlerts.length > 0 ? (
        <div className="space-y-3">
          {data.bottleneckAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in ${
                alert.level === "critical"
                  ? "bg-rose-50 border-rose-300 text-rose-950"
                  : "bg-amber-50 border-amber-300 text-amber-950"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span className="text-2xl shrink-0 mt-0.5">
                  {alert.level === "critical" ? "🚨" : "⚠️"}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-extrabold uppercase tracking-wide">
                      {alert.title}
                    </strong>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        alert.level === "critical"
                          ? "bg-rose-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {alert.level === "critical" ? "Tindakan Segera" : "Perlu Perhatian"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold mt-1 text-slate-700">
                    {alert.message}
                  </p>
                  <p className="text-xs font-bold text-blue-900 mt-1 flex items-center gap-1">
                    <span>💡 <strong>Cadangan Ketua Cawangan:</strong></span> {alert.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-xs">
          <span className="text-2xl">✓</span>
          <div>
            <strong className="text-xs font-bold block">
              Aliran Operasi Cawangan Lancar & Terkawal
            </strong>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Tiada kesesakan kritikal dikesan pada mana-mana perkhidmatan dan semua kaunter beroperasi mengikut kapasiti normal.
            </p>
          </div>
        </div>
      )}

      {/* Service Queue Distribution Pills */}
      {data?.services && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Taburan Barisan Menunggu Mengikut Perkhidmatan
          </p>
          <div className="flex flex-wrap gap-2">
            {data.services.map((s) => (
              <div
                key={s.id}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2.5"
              >
                <span className="font-bold text-slate-800">{s.keterangan}</span>
                <span
                  className={`font-black font-mono px-2 py-0.5 rounded-lg text-xs ${
                    s.bilMenunggu >= 15
                      ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                      : s.bilMenunggu >= 8
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {s.bilMenunggu} Menunggu
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar for Counter Grid */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kaunter, staf, servis..."
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterStatus === "all"
                  ? "bg-white text-blue-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Semua ({data?.counters.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("serving")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterStatus === "serving"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🟢 Aktif Melayan ({data?.counters.filter((c) => c.status === "serving" || c.status === "sla_warning").length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("sla_warning")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterStatus === "sla_warning"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🔴 &gt;10 Minit ({data?.counters.filter((c) => c.status === "sla_warning").length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("idle")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterStatus === "idle"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🟡 Melahu / Rehat ({data?.counters.filter((c) => c.status === "idle").length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("closed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterStatus === "closed"
                  ? "bg-white text-slate-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ⚪ Tutup ({data?.counters.filter((c) => c.status === "closed").length || 0})
            </button>
          </div>
        </div>

        {/* Hide No Staff Toggle */}
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition self-start sm:self-auto shrink-0">
          <input
            type="checkbox"
            checked={hideNoStaff}
            onChange={(e) => setHideNoStaff(e.target.checked)}
            className="rounded text-blue-600 cursor-pointer"
          />
          <span>Sembunyi Kaunter Tiada Staf</span>
        </label>
      </div>

      {/* Interactive Kaunter Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            Memuatkan matriks status kaunter...
          </div>
        ) : filteredCounters.length > 0 ? (
          filteredCounters.map((c) => {
            const hasActiveTicket = Boolean(c.currentTicket);
            const currentElapsed = hasActiveTicket
              ? getElapsedSeconds(
                  c.currentTicket?.masaPanggil || null,
                  c.currentTicket?.elapsedSeconds || 0,
                  nowSec
                )
              : 0;

            const isSlaExceeded = hasActiveTicket && currentElapsed >= 600;
            const isSlaWarning = hasActiveTicket && currentElapsed >= 300 && currentElapsed < 600;

            return (
              <div
                key={c.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                  isSlaExceeded
                    ? "border-rose-400 ring-2 ring-rose-300/50 bg-rose-50/20"
                    : c.status === "serving"
                    ? "border-emerald-300 ring-1 ring-emerald-200"
                    : c.status === "idle"
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200 opacity-80"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg font-black text-blue-950">
                          Kaunter {c.noKaunter}
                        </h3>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 truncate max-w-[170px]" title={c.perkhidmatan}>
                        {c.perkhidmatan}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        isSlaExceeded
                          ? "bg-rose-600 text-white border-rose-700 animate-pulse"
                          : c.status === "serving"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : c.status === "idle"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {isSlaExceeded
                        ? "🚨 >10m SLA"
                        : c.status === "serving"
                        ? "🟢 Melayan"
                        : c.status === "idle"
                        ? "🟡 Melahu"
                        : "⚪ Tutup"}
                    </span>
                  </div>

                  {/* Staff Info */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-400">👤 Staf:</span>
                    <span className="font-bold text-slate-800 truncate" title={c.staffName || "Belum ditugaskan"}>
                      {c.staffName || "Belum ditugaskan"}
                    </span>
                  </div>

                  {/* Active Serving Ticket Box */}
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    {hasActiveTicket && c.currentTicket ? (
                      <>
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-slate-200/60">
                          <span>Sedang Dilayan</span>
                          {c.currentTicket.masaPanggil && (
                            <span className="font-mono font-bold text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded-md">
                              ⏰ Panggil: {c.currentTicket.masaPanggil}
                            </span>
                          )}
                        </div>
                        <p className="text-3xl font-black font-mono text-blue-950 mt-1">
                          #{c.currentTicket.noTiket}
                        </p>

                        {/* Live Stopwatch for this counter */}
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border ${
                              isSlaExceeded
                                ? "bg-rose-100 border-rose-300 text-rose-900 animate-pulse"
                                : isSlaWarning
                                ? "bg-amber-100 border-amber-300 text-amber-900"
                                : "bg-emerald-100 border-emerald-300 text-emerald-900"
                            }`}
                          >
                            ⏱️ {formatStopwatch(currentElapsed)}
                          </span>
                        </div>

                        {/* Case Memo Note if available */}
                        {c.currentTicket.catatan && (
                          <p
                            className="mt-2 text-[10px] font-medium text-amber-900 bg-amber-50 border border-amber-200 p-1.5 rounded-lg truncate text-left"
                            title={c.currentTicket.catatan}
                          >
                            📝 {c.currentTicket.catatan}
                          </p>
                        )}
                      </>
                    ) : c.lastCompletedTicket ? (
                      <div className="space-y-2 text-left">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>Tiket Selesai Terkini:</span>
                          <span className="font-mono font-bold text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                            #{c.lastCompletedTicket.noTiket}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 grid grid-cols-2 gap-2 text-center shadow-2xs">
                          <div className="bg-slate-50 p-1 rounded-lg">
                            <span className="text-[9px] block text-slate-400 font-sans uppercase font-bold">Masa Panggil</span>
                            <span className="font-bold text-slate-800">{c.lastCompletedTicket.masaPanggil || "-"}</span>
                          </div>
                          <div className="bg-slate-50 p-1 rounded-lg">
                            <span className="text-[9px] block text-slate-400 font-sans uppercase font-bold">Masa Selesai</span>
                            <span className="font-bold text-slate-800">{c.lastCompletedTicket.masaSelesai || "-"}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-amber-800 font-bold block text-center">
                          🟡 Sedia memanggil giliran seterusnya
                        </span>
                      </div>
                    ) : (
                      <div className="py-2 text-xs text-slate-400 italic">
                        {c.status === "idle" ? "Menunggu panggilan giliran pertama" : "Kaunter tidak beroperasi"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Statistics & Quick Link */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div>
                    <span>Selesai: <strong className="font-bold text-slate-900">{c.stats.totalServed}</strong></span>
                    <span className="mx-1.5">&bull;</span>
                    <span>SLA: <strong className="font-bold text-emerald-700">{c.stats.totalServed > 0 ? `${c.stats.slaRate}%` : "-"}</strong></span>
                  </div>
                  <Link
                    href={`/kaunter/sejarah?no_kaunter=${c.noKaunter}`}
                    className="font-bold text-blue-600 hover:text-blue-800 transition"
                  >
                    Sejarah &rarr;
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            Tiada kaunter sepadan dengan carian / penapis status.
          </div>
        )}
      </div>
    </div>
  );
}
