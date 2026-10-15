"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";

interface NavItem {
  key: string;
  labelKey: any;
  href: string;
  icon: string;
  roles?: string[]; // "SUPERADMIN" | "TENANT_ADMIN" | "BRANCH_MANAGER" | "COUNTER_STAFF"
}

interface NavSection {
  titleKey: any;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    titleKey: "secOperations",
    items: [
      {
        key: "superadmin",
        labelKey: "navSuperadmin",
        href: "/superadmin",
        icon: "shield",
        roles: ["SUPERADMIN"],
      },
      {
        key: "dashboard",
        labelKey: "navDashboard",
        href: "/dashboard",
        icon: "home",
        roles: ["TENANT_ADMIN", "BRANCH_MANAGER", "COUNTER_STAFF"],
      },
      {
        key: "branches",
        labelKey: "navBranches",
        href: "/cawangan",
        icon: "building",
        roles: ["SUPERADMIN", "TENANT_ADMIN"],
      },
      {
        key: "manager",
        labelKey: "navManager",
        href: "/pengurus",
        icon: "smartphone",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER"],
      },
      {
        key: "terminal",
        labelKey: "navTerminal",
        href: "/terminal",
        icon: "monitor",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER", "COUNTER_STAFF"],
      },
      {
        key: "devices",
        labelKey: "navDevices",
        href: "/peranti",
        icon: "tv",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER"],
      },
      {
        key: "kiosk",
        labelKey: "navKiosk",
        href: "/kiosk/demo",
        icon: "tablet",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER"],
      },
      {
        key: "qrcode",
        labelKey: "navQRCode",
        href: "/qrcode",
        icon: "qr",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER"],
      },
      {
        key: "onboarding",
        labelKey: "navOnboarding",
        href: "/onboarding",
        icon: "settings",
        roles: ["SUPERADMIN", "TENANT_ADMIN"],
      },
    ],
  },
  {
    titleKey: "secServices",
    items: [
      {
        key: "appointments",
        labelKey: "navAppointments",
        href: "/temujanji",
        icon: "calendar",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER", "COUNTER_STAFF"],
      },
      {
        key: "feedback",
        labelKey: "navFeedback",
        href: "/maklumbalas",
        icon: "heart",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER"],
      },
      {
        key: "integration",
        labelKey: "navIntegration",
        href: "/integrasi",
        icon: "message-square",
        roles: ["SUPERADMIN", "TENANT_ADMIN"],
      },
    ],
  },
  {
    titleKey: "secAnalytics",
    items: [
      {
        key: "analytics",
        labelKey: "navAnalytics",
        href: "/analisis",
        icon: "bar-chart",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER"],
      },
      {
        key: "aioptima",
        labelKey: "navAIOptima",
        href: "/ai-optima",
        icon: "cpu",
        roles: ["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER"],
      },
      {
        key: "billing",
        labelKey: "navBilling",
        href: "/langganan",
        icon: "credit-card",
        roles: ["SUPERADMIN", "TENANT_ADMIN"],
      },
    ],
  },
];

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  monitor: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  tv: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4l4 4-4 4m10-8l-4 4 4 4M3 8h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  tablet: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  smartphone: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  heart: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  "message-square": (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  "bar-chart": (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  cpu: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  "credit-card": (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  qr: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

function getRoleMeta(role: string, t: (k: any) => string) {
  switch (role) {
    case "SUPERADMIN":
      return { title: t("roleSuperadmin") || "Super Administrator", badge: "Superadmin", color: "bg-purple-500/20 text-purple-300 border-purple-400/30" };
    case "TENANT_ADMIN":
      return { title: t("roleTenantAdmin") || "Pentadbir Syarikat", badge: "Tenant Admin", color: "bg-blue-500/20 text-blue-300 border-blue-400/30" };
    case "BRANCH_MANAGER":
      return { title: t("roleBranchManager") || "Pengurus Cawangan", badge: "Manager", color: "bg-sky-500/20 text-sky-300 border-sky-400/30" };
    case "COUNTER_STAFF":
      return { title: t("roleCounterStaff") || "Staf Kaunter", badge: "Staf", color: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" };
    default:
      return { title: t("user") || "Pengguna", badge: "Akses", color: "bg-slate-500/20 text-slate-300 border-slate-400/30" };
  }
}

export default function Sidebar({ userRole = "TENANT_ADMIN" }: { userRole?: string; userLevel?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);

  // Normalize role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentRole = (session?.user as any)?.role || userRole || "TENANT_ADMIN";
  const roleMeta = getRoleMeta(currentRole, t);

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-68"
      } sticky top-0 h-screen border-r border-slate-800 bg-[#0B1528] text-slate-100 shadow-2xl transition-all duration-300 flex flex-col z-30 select-none shrink-0`}
    >
      {/* Brand Header */}
      <div className="flex h-18 items-center justify-between border-b border-slate-800/80 px-3.5 shrink-0 bg-[#070E1B]/60">
        {!collapsed ? (
          <>
            <Link href={currentRole === "SUPERADMIN" ? "/superadmin" : "/dashboard"} className="flex min-w-0 items-center gap-3 group">
              <div className="relative h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-md flex items-center justify-center text-white text-xl font-black">
                Q
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-white block leading-none">
                    QueNombo
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-500 text-white">
                    SaaS
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 block truncate mt-0.5">
                  {t("appTagline")}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
              title="Kecilkan Sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded-xl text-slate-300 hover:bg-blue-600/30 hover:text-blue-400 transition cursor-pointer flex items-center justify-center border border-slate-700/60"
              title="Buka Sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Role & Context Card */}
      {!collapsed && (
        <div className="px-3 pt-3.5 pb-2 shrink-0">
          <div className="rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/80 border border-slate-700/60 p-3 shadow-inner">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${roleMeta.color}`}>
                {roleMeta.badge}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("active")}
              </span>
            </div>
            <div className="mt-1.5 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(session?.user as any)?.tenantName || (session?.user as any)?.branchName || roleMeta.title}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {session?.user?.name || session?.user?.email || t("user")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-4 px-3 py-3 overflow-y-auto custom-scrollbar">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(currentRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400/80">
                  {t(section.titleKey)}
                </p>
              )}
              {collapsed && sIdx > 0 && (
                <div className="my-2 border-t border-slate-800" />
              )}

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/superadmin" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition w-full cursor-pointer relative group ${
                        isActive
                          ? "bg-blue-600/30 text-white border border-blue-500/40 shadow-xs"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                      title={collapsed ? t(item.labelKey) : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-blue-400 shadow-[0_0_8px_#3b82f6]" />
                      )}
                      <span className={`${isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"} transition-colors`}>
                        {icons[item.icon] || icons.home}
                      </span>
                      {!collapsed && <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-800/80 shrink-0 bg-[#070E1B]/60">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition w-full cursor-pointer"
          title={t("logout")}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>{t("logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
