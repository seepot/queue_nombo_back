"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

interface CounterInfo {
  id: string;
  counterNo: string;
  name: string;
  status: string;
  staffName: string | null;
}

interface BranchInfo {
  id: string;
  name: string;
  code: string;
  tenantName: string;
  runningText: string;
  kioskPaused: boolean;
  counters: CounterInfo[];
}

interface ManagerMetrics {
  waitingCount: number;
  servingCount: number;
  completedCount: number;
  csatScore: string;
  totalFeedbacks: number;
  kioskPaused: boolean;
  runningText: string;
}

export default function ManagerMobileClient({
  branches,
  initialActiveBranchId,
  initialMetrics,
}: {
  branches: BranchInfo[];
  initialActiveBranchId: string;
  initialMetrics: ManagerMetrics;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const [selectedBranchId, setSelectedBranchId] = useState(initialActiveBranchId);
  const [metrics, setMetrics] = useState<ManagerMetrics>(initialMetrics);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState(initialMetrics.runningText);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const handleToggleCounter = async (counterId: string, currentStatus: string) => {
    const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
    setLoadingAction(`counter_${counterId}`);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/manager/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_COUNTER",
          branchId: activeBranch.id,
          counterId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mengubah status kaunter.");
      }
    } catch {
      setStatusMessage("Ralat rangkaian.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleKiosk = async () => {
    const newPaused = !metrics.kioskPaused;
    setLoadingAction("kiosk");
    setStatusMessage(null);

    try {
      const res = await fetch("/api/manager/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_KIOSK_PAUSE",
          branchId: activeBranch.id,
          kioskPaused: newPaused,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMetrics((prev) => ({ ...prev, kioskPaused: newPaused }));
        setStatusMessage(data.message);
      } else {
        setStatusMessage(data.message || "Gagal mengemas kini status kiosk.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBroadcastTv = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("broadcast");
    setStatusMessage(null);

    try {
      const res = await fetch("/api/manager/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BROADCAST_TV_MESSAGE",
          branchId: activeBranch.id,
          runningText: broadcastText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        setIsTvModalOpen(false);
      } else {
        setStatusMessage(data.message || "Gagal menyiarkan mesej.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoadingAction(null);
    }
  };

  const openCountersCount = activeBranch.counters.filter((c) => c.status === "OPEN").length;
  const isSurgeWarning = metrics.waitingCount > 8;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 font-sans select-none">
      {/* Top Mobile Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] font-black rounded-full uppercase tracking-wider">
              PWA Mobile Command
            </span>
            <span className="text-xs text-slate-400 font-mono">v2.0 Standalone</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            {language === "en" ? "Manager Mobile Command Center" : "Pusat Kawalan Pengurus Cawangan"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeBranch.tenantName} • [{activeBranch.code}]
          </p>
        </div>

        {branches.length > 1 && (
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl focus:ring-2 focus:ring-blue-500 self-start sm:self-auto cursor-pointer"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-sm font-bold cursor-pointer">&times;</button>
        </div>
      )}

      {/* Critical Surge Banner */}
      {isSurgeWarning && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl flex items-center gap-3 text-amber-950 animate-pulse">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide">
              {language === "en" ? "Queue Surge Alert (High Waiting Volume)" : "Amaran Lonjakan Giliran (Volum Menunggu Tinggi)"}
            </p>
            <p className="text-[11px] opacity-90">
              {language === "en"
                ? `${metrics.waitingCount} customers waiting. Consider opening additional counters.`
                : `${metrics.waitingCount} pelanggan sedang menunggu. Sila buka kaunter tambahan untuk mempercepatkan layanan.`}
            </p>
          </div>
        </div>
      )}

      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Waiting */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{language === "en" ? "Waiting" : "Menunggu"}</p>
          <p className="text-3xl sm:text-4xl font-black text-amber-600 font-mono">{metrics.waitingCount}</p>
          <p className="text-[10px] text-gray-400">{language === "en" ? "in lobby queue" : "dalam lobi"}</p>
        </div>

        {/* Serving */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{language === "en" ? "Serving" : "Dilayan"}</p>
          <p className="text-3xl sm:text-4xl font-black text-blue-600 font-mono">{metrics.servingCount}</p>
          <p className="text-[10px] text-gray-400">{language === "en" ? "at counters" : "di kaunter"}</p>
        </div>

        {/* Completed */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{language === "en" ? "Completed" : "Selesai"}</p>
          <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">{metrics.completedCount}</p>
          <p className="text-[10px] text-gray-400">{language === "en" ? "today" : "hari ini"}</p>
        </div>

        {/* CSAT Score */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">CSAT Rating</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black text-purple-600 font-mono">{metrics.csatScore}</span>
            <span className="text-xs font-bold text-amber-500">★</span>
          </div>
          <p className="text-[10px] text-gray-400">{metrics.totalFeedbacks} {language === "en" ? "reviews" : "ulasan"}</p>
        </div>
      </div>

      {/* Emergency Quick Control Pills */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-gray-900">
          {language === "en" ? "Premise Remote Controls" : "Kawalan Pantas Premis"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Broadcast to TV */}
          <button
            onClick={() => setIsTvModalOpen(true)}
            className="p-3.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-2xl transition flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📢</span>
              <div>
                <p className="text-xs font-bold text-gray-900">{language === "en" ? "Broadcast TV Notice" : "Siaran Teks Skrin TV"}</p>
                <p className="text-[11px] text-gray-500">{language === "en" ? "Update ticker text live" : "Kemas kini teks hebahan lobi"}</p>
              </div>
            </div>
            <span className="text-blue-600 font-bold text-xs">Urus ➔</span>
          </button>

          {/* Pause Kiosk Intake */}
          <button
            onClick={handleToggleKiosk}
            disabled={loadingAction === "kiosk"}
            className={`p-3.5 border rounded-2xl transition flex items-center justify-between text-left cursor-pointer ${
              metrics.kioskPaused
                ? "bg-red-50 border-red-300 text-red-900"
                : "bg-gray-50 hover:bg-amber-50 border-gray-200 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{metrics.kioskPaused ? "🛑" : "⏸️"}</span>
              <div>
                <p className="text-xs font-bold text-gray-900">
                  {metrics.kioskPaused
                    ? (language === "en" ? "Kiosk Paused (Click to Resume)" : "Kiosk Dihenti (Klik Sambung)")
                    : (language === "en" ? "Emergency Pause Kiosk" : "Henti Sementara Kiosk")}
                </p>
                <p className="text-[11px] text-gray-500">
                  {metrics.kioskPaused
                    ? (language === "en" ? "Ticket intake stopped" : "Pengambilan tiket dihentikan")
                    : (language === "en" ? "Halt ticket intake" : "Hentikan tiket jika lobi sesak")}
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold ${metrics.kioskPaused ? "text-red-700" : "text-amber-700"}`}>
              {loadingAction === "kiosk" ? "..." : metrics.kioskPaused ? "Sambung ➔" : "Jeda ➔"}
            </span>
          </button>
        </div>
      </div>

      {/* Staff Counters Remote Management */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{language === "en" ? "Physical Counters Status" : "Status Kaunter Fizikal"}</h2>
            <p className="text-xs text-gray-500">
              {openCountersCount} / {activeBranch.counters.length} {language === "en" ? "counters active" : "kaunter beroperasi"}
            </p>
          </div>

          <Link
            href="/terminal"
            target="_blank"
            className="text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            {language === "en" ? "Open Terminal ↗" : "Buka Terminal ↗"}
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {activeBranch.counters.map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition">
              <div className="flex items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs font-mono ${
                    c.status === "OPEN"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  #{c.counterNo}
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-900">{c.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {c.staffName ? `Staf: ${c.staffName}` : (language === "en" ? "No staff assigned" : "Tiada staf ditetapkan")}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggleCounter(c.id, c.status)}
                disabled={loadingAction === `counter_${c.id}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  c.status === "OPEN"
                    ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                {loadingAction === `counter_${c.id}`
                  ? "..."
                  : c.status === "OPEN"
                  ? (language === "en" ? "Close Counter" : "Tutup Kaunter")
                  : (language === "en" ? "Open Counter" : "Buka Kaunter")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast TV Modal */}
      {isTvModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 font-sans">
            <h3 className="text-base font-black text-gray-900">{language === "en" ? "Broadcast TV Notice" : "Siarkan Mesej ke Skrin TV Lobi"}</h3>
            <p className="text-xs text-gray-500">
              {language === "en"
                ? "This text will immediately appear on the bottom running banner of all lobby TV screens."
                : "Teks ini akan tertera secara langsung pada bahagian bawah paparan skrin TV cawangan."}
            </p>

            <form onSubmit={handleBroadcastTv} className="space-y-4">
              <textarea
                required
                rows={3}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Cth: Perhatian: Kaunter 3 ditutup sementara untuk rehat. Kaunter 1 & 2 beroperasi seperti biasa."
                className="w-full text-xs p-3.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTvModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === "broadcast"}
                  className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === "broadcast" ? "Menyiarkan..." : "Siarkan Sekarang 📢"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
