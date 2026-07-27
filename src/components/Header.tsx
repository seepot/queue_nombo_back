"use client";

import { useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

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
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-sm">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </span>
        </div>
      </div>
    </header>
  );
}
