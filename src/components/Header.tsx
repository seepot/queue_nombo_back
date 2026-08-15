"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-sm text-gray-500">Selamat Datang,</h2>
        <p className="font-semibold text-gray-800">
          {session?.user?.name || "Pengguna"}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <p className="text-gray-500">Cawangan</p>
          <p className="font-medium text-gray-700">
            {session?.user?.namaCawangan || "-"}
          </p>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 ring-blue-200 transition hover:bg-blue-200 focus:outline-none focus:ring-2"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {userInitial}
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-800">
                  {session?.user?.name || "Pengguna"}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {session?.user?.namaCawangan || "-"}
                </p>
              </div>
              <div className="p-2">
                <Link
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  href="/kakitangan/tukar-password"
                  onClick={() => setOpen(false)}
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.88 6.196 9 9 0 015.12 17.804zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Profil
                </Link>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  type="button"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
