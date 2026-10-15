"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

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

interface LiveBranchData {
  branchInfo: {
    idCawangan: string;
    namaCawangan: string;
    negeri: string;
    totalCounters: number;
    openCounters: number;
    waitingCount: number;
    servedToday: number;
    slaComplianceRate: number;
  };
  counters: CounterItem[];
}

interface Props {
  idCawangan: string;
  namaCawangan: string;
  onClose: () => void;
}

function formatStopwatch(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getElapsedSeconds(
  masaPanggilStr: string | null,
  fallback: number,
  _tick?: number
): number {
  if (masaPanggilStr) {
    const parts = masaPanggilStr.split(":").map(Number);
    if (parts.length >= 2) {
      const [h, m, s = 0] = parts;
      const now = new Date();
      const callTime = new Date(now);
      callTime.setHours(h, m, s, 0);
      const diff = Math.floor((now.getTime() - callTime.getTime()) / 1000);
      if (diff >= 0 && diff < 86400) {
        return diff;
      }
    }
  }
  return Math.max(0, fallback + ((_tick || 0) % 5));
}

export default function BranchCounterDrilldownModal({
  idCawangan,
  namaCawangan,
  onClose,
}: Props) {
  const [data, setData] = useState<LiveBranchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "active" | "serving" | "idle" | "all"
  >("active");
  const [hideClosed, setHideClosed] = useState(true);
  const [tick, setTick] = useState(0);

  const fetchCounters = useCallback(async () => {
    try {
      const res = await fetch(`/api/cawangan/live-monitoring?cawangan=${idCawangan}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [idCawangan]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCounters();
    }, 0);
    const interval = setInterval(fetchCounters, 5000); // 5s auto-refresh
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchCounters]);

  // Client stopwatch ticker
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtered Counter List: Hides closed counters and counters with no staff / no numbers by default
  // Filtered Counter List: Hides closed counters by default
  const filteredCounters = useMemo(() => {
    if (!data?.counters) return [];

    return data.counters.filter((c) => {
      const hasValidNumber = Boolean(c.noKaunter && c.noKaunter !== "" && c.noKaunter !== "0");
      const isClosed = c.status === "closed";

      // If hideClosed is ON, exclude closed counters
      if (hideClosed && (isClosed || !hasValidNumber)) {
        return false;
      }

      if (filterStatus === "active") {
        return (c.status === "serving" || c.status === "sla_warning" || c.status === "idle") && hasValidNumber;
      }
      if (filterStatus === "serving") {
        return c.status === "serving" || c.status === "sla_warning";
      }
      if (filterStatus === "idle") {
        return c.status === "idle";
      }

      return true; // "all"
    });
  }, [data, filterStatus, hideClosed]);

  // Counts for Badges
  const counts = useMemo(() => {
    if (!data?.counters) return { active: 0, serving: 0, idle: 0, closed: 0, total: 0 };
    const serving = data.counters.filter(
      (c) => c.status === "serving" || c.status === "sla_warning"
    ).length;
    const idle = data.counters.filter((c) => c.status === "idle").length;
    const closed = data.counters.filter((c) => c.status === "closed").length;
    return {
      active: serving + idle,
      serving,
      idle,
      closed,
      total: data.counters.length,
    };
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 shrink-0 flex items-start justify-between gap-4 border-b border-blue-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Pusat Kawalan Kaunter Langsung
              </span>
              <span className="text-xs font-mono text-blue-200">
                ID: {idCawangan}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
              {namaCawangan}
            </h3>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Pemantauan masa nyata nombor tiket panggilan semasa, pematuhan SLA kaunter, dan staf bertugas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition cursor-pointer border border-white/20 shrink-0 text-lg"
            title="Tutup Modal (ESC)"
          >
            &times;
          </button>
        </div>

        {/* Branch Live KPIs Summary */}
        {data?.branchInfo && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Kaunter Beroperasi
                </span>
                <span className="text-xl font-black text-blue-950 font-mono">
                  {counts.active} / {counts.total}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Menunggu di Ruang Legar
                </span>
                <span className="text-xl font-black text-amber-600 font-mono">
                  {data.branchInfo.waitingCount} Orang
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Selesai Dilayan Hari Ini
                </span>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  {data.branchInfo.servedToday}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Pematuhan SLA Cawangan
                </span>
                <span className="text-xl font-black text-emerald-600 font-mono">
                  {data.branchInfo.slaComplianceRate}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Counter Filter Tabs & Quick Actions */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs font-bold">
            <span className="text-slate-400 mr-1">Tapis Kaunter:</span>
            <button
              type="button"
              onClick={() => {
                setFilterStatus("active");
                setHideClosed(true);
              }}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                filterStatus === "active" && hideClosed
                  ? "bg-slate-900 text-white font-black shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>🟢</span> Kaunter Aktif Sahaja ({counts.active})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("serving")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                filterStatus === "serving"
                  ? "bg-emerald-600 text-white font-black shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sedang Melayan ({counts.serving})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("idle")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                filterStatus === "idle"
                  ? "bg-amber-600 text-white font-black shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Menunggu Panggilan ({counts.idle})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterStatus("all");
                setHideClosed(false);
              }}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterStatus === "all" && !hideClosed
                  ? "bg-slate-600 text-white font-black shadow-xs"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              Papar Semua Termasuk Tutup ({counts.total})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle to Hide Closed Counters */}
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={hideClosed}
                onChange={(e) => setHideClosed(e.target.checked)}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span>Sembunyi Kaunter Tutup</span>
            </label>

            <button
              type="button"
              onClick={fetchCounters}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
            >
              <span>🔄</span>
            </button>
          </div>
        </div>

        {/* Counter Grid Content Area (Scrollable) */}
        <div className="p-5 overflow-y-auto grow space-y-4 bg-slate-50/50">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <span className="inline-block animate-spin text-xl mb-2">🔄</span>
              <p>Memuatkan status langsung kaunter cawangan...</p>
            </div>
          ) : filteredCounters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCounters.map((c) => {
                const isServing = c.status === "serving" || c.status === "sla_warning";
                const isSlaWarning = c.status === "sla_warning";
                const isIdle = c.status === "idle";

                const elapsedLive = c.currentTicket
                  ? getElapsedSeconds(
                      c.currentTicket.masaPanggil || null,
                      c.currentTicket.elapsedSeconds || 0,
                      tick
                    )
                  : 0;

                const avgMinutes = Math.round((c.stats.avgDurationSeconds || 0) / 60 * 10) / 10;

                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl p-4 border transition flex flex-col justify-between shadow-2xs ${
                      isServing
                        ? isSlaWarning
                          ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/40"
                          : "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300"
                        : isIdle
                        ? "bg-amber-50/70 border-amber-300"
                        : "bg-white border-slate-200 opacity-60"
                    }`}
                  >
                    <div>
                      {/* Top Row: Counter Title & Status */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              Kaunter {c.noKaunter}
                            </span>
                            {c.stats.totalServed > 0 && (
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                {c.stats.slaRate}% SLA
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mt-1">
                            {c.perkhidmatan}
                          </h4>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                            isServing
                              ? isSlaWarning
                                ? "bg-rose-600 text-white border-rose-700 animate-pulse"
                                : "bg-emerald-600 text-white border-emerald-700"
                              : isIdle
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-slate-200 text-slate-600 border-slate-300"
                          }`}
                        >
                          {isServing
                            ? isSlaWarning
                              ? "🚨 SLA > 10m"
                              : "🟢 Melayan"
                            : isIdle
                            ? "🟡 Sedia"
                            : "⚪ Tutup"}
                        </span>
                      </div>

                      {/* Staff Info */}
                      <div className="mt-2.5 flex items-center gap-2 text-xs">
                        <span className="text-sm">👤</span>
                        <div className="truncate">
                          <strong className="text-slate-800 block truncate text-[11px]">
                            {c.staffName || "Tiada Staf Bertugas"}
                          </strong>
                        </div>
                      </div>

                      {/* Active Ticket Card (when serving) */}
                      {isServing && c.currentTicket ? (
                        <div
                          className={`mt-3 p-3 rounded-2xl border shadow-xs space-y-2 ${
                            isSlaWarning
                              ? "bg-rose-100/60 border-rose-300"
                              : "bg-white border-emerald-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-500">
                              🎟️ Nombor Terkini:
                            </span>
                            <span className="text-lg font-black font-mono text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                              #{c.currentTicket.noTiket}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-mono">
                            <span className="text-[11px] text-slate-600 font-sans font-semibold">
                              ⏰ Masa Panggil:
                            </span>
                            <span className="font-bold text-slate-900">
                              {c.currentTicket.masaPanggil || "-"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                            <span className="text-[11px] text-slate-600 font-semibold">
                              ⏱️ Masa Layanan:
                            </span>
                            <span
                              className={`font-mono font-black text-xs ${
                                isSlaWarning ? "text-rose-600 font-extrabold" : "text-emerald-700"
                              }`}
                            >
                              {formatStopwatch(elapsedLive)} min
                            </span>
                          </div>

                          {/* SLA Compliance Indicator Banner */}
                          <div
                            className={`text-[10px] font-bold text-center py-1 rounded-lg ${
                              isSlaWarning
                                ? "bg-rose-600 text-white animate-pulse"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {isSlaWarning
                              ? "⚠️ Melebihi Piagam SLA (>10 minit)"
                              : "✓ Mematuhi Piagam SLA (<10 minit)"}
                          </div>
                        </div>
                      ) : c.lastCompletedTicket ? (
                        <div className="mt-3 p-3 rounded-2xl bg-white border border-amber-200 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Tiket Terakhir:
                            </span>
                            <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              #{c.lastCompletedTicket.noTiket}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px] font-mono grid grid-cols-2 gap-2 text-center">
                            <div>
                              <span className="text-[9px] block text-slate-400 font-sans uppercase font-bold">Masa Panggil</span>
                              <span className="font-bold text-slate-800">{c.lastCompletedTicket.masaPanggil || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] block text-slate-400 font-sans uppercase font-bold">Masa Selesai</span>
                              <span className="font-bold text-slate-800">{c.lastCompletedTicket.masaSelesai || "-"}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-amber-800 font-bold block text-center">
                            🟡 Sedia memanggil giliran seterusnya
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 rounded-2xl bg-slate-100 border border-slate-200 text-center text-xs text-slate-400 font-semibold">
                          <span className="block text-base mb-0.5">🔒</span>
                          Kaunter tidak aktif / belum dibuka
                        </div>
                      )}
                    </div>

                    {/* Counter Footer: Performance Metrics */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>
                        Selesai: <strong className="text-slate-900 font-bold">{c.stats.totalServed}</strong>
                      </span>
                      <span>
                        Purata: <strong className="text-slate-900 font-bold">{avgMinutes}m</strong>
                      </span>
                      <span>
                        SLA: <strong className="text-emerald-700 font-bold">{c.stats.totalServed > 0 ? `${c.stats.slaRate}%` : "-"}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              <span className="text-2xl block mb-1">🔒</span>
              <p>Tiada kaunter aktif yang beroperasi pada masa ini.</p>
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("all");
                  setHideClosed(false);
                }}
                className="mt-3 px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition cursor-pointer"
              >
                Papar Semua Kaunter Termasuk Tutup
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Paparan masa nyata hanya memaparkan kaunter aktif yang beroperasi.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Tutup Paparan
          </button>
        </div>
      </div>
    </div>
  );
}
