"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const isIdleLogout = searchParams.get("reason") === "idle";
  const orgParam = searchParams.get("org") || searchParams.get("tenant") || "";

  const { language } = useLanguage();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Quick Demo Autofill Handler
  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password: password,
        redirect: false,
      });

      if (result?.code === "throttled") {
        setError(
          language === "en"
            ? "Too many failed sign-in attempts. Please wait 15 minutes before trying again."
            : "Terlalu banyak percubaan log masuk gagal. Sila tunggu 15 minit sebelum mencuba semula."
        );
        setLoading(false);
      } else if (!result || result.error) {
        setError(
          language === "en"
            ? "Authentication failed. Please check your username or password."
            : "Log masuk gagal. Sila semak ID pengguna atau kata laluan anda."
        );
        setLoading(false);
      } else if (result.ok) {
        window.location.replace(callbackUrl);
      } else {
        setError(
          language === "en"
            ? "Unable to log in. Please try again shortly."
            : "Log masuk tidak berjaya. Sila cuba sebentar lagi."
        );
        setLoading(false);
      }
    } catch {
      setError(
        language === "en"
          ? "Network connection error during sign-in."
          : "Ralat sambungan rangkaian semasa log masuk."
      );
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans select-none">
      {orgParam && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>
              {language === "en" ? "Logging into organization:" : "Log masuk ke organisasi:"}{" "}
              <strong className="font-mono uppercase">{orgParam}</strong>
            </span>
          </div>
        </div>
      )}

      {isIdleLogout && !error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-base shrink-0">⏳</span>
          <div className="min-w-0">
            <strong className="font-bold block">
              {language === "en" ? "Session Expired" : "Sesi Ditamatkan"}
            </strong>
            <span className="text-amber-800 leading-relaxed">
              {language === "en"
                ? "Your session has timed out due to inactivity for security."
                : "Sesi anda telah ditamatkan secara automatik atas faktor keselamatan kerana tiada aktiviti."}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/95 p-3.5 text-xs text-rose-900 flex items-start gap-2.5 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-base shrink-0">⚠️</span>
          <div className="min-w-0">
            <strong className="font-bold block">
              {language === "en" ? "Authentication Error" : "Ralat Pengesahan"}
            </strong>
            <span className="text-rose-800 leading-relaxed">{error}</span>
          </div>
        </div>
      )}

      {/* Input ID Pengguna */}
      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700"
        >
          {language === "en" ? "Username / Staff ID" : "Nama Pengguna / ID Staf"}
        </label>
        <div className="relative group">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <input
            id="username"
            type="text"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50/60 pl-11 pr-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder={language === "en" ? "e.g. admin or staf1" : "Contoh: admin atau staf1"}
            required
          />
        </div>
      </div>

      {/* Input Kata Laluan */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700"
          >
            {language === "en" ? "Password" : "Kata Laluan"}
          </label>
        </div>
        <div className="relative group">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50/60 pl-11 pr-11 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 font-mono"
            placeholder="••••••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
            title={showPassword ? "Sembunyikan kata laluan" : "Papar kata laluan"}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Remember Me & Help */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <label className="flex items-center gap-2 cursor-pointer text-slate-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded-md accent-blue-600 cursor-pointer"
          />
          <span className="font-medium">{language === "en" ? "Remember me" : "Ingat saya"}</span>
        </label>
        <Link href="/forgot-password" className="text-blue-600 font-bold hover:underline cursor-pointer">
          {language === "en" ? "Forgot password?" : "Lupa kata laluan?"}
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !username || !password}
        className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-700/25 transition hover:from-blue-700 hover:to-indigo-800 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>{language === "en" ? "Authenticating..." : "Mengesahkan Maklumat..."}</span>
          </>
        ) : (
          <>
            <span>{language === "en" ? "Sign In to Platform" : "Log Masuk Sistem"}</span>
            <span className="text-base">➔</span>
          </>
        )}
      </button>

      {/* 1-CLICK QUICK DEMO AUTOFILL CHIPS */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-center">
          ⚡ {language === "en" ? "Quick Demo Access (1-Click Autofill)" : "Akses Pantas Ujian (Isi 1-Klik):"}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickFill("superadmin", "admin123")}
            className="p-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <span>👑</span>
            <span>SuperAdmin</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill("admin", "admin123")}
            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-blue-200"
          >
            <span>🏢</span>
            <span>Admin Tenant</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill("suraya", "admin123")}
            className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-purple-200"
          >
            <span>🏥</span>
            <span>Klinik Suraya</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill("staf1", "admin123")}
            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-emerald-200"
          >
            <span>👩‍💻</span>
            <span>Staf Kaunter</span>
          </button>
        </div>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between font-sans">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left Visual Hero Showcase */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 lg:flex flex-col justify-between p-12 text-white border-r border-slate-800">
          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Tag with Official Logo */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 p-2 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center">
              <Image
                src="/images/quenombo-icon.png"
                alt="Logo QueNombo"
                width={48}
                height={48}
                className="object-contain rounded-xl"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white font-sans">
                  QueNombo
                </span>
                <span className="rounded-lg bg-blue-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-300 border border-cyan-400/30 font-mono">
                  SaaS v2.0
                </span>
              </div>
              <p className="text-xs text-cyan-200/80 font-medium">
                Aliran Giliran Lancar &amp; Tanpa Henti
              </p>
            </div>
          </div>

          {/* Middle Narrative */}
          <div className="relative z-10 max-w-xl my-auto py-8 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300 border border-cyan-400/30 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {language === "en"
                  ? "Integrated Cloud Queue & Appointment Solution"
                  : "Penyelesaian Pengurusan Giliran Awan Bersepadu"}
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight text-white">
              {language === "en"
                ? "Seamless, Next-Gen Multi-Tenant Queue Orchestration"
                : "Transformasi Pengurusan Giliran Pintar Berasaskan Awan"}
            </h1>

            <p className="text-sm xl:text-base leading-relaxed text-slate-300 font-normal">
              {language === "en"
                ? "Powering hospitals, clinics, government counters, banks, and enterprises with sub-second AI voice dispatch, real-time telemetry, and resilient offline mode."
                : "Memacu kecekapan operasi kaunter hospital, klinik, agensi kerajaan, bank, dan peruncitan dengan panggilan suara pintar dwibahasa, ramalan AI, dan ketahanan luar talian."}
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎙️</span>
                  <h4 className="text-xs font-black text-white">
                    {language === "en" ? "AI Voice Announcer" : "Panggilan Suara AI"}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === "en" ? "Dual-language D5-A5 audio synthesis." : "Sintesis audio dwibahasa BM & ENG."}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h4 className="text-xs font-black text-white">
                    {language === "en" ? "AI Optima Queue" : "Ramalan AI Optima"}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === "en" ? "Dynamic waiting time & staff load." : "Analitik masa menunggu & beban staf."}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <h4 className="text-xs font-black text-white">
                    {language === "en" ? "PWA Mobile Manager" : "Pengurus Cawangan PWA"}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === "en" ? "Remote counter & queue control." : "Kawalan giliran mudah alih cawangan."}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h4 className="text-xs font-black text-white">
                    {language === "en" ? "Edge Offline Sync" : "Mod Luar Talian"}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === "en" ? "Zero downtime local resilience." : "Tiket tetap jalan tanpa internet."}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
            <span>© 2026 QueNombo Cloud SaaS • All Rights Reserved</span>
            <span className="font-mono text-[11px] bg-white/5 px-3 py-1 rounded-xl border border-white/10 text-cyan-300">
              PostgreSQL Enterprise Isolation
            </span>
          </div>
        </section>

        {/* Right Form Card Panel */}
        <main className="flex min-h-screen items-center justify-center bg-slate-100/90 px-4 py-8 sm:px-6 lg:px-12 relative">
          {/* Floating Language Switcher */}
          <div className="absolute top-6 right-6 flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
            <button
              onClick={() => setLanguage("ms")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                language === "ms" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇲🇾 BM
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                language === "en" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇬🇧 ENG
            </button>
          </div>

          <div className="w-full max-w-md">
            {/* Header & Logo for Mobile */}
            <div className="mb-6 text-center lg:text-left">
              <div className="mb-3 flex items-center justify-center lg:justify-start gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg border border-slate-100">
                  <Image
                    src="/images/quenombo-icon.png"
                    alt="Logo QueNombo"
                    width={48}
                    height={48}
                    className="h-full w-full object-contain rounded-xl"
                    priority
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">QueNombo</h2>
                  <p className="text-xs text-blue-600 font-bold">Aliran Giliran Lancar &amp; Tanpa Henti</p>
                </div>
              </div>
            </div>

            {/* Login Box Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/70">
              <div className="mb-5">
                <h3 className="text-lg font-black text-slate-900">
                  {language === "en" ? "Welcome Back 👋" : "Selamat Kembali 👋"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {language === "en"
                    ? "Please enter your username and password to proceed."
                    : "Sila masukkan ID Pengguna dan Kata Laluan untuk meneruskan."}
                </p>
              </div>

              <Suspense fallback={<div className="py-8 text-center text-xs text-slate-400">Memuatkan borang...</div>}>
                <LoginForm />
              </Suspense>
            </div>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 font-medium">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                {language === "en"
                  ? "256-Bit SSL/TLS End-to-End Enterprise Encryption"
                  : "Sambungan Selamat & Terenkripsi 256-Bit SSL/TLS"}
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
