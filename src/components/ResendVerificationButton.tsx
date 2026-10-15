"use client";

import { useEffect, useState } from "react";

const COOLDOWN_SEC = 60;

/** Butang "hantar semula" untuk pengguna yang sudah log masuk (menggunakan sesi, tanpa body). */
export default function ResendVerificationButton() {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string; devVerifyUrl?: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setResult({ type: "success", text: data.message || "Pautan pengesahan baharu dihantar.", devVerifyUrl: data.devVerifyUrl });
        setCooldown(COOLDOWN_SEC);
      } else {
        setResult({ type: "error", text: data.message || "Gagal menghantar pautan. Sila cuba semula." });
      }
    } catch {
      setResult({ type: "error", text: "Ralat sambungan rangkaian." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading || cooldown > 0}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Menghantar..." : cooldown > 0 ? `Hantar semula (${cooldown}s)` : "Hantar Semula E-mel Pengesahan"}
      </button>
      {result && (
        <p className={`max-w-xs text-right text-[11px] ${result.type === "success" ? "text-emerald-800" : "text-rose-800"}`}>
          {result.text}
          {result.devVerifyUrl && (
            <a href={result.devVerifyUrl} className="mt-0.5 block break-all font-mono text-blue-700 underline">
              {result.devVerifyUrl}
            </a>
          )}
        </p>
      )}
    </div>
  );
}
