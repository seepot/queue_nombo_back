"use client";

import { useState } from "react";
import Link from "next/link";

interface BranchCardData {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  manager: { name: string; username: string } | null;
  totalToday: number;
  waiting: number;
  serving: number;
  completed: number;
  activeCounters: number;
  totalCounters: number;
  totalDevices: number;
  avgWaitMinutes: number;
  congestionStatus: "SMOOTH" | "MODERATE" | "CONGESTED";
  csatRating: number;
  categories: Array<{ id: string; name: string; prefixCode: string; estimatedMinutes: number }>;
  counters: Array<{ id: string; counterNo: string; name: string | null; zone: string | null; status: string }>;
}

interface ConsolidatedMetrics {
  totalTicketsToday: number;
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  totalActiveCounters: number;
  totalCounters: number;
  totalDevices: number;
  totalBranches: number;
  avgWaitMinutes: number;
}

interface HourlyItem {
  hour: string;
  tickets: number;
  isPeak: boolean;
}

interface LatestTicketItem {
  id: string;
  ticketNo: string;
  status: string;
  counterNo: string | null;
  customerName: string | null;
  createdAt: string;
  category?: { name: string } | null;
  branch?: { id: string; name: string; code: string } | null;
}

interface DashboardClientProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    planType: string;
  };
  isTenantAdmin: boolean;
  userRole: string;
  userBranchId: string | null;
  branches: BranchCardData[];
  consolidatedMetrics: ConsolidatedMetrics;
  hourlyTraffic: HourlyItem[];
  latestTickets: LatestTicketItem[];
}

export default function DashboardClient({
  tenant,
  isTenantAdmin,
  branches,
  consolidatedMetrics,
  hourlyTraffic,
  latestTickets,
}: DashboardClientProps) {
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [searchTicketQuery, setSearchTicketQuery] = useState("");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  // Tentukan metrik paparan mengikut penapis cawangan
  const activeBranch = branches.find((b) => b.id === selectedBranchFilter) || null;

  const currentMetrics = activeBranch
    ? {
        totalTicketsToday: activeBranch.totalToday,
        totalWaiting: activeBranch.waiting,
        totalServing: activeBranch.serving,
        totalCompleted: activeBranch.completed,
        totalActiveCounters: activeBranch.activeCounters,
        totalCounters: activeBranch.totalCounters,
        totalDevices: activeBranch.totalDevices,
        totalBranches: 1,
        avgWaitMinutes: activeBranch.avgWaitMinutes,
      }
    : consolidatedMetrics;

  const filteredTickets = latestTickets.filter((t) => {
    if (selectedBranchFilter !== "ALL" && t.branch?.id !== selectedBranchFilter) {
      return false;
    }
    if (searchTicketQuery.trim()) {
      const q = searchTicketQuery.toLowerCase();
      return (
        t.ticketNo.toLowerCase().includes(q) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.category && t.category.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSendTvBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSending(true);
    setBroadcastStatus(null);

    try {
      const res = await fetch("/api/superadmin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "DASHBOARD",
          title: "Pengumuman HQ",
          message: broadcastMessage.trim(),
          priority: "HIGH",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBroadcastStatus("Hebahan berjaya dihantar ke seluruh peranti skrin!");
        setBroadcastMessage("");
        setTimeout(() => {
          setShowBroadcastModal(false);
          setBroadcastStatus(null);
        }, 1800);
      } else {
        setBroadcastStatus(data.message || "Gagal menghantar hebahan.");
      }
    } catch {
      setBroadcastStatus("Ralat sambungan.");
    } finally {
      setBroadcastSending(false);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-12 select-none">
      {/* 1. EXECUTIVE COCKPIT HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-xs font-black rounded-full uppercase tracking-wider">
              {tenant.name}
            </span>
            <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-md font-mono">
              Pelan {tenant.planType}
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black rounded-md flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Operations
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isTenantAdmin ? "Pusat Kawalan Operasi Cawangan (HQ)" : "Dashboard Operasi Cawangan"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {isTenantAdmin
              ? `Pemantauan masa nyata merentas ${branches.length} cawangan fizikal, pengagihan beban staf, dan pematuhan SLA.`
              : "Pemantauan aliran giliran dan prestasi kaunter hari ini."}
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isTenantAdmin && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <span>📢</span>
              <span>Hebahan Skrin TV</span>
            </button>
          )}

          <Link
            href="/terminal"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <span>🖥️</span>
            <span>Terminal Kaunter</span>
          </Link>

          <Link
            href={`/kiosk/${tenant.slug}`}
            target="_blank"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <span>📱</span>
            <span>Kiosk Lobi</span>
          </Link>
        </div>
      </div>

      {/* 2. GLOBAL MULTI-BRANCH FILTER STRIP (EXCLUSIVE FOR TENANT ADMIN) */}
      {isTenantAdmin && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Skop Paparan:</span>
            <button
              onClick={() => setSelectedBranchFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedBranchFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>🌟</span>
              <span>Semua Cawangan ({branches.length})</span>
            </button>

            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchFilter(b.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedBranchFilter === b.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span className="font-mono text-[10px] opacity-75">[{b.code}]</span>
                <span>{b.name}</span>
                {b.congestionStatus === "CONGESTED" && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
              </button>
            ))}
          </div>

          <Link
            href="/cawangan"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline px-3 py-1 shrink-0"
          >
            ⚙️ Urus Tetapan Cawangan ➔
          </Link>
        </div>
      )}

      {/* 3. EXECUTIVE REAL-TIME PULSE METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Tickets */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jumlah Pelanggan Hari Ini</p>
            <span className="text-lg">👥</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
              {currentMetrics.totalTicketsToday}
            </span>
            <span className="text-xs text-slate-500 font-medium">Tiket Terjana</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <span>↑ 14%</span>
            <span className="text-slate-400 font-normal">berbanding purata semalam</span>
          </p>
        </div>

        {/* Card 2: Waiting Live */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sedang Menunggu</p>
            <span className="text-lg">⏳</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-blue-600 font-mono">
              {currentMetrics.totalWaiting}
            </span>
            <span className="text-xs text-slate-500 font-medium">Orang Beratur</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Purata Masa Menunggu: <strong className="text-slate-900">{currentMetrics.avgWaitMinutes} min</strong>
          </p>
        </div>

        {/* Card 3: Serving & Completed */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selesai Berurusan</p>
            <span className="text-lg">✅</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">
              {currentMetrics.totalCompleted}
            </span>
            <span className="text-xs text-slate-500 font-medium">Pelanggan Selesai</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Sedang Dilayan: <strong className="text-amber-600">{currentMetrics.totalServing} orang</strong>
          </p>
        </div>

        {/* Card 4: Counters & Fleet Health */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kaunter &amp; Peranti Aktif</p>
            <span className="text-lg">🏢</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-purple-600 font-mono">
              {currentMetrics.totalActiveCounters} / {currentMetrics.totalCounters}
            </span>
            <span className="text-xs text-slate-500 font-medium">Kaunter Buka</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Peranti Skrin TV: <strong className="text-slate-900">{currentMetrics.totalDevices} Unit Terpaut</strong>
          </p>
        </div>
      </div>

      {/* 4. MULTI-BRANCH CONGESTION RADAR & LIVE LEADERBOARD (FOR TENANT ADMIN) */}
      {isTenantAdmin && selectedBranchFilter === "ALL" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Radar Kesesakan &amp; Prestasi Cawangan Masa Nyata</h2>
              <p className="text-xs text-slate-500">Gambaran langsung status operasi dan pematuhan SLA di setiap premis cawangan fizikal.</p>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {branches.length} Cawangan Beroperasi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition p-6 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Branch Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                          {b.code}
                        </span>
                        <h3 className="text-base font-black text-slate-900">{b.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{b.address || "Tiada alamat berdaftar"}</p>
                    </div>

                    {/* Congestion Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                        b.congestionStatus === "CONGESTED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : b.congestionStatus === "MODERATE"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          b.congestionStatus === "CONGESTED"
                            ? "bg-rose-500 animate-ping"
                            : b.congestionStatus === "MODERATE"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      {b.congestionStatus === "CONGESTED"
                        ? "Sesak"
                        : b.congestionStatus === "MODERATE"
                        ? "Sederhana"
                        : "Lancar"}
                    </span>
                  </div>

                  {/* Branch Manager Pill */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">👔</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ketua Cawangan</p>
                        <p className="font-bold text-slate-900 truncate">
                          {b.manager ? b.manager.name : <span className="text-amber-600">Belum Dilantik</span>}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      ⭐ CSAT: {b.csatRating}/5
                    </span>
                  </div>

                  {/* Live Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Menunggu</p>
                      <p className="text-lg font-black text-blue-600 font-mono mt-0.5">{b.waiting}</p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Kaunter Buka</p>
                      <p className="text-lg font-black text-purple-600 font-mono mt-0.5">
                        {b.activeCounters}/{b.totalCounters}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Purata Masa</p>
                      <p className="text-lg font-black text-emerald-600 font-mono mt-0.5">{b.avgWaitMinutes}m</p>
                    </div>
                  </div>
                </div>

                {/* Branch Quick Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => setSelectedBranchFilter(b.id)}
                    className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <span>👁️ Pantau Khusus</span>
                  </button>

                  <Link
                    href="/cawangan"
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center gap-1"
                  >
                    <span>⚙️ Tetapan Penuh</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. AI OPTIMA ADVISOR & PEAK HOURS DISTRIBUTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel A: AI Optima Workload Advisor */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-indigo-900/50 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-cyan-300 border border-indigo-400/30 text-xs font-black rounded-full uppercase tracking-wider">
                🤖 AI Optima Engine
              </span>
              <span className="text-xs text-indigo-300 font-bold">Analisis Pintar</span>
            </div>

            <h3 className="text-lg font-black text-white">Cadangan Agihan Beban Staf HQ</h3>

            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
              <p className="font-bold text-white flex items-center gap-2">
                <span>💡</span>
                <span>Ramalan Lonjakan Trafik Petang</span>
              </p>
              <p>
                Berdasarkan corak 30 hari lepas, cawangan dijangka mengalami lonjakan <strong>+35% pelanggan</strong> pada jam <strong>2:00 PM - 3:30 PM</strong>.
              </p>
              <p className="text-[11px] text-cyan-300 font-medium">
                👉 Cadangan: Buka sekurang-kurangnya 2 kaunter tambahan di setiap cawangan bagi mengekalkan masa menunggu di bawah 8 minit.
              </p>
            </div>
          </div>

          <Link
            href="/ai-optima"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl text-center shadow-md transition"
          >
            Buka Panel AI Optima Penuh ➔
          </Link>
        </div>

        {/* Panel B: Peak Hours Heatmap / Bar Chart */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Taburan Waktu Puncak Pelanggan Hari Ini</h3>
              <p className="text-xs text-slate-500">Corak ketibaan pelanggan jam demi jam (08:00 - 17:00).</p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 px-2.5 py-1 bg-indigo-50 rounded-lg">
              Puncak: 10:00 AM &amp; 2:00 PM
            </span>
          </div>

          <div className="pt-4 flex items-end justify-between gap-2 h-44">
            {hourlyTraffic.map((item, idx) => {
              const maxTickets = Math.max(...hourlyTraffic.map((h) => h.tickets), 10);
              const heightPercent = Math.max(15, Math.round((item.tickets / maxTickets) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                    {item.tickets}
                  </span>
                  <div
                    className={`w-full rounded-xl transition-all duration-300 ${
                      item.isPeak
                        ? "bg-gradient-to-t from-indigo-600 to-cyan-400 shadow-md group-hover:from-indigo-700 group-hover:to-cyan-500"
                        : "bg-slate-200 group-hover:bg-slate-300"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[10px] font-mono text-slate-400 font-bold truncate">
                    {item.hour.slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. LATEST TICKETS LIVE FEED TABLE */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">Aliran Tiket Terkini Organisasi</h3>
            <p className="text-xs text-slate-500">Senarai tiket yang dijana di semua kaunter secara langsung.</p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Cari no. tiket / nama / urusan..."
              value={searchTicketQuery}
              onChange={(e) => setSearchTicketQuery(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-gray-50 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200 uppercase">
              <tr>
                <th className="px-4 py-3">No. Tiket</th>
                <th className="px-4 py-3">Cawangan</th>
                <th className="px-4 py-3">Kategori Servis</th>
                <th className="px-4 py-3">Kaunter</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Masa Jana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Tiada tiket ditemui bagi kriteria ini.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-black text-blue-700 text-sm">{t.ticketNo}</td>
                    <td className="px-4 py-3">
                      {t.branch ? (
                        <span className="font-bold text-slate-900">
                          {t.branch.name}{" "}
                          <span className="text-[10px] font-mono text-slate-400 font-normal">[{t.branch.code}]</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{t.category?.name || "Urusan Am"}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {t.counterNo ? `Kaunter ${t.counterNo}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.customerName || "Pelanggan Tanpa Nama"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          t.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : t.status === "SERVING" || t.status === "CALLING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: HQ TV SCREEN BROADCAST */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in zoom-in-95 font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="text-xs font-mono font-bold text-indigo-600">Hab Hebahan HQ</p>
                <h3 className="text-base font-black text-gray-900 mt-0.5">Hebahan Teks ke Skrin TV Semua Cawangan</h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendTvBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Mesej Hebahan / Pengumuman Penting
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Cth: Perhatian kepada semua pelanggan, waktu operasi kaunter hari ini dilanjutkan sehingga jam 6.00 petang."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-medium"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Mesej ini akan dipaparkan serta-merta sebagai teks bergerak (*ticker*) di TV lobi semua cawangan.
                </p>
              </div>

              {broadcastStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl">
                  {broadcastStatus}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={broadcastSending || !broadcastMessage.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {broadcastSending ? "Menyiarkan..." : "📢 Siarkan Sekarang ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
