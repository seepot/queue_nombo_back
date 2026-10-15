"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getOfflineBuffer, syncOfflineTicketsToCloud } from "@/lib/offline-sync";

// Status talian pelayar sebagai stor luaran (acara online/offline)
const subscribeOnlineStatus = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};
const getOnlineSnapshot = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const getServerOnlineSnapshot = () => true;

// Bilangan tiket luar talian dalam penimbal setempat, disemak setiap 3 saat
const subscribePendingCount = (onChange: () => void) => {
  const interval = setInterval(onChange, 3000);
  return () => clearInterval(interval);
};
const getPendingCountSnapshot = () => getOfflineBuffer().length;
const getServerPendingCountSnapshot = () => 0;

export default function OfflineIndicator() {
  const { language } = useLanguage();
  const isOnline = useSyncExternalStore(subscribeOnlineStatus, getOnlineSnapshot, getServerOnlineSnapshot);
  const pendingCount = useSyncExternalStore(subscribePendingCount, getPendingCountSnapshot, getServerPendingCountSnapshot);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (!isOnline || pendingCount === 0 || syncing) return;
    setSyncing(true);
    setSyncSuccessMsg(null);

    const res = await syncOfflineTicketsToCloud();
    setSyncing(false);
    if (res.success && res.syncedCount > 0) {
      setSyncSuccessMsg(
        language === "en"
          ? `✓ ${res.syncedCount} offline tickets synced to cloud successfully!`
          : `✓ ${res.syncedCount} tiket luar talian berjaya disegerakkan ke awan!`
      );
      setTimeout(() => {
        setSyncSuccessMsg(null);
      }, 5000);
    }
  };

  // Segerak automatik apabila talian pulih
  useEffect(() => {
    const handleOnline = async () => {
      const buffer = getOfflineBuffer();
      if (buffer.length > 0) {
        setSyncing(true);
        const res = await syncOfflineTicketsToCloud();
        setSyncing(false);
        if (res.success && res.syncedCount > 0) {
          setSyncSuccessMsg(
            language === "en"
              ? `✓ Online connection restored! ${res.syncedCount} offline records synced to cloud.`
              : `✓ Talian internet pulih! ${res.syncedCount} rekod luar talian berjaya disegerakkan ke awan.`
          );
          setTimeout(() => {
            setSyncSuccessMsg(null);
          }, 5000);
        }
      }
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [language]);

  if (isOnline && pendingCount === 0 && !syncSuccessMsg) {
    return null; // Sembunyi jika online sepenuhnya dan tiada data tertunggak
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 font-sans">
      {syncSuccessMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 mb-2">
          <span>🟢</span>
          <span>{syncSuccessMsg}</span>
          <button onClick={() => setSyncSuccessMsg(null)} className="ml-2 font-bold cursor-pointer text-sm">
            &times;
          </button>
        </div>
      )}

      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-amber-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-950 animate-ping" />
          <div>
            <p className="font-extrabold uppercase tracking-wide">
              {language === "en" ? "Offline Edge Mode Active" : "Mod Luar Talian Aktif"}
            </p>
            <p className="text-[11px] opacity-90">
              {language === "en"
                ? `${pendingCount} tickets buffered locally. Will auto-sync when online.`
                : `${pendingCount} tiket disimpan setempat. Akan disegerak automatik apabila online.`}
            </p>
          </div>
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-blue-400">
          <span>🔄</span>
          <span>
            {pendingCount} {language === "en" ? "offline records pending sync" : "rekod menunggu penyegerakan"}
          </span>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="px-3 py-1 bg-white text-blue-700 font-black rounded-xl hover:bg-blue-50 transition cursor-pointer text-[11px] disabled:opacity-50"
          >
            {syncing ? (language === "en" ? "Syncing..." : "Menyegerak...") : (language === "en" ? "Sync Now" : "Segerak Sekarang")}
          </button>
        </div>
      )}
    </div>
  );
}
