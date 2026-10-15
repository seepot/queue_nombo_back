"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n";

function getRoleBadge(role: string, t: (k: TranslationKey) => string) {
  switch (role) {
    case "SUPERADMIN":
      return { label: t("roleSuperadmin") || "Superadmin", color: "bg-purple-100 text-purple-800 border-purple-200" };
    case "TENANT_ADMIN":
      return { label: t("roleTenantAdmin") || "Tenant Admin", color: "bg-blue-100 text-blue-800 border-blue-200" };
    case "BRANCH_MANAGER":
      return { label: t("roleBranchManager") || "Manager", color: "bg-sky-100 text-sky-800 border-sky-200" };
    case "COUNTER_STAFF":
      return { label: t("roleCounterStaff") || "Staf Kaunter", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    default:
      return { label: t("user") || "Pengguna", color: "bg-slate-100 text-slate-800 border-slate-200" };
  }
}

function getBreadcrumb(pathname: string, t: (k: TranslationKey) => string): { module: string; page: string } {
  if (pathname === "/dashboard") return { module: "QueNombo", page: t("navDashboard") };
  if (pathname === "/superadmin") return { module: "SuperAdmin", page: t("navSuperadmin") };
  if (pathname === "/terminal") return { module: "Counter", page: t("navTerminal") };
  if (pathname === "/peranti") return { module: "Display", page: t("navDevices") };
  if (pathname === "/kiosk/demo") return { module: "Kiosk", page: t("navKiosk") };
  if (pathname === "/qrcode") return { module: "QR Code", page: t("navQRCode") };
  if (pathname === "/onboarding") return { module: "Setup", page: t("navOnboarding") };
  if (pathname === "/temujanji") return { module: "Appointments", page: t("navAppointments") };
  if (pathname === "/maklumbalas") return { module: "CSAT", page: t("navFeedback") };
  if (pathname === "/integrasi") return { module: "Integrations", page: t("navIntegration") };
  if (pathname === "/analisis") return { module: "Reports", page: t("navAnalytics") };
  if (pathname === "/ai-optima") return { module: "AI Engine", page: t("navAIOptima") };
  if (pathname === "/langganan") return { module: "Billing", page: t("navBilling") };
  return { module: "QueNombo", page: pathname.replace("/", "") };
}

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  const userRole = user?.role || "TENANT_ADMIN";
  const roleBadge = getRoleBadge(userRole, t);
  const breadcrumb = getBreadcrumb(pathname, t);
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "Q";

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const initTimer = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(timer);
    };
  }, []);

  const locale = language === "en" ? "en-US" : "ms-MY";
  const formattedDate = now
    ? new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(now)
    : "-";

  const formattedTime = now
    ? new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now)
    : "--:--";

  return (
    <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8 shadow-xs select-none">
      {/* Breadcrumb Info */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>QueNombo</span>
            <span>/</span>
            <span>{breadcrumb.module}</span>
          </div>
          <h1 className="text-base font-extrabold text-slate-900 truncate tracking-tight">
            {breadcrumb.page}
          </h1>
        </div>
      </div>

      {/* Right Controls: Language Toggle, Clock & User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Bilingual Language Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => setLanguage("ms")}
            className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
              language === "ms"
                ? "bg-white text-blue-700 shadow-xs ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-900"
            }`}
            title="Tukar ke Bahasa Melayu"
          >
            🇲🇾 BM
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
              language === "en"
                ? "bg-white text-blue-700 shadow-xs ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-900"
            }`}
            title="Switch to English"
          >
            🇬🇧 ENG
          </button>
        </div>

        {/* Live Clock Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-slate-900">{formattedTime}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-medium">{formattedDate}</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex items-center gap-2 p-1 pl-2.5 pr-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer group"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <div className="hidden lg:block text-right leading-tight">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[130px] group-hover:text-blue-900">
                {user?.name || t("user")}
              </p>
              <p className="text-[10px] font-medium text-slate-400 truncate max-w-[130px]">
                {user?.tenantName || user?.branchName || roleBadge.label}
              </p>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-xs font-black text-white shadow-xs">
              {userInitial}
            </div>
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* User Identity Header */}
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-base font-black text-white border border-white/20 shadow-inner">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-white truncate">
                      {user?.name || t("user")}
                    </p>
                    <p className="text-[11px] text-blue-200 truncate mt-0.5">
                      {user?.tenantName || user?.branchName || "QueNombo Cloud"}
                    </p>
                    <span className={`inline-block mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded border ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2 space-y-1">
                {userRole === "SUPERADMIN" && (
                  <Link
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition"
                    href="/superadmin"
                    onClick={() => setOpen(false)}
                  >
                    <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">👑</span>
                    {t("navSuperadmin")}
                  </Link>
                )}

                <Link
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-900 transition"
                  href="/terminal"
                  onClick={() => setOpen(false)}
                >
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">🖥️</span>
                  {t("navTerminal")}
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  type="button"
                >
                  <span className="p-1.5 rounded-lg bg-red-100 text-red-600">🚪</span>
                  {t("logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
