"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SubItem {
  label: string;
  href: string;
  roles?: string[];
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: string[]; // level_akses values that can see this
  subItems?: SubItem[];
}

// Role mapping from old PHP:
// 1 = Admin HQ (nationwide management)
// 2 = Ketua Cawangan (branch head - manages own branch)
// 3 = Staff Kaunter (counter staff - ticket calling)
const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  {
    label: "Cawangan",
    href: "/cawangan",
    icon: "building",
    roles: ["1"],
    subItems: [
      { label: "Senarai", href: "/cawangan" },
      { label: "Pendaftaran", href: "/cawangan/daftar" },
      { label: "Maklumat Tiket", href: "/cawangan/tiket" },
      { label: "Maklumat Kaunter", href: "/cawangan/kaunter-info" },
    ],
  },
  {
    label: "Kakitangan",
    href: "/kakitangan",
    icon: "users",
    roles: ["1", "2", "3"],
    subItems: [
      { label: "Senarai", href: "/kakitangan", roles: ["1", "2"] },
      { label: "Daftar Baru", href: "/kakitangan/daftar", roles: ["1", "2"] },
      { label: "Daftar KC", href: "/kakitangan/daftar-kc", roles: ["1"] },
      { label: "Kemaskini Katalaluan", href: "/kakitangan/tukar-password", roles: ["1", "2", "3"] },
    ],
  },
  { label: "Perkhidmatan", href: "/perkhidmatan", icon: "layers", roles: ["1", "2"] },
  { label: "Kaunter", href: "/kaunter", icon: "monitor", roles: ["2"] },
  {
    label: "Jadual Bertugas",
    href: "/jadual",
    icon: "calendar",
    roles: ["2"],
  },
  {
    label: "Temujanji",
    href: "/temujanji",
    icon: "calendar",
    roles: ["1", "2"],
    subItems: [
      { label: "Senarai", href: "/temujanji", roles: ["2"] },
      { label: "Buka Temujanji", href: "/temujanji/buka", roles: ["2"] },
      { label: "Draf Slot Temujanji", href: "/temujanji/draf-slot", roles: ["2"] },
      { label: "Kalendar Temujanji", href: "/temujanji/kalendar" },
    ],
  },
  {
    label: "Laporan",
    href: "/laporan",
    icon: "chart",
    roles: ["1", "2"],
    subItems: [
      { label: "Transaksi", href: "/laporan" },
      { label: "Perkhidmatan", href: "/laporan/perkhidmatan" },
      { label: "Kumpulan Perkhidmatan", href: "/laporan/kumpulan" },
      { label: "Kaunter", href: "/laporan/kaunter" },
    ],
  },
  {
    label: "Pentadbiran",
    href: "/pentadbiran",
    icon: "settings",
    roles: ["2"],
    subItems: [
      { label: "Kemaskini Info", href: "/pentadbiran" },
      { label: "Had Limit", href: "/pentadbiran/had-limit" },
      { label: "Koordinat/Radius", href: "/pentadbiran/koordinat-radius" },
      { label: "Zon", href: "/pentadbiran/zon" },
      { label: "Masa Operasi", href: "/pentadbiran/waktu-operasi" },
    ],
  },
  { label: "QR Code", href: "/qrcode", icon: "monitor", roles: ["2"] },
  { label: "Aduan", href: "/aduan", icon: "alert", roles: ["1", "2"] },
  {
    label: "Manual Pengguna",
    href: "/manual",
    icon: "monitor",
    roles: ["2", "3"],
    subItems: [
      { label: "Modul Temujanji", href: "/manual", roles: ["2"] },
      { label: "Modul eQ (Ketua Cawangan)", href: "/manual/kc", roles: ["2"] },
      { label: "Modul eQ (Kaunter)", href: "/manual/kaunter", roles: ["2", "3"] },
    ],
  },
];

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  monitor: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  layers: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  alert: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
};

export default function Sidebar({ userLevel }: { userLevel: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userLevel)
  );

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isMenuExpanded = (item: NavItem) => {
    return (
      expandedMenus.includes(item.href) ||
      pathname === item.href ||
      pathname.startsWith(item.href + "/")
    );
  };

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-white border-r border-gray-200 min-h-screen flex flex-col transition-all duration-300`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <h1 className="text-xl font-bold text-blue-600">SmartQ</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-100"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const expanded = hasSubItems && isMenuExpanded(item);

          if (hasSubItems && !collapsed) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleMenu(item.href)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition w-full ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className={isActive ? "text-blue-600" : "text-gray-400"}>
                    {icons[item.icon]}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {expanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.subItems!
                      .filter((sub) => !sub.roles || sub.roles.includes(userLevel))
                      .map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition ${
                            subActive
                              ? "text-blue-700 font-medium bg-blue-50"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={isActive ? "text-blue-600" : "text-gray-400"}>
                {icons[item.icon]}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3" />
    </aside>
  );
}
