"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Module Error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-8 min-h-[60vh]">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          Gagal Memuatkan Modul
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Terdapat gangguan semasa memproses data modul ini. Sila cuba lagi.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition cursor-pointer"
          >
            Muat Semula Modul
          </button>
          <Link
            href="/dashboard"
            className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Dashboard Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
