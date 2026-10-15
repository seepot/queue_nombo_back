"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import AuthCard from "../AuthCard";

type Status = "missing" | "verifying" | "success" | "invalid";

export default function VerifyEmailClient() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const en = language === "en";

  const [status, setStatus] = useState<Status>(() => (token ? "verifying" : "missing"));
  const [serverMessage, setServerMessage] = useState("");
  const attempted = useRef(false);

  // Borang minta pautan baharu (tanpa sesi)
  const [identifier, setIdentifier] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState("");

  useEffect(() => {
    // Token sekali guna: elakkan panggilan berganda (React StrictMode / navigasi semula)
    if (!token || attempted.current) return;
    attempted.current = true;

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        setServerMessage(data?.message || "");
        setStatus(ok && data?.success ? "success" : "invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendMessage(null);
    setDevVerifyUrl("");
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendMessage({
          type: "success",
          text:
            data.message ||
            (en
              ? "If the account exists, a new verification link has been sent."
              : "Jika akaun wujud, pautan pengesahan baharu telah dihantar."),
        });
        if (data.devVerifyUrl) setDevVerifyUrl(data.devVerifyUrl);
      } else {
        setResendMessage({
          type: "error",
          text: data.message || (en ? "Request failed." : "Permintaan gagal."),
        });
      }
    } catch {
      setResendMessage({
        type: "error",
        text: en ? "Network connection error." : "Ralat sambungan rangkaian.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard
      title={en ? "Verify your email" : "Sahkan e-mel anda"}
      subtitle={
        en
          ? "Email verification unlocks subscription and billing management."
          : "Pengesahan e-mel membolehkan pengurusan langganan dan pembayaran."
      }
    >
      {status === "verifying" && (
        <p className="py-6 text-center text-xs text-slate-400">
          {en ? "Verifying your email..." : "Mengesahkan e-mel anda..."}
        </p>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
            <strong className="block font-bold">{en ? "Email verified" : "E-mel disahkan"}</strong>
            {serverMessage ||
              (en
                ? "Your email address has been verified."
                : "Alamat e-mel anda telah berjaya disahkan.")}
          </div>
          <Link
            href="/login"
            className="block w-full rounded-2xl bg-slate-900 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
          >
            {en ? "Continue to sign in" : "Teruskan ke log masuk"}
          </Link>
        </div>
      )}

      {(status === "invalid" || status === "missing") && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900">
            {status === "missing"
              ? en
                ? "This page needs a verification link from your email."
                : "Halaman ini memerlukan pautan pengesahan daripada e-mel anda."
              : serverMessage ||
                (en
                  ? "This verification link is invalid or has expired."
                  : "Pautan pengesahan ini tidak sah atau telah luput.")}
          </div>

          <form onSubmit={handleResend} className="space-y-3">
            <p className="text-xs text-slate-600">
              {en
                ? "Enter your username or email to request a new link."
                : "Masukkan nama pengguna atau e-mel untuk meminta pautan baharu."}
            </p>
            <input
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={en ? "Username or email" : "Nama pengguna atau e-mel"}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
            {resendMessage && (
              <div
                className={`rounded-2xl border p-3.5 text-xs ${
                  resendMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                {resendMessage.text}
                {devVerifyUrl && (
                  <a href={devVerifyUrl} className="mt-2 block break-all font-mono text-[11px] text-blue-700 underline">
                    {devVerifyUrl}
                  </a>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={resending || !identifier.trim()}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-700/25 transition hover:from-blue-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {resending
                ? en
                  ? "Sending..."
                  : "Menghantar..."
                : en
                ? "Send a new verification link"
                : "Hantar pautan pengesahan baharu"}
            </button>
          </form>
        </div>
      )}
    </AuthCard>
  );
}
