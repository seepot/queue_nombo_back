"use client";

import { useEffect, useState, useCallback } from "react";
import { Announcement } from "@/lib/announcements";

export default function BroadcastBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("dismissed_announcements");
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/pengumuman", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setAnnouncements(json.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnnouncements();
    }, 0);

    // Periodic check every 30s for new broadcasts
    const interval = setInterval(fetchAnnouncements, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAnnouncements]);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("dismissed_announcements", JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a.id));

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {visibleAnnouncements.map((a) => {
        const isUrgent = a.type === "urgent";
        const isWarning = a.type === "warning";

        const bgClass = isUrgent
          ? "bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-700"
          : isWarning
          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600"
          : "bg-gradient-to-r from-blue-700 to-indigo-800 text-white border-blue-800";

        const badgeClass = isUrgent
          ? "bg-red-900/60 text-red-100 ring-1 ring-red-400/30"
          : isWarning
          ? "bg-amber-900/60 text-amber-100 ring-1 ring-amber-300/30"
          : "bg-blue-950/60 text-blue-100 ring-1 ring-blue-400/30";

        return (
          <div
            key={a.id}
            className={`rounded-2xl p-4 shadow-md border flex items-start justify-between gap-4 animate-in slide-in-from-top duration-300 ${bgClass}`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 shrink-0">
                {isUrgent ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${badgeClass}`}>
                    {isUrgent ? "PENGUMUMAN SEGERA" : isWarning ? "PERINGATAN OPERASI" : "MEMO RASMI"}
                  </span>
                  {a.target === "branch" && a.cawanganNama && (
                    <span className="text-[11px] font-medium bg-black/20 px-2 py-0.5 rounded text-white/90">
                      📍 {a.cawanganNama}
                    </span>
                  )}
                  <span className="text-xs text-white/75">
                    Daripada: <strong>{a.createdByName}</strong>
                  </span>
                </div>
                <h4 className="font-bold text-sm tracking-tight text-white">{a.title}</h4>
                <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap">
                  {a.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(a.id)}
              title="Tutup Pengumuman"
              className="text-white/70 hover:text-white rounded-lg p-1 transition cursor-pointer hover:bg-white/10 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
