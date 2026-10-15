"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import AuthCard from "../AuthCard";

export default function ResetPasswordClient() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [tokenState, setTokenState] = useState<"checking" | "valid" | "invalid">(() =>
    token ? "checking" : "invalid"
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTokenState(d.valid ? "valid" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setTokenState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirm) {
      setMessage({
        type: "error",
        text: language === "en" ? "Passwords do not match." : "Kata laluan tidak sepadan.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text:
            language === "en"
              ? "Password updated. Redirecting to sign in..."
              : "Kata laluan dikemas kini. Mengalihkan ke log masuk...",
        });
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setMessage({
          type: "error",
          text: data.message || (language === "en" ? "Reset failed." : "Tetapan semula gagal."),
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
      title={language === "en" ? "Set a new password" : "Tetapkan kata laluan baharu"}
      subtitle={
        language === "en"
          ? "Minimum 8 characters with letters and numbers."
          : "Minimum 8 aksara dengan huruf dan nombor."
      }
    >
      {tokenState === "checking" && (
        <p className="py-6 text-center text-xs text-slate-400">
          {language === "en" ? "Validating link..." : "Mengesahkan pautan..."}
        </p>
      )}

      {tokenState === "invalid" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900">
            {language === "en"
              ? "This reset link is invalid or has expired."
              : "Pautan tetapan semula ini tidak sah atau telah luput."}
          </div>
          <a
            href="/forgot-password"
            className="block w-full rounded-2xl bg-slate-900 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
          >
            {language === "en" ? "Request a new link" : "Mohon pautan baharu"}
          </a>
        </div>
      )}

      {tokenState === "valid" && (
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

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              {language === "en" ? "New Password" : "Kata Laluan Baharu"}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-16 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showPassword ? (language === "en" ? "Hide" : "Sembunyi") : language === "en" ? "Show" : "Papar"}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              {language === "en" ? "Confirm Password" : "Sahkan Kata Laluan"}
            </label>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 8 || !confirm}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-700/25 transition hover:from-blue-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? language === "en"
                ? "Saving..."
                : "Menyimpan..."
              : language === "en"
              ? "Update Password"
              : "Kemas Kini Kata Laluan"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
