"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import BranchCounterDrilldownModal from "./BranchCounterDrilldownModal";

interface BranchItem {
  idCawangan: string;
  namaCawangan: string;
  negeri: string | null;
  stateCode: string;
  quota: number;
  issued: number;
  waiting: number;
  serving: number;
  served: number;
  cancelled: number;
  withinSla: number;
  totalCalled: number;
  utilizationRate: number;
  slaRate: number;
  avgWaitMinutes: number;
  avgServiceMinutes: number;
  capacityStatus: "critical" | "high" | "moderate" | "low";
}

interface AnomalyItem {
  id: string;
  level: "critical" | "warning" | "info";
  branchId: string;
  branchName: string;
  state: string;
  title: string;
  message: string;
  metric: string;
  recommendation: string;
}

interface PerformanceData {
  selectedDate: string;
  summary: {
    totalBranches: number;
    totalIssued: number;
    totalWaiting: number;
    totalServed: number;
    overallSlaRate: number;
    anomaliesCount: number;
  };
  anomalies: AnomalyItem[];
  leaderboards: {
    topSla: BranchItem[];
    topVolume: BranchItem[];
    topBusy: BranchItem[];
  };
  hourlyTraffic: Array<{ hour: string; volumeRatio: number; label: string }>;
  branches: BranchItem[];
}

type SortField =
  | "name"
  | "negeri"
  | "quota"
  | "waiting"
  | "volume"
  | "sla"
  | "avg_wait"
  | "status";
type SortDirection = "asc" | "desc";

const STATUS_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

interface AdminCommandCenterClientProps {
  userLevel?: string;
  lockedStateCode?: string;
}

export default function AdminCommandCenterClient({
  userLevel,
  lockedStateCode,
}: AdminCommandCenterClientProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<
    "leaderboard" | "anomalies" | "forecast" | "bulk_quota"
  >("leaderboard");

  const [selectedTarikh, setSelectedTarikh] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState(lockedStateCode || "all");

  // Counter Drilldown Modal state
  const [drilldownBranch, setDrilldownBranch] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Dynamic Column Sorting State
  const [sortField, setSortField] = useState<SortField>("sla");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Bulk Quota Form State
  const [bulkState, setBulkState] = useState("all");
  const [bulkPercentage, setBulkPercentage] = useState("20");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cawangan/prestasi?tarikh=${selectedTarikh}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedTarikh]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Column Sort Click Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // Text fields default to asc (A-Z), numeric fields default to desc (High-Low)
      setSortDirection(field === "name" || field === "negeri" ? "asc" : "desc");
    }
  };

  const activeStateName = useMemo(() => {
    const STATE_NAMES: Record<string, string> = {
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
    return lockedStateCode ? STATE_NAMES[lockedStateCode] || `Negeri ${lockedStateCode}` : "";
  }, [lockedStateCode]);

  // Scoped anomalies for Level 7
  const scopedAnomalies = useMemo(() => {
    if (!data?.anomalies) return [];
    if (lockedStateCode) {
      return data.anomalies.filter(
        (a) => a.branchId.substring(2, 4) === lockedStateCode
      );
    }
    return data.anomalies;
  }, [data, lockedStateCode]);

  // Scoped state summary
  const stateSummary = useMemo(() => {
    if (!data?.branches) return data?.summary;
    const branches = lockedStateCode
      ? data.branches.filter((b) => b.stateCode === lockedStateCode)
      : data.branches;

    const totalIssued = branches.reduce((s, b) => s + b.issued, 0);
    const totalWaiting = branches.reduce((s, b) => s + b.waiting, 0);
    const totalServed = branches.reduce((s, b) => s + b.served, 0);
    const totalCalledAll = branches.reduce((s, b) => s + b.totalCalled, 0);
    const totalWithinSlaAll = branches.reduce((s, b) => s + b.withinSla, 0);
    const overallSlaRate =
      totalCalledAll > 0
        ? Math.min(100, Math.round((totalWithinSlaAll / totalCalledAll) * 100))
        : 100;

    return {
      totalBranches: branches.length,
      totalIssued,
      totalWaiting,
      totalServed,
      overallSlaRate,
      anomaliesCount: scopedAnomalies.length,
    };
  }, [data, lockedStateCode, scopedAnomalies]);

  // Scoped Leaderboards for Level 7
  const scopedLeaderboards = useMemo(() => {
    if (!data?.branches) return data?.leaderboards;
    const branches = lockedStateCode
      ? data.branches.filter((b) => b.stateCode === lockedStateCode)
      : data.branches;

    const topSla = [...branches].sort((a, b) => b.slaRate - a.slaRate).slice(0, 5);
    const topVolume = [...branches].sort((a, b) => b.served - a.served).slice(0, 5);
    const topBusy = [...branches].sort((a, b) => b.waiting - a.waiting).slice(0, 5);

    return {
      topSla,
      topVolume,
      topBusy,
    };
  }, [data, lockedStateCode]);

  // Filter & Sort Logic
  const filteredBranches = useMemo(() => {
    if (!data) return [];

    return data.branches
      .filter((b) => {
        const matchesSearch =
          searchQuery === "" ||
          b.namaCawangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.idCawangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.negeri && b.negeri.toLowerCase().includes(searchQuery.toLowerCase()));

        const effectiveState = lockedStateCode || filterState;
        const matchesState = effectiveState === "all" || b.stateCode === effectiveState;

        return matchesSearch && matchesState;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "name") {
          cmp = a.namaCawangan.localeCompare(b.namaCawangan);
        } else if (sortField === "negeri") {
          cmp = (a.negeri || "").localeCompare(b.negeri || "");
        } else if (sortField === "quota") {
          cmp = a.utilizationRate - b.utilizationRate;
        } else if (sortField === "waiting") {
          cmp = a.waiting - b.waiting;
        } else if (sortField === "volume") {
          cmp = a.served - b.served;
        } else if (sortField === "sla") {
          cmp = a.slaRate - b.slaRate;
        } else if (sortField === "avg_wait") {
          cmp = a.avgWaitMinutes - b.avgWaitMinutes;
        } else if (sortField === "status") {
          cmp = (STATUS_RANK[a.capacityStatus] || 0) - (STATUS_RANK[b.capacityStatus] || 0);
        }

        return sortDirection === "asc" ? cmp : -cmp;
      });
  }, [data, searchQuery, filterState, lockedStateCode, sortField, sortDirection]);

  // Handle Bulk Quota Submit
  const handleBulkQuotaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSubmitting(true);
    setBulkSuccessMsg("");

    try {
      const targetState = lockedStateCode || bulkState;
      const res = await fetch("/api/cawangan/prestasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateCode: targetState,
          percentageIncrease: Number(bulkPercentage),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setBulkSuccessMsg(json.message || "Pelarasan kuota pukal berjaya dikemaskini!");
        fetchData();
      } else {
        alert("Gagal memproses pelarasan kuota.");
      }
    } catch {
      alert("Ralat sambungan pelayan semasa pelarasan kuota.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Helper render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-slate-300 ml-1 text-[10px]">⇅</span>;
    }
    return (
      <span className="text-blue-900 ml-1 text-xs font-black">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl shadow-sm border border-blue-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {lockedStateCode ? `Eksekutif Negeri (${activeStateName})` : "Pusat Pengurusan Eksekutif HQ"}
              </span>
              <span className="text-xs font-bold text-blue-200">
                {lockedStateCode ? `🏛️ Prestasi & Amaran Cawangan ${activeStateName}` : "🇲🇾 Prestasi & Kawalan Cawangan Kebangsaan"}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1.5">
              {lockedStateCode ? `Prestasi & Amaran Cawangan JPJ Negeri ${activeStateName}` : "Pusat Prestasi & Amaran Cawangan JPJ"}
            </h2>
            <p className="text-xs text-blue-200/90 mt-0.5 max-w-2xl">
              {lockedStateCode
                ? `Penanda aras prestasi semua cawangan di ${activeStateName}, amaran anomali ruang legar, dan pelarasan kuota cawangan negeri.`
                : "Penanda aras prestasi cawangan seluruh Malaysia, amaran kesesakan anomali, unjuran waktu puncak, dan pelarasan kuota pukal."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              value={selectedTarikh}
              onChange={(e) => setSelectedTarikh(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>{loading ? "⌛" : "🔄"}</span>
              <span>{loading ? "Memuatkan..." : "Kemas Kini"}</span>
            </button>
          </div>
        </div>

        {/* Top Summary Stats Matrix */}
        {stateSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                {lockedStateCode ? "Cawangan Negeri" : "Jumlah Cawangan"}
              </span>
              <p className="text-2xl font-black text-white mt-1">
                {stateSummary.totalBranches}
              </p>
              <span className="text-[11px] text-blue-300">
                {lockedStateCode ? `Cawangan di ${activeStateName}` : "Cawangan dipantau"}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Tiket Dikeluarkan
              </span>
              <p className="text-2xl font-black text-white mt-1">
                {stateSummary.totalIssued.toLocaleString()}
              </p>
              <span className="text-[11px] text-blue-300">
                Jumlah janaan hari ini
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Sedang Menunggu
              </span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {stateSummary.totalWaiting.toLocaleString()}
              </p>
              <span className="text-[11px] text-blue-300">
                Ruang legar cawangan
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Transaksi Selesai
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {stateSummary.totalServed.toLocaleString()}
              </p>
              <span className="text-[11px] text-blue-300">
                Dilayan di kaunter
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Pematuhan SLA
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {stateSummary.overallSlaRate}%
              </p>
              <span className="text-[11px] text-blue-300">
                Sasaran menunggu &le; 30 minit
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Amaran Anomali
              </span>
              <p className="text-2xl font-black text-rose-400 mt-1">
                {stateSummary.anomaliesCount}
              </p>
              <span className="text-[11px] text-blue-300">
                {lockedStateCode ? `Insiden di ${activeStateName}` : "Insiden dikesan"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("leaderboard")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "leaderboard"
              ? "bg-blue-950 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-slate-50"
          }`}
        >
          <span>🏆</span> {lockedStateCode ? `Papan Prestasi Cawangan (${activeStateName})` : "Papan Kedudukan Prestasi (Leaderboard)"}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("anomalies")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "anomalies"
              ? "bg-blue-950 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-slate-50"
          }`}
        >
          <span>🚨</span> Pusat Amaran Kesesakan {lockedStateCode ? `(${activeStateName})` : ""}
          {scopedAnomalies.length > 0 && (
            <span className="h-5 w-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
              {scopedAnomalies.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("forecast")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "forecast"
              ? "bg-blue-950 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-slate-50"
          }`}
        >
          <span>📈</span> Unjuran Waktu Puncak (AI Analytics)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("bulk_quota")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "bulk_quota"
              ? "bg-blue-950 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-slate-50"
          }`}
        >
          <span>⚡</span> {lockedStateCode ? `Pelarasan Kuota (${activeStateName})` : "Pelarasan Kuota Pukal (Bulk Override)"}
        </button>
      </div>

      {/* TAB 1: Papan Kedudukan Prestasi (Leaderboard) */}
      {activeSubTab === "leaderboard" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Top 3 Highflyers Carousel Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top SLA */}
            <div
              onClick={() =>
                scopedLeaderboards?.topSla[0] &&
                setDrilldownBranch({
                  id: scopedLeaderboards.topSla[0].idCawangan,
                  name: scopedLeaderboards.topSla[0].namaCawangan,
                })
              }
              className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-emerald-400 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
                <span className="text-xs font-extrabold uppercase text-emerald-800">
                  🥇 Top SLA Piagam {lockedStateCode ? `(${activeStateName})` : "Pelanggan"}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg group-hover:bg-emerald-200">
                  Lihat Kaunter ➔
                </span>
              </div>
              {scopedLeaderboards?.topSla[0] && (
                <div className="mt-3">
                  <h4 className="text-base font-black text-slate-900 truncate group-hover:text-emerald-950">
                    {scopedLeaderboards.topSla[0].namaCawangan}
                  </h4>
                  <p className="text-xs text-slate-500">{scopedLeaderboards.topSla[0].negeri}</p>
                  <p className="text-3xl font-black text-emerald-700 mt-2">
                    {scopedLeaderboards.topSla[0].slaRate}% SLA
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Purata menunggu: {scopedLeaderboards.topSla[0].avgWaitMinutes} minit
                  </span>
                </div>
              )}
            </div>

            {/* Top Volume */}
            <div
              onClick={() =>
                scopedLeaderboards?.topVolume[0] &&
                setDrilldownBranch({
                  id: scopedLeaderboards.topVolume[0].idCawangan,
                  name: scopedLeaderboards.topVolume[0].namaCawangan,
                })
              }
              className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between pb-3 border-b border-blue-200/60">
                <span className="text-xs font-extrabold uppercase text-blue-800">
                  🚀 Paling Produktif / Volum {lockedStateCode ? `(${activeStateName})` : ""}
                </span>
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg group-hover:bg-blue-200">
                  Lihat Kaunter ➔
                </span>
              </div>
              {scopedLeaderboards?.topVolume[0] && (
                <div className="mt-3">
                  <h4 className="text-base font-black text-slate-900 truncate group-hover:text-blue-950">
                    {scopedLeaderboards.topVolume[0].namaCawangan}
                  </h4>
                  <p className="text-xs text-slate-500">{scopedLeaderboards.topVolume[0].negeri}</p>
                  <p className="text-3xl font-black text-blue-900 mt-2">
                    {scopedLeaderboards.topVolume[0].served.toLocaleString()} Selesai
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Kuota digunakan: {scopedLeaderboards.topVolume[0].utilizationRate}%
                  </span>
                </div>
              )}
            </div>

            {/* Highest Waiting */}
            <div
              onClick={() =>
                scopedLeaderboards?.topBusy[0] &&
                setDrilldownBranch({
                  id: scopedLeaderboards.topBusy[0].idCawangan,
                  name: scopedLeaderboards.topBusy[0].namaCawangan,
                })
              }
              className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                <span className="text-xs font-extrabold uppercase text-amber-800">
                  ⏳ Permintaan Ruang Legar {lockedStateCode ? `(${activeStateName})` : "Tertinggi"}
                </span>
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg group-hover:bg-amber-200">
                  Lihat Kaunter ➔
                </span>
              </div>
              {scopedLeaderboards?.topBusy[0] && (
                <div className="mt-3">
                  <h4 className="text-base font-black text-slate-900 truncate group-hover:text-amber-950">
                    {scopedLeaderboards.topBusy[0].namaCawangan}
                  </h4>
                  <p className="text-xs text-slate-500">{scopedLeaderboards.topBusy[0].negeri}</p>
                  <p className="text-3xl font-black text-amber-700 mt-2">
                    {scopedLeaderboards.topBusy[0].waiting} Menunggu
                  </p>
                  <span className="text-[11px] text-slate-500">
                    {scopedLeaderboards.topBusy[0].serving} kaunter melayan aktif
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Search & State Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lockedStateCode ? `Cari cawangan di ${activeStateName}...` : "Cari cawangan atau negeri..."}
                className="text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
              />
              {!lockedStateCode && (
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">Semua Negeri</option>
                  <option value="01">Johor</option>
                  <option value="02">Kedah</option>
                  <option value="03">Kelantan</option>
                  <option value="04">Melaka</option>
                  <option value="05">Negeri Sembilan</option>
                  <option value="06">Pahang</option>
                  <option value="07">Pulau Pinang</option>
                  <option value="08">Perak</option>
                  <option value="09">Perlis</option>
                  <option value="10">Selangor</option>
                  <option value="11">Terengganu</option>
                  <option value="12">Sabah</option>
                  <option value="13">Sarawak</option>
                  <option value="14">WP Kuala Lumpur</option>
                  <option value="15">WP Labuan</option>
                  <option value="16">WP Putrajaya</option>
                </select>
              )}
              {lockedStateCode && (
                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
                  🏛️ {activeStateName}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
              <span>💡 Klik pada kepala lajur untuk susun (Sort):</span>
              <span className="font-bold text-blue-900 font-mono bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {sortField.toUpperCase()} ({sortDirection === "asc" ? "A-Z / Naik" : "Z-A / Turun"})
              </span>
            </div>
          </div>

          {/* Interactive Sortable Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black select-none">
                  <tr>
                    <th className="p-3.5 text-center w-12">#</th>

                    {/* Sortable Column: Nama Cawangan */}
                    <th
                      onClick={() => handleSort("name")}
                      className="p-3.5 text-left cursor-pointer hover:bg-slate-100/80 transition"
                      title="Klik untuk susun mengikut Nama Cawangan"
                    >
                      <div className="flex items-center gap-1">
                        <span>Nama Cawangan</span>
                        {renderSortIndicator("name")}
                      </div>
                    </th>

                    {/* Sortable Column: Negeri */}
                    <th
                      onClick={() => handleSort("negeri")}
                      className="p-3.5 text-left cursor-pointer hover:bg-slate-100/80 transition"
                      title="Klik untuk susun mengikut Negeri"
                    >
                      <div className="flex items-center gap-1">
                        <span>Negeri</span>
                        {renderSortIndicator("negeri")}
                      </div>
                    </th>

                    {/* Sortable Column: Penggunaan Kuota */}
                    <th
                      onClick={() => handleSort("quota")}
                      className="p-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition"
                      title="Klik untuk susun mengikut % Penggunaan Kuota"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Penggunaan Kuota</span>
                        {renderSortIndicator("quota")}
                      </div>
                    </th>

                    {/* Sortable Column: Menunggu */}
                    <th
                      onClick={() => handleSort("waiting")}
                      className="p-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition"
                      title="Klik untuk susun mengikut Bilangan Menunggu"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Menunggu</span>
                        {renderSortIndicator("waiting")}
                      </div>
                    </th>

                    {/* Sortable Column: Selesai */}
                    <th
                      onClick={() => handleSort("volume")}
                      className="p-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition"
                      title="Klik untuk susun mengikut Jumlah Selesai"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Selesai</span>
                        {renderSortIndicator("volume")}
                      </div>
                    </th>

                    {/* Sortable Column: Pematuhan SLA */}
                    <th
                      onClick={() => handleSort("sla")}
                      className="p-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition"
                      title="Klik untuk susun mengikut Kadar SLA Piagam"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Pematuhan SLA</span>
                        {renderSortIndicator("sla")}
                      </div>
                    </th>

                    {/* Sortable Column: Purata Masa */}
                    <th
                      onClick={() => handleSort("avg_wait")}
                      className="p-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition"
                      title="Klik untuk susun mengikut Purata Masa Menunggu"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Purata Masa</span>
                        {renderSortIndicator("avg_wait")}
                      </div>
                    </th>

                    {/* Sortable Column: Status */}
                    <th
                      onClick={() => handleSort("status")}
                      className="p-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition"
                      title="Klik untuk susun mengikut Status Kapasiti"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        {renderSortIndicator("status")}
                      </div>
                    </th>

                    <th className="p-3.5 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Memuatkan papan kedudukan cawangan...
                      </td>
                    </tr>
                  ) : filteredBranches.length > 0 ? (
                    filteredBranches.map((b, idx) => (
                      <tr key={b.idCawangan} className="hover:bg-blue-50/40 transition group">
                        <td className="p-3.5 text-center font-bold text-slate-700">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() =>
                              setDrilldownBranch({
                                id: b.idCawangan,
                                name: b.namaCawangan,
                              })
                            }
                            className="text-left group-hover:text-blue-900 transition cursor-pointer"
                          >
                            <strong className="font-bold text-slate-900 block group-hover:underline">
                              {b.namaCawangan}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {b.idCawangan}
                            </span>
                          </button>
                        </td>
                        <td className="p-3.5 text-slate-600 font-medium">{b.negeri || "-"}</td>
                        <td className="p-3.5 text-center">
                          <div className="w-28 mx-auto">
                            <div className="flex justify-between text-[10px] font-mono font-bold mb-0.5">
                              <span>{b.issued}/{b.quota}</span>
                              <span>{b.utilizationRate}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  b.utilizationRate >= 95
                                    ? "bg-rose-600"
                                    : b.utilizationRate >= 80
                                    ? "bg-orange-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${b.utilizationRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-black font-mono text-blue-900">
                          {b.waiting}
                        </td>
                        <td className="p-3.5 text-center font-bold font-mono text-slate-800">
                          {b.served}
                        </td>
                        <td className="p-3.5 text-center font-black font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-md ${
                              b.slaRate >= 90
                                ? "bg-emerald-100 text-emerald-800"
                                : b.slaRate >= 75
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {b.slaRate}%
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-700">
                          {b.avgWaitMinutes} min
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              b.capacityStatus === "critical"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : b.capacityStatus === "high"
                                ? "bg-orange-100 text-orange-800 border-orange-300"
                                : b.capacityStatus === "moderate"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {b.capacityStatus === "critical"
                              ? "Kritikal"
                              : b.capacityStatus === "high"
                              ? "Tinggi"
                              : b.capacityStatus === "moderate"
                              ? "Normal"
                              : "Lapang"}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setDrilldownBranch({
                                id: b.idCawangan,
                                name: b.namaCawangan,
                              })
                            }
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg font-bold text-[11px] transition cursor-pointer shadow-2xs whitespace-nowrap flex items-center gap-1 mx-auto"
                            title="Buka Pusat Kawalan Kaunter Langsung Cawangan ini"
                          >
                            <span>🖥️</span> Kaunter
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Tiada cawangan sepadan dengan carian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Pusat Amaran Anomali & Kesesakan */}
      {activeSubTab === "anomalies" && (
        <div className="space-y-4 animate-in fade-in">
          {scopedAnomalies && scopedAnomalies.length > 0 ? (
            scopedAnomalies.map((a) => (
              <div
                key={a.id}
                className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
                  a.level === "critical"
                    ? "bg-rose-50/80 border-rose-300 text-rose-950"
                    : "bg-amber-50/80 border-amber-300 text-amber-950"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl mt-0.5">
                    {a.level === "critical" ? "🚨" : "⚠️"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-black uppercase">
                        {a.branchName} ({a.state})
                      </strong>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          a.level === "critical"
                            ? "bg-rose-600 text-white"
                            : "bg-amber-600 text-white"
                        }`}
                      >
                        {a.level === "critical" ? "Kritikal" : "Amaran"}
                      </span>
                    </div>
                    <h5 className="font-extrabold text-xs mt-1 text-slate-900">{a.title}</h5>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{a.message}</p>
                    <p className="text-xs font-bold text-blue-900 mt-1.5 flex items-center gap-1.5">
                      <span>💡 <strong>Tindakan Disyorkan {lockedStateCode ? "Pengarah Negeri" : "HQ"}:</strong></span> {a.recommendation}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start md:self-auto shrink-0">
                  <span className="font-mono text-sm font-black px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 shadow-2xs">
                    {a.metric}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDrilldownBranch({
                        id: a.branchId,
                        name: a.branchName,
                      })
                    }
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <span>🖥️</span> Periksa Kaunter
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center space-y-2">
              <span className="text-4xl block">✓</span>
              <strong className="text-base font-black text-emerald-900 block">
                {lockedStateCode ? `Tiada Anomali Dikesan di Cawangan Negeri ${activeStateName}` : "Tiada Anomali Dikesan di Mana-Mana Cawangan"}
              </strong>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                Semua cawangan beroperasi dalam had kapasiti terkawal dan pematuhan SLA Piagam adalah memuaskan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Unjuran Waktu Puncak (AI Analytics) */}
      {activeSubTab === "forecast" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Unjuran Taburan Waktu Puncak Harian (Berasaskan Data Tren)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis corak kesesakan waktu operasi untuk perancangan pembukaan kaunter yang optimum.
            </p>
          </div>

          {/* Hourly Traffic Bar Chart Visualizer */}
          <div className="space-y-3">
            {data?.hourlyTraffic.map((item) => (
              <div key={item.hour} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800">{item.hour} &bull; {item.label}</span>
                  <span className="font-mono text-blue-900">{item.volumeRatio}% Volum</span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-lg transition-all duration-500 ${
                      item.volumeRatio >= 30
                        ? "bg-rose-600"
                        : item.volumeRatio >= 20
                        ? "bg-amber-500"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${item.volumeRatio * 2.8}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1.5">
            <strong className="font-black block text-sm">💡 Cadangan Perjawatan &amp; Kaunter Minimum:</strong>
            <p>
              1. **Waktu Puncak Tertinggi (10:00 pagi – 12:00 tgh)**: Cawangan disyorkan membuka sekurang-kurangnya <strong>85% kaunter</strong> bagi mengelakkan masa menunggu melepasi 30 minit.
            </p>
            <p>
              2. **Waktu Giliran Rehat (12:00 tgh – 2:00 ptg)**: Sila pastikan staf kaunter bergilir-gilir secara berfasa tanpa menutup kaunter sepenuhnya.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: Pelarasan Kuota Pukal (Bulk Override) */}
      {activeSubTab === "bulk_quota" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl mx-auto space-y-6 animate-in fade-in">
          <div>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Kawalan Had Kuota {lockedStateCode ? `Negeri ${activeStateName}` : "Pukal"}
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              {lockedStateCode ? `Pelarasan Kuota Cawangan Negeri ${activeStateName}` : "Pelarasan Kuota Tiket Cawangan Berkelompok"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lockedStateCode
                ? `Tingkatkan had kuota harian bagi semua cawangan di ${activeStateName} secara serentak.`
                : "Tingkatkan had kuota harian secara pukal bagi menampung lonjakan permohonan semasa musim puncak / cuti perayaan."}
            </p>
          </div>

          {bulkSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <span>✓</span> {bulkSuccessMsg}
            </div>
          )}

          <form onSubmit={handleBulkQuotaSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Wilayah / Negeri Sasaran:
              </label>
              {lockedStateCode ? (
                <div className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>🏛️ {activeStateName}</span>
                  <span className="text-[10px] text-slate-500 uppercase bg-white px-2 py-0.5 rounded border">Terkunci (Level 7)</span>
                </div>
              ) : (
                <select
                  value={bulkState}
                  onChange={(e) => setBulkState(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                >
                  <option value="all">Seluruh Malaysia (Semua Cawangan)</option>
                  <option value="01">Johor</option>
                  <option value="02">Kedah</option>
                  <option value="03">Kelantan</option>
                  <option value="04">Melaka</option>
                  <option value="05">Negeri Sembilan</option>
                  <option value="06">Pahang</option>
                  <option value="07">Pulau Pinang</option>
                  <option value="08">Perak</option>
                  <option value="09">Perlis</option>
                  <option value="10">Selangor</option>
                  <option value="11">Terengganu</option>
                  <option value="12">Sabah</option>
                  <option value="13">Sarawak</option>
                  <option value="14">WP Kuala Lumpur</option>
                  <option value="15">WP Labuan</option>
                  <option value="16">WP Putrajaya</option>
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Kadar Kenaikan Kuota:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["10", "20", "30", "50"].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setBulkPercentage(pct)}
                    className={`py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                      bulkPercentage === pct
                        ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={bulkSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {bulkSubmitting ? "Memproses Pelarasan..." : "⚡ Laksanakan Pelarasan Kuota Pukal"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Live Counter Drilldown Modal */}
      {drilldownBranch && (
        <BranchCounterDrilldownModal
          idCawangan={drilldownBranch.id}
          namaCawangan={drilldownBranch.name}
          onClose={() => setDrilldownBranch(null)}
        />
      )}
    </div>
  );
}
