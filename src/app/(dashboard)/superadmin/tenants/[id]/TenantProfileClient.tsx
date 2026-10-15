"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { calculateTenantHealth } from "@/lib/tenant-health";
import Link from "next/link";

interface CounterItem {
  id: string;
  counterNo: string;
  name: string;
  status: string;
  staffName: string | null;
}

interface CategoryItem {
  id: string;
  name: string;
  prefixCode: string;
}

interface DeviceItem {
  id: string;
  deviceName: string;
  deviceType: string;
  isPaired: boolean;
}

interface BranchItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  counters: CounterItem[];
  categories: CategoryItem[];
  devices: DeviceItem[];
}

interface UserItem {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  branchName: string | null;
  assignedCounters: string[];
  lastLogin: string | null;
  createdAt: string;
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

interface TransactionItem {
  id: string;
  invoiceNo: string;
  amount: number;
  currency: string;
  planType: string;
  billingCycle: string;
  paymentMethod: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  status: string;
  details: any;
  createdAt: string;
}

interface FeatureFlags {
  enableAiOptima: boolean;
  enableVoiceAnnouncer: boolean;
  enableOfflineEdge: boolean;
  enableExternalApi: boolean;
  enablePwaManager: boolean;
}

interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  planType: string;
  status: string;
  createdAt: string;
  internalNotes: string;
  ticketCount: number;
  ticketCountLast7Days: number;
  daysUntilExpiry: number | null;
  activeStaffWithRecentLogin: number;
  featureFlags: FeatureFlags;
  subscription: SubscriptionInfo | null;
  branches: BranchItem[];
  users: UserItem[];
  transactions: TransactionItem[];
  auditLogs: AuditLogItem[];
}

export default function TenantProfileClient({ tenant }: { tenant: TenantDetails }) {
  const router = useRouter();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "flags" | "quotas" | "security" | "billing" | "crm">("overview");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Health Score Calculation
  const health = calculateTenantHealth({
    ticketCountLast7Days: tenant.ticketCountLast7Days,
    totalTickets: tenant.ticketCount,
    activeCounters: tenant.branches.reduce((acc, b) => acc + b.counters.length, 0),
    totalStaff: tenant.users.length,
    activeStaffWithRecentLogin: tenant.activeStaffWithRecentLogin,
    daysUntilExpiry: tenant.daysUntilExpiry,
    status: tenant.status,
  });

  // Feature Flags State
  const [flags, setFlags] = useState<FeatureFlags>(tenant.featureFlags);

  // User Filter & Management State
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserItem | null>(null);
  const [staffCustomPass, setStaffCustomPass] = useState("");
  const [staffTempPass, setStaffTempPass] = useState<string | null>(null);
  const [copiedStaffPass, setCopiedStaffPass] = useState(false);

  // Quotas Form State
  const [quotas, setQuotas] = useState({
    maxBranches: tenant.subscription?.maxBranches || 1,
    maxCounters: tenant.subscription?.maxCounters || 2,
    maxDisplays: tenant.subscription?.maxDisplays || 1,
    whatsappQuota: tenant.subscription?.whatsappQuota || 200,
  });

  // Admin Password Reset State
  const [customPassword, setCustomPassword] = useState("");
  const [generatedTempPass, setGeneratedTempPass] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Manual Payment Form State
  const [manualPay, setManualPay] = useState({
    amount: tenant.planType === "ENTERPRISE" ? "7188.00" : tenant.planType === "PRO" ? "2388.00" : "948.00",
    planType: tenant.planType,
    billingCycle: "YEARLY",
    paymentMethod: "BANK_TRANSFER",
    referenceNo: `REF-${Date.now().toString().slice(-6)}`,
  });

  // CRM Notes State
  const [crmNotes, setCrmNotes] = useState(tenant.internalNotes || "");

  // 1. GHOST IMPERSONATION TRIGGER
  const handleStartImpersonation = async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id }),
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        setStatusMessage(data.message || "Gagal mengaktifkan penyamaran.");
      }
    } catch {
      setStatusMessage("Ralat sambungan pelayan.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatusOrPlan = async (planType?: string, status?: string) => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, planType, status }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mengemas kini maklumat.");
      }
    } catch {
      setStatusMessage("Ralat sambungan pelayan.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendTrial = async (days: number) => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EXTEND_TRIAL", tenantId: tenant.id, extraDays: days }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal melanjutkan tempoh percubaan.");
      }
    } catch {
      setStatusMessage("Ralat sambungan pelayan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeatureFlags = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_FEATURE_FLAGS",
          tenantId: tenant.id,
          featureFlags: flags,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mengemas kini suis ciri.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_QUOTAS",
          tenantId: tenant.id,
          quotas,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mengemas kini kuota.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setStatusMessage(null);
    setGeneratedTempPass(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_ADMIN_PASSWORD",
          tenantId: tenant.id,
          newPassword: customPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedTempPass(data.generatedPassword);
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal menetapkan semula kata laluan.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetStaffPassword = async () => {
    if (!selectedUserForReset) return;
    setLoading(true);
    setStatusMessage(null);
    setStaffTempPass(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_USER_PASSWORD",
          tenantId: tenant.id,
          userId: selectedUserForReset.id,
          newPassword: staffCustomPass.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStaffTempPass(data.generatedPassword);
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal menetapkan semula kata laluan staf.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userItem: UserItem) => {
    setLoading(true);
    setStatusMessage(null);
    const newStatus = userItem.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_USER_STATUS",
          tenantId: tenant.id,
          userId: userItem.id,
          userStatus: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal menukar status pengguna.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_MANUAL_PAYMENT",
          tenantId: tenant.id,
          manualPayment: manualPay,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal merekodkan bayaran manual.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCrmNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_CRM_NOTES",
          tenantId: tenant.id,
          crmNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal menyimpan nota CRM.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const maxB = tenant.subscription?.maxBranches || 1;
  const branchPercent = Math.min(100, Math.round((tenant.branches.length / maxB) * 100));

  const endDate = tenant.subscription?.endDate ? new Date(tenant.subscription.endDate) : null;
  let daysRemaining: number | null = null;
  let isExpired = false;

  if (endDate) {
    const diffTime = endDate.getTime() - Date.now();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining <= 0;
  }

  // Filtered Users
  const filteredUsers = tenant.users.filter((u) => {
    const matchSearch =
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.phone && u.phone.includes(userSearch));

    const matchRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
    const matchStatus = userStatusFilter === "ALL" || u.status === userStatusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans select-none">
      {/* Breadcrumbs & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
          <Link href="/superadmin" className="hover:text-blue-600 transition">
            Pusat SuperAdmin
          </Link>
          <span>/</span>
          <span>Direktori Tenant</span>
          <span>/</span>
          <span className="text-gray-900">{tenant.name}</span>
        </div>

        <Link
          href="/superadmin"
          className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl shadow-2xs transition self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Kembali ke Pusat SuperAdmin</span>
        </Link>
      </div>

      {statusMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-base font-bold cursor-pointer">&times;</button>
        </div>
      )}

      {/* Tenant Hero Profile Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-400/30 text-xs font-black rounded-full uppercase tracking-wider">
              Pelan {tenant.planType} ({tenant.subscription?.billingCycle || "MONTHLY"})
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                tenant.status === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/30"
                  : "bg-red-500/20 text-red-400 border border-red-400/30"
              }`}
            >
              Status: {tenant.status}
            </span>

            {/* Health Radar Score Pill */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                health.status === "HEALTHY"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  : health.status === "STABLE"
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                  : "bg-red-500/30 text-red-300 border-red-500 animate-pulse"
              }`}
            >
              <span>{health.badgeText} ({health.score}%)</span>
            </span>

            {/* Plan Expiry Pill */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                !endDate
                  ? "bg-purple-500/20 text-purple-300 border-purple-400/30"
                  : isExpired
                  ? "bg-red-500/30 text-red-300 border-red-500"
                  : daysRemaining !== null && daysRemaining <= 7
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                  : "bg-blue-500/20 text-blue-300 border-blue-400/30"
              }`}
            >
              <span>⏳</span>
              <span>
                {endDate
                  ? isExpired
                    ? `Tamat: ${endDate.toLocaleDateString("ms-MY")}`
                    : `Tamat: ${endDate.toLocaleDateString("ms-MY")} (${daysRemaining} hari)`
                  : "Tanpa Had"}
              </span>
            </span>

            <span className="text-xs font-mono text-slate-400">/{tenant.slug}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{tenant.name}</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {tenant.email || "Tiada emel"} • {tenant.phone || "Tiada tel"} • Mendaftar: {new Date(tenant.createdAt).toLocaleDateString("ms-MY")}
          </p>
        </div>

        {/* Quick Actions Strip in Hero */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
          {/* GHOST IMPERSONATE BUTTON */}
          <button
            onClick={handleStartImpersonation}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 animate-pulse"
          >
            <span>🕵️</span>
            <span>Masuk Sebagai Tenant</span>
          </button>

          <button
            onClick={() => handleExtendTrial(14)}
            disabled={loading}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            +14 Hari ⏳
          </button>

          <button
            onClick={() => handleUpdateStatusOrPlan(undefined, tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
            disabled={loading}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 ${
              tenant.status === "ACTIVE"
                ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
            }`}
          >
            {tenant.status === "ACTIVE" ? "Gantung 🛑" : "Aktifkan 🟢"}
          </button>

          <Link
            href={`/kiosk/${tenant.slug}`}
            target="_blank"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1"
          >
            <span>Kiosk Awam</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* Telemetry Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Radar Kesihatan</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono">{health.score}%</span>
            <span className="text-xs font-bold text-emerald-600">{health.status}</span>
          </div>
          <p className="text-[10px] text-gray-400">{tenant.ticketCountLast7Days} tiket dlm 7 hari</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cawangan</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono">{tenant.branches.length}</span>
            <span className="text-xs text-gray-400 font-mono">/ {maxB}</span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${branchPercent}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Akaun Staf</p>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">{tenant.users.length}</p>
          <p className="text-[10px] text-gray-400">{tenant.users.filter((u) => u.role === "TENANT_ADMIN").length} Pentadbir</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Jumlah Tiket</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{tenant.ticketCount.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-bold">Trafik Premis</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mesej WhatsApp</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">{tenant.subscription?.whatsappUsed || 0}</span>
            <span className="text-xs text-gray-400 font-mono">/ {tenant.subscription?.whatsappQuota || 0}</span>
          </div>
          <p className="text-[10px] text-gray-400">Bulan Ini</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "overview" ? "bg-slate-900 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🏢</span>
          <span>Cawangan ({tenant.branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "users" ? "bg-slate-900 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>👥</span>
          <span>Staf Berdaftar ({tenant.users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("flags")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "flags" ? "bg-slate-900 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🎛️</span>
          <span>Suis Ciri & Modul</span>
        </button>

        <button
          onClick={() => setActiveTab("quotas")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "quotas" ? "bg-slate-900 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>⚡</span>
          <span>Kawalan Kuota Dinamik</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "security" ? "bg-slate-900 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>🔑</span>
          <span>Reset Kata Laluan Pentadbir</span>
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "billing" ? "bg-slate-900 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>💳</span>
          <span>Kewangan & Invois ({tenant.transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("crm")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "crm" ? "bg-slate-900 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <span>📝</span>
          <span>Nota CRM Dalaman</span>
        </button>
      </div>

      {/* TAB 1: BRANCHES OVERVIEW */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-black text-gray-900">Senarai Cawangan Beroperasi ({tenant.branches.length})</h2>
              <p className="text-xs text-gray-500">Struktur cawangan fizikal, susunan kaunter servis, kategori tiket dan peranti TV lobi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenant.branches.map((b) => (
              <div key={b.id} className="p-5 bg-gray-50/80 border border-gray-200 rounded-3xl space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 text-base">{b.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold">
                        {b.code}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{b.address || "Tiada alamat"} • {b.phone || "Tiada tel"}</p>
                  </div>
                  <Link
                    href={`/qrcode/print/${b.id}`}
                    target="_blank"
                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl transition shadow-2xs"
                  >
                    Poster A4 ↗
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-gray-200 text-center text-xs">
                  <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Kaunter Fizikal</p>
                    <p className="text-lg font-black text-gray-900 mt-0.5">{b.counters.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Kategori Servis</p>
                    <p className="text-lg font-black text-blue-600 mt-0.5">{b.categories.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Peranti TV</p>
                    <p className="text-lg font-black text-purple-600 mt-0.5">{b.devices.length}</p>
                  </div>
                </div>

                {b.counters.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-gray-200">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Senarai Kaunter & Staf:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {b.counters.map((c) => (
                        <span key={c.id} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-mono">
                          <strong>K{c.counterNo}:</strong> {c.staffName ? c.staffName : <span className="text-gray-400">Kosong</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED USERS DIRECTORY */}
      {activeTab === "users" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-black text-gray-900">Senarai Pengguna & Staf Berdaftar ({tenant.users.length})</h2>
              <p className="text-xs text-gray-500">Pengurusan akaun staf, peranan sistem, cawangan bertugas, status keaktifan dan penetapan semula kata laluan.</p>
            </div>
          </div>

          {/* User Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Cari nama staf, @username, emel atau telefon..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl bg-white cursor-pointer"
              >
                <option value="ALL">Semua Peranan</option>
                <option value="TENANT_ADMIN">Pentadbir Syarikat</option>
                <option value="BRANCH_MANAGER">Pengurus Cawangan</option>
                <option value="COUNTER_STAFF">Staf Kaunter</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl bg-white cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Nama & Pengguna</th>
                  <th className="px-5 py-3.5">Peranan Sistem</th>
                  <th className="px-5 py-3.5">Cawangan / Kaunter</th>
                  <th className="px-5 py-3.5">Emel & Telefon</th>
                  <th className="px-5 py-3.5">Status Akaun</th>
                  <th className="px-5 py-3.5">Log Masuk Terakhir</th>
                  <th className="px-5 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                      Tiada pengguna ditemui sepadan dengan carian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-blue-50/30 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {(u.name || u.username)[0]}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{u.name || u.username}</p>
                            <p className="text-[11px] font-mono text-gray-400">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            u.role === "TENANT_ADMIN"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : u.role === "BRANCH_MANAGER"
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-bold text-gray-900">{u.branchName || "Semua Cawangan"}</p>
                        {u.assignedCounters.length > 0 && (
                          <p className="text-[10px] text-gray-400 font-mono">{u.assignedCounters.join(", ")}</p>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="text-gray-900 font-mono">{u.email || "-"}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{u.phone || "-"}</p>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-[11px] text-gray-500">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString("ms-MY") : "Belum pernah"}
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setStaffCustomPass("");
                            setStaffTempPass(null);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg transition cursor-pointer"
                        >
                          🔑 Reset Kata Laluan
                        </button>

                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          disabled={loading}
                          className={`px-2.5 py-1 font-bold text-xs rounded-lg transition cursor-pointer ${
                            u.status === "ACTIVE"
                              ? "bg-red-50 hover:bg-red-100 text-red-700"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {u.status === "ACTIVE" ? "Gantung" : "Aktifkan"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FEATURE FLAGS & MODULE SWITCHES */}
      {activeTab === "flags" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-base font-black text-gray-900">Pengurus Suis Modul & Ciri Platform (Feature Flags)</h2>
            <p className="text-xs text-gray-500">Kawal akses ciri khas secara tersuai bagi organisasi ini secara dinamik.</p>
          </div>

          <form onSubmit={handleSaveFeatureFlags} className="space-y-4">
            <div className="space-y-3">
              {/* Flag 1: AI Optima */}
              <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <h3 className="text-xs font-black text-gray-900">Enjin Ramalan Giliran AI Optima</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Analitik ramalan masa menunggu dan cadangan pembukaan kaunter automatik.</p>
                </div>
                <input
                  type="checkbox"
                  checked={flags.enableAiOptima}
                  onChange={(e) => setFlags({ ...flags, enableAiOptima: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Flag 2: Voice Announcer */}
              <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎙️</span>
                    <h3 className="text-xs font-black text-gray-900">Enjin Panggilan Suara AI Dwi-Bahasa</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Sintesis audio D5-A5 dan sebutan nombor tiket dwibahasa (BM/ENG).</p>
                </div>
                <input
                  type="checkbox"
                  checked={flags.enableVoiceAnnouncer}
                  onChange={(e) => setFlags({ ...flags, enableVoiceAnnouncer: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Flag 3: Offline Edge */}
              <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <h3 className="text-xs font-black text-gray-900">Mod Ketahanan Luar Talian (Edge Local Cache)</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Penyegerakan kelompok automatik bila sambungan internet pulih.</p>
                </div>
                <input
                  type="checkbox"
                  checked={flags.enableOfflineEdge}
                  onChange={(e) => setFlags({ ...flags, enableOfflineEdge: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Flag 4: PWA Manager */}
              <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">📱</span>
                    <h3 className="text-xs font-black text-gray-900">Pusat Kawalan Mudah Alih Pengurus (PWA)</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Akses pengurusan cawangan mudah alih berasaskan Web Standalone App.</p>
                </div>
                <input
                  type="checkbox"
                  checked={flags.enablePwaManager}
                  onChange={(e) => setFlags({ ...flags, enablePwaManager: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Flag 5: External API */}
              <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔌</span>
                    <h3 className="text-xs font-black text-gray-900">Integrasi API Luar & Webhook</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Kebenaran integrasi API dengan sistem pihak ketiga / ERP pelanggan.</p>
                </div>
                <input
                  type="checkbox"
                  checked={flags.enableExternalApi}
                  onChange={(e) => setFlags({ ...flags, enableExternalApi: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Suis Ciri 💾"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: DYNAMIC QUOTAS */}
      {activeTab === "quotas" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-purple-50 border border-purple-200 rounded-2xl">
            <div>
              <p className="text-[11px] font-bold uppercase text-purple-700 tracking-wider">Tarikh Tamat Langganan Semasa</p>
              <p className="text-base font-black text-purple-950 font-mono mt-0.5">
                {endDate ? `${endDate.toLocaleDateString("ms-MY")} (${isExpired ? "Tamat Tempoh" : `Baki ${daysRemaining} hari`})` : "Tanpa Had Tarikh"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExtendTrial(14)}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
              >
                +14 Hari
              </button>
              <button
                type="button"
                onClick={() => handleExtendTrial(30)}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
              >
                +30 Hari
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-base font-black text-gray-900">Penyesuaian Kuota Sumber Dinamik (Custom Overrides)</h2>
            <p className="text-xs text-gray-500">Tetapkan kuota khas bagi organisasi ini tanpa mengubah pelan langganan asas.</p>
          </div>

          <form onSubmit={handleSaveQuotas} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Maksimum Cawangan</label>
                <input
                  type="number"
                  min="1"
                  value={quotas.maxBranches}
                  onChange={(e) => setQuotas({ ...quotas, maxBranches: parseInt(e.target.value) || 1 })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Maksimum Kaunter</label>
                <input
                  type="number"
                  min="1"
                  value={quotas.maxCounters}
                  onChange={(e) => setQuotas({ ...quotas, maxCounters: parseInt(e.target.value) || 1 })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Maksimum Skrin TV Lobi</label>
                <input
                  type="number"
                  min="1"
                  value={quotas.maxDisplays}
                  onChange={(e) => setQuotas({ ...quotas, maxDisplays: parseInt(e.target.value) || 1 })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Kuota WhatsApp (Mesej / Bulan)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quotas.whatsappQuota}
                  onChange={(e) => setQuotas({ ...quotas, whatsappQuota: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono font-bold text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Kuota Dinamik 💾"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: ADMIN SECURITY & PASSWORD RESET */}
      {activeTab === "security" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-black text-gray-900">Pusat Keselamatan & Reset Kata Laluan Pentadbir Syarikat</h2>
            <p className="text-xs text-gray-500">Jana kata laluan sementara baharu bagi pemilik syarikat (TENANT_ADMIN) yang terlupa akses mereka.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Kata Laluan Kustom (Pilihan - Biarkan kosong untuk penjanaan rawak selamat)
              </label>
              <input
                type="text"
                placeholder="Cth: KlinikAzman#2026!"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 text-xs font-mono"
              />
            </div>

            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="py-3 px-6 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Menetapkan Semula..." : "Jana & Tetapkan Kata Laluan Pentadbir 🔑"}
            </button>

            {generatedTempPass && (
              <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-3 animate-in zoom-in-95 mt-4">
                <p className="text-xs text-gray-400 font-bold">Kata laluan sementara baharu pentadbir berjaya dicipta:</p>
                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="font-mono font-black text-emerald-400 text-base tracking-wider">{generatedTempPass}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedTempPass);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 3000);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {copiedPass ? "✓ Disalin!" : "Salin 📋"}
                  </button>
                </div>
                <p className="text-[11px] text-amber-400">Sila salin dan berikan kata laluan ini kepada pemilik akaun pentadbir syarikat.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: BILLING & INVOICES */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Manual Payment Form */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-3xl">
            <div>
              <h2 className="text-base font-black text-gray-900">Rekod Bayaran Luar Talian (Manual Invoicing)</h2>
              <p className="text-xs text-gray-500">Keluarkan invois rasmi dan aktifkan langganan bagi bayaran melalui Pindahan Bank, Pesanan Kerajaan (L.O), atau Cek.</p>
            </div>

            <form onSubmit={handleRecordManualPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Jumlah Bayaran (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={manualPay.amount}
                    onChange={(e) => setManualPay({ ...manualPay, amount: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Pelan Langganan</label>
                  <select
                    value={manualPay.planType}
                    onChange={(e) => setManualPay({ ...manualPay, planType: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-2xl bg-white font-bold"
                  >
                    <option value="STARTER">STARTER</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Kitaran</label>
                  <select
                    value={manualPay.billingCycle}
                    onChange={(e) => setManualPay({ ...manualPay, billingCycle: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-2xl bg-white font-bold"
                  >
                    <option value="YEARLY">Tahunan (12 Bulan)</option>
                    <option value="MONTHLY">Bulanan (1 Bulan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Kaedah Bayaran</label>
                  <select
                    value={manualPay.paymentMethod}
                    onChange={(e) => setManualPay({ ...manualPay, paymentMethod: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-2xl bg-white font-bold"
                  >
                    <option value="BANK_TRANSFER">Pindahan Bank Terus</option>
                    <option value="LOCAL_ORDER">Pesanan Tempatan (L.O Kerajaan)</option>
                    <option value="CHEQUE">Cek Syarikat</option>
                    <option value="CASH">Tunai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">No. Rujukan Resit / L.O</label>
                <input
                  type="text"
                  placeholder="Cth: MBB-TRX-982144 atau LO/MOH/2026/88"
                  value={manualPay.referenceNo}
                  onChange={(e) => setManualPay({ ...manualPay, referenceNo: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {loading ? "Merekodkan..." : "Sahkan Bayaran & Aktifkan Langganan 💳"}
              </button>
            </form>
          </div>

          {/* Invoices History Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-black text-gray-900">Sejarah Invois & Pembayaran ({tenant.transactions.length})</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3.5">No. Invois</th>
                    <th className="px-5 py-3.5">Pelan / Kitaran</th>
                    <th className="px-5 py-3.5">Jumlah</th>
                    <th className="px-5 py-3.5">Kaedah</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Tarikh</th>
                    <th className="px-5 py-3.5 text-right">Resit Rasmi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tenant.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-gray-400">
                        Tiada sejarah invois direkodkan lagi.
                      </td>
                    </tr>
                  ) : (
                    tenant.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{tx.invoiceNo}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">
                            {tx.planType} ({tx.billingCycle})
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono font-black text-gray-900 text-sm">
                          RM {tx.amount.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 uppercase font-mono text-[11px]">{tx.paymentMethod || "FPX"}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[11px] text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString("ms-MY")}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/langganan/invois/${tx.id}`}
                            target="_blank"
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-xs transition"
                          >
                            Buka Resit A4 ↗
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CRM INTERNAL NOTES */}
      {activeTab === "crm" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-base font-black text-gray-900">Nota CRM Tertutup SuperAdmin</h2>
            <p className="text-xs text-gray-500">Nota ini hanya boleh dilihat dan disunting oleh pentadbir platform QueNombo.</p>
          </div>

          <form onSubmit={handleSaveCrmNotes} className="space-y-4">
            <div>
              <textarea
                rows={8}
                value={crmNotes}
                onChange={(e) => setCrmNotes(e.target.value)}
                placeholder="Cth: Pelanggan VIP - Rundingan pelan tahunan khas. Hubungi En. Shahrul (012-3456789) untuk sebarang bantuan sokongan teknikal."
                className="w-full p-4 border border-gray-300 rounded-2xl bg-gray-50 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Nota CRM 💾"}
            </button>
          </form>
        </div>
      )}

      {/* INDIVIDUAL STAFF PASSWORD RESET MODAL */}
      {selectedUserForReset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="text-xs font-mono font-bold text-amber-600">Reset Kata Laluan Staf</p>
                <h3 className="text-base font-black text-gray-900 mt-0.5">
                  {selectedUserForReset.name || selectedUserForReset.username} (@{selectedUserForReset.username})
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForReset(null)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-gray-700">
                Kata Laluan Baharu (Biarkan kosong untuk jana automatik)
              </label>
              <input
                type="text"
                placeholder="Cth: StafQue#2026!"
                value={staffCustomPass}
                onChange={(e) => setStaffCustomPass(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono text-xs"
              />

              <button
                onClick={handleResetStaffPassword}
                disabled={loading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {loading ? "Menetapkan Semula..." : "Jana & Set Kata Laluan Staf 🔑"}
              </button>
            </div>

            {staffTempPass && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 animate-in zoom-in-95">
                <p className="text-[11px] text-gray-400">Kata laluan sementara staf:</p>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="font-mono font-black text-emerald-400 text-sm">{staffTempPass}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(staffTempPass);
                      setCopiedStaffPass(true);
                      setTimeout(() => setCopiedStaffPass(false), 3000);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    {copiedStaffPass ? "✓ Disalin!" : "Salin 📋"}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedUserForReset(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
