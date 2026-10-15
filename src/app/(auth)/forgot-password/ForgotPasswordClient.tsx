"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import AuthCard from "../AuthCard";

export default function ForgotPasswordClient() {
  const { language } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setMessage(null);
    setDevResetUrl(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text:
            language === "en"
              ? "If an account with that information exists and has an email, a reset link has been sent."
              : data.message,
        });
        if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
      } else {
        setMessage({
          type: "error",
          text: data.message || (language === "en" ? "Request failed." : "Permintaan gagal."),
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: language === "en" ? "Network connection error." : "Ralat sambungan rangkaian.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={language === "en" ? "Forgot your password?" : "Lupa kata laluan?"}
      subtitle={
        language === "en"
          ? "Enter your username or email and we will send you a reset link."
          : "Masukkan nama pengguna atau e-mel anda dan kami akan hantar pautan tetapan semula."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <div
            className={`rounded-2xl border p-3.5 text-xs ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {message.text}
          </div>
        )}

        {devResetUrl && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 break-all">
            <strong className="block mb-1">Mod pembangunan (e-mel belum dikonfigurasi):</strong>
            <a href={devResetUrl} className="underline font-mono">
              {devResetUrl}
            </a>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="identifier" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
            {language === "en" ? "Username or Email" : "Nama Pengguna atau E-mel"}
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder={language === "en" ? "e.g. admin or admin@company.com" : "cth. admin atau admin@syarikat.com"}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !identifier.trim()}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-700/25 transition hover:from-blue-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {loading
            ? language === "en"
              ? "Sending..."
              : "Menghantar..."
            : language === "en"
            ? "Send Reset Link"
            : "Hantar Pautan Tetapan Semula"}
        </button>
      </form>
    </AuthCard>
  );
}
