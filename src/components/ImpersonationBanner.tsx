"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ImpersonationBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [impersonating, setImpersonating] = useState<{
    isImpersonating: boolean;
    tenantName?: string;
    tenantSlug?: string;
    tenantId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Semak status penyamaran setiap kali laluan bertukar (setState hanya selepas respons tiba)
  useEffect(() => {
    fetch("/api/superadmin/impersonate")
      .then((res) => res.json())
      .then((data) => setImpersonating(data.isImpersonating ? data : null))
      .catch(() => setImpersonating(null));
  }, [pathname]);

  const handleStopImpersonation = async () => {
    setLoading(true);
    try {
      await fetch("/api/superadmin/impersonate", { method: "DELETE" });
      setImpersonating(null);
      // Muat semula penuh diperlukan supaya kuki penyamaran yang dipadam dibaca semula oleh pelayan
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/superadmin";
    } catch {
      router.push("/superadmin");
    } finally {
      setLoading(false);
    }
  };

  if (!impersonating?.isImpersonating) return null;

  return (
    <aside
      aria-label="Pemberitahuan Mod Penyamaran SuperAdmin"
      className="sticky top-0 z-50 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 shadow-lg border-b border-red-700 font-sans text-xs flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2.5 font-bold">
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
        <span className="px-2 py-0.5 bg-black/20 rounded-md text-[10px] uppercase tracking-wider font-mono">
          Ghost Mode
        </span>
        <p className="leading-snug">
          Anda sedang mengendalikan akaun:{" "}
          <strong className="underline decoration-white/60 underline-offset-2">
            {impersonating.tenantName}
          </strong>{" "}
          <span className="font-mono text-red-100 font-normal">
            (/{impersonating.tenantSlug})
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleStopImpersonation}
          disabled={loading}
          className="px-3.5 py-1.5 bg-white text-red-700 hover:bg-red-50 font-black rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
        >
          <span>{loading ? "Menamatkan..." : "Keluar Penyamaran"}</span>
          <span>➔</span>
        </button>
      </div>
    </aside>
  );
}
