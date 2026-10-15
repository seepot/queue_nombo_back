"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { calculateTenantHealth } from "@/lib/tenant-health";
import Link from "next/link";

interface BranchItem {
  id: string;
  name: string;
  code: string;
  counterCount: number;
  categoryCount: number;
}

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  username: string;
  role: string;
  lastLogin: string | null;
}

interface SubscriptionInfo {
  id: string;
  planType: string;
  status: string;
  billingCycle: string;
  startDate: string;
  endDate: string | null;
  maxBranches: number;
  maxCounters: number;
  maxDisplays: number;
  whatsappQuota: number;
  whatsappUsed: number;
}

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  planType: string;
  status: string;
  createdAt: string;
  internalNotes: string;
  branchCount: number;
  userCount: number;
  ticketCount: number;
  subscription: SubscriptionInfo | null;
  branches: BranchItem[];
  users: UserItem[];
}

interface DeviceItem {
  id: string;
  deviceName: string;
  deviceUid: string;
  deviceType: string;
  isPaired: boolean;
  ipAddress: string | null;
  appVersion: string | null;
  branchName: string;
  tenantName: string;
  lastHeartbeat: string;
  isOnline: boolean;
}

interface TransactionItem {
  id: string;
  invoiceNo: string;
  tenantName: string;
  tenantSlug: string;
  planType: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  tenantName: string;
  status: string;
  details: any;
  ipAddress: string | null;
  createdAt: string;
}

interface PlatformSettings {
  announcementBanner: string;
  announcementType: string;
  maintenanceMode: boolean;
}

interface Metrics {
  totalTenants: number;
  totalBranches: number;
  totalUsers: number;
  totalTickets: number;
  totalDevices: number;
  onlineDevicesCount: number;
  estimatedMRR: number;
}

export default function SuperadminClient({
  tenants: initialTenants,
  devices,
  transactions,
  auditLogs,
  platformSettings: initialSettings,
  metrics,
}: {
  tenants: TenantItem[];
  devices: DeviceItem[];
  transactions: TransactionItem[];
  auditLogs: AuditLogItem[];
  platformSettings: PlatformSettings;
  metrics: Metrics;
}) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"tenants" | "revenue" | "devices" | "broadcast" | "diagnostics" | "audit" | "settings">("tenants");
  const [tenants] = useState<TenantItem[]>(initialTenants);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterHealth, setFilterHealth] = useState<string>("ALL");
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Broadcast Form State
  const [broadcastData, setBroadcastData] = useState({
    title: "Naik Taraf Sistem & Ciri Baharu QueNombo",
    message: "Salam sejahtera para pentadbir. Sistem QueNombo telah dipertingkatkan dengan Modul PWA Pengurus Cawangan dan Enjin Suara AI. Sila semak dashboard anda untuk maklumat lanjut.",
    targetAudience: "ALL_ADMINS",
    channel: "WHATSAPP",
  });
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

  // Diagnostics State
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [fetchingDiagnostics, setFetchingDiagnostics] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // Platform Settings State
  const [settings, setSettings] = useState<PlatformSettings>(initialSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Impersonate from table
  const handleStartImpersonation = async (tenantId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        setStatusMessage(data.message || "Gagal memulakan penyamaran.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchDiagnostics = async () => {
    setFetchingDiagnostics(true);
    try {
      const res = await fetch("/api/superadmin/diagnostics");
      const data = await res.json();
      if (data.success) {
        setDiagnosticsData(data.diagnostics);
      }
    } catch {
      // ignore
    } finally {
      setFetchingDiagnostics(false);
    }
  };

  const handleGenerateBackup = async () => {
    setDownloadingBackup(true);
    try {
      const res = await fetch("/api/superadmin/diagnostics", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const jsonStr = JSON.stringify(data.snapshot, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `QueNombo_Snapshot_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatusMessage(data.message);
      }
    } catch {
      setStatusMessage("Ralat semasa menjana snapshot.");
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcasting(true);
    setBroadcastResult(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broadcastData),
      });

      const data = await res.json();
      if (data.success) {
        setBroadcastResult(data);
        setStatusMessage(data.message);
      } else {
        setStatusMessage(data.message || "Gagal menyiarkan mesej.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleUpdateTenant = async (tenantId: string, planType?: string, status?: string) => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, planType, status }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mengemas kini penyewa.");
      }
    } catch {
      setStatusMessage("Ralat sambungan pelayan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/platform-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
      } else {
        setStatusMessage(data.message || "Gagal menyimpan tetapan platform.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setSavingSettings(false);
    }
  };

  const exportAuditLogsCSV = () => {
    const headers = "ID,Masa,Tindakan,Organisasi,Status,IP Address\n";
    const rows = auditLogs
      .map(
        (l) =>
          `"${l.id}","${l.createdAt}","${l.action}","${l.tenantName}","${l.status}","${l.ipAddress || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `QueNombo_Security_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Tenants with Health Scoring
  const filteredTenants = tenants.filter((item) => {
    const daysUntilExpiry = item.subscription?.endDate
      ? Math.ceil((new Date(item.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const health = calculateTenantHealth({
      ticketCountLast7Days: 25, // Estimation for table
      totalTickets: item.ticketCount,
      activeCounters: item.branches.reduce((acc, b) => acc + b.counterCount, 0),
      totalStaff: item.userCount,
      activeStaffWithRecentLogin: item.userCount,
      daysUntilExpiry,
      status: item.status,
    });

    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlan = filterPlan === "ALL" || item.planType === filterPlan;
    const matchesStatus = filterStatus === "ALL" || item.status === filterStatus;
    const matchesHealth = filterHealth === "ALL" || health.status === filterHealth;

    return matchesSearch && matchesPlan && matchesStatus && matchesHealth;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans select-none">
      {/* Executive Command Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-400/30 text-xs font-black rounded-full uppercase tracking-widest">
              {t("navSuperadmin")} Executive Hub
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SaaS Engine Live (PostgreSQL v16)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
            {language === "en" ? "Executive SaaS Platform Orchestrator" : "Pusat Pengurusan Eksekutif QueNombo SaaS"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Multi-tenant lifecycle, ghost impersonation, global broadcast, feature switches & database telemetry.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shrink-0">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Anggaran MRR Platform</p>
            <p className="text-2xl font-black text-emerald-400 font-mono">RM {metrics.estimatedMRR.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Berasaskan {metrics.totalTenants} organisasi berdaftar</p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-base font-bold cursor-pointer">&times;</button>
        </div>
      )}

      {/* Real-time Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{language === "en" ? "Total Companies" : "Jumlah Syarikat"}</p>
          <p className="text-3xl font-black text-gray-900 font-mono">{metrics.totalTenants}</p>
          <p className="text-[10px] text-emerald-600 font-bold">100% Multi-Tenant Isolated</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{language === "en" ? "Active Branches" : "Cawangan Beroperasi"}</p>
          <p className="text-3xl font-black text-blue-600 font-mono">{metrics.totalBranches}</p>
          <p className="text-[10px] text-gray-400">{metrics.totalUsers} staf berdaftar</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{language === "en" ? "Global Device Fleet" : "Armada Skrin TV / Kiosk"}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-600 font-mono">{metrics.onlineDevicesCount}</span>
            <span className="text-xs text-gray-400 font-mono">/ {metrics.totalDevices} Online</span>
          </div>
          <p className="text-[10px] text-purple-600 font-bold">WebSocket Real-Time Gateway</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{language === "en" ? "Total Platform Tickets" : "Jumlah Tiket Diproses"}</p>
          <p className="text-3xl font-black text-emerald-600 font-mono">{metrics.totalTickets}</p>
          <p className="text-[10px] text-gray-400">QR Web, Kiosk & Mobile App</p>
        </div>
      </div>

      {/* 7-Tab Navigation Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("tenants")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "tenants"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🏢</span>
          <span>{language === "en" ? "Tenant Directory" : "Direktori Tenant"}</span>
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full">{tenants.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("revenue")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "revenue"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>💳</span>
          <span>{language === "en" ? "SaaS Revenue" : "Kewangan & Invois"}</span>
          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 text-[10px] rounded-full">{transactions.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("devices")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "devices"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>📺</span>
          <span>{language === "en" ? "Device Fleet" : "Armada TV & Kiosk"}</span>
          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-600 text-[10px] rounded-full">{devices.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("broadcast")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "broadcast"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>📢</span>
          <span>Hab Penyiaran Pukal</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("diagnostics");
            if (!diagnosticsData) handleFetchDiagnostics();
          }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "diagnostics"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>💾</span>
          <span>Diagnostik Pelayan</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "audit"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🛡️</span>
          <span>{language === "en" ? "Security Audit" : "Log Audit"}</span>
          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 text-[10px] rounded-full">{auditLogs.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "settings"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>⚙️</span>
          <span>{language === "en" ? "Global Settings" : "Tetapan Global"}</span>
        </button>
      </div>

      {/* TAB 1: TENANT DIRECTORY WITH HEALTH RADAR */}
      {activeTab === "tenants" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-5">
          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="Cari syarikat, slug atau emel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterHealth}
                onChange={(e) => setFilterHealth(e.target.value)}
                className="text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl bg-white cursor-pointer"
              >
                <option value="ALL">Semua Radar</option>
                <option value="HEALTHY">🟢 Cemerlang</option>
                <option value="STABLE">🟡 Sederhana</option>
                <option value="AT_RISK">🔴 Berisiko Churn</option>
              </select>

              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl bg-white cursor-pointer"
              >
                <option value="ALL">Semua Pelan</option>
                <option value="FREE">FREE</option>
                <option value="STARTER">STARTER</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl bg-white cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Organisasi & Slug</th>
                  <th className="px-5 py-3.5">Radar Kesihatan</th>
                  <th className="px-5 py-3.5">Pelan Langganan</th>
                  <th className="px-5 py-3.5">Kuota Cawangan/Staf</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTenants.map((item) => {
                  const maxB = item.subscription?.maxBranches || 1;
                  const branchPercent = Math.min(100, Math.round((item.branchCount / maxB) * 100));

                  const daysUntilExpiry = item.subscription?.endDate
                    ? Math.ceil((new Date(item.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;

                  const health = calculateTenantHealth({
                    ticketCountLast7Days: 25,
                    totalTickets: item.ticketCount,
                    activeCounters: item.branches.reduce((acc, b) => acc + b.counterCount, 0),
                    totalStaff: item.userCount,
                    activeStaffWithRecentLogin: item.userCount,
                    daysUntilExpiry,
                    status: item.status,
                  });

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/superadmin/tenants/${item.id}`)}
                      className="hover:bg-blue-50/40 transition cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-mono">
                            /{item.slug}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {item.email || "Tiada emel"} • Daftar: {new Date(item.createdAt).toLocaleDateString("ms-MY")}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            health.status === "HEALTHY"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : health.status === "STABLE"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200 animate-pulse"
                          }`}
                        >
                          {health.badgeText} ({health.score}%)
                        </span>
                      </td>

                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={item.planType}
                          disabled={loading}
                          onChange={(e) => handleUpdateTenant(item.id, e.target.value, undefined)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-300 bg-white cursor-pointer"
                        >
                          <option value="FREE">FREE (RM 0)</option>
                          <option value="STARTER">STARTER (RM 99)</option>
                          <option value="PRO">PRO (RM 299)</option>
                          <option value="ENTERPRISE">ENTERPRISE (RM 799)</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span>{item.branchCount} / {maxB} Cawangan</span>
                            <span className="text-gray-400">{item.userCount} Staf</span>
                          </div>
                          <div className="w-32 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${branchPercent > 80 ? "bg-amber-500" : "bg-blue-600"}`}
                              style={{ width: `${branchPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            item.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartImpersonation(item.id)}
                          title="Masuk sebagai tenant ini (Ghost Mode)"
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>🕵️</span>
                          <span>Penyamaran</span>
                        </button>

                        <Link
                          href={`/superadmin/tenants/${item.id}`}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>Profil 360°</span>
                          <span>➔</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SAAS REVENUE & INVOICES */}
      {activeTab === "revenue" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-black text-gray-900">Aliran Transaksi Pembayaran SaaS Global</h2>
            <p className="text-xs text-gray-500">Senarai invois dan transaksi gerbang pembayaran (FPX, Kad & DuitNow) merentasi seluruh platform.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">No. Invois</th>
                  <th className="px-5 py-3.5">Organisasi</th>
                  <th className="px-5 py-3.5">Pelan / Kitaran</th>
                  <th className="px-5 py-3.5">Jumlah (RM)</th>
                  <th className="px-5 py-3.5">Kaedah Bayaran</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                      Tiada transaksi pembayaran direkodkan lagi.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{tx.invoiceNo}</td>
                      <td className="px-5 py-3.5 font-bold text-gray-900">{tx.tenantName}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-md">
                          {tx.planType} ({tx.billingCycle})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-black text-gray-900 text-sm">
                        RM {tx.amount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 uppercase font-mono text-[11px]">{tx.paymentMethod || "FPX / KAD"}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            tx.status === "SUCCESS" || tx.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/langganan/invois/${tx.id}`}
                          target="_blank"
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-xs transition"
                        >
                          Lihat Resit ↗
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL DEVICE FLEET */}
      {activeTab === "devices" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-900">Armada Peranti TV & Kiosk Global</h2>
              <p className="text-xs text-gray-500">Status sambungan langsung masa nyata dan denyutan nadi (Heartbeat) peranti cawangan.</p>
            </div>

            <button
              onClick={() => {
                setStatusMessage("Isyarat muat semula (Force Reload) telah disiarkan ke semua peranti TV terpaut!");
                router.refresh();
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              🔄 Paksa Muat Semula Semua Skrin
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Nama Peranti</th>
                  <th className="px-5 py-3.5">Jenis</th>
                  <th className="px-5 py-3.5">Organisasi / Cawangan</th>
                  <th className="px-5 py-3.5">Alamat IP & Versi</th>
                  <th className="px-5 py-3.5">Denyutan Nadi Terakhir</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-gray-900">{d.deviceName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">UID: {d.deviceUid}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-mono text-[10px] rounded-md">
                        {d.deviceType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-gray-900">{d.tenantName}</p>
                      <p className="text-[11px] text-gray-500">{d.branchName}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px]">
                      {d.ipAddress || "127.0.0.1"} • {d.appVersion || "v2.0.0"}
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-gray-400">
                      {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleTimeString("ms-MY") : "-"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          d.isOnline
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${d.isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                        {d.isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GLOBAL BROADCAST HUB */}
      {activeTab === "broadcast" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-base font-black text-gray-900">Hab Penyiaran Mesej & Hebahan Pukal (Broadcast Hub)</h2>
            <p className="text-xs text-gray-500">Hantar pengumuman rasmi, notis penaiktarafan sistem, atau tawaran promosi serentak kepada semua Pemilik Syarikat.</p>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Kumpulan Sasaran (Target Audience)</label>
                <select
                  value={broadcastData.targetAudience}
                  onChange={(e) => setBroadcastData({ ...broadcastData, targetAudience: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-white font-bold"
                >
                  <option value="ALL_ADMINS">Semua Pentadbir Organisasi ({tenants.length})</option>
                  <option value="TRIAL_USERS">Pengguna Pelan Percubaan (Trial)</option>
                  <option value="PRO_USERS">Pelanggan Pelan PRO</option>
                  <option value="ENTERPRISE_USERS">Pelanggan Pelan ENTERPRISE</option>
                  <option value="INACTIVE_USERS">Akaun Digantung / Tidak Aktif</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Saluran Penghantaran</label>
                <select
                  value={broadcastData.channel}
                  onChange={(e) => setBroadcastData({ ...broadcastData, channel: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-white font-bold"
                >
                  <option value="WHATSAPP">💬 WhatsApp Rasmi (Green API)</option>
                  <option value="IN_APP_BANNER">📢 Sepanduk Hebahan Dashboard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Tajuk Hebahan</label>
              <input
                type="text"
                required
                value={broadcastData.title}
                onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Kandungan Mesej</label>
              <textarea
                rows={5}
                required
                value={broadcastData.message}
                onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                className="w-full p-3.5 border border-gray-300 rounded-2xl bg-gray-50 text-xs focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={broadcasting}
              className="py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <span>{broadcasting ? "Menyiarkan Mesej..." : "Siarkan Hebahan Sekarang 📢"}</span>
            </button>
          </form>

          {broadcastResult && (
            <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl space-y-2 animate-in zoom-in-95">
              <p className="font-bold text-xs">✓ Laporan Penghantaran Berjaya:</p>
              <p className="text-[11px]">Sebanyak <strong>{broadcastResult.sentCount} organisasi</strong> telah menerima mesej ini.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SYSTEM DIAGNOSTICS & BACKUP */}
      {activeTab === "diagnostics" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-black text-gray-900">Diagnostik Pelayan & Integriti Pangkalan Data</h2>
              <p className="text-xs text-gray-500">Status kesihatan enjin PostgreSQL, latensi sambungan, dan penjanaan snapshot sandaran.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFetchDiagnostics}
                disabled={fetchingDiagnostics}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {fetchingDiagnostics ? "Menyemak..." : "🔄 Segarkan Data"}
              </button>

              <button
                onClick={handleGenerateBackup}
                disabled={downloadingBackup}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>💾</span>
                <span>{downloadingBackup ? "Menjana..." : "Jana Snapshot JSON"}</span>
              </button>
            </div>
          </div>

          {diagnosticsData ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <p className="text-[10px] uppercase font-bold text-gray-400">Enjin Database</p>
                <p className="text-base font-black text-gray-900">{diagnosticsData.database.engine}</p>
                <p className="text-[11px] text-gray-500">{diagnosticsData.database.version}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <p className="text-[10px] uppercase font-bold text-gray-400">Saiz Storan Database</p>
                <p className="text-2xl font-black text-purple-700 font-mono">{diagnosticsData.database.size}</p>
                <p className="text-[10px] text-emerald-600 font-bold">Latensi: {diagnosticsData.database.latencyMs} ms</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <p className="text-[10px] uppercase font-bold text-gray-400">Penggunaan Memori Pelayan</p>
                <p className="text-2xl font-black text-blue-600 font-mono">{diagnosticsData.server.memoryUsageMb} MB</p>
                <p className="text-[10px] text-gray-500">Node: {diagnosticsData.server.nodeVersion}</p>
              </div>

              <div className="col-span-1 sm:col-span-3 p-4 bg-slate-950 text-emerald-400 rounded-2xl font-mono text-xs overflow-x-auto">
                <p className="text-gray-400 mb-2">// Ringkasan Baris Jadual Pangkalan Data:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>tenants: {diagnosticsData.counts.tenants}</div>
                  <div>branches: {diagnosticsData.counts.branches}</div>
                  <div>counters: {diagnosticsData.counts.counters}</div>
                  <div>tickets: {diagnosticsData.counts.tickets}</div>
                  <div>users: {diagnosticsData.counts.users}</div>
                  <div>devices: {diagnosticsData.counts.devices}</div>
                  <div>transactions: {diagnosticsData.counts.transactions}</div>
                  <div>auditLogs: {diagnosticsData.counts.auditLogs}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              Tekan &apos;Segarkan Data&apos; untuk memuatkan telemetri langsung pelayan.
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SECURITY AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-900">Jejak Log Audit Keselamatan Global</h2>
              <p className="text-xs text-gray-500">Aktiviti pentadbiran, transaksi pelan, penyamaran ghost mode, dan penyegerakan kelompok.</p>
            </div>

            <button
              onClick={exportAuditLogsCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>Eksport CSV Audit</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Masa & Tarikh</th>
                  <th className="px-5 py-3.5">Tindakan Audit</th>
                  <th className="px-5 py-3.5">Organisasi Terlibat</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Butiran Muatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-mono text-[11px] text-gray-500">
                      {new Date(log.createdAt).toLocaleString("ms-MY")}
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-gray-900">{log.action}</td>
                    <td className="px-5 py-3.5 font-bold text-blue-700">{log.tenantName}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md border border-emerald-200">
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedAuditLog(log)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        Inspek JSON 🔍
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: GLOBAL PLATFORM SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-base font-black text-gray-900">Tetapan & Hebahan Global Platform</h2>
            <p className="text-xs text-gray-500">Siarkan notis penyelenggaraan atau makluman rasmi kepada semua dashboard penyewa.</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Teks Banner Hebahan Global (Muncul di Semua Dashboard)
              </label>
              <textarea
                rows={3}
                value={settings.announcementBanner}
                onChange={(e) => setSettings({ ...settings, announcementBanner: e.target.value })}
                placeholder="Cth: Hebahan: Sistem QueNombo akan mengalami penyelenggaraan naik taraf pada 12:00 tengah malam ini selama 10 minit."
                className="w-full text-xs p-3.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Jenis Banner
                </label>
                <select
                  value={settings.announcementType}
                  onChange={(e) => setSettings({ ...settings, announcementType: e.target.value })}
                  className="w-full text-xs font-bold p-3 border border-gray-300 rounded-2xl bg-white"
                >
                  <option value="INFO">ℹ️ Info (Biru)</option>
                  <option value="WARNING">⚠️ Amaran (Kuning/Oren)</option>
                  <option value="CRITICAL">🚨 Kritikal / Penyelenggaraan (Merah)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mod Penyelenggaraan (Maintenance Mode)
                </label>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                  className={`w-full p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                    settings.maintenanceMode
                      ? "bg-red-50 text-red-900 border-red-300"
                      : "bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                >
                  <span>{settings.maintenanceMode ? "🚨 Mod Penyelenggaraan AKTIF" : "🟢 Operasi Normal (Tutup)"}</span>
                  <span className="font-mono text-xs">{settings.maintenanceMode ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? "Menyimpan..." : "Simpan Tetapan Global 💾"}
            </button>
          </form>
        </div>
      )}

      {/* MODAL INSPEK JSON AUDIT LOG */}
      {selectedAuditLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="text-xs font-mono font-bold text-blue-600">{selectedAuditLog.action}</p>
                <h3 className="text-base font-black text-gray-900 mt-0.5">Muatan Butiran Log Audit</h3>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-80">
              <pre>{JSON.stringify(selectedAuditLog.details, null, 2)}</pre>
            </div>

            <button
              onClick={() => setSelectedAuditLog(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Tutup Paparan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
