"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function RegisterClient() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    companyName: "",
    slug: "",
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [devVerifyUrl, setDevVerifyUrl] = useState("");

  // Peraturan sama seperti validateNewPassword() di pelayan: min 8 aksara, huruf & nombor
  const passwordRuleError = (pw: string): string | null => {
    if (pw.length < 8) {
      return language === "en"
        ? "Password must be at least 8 characters."
        : "Kata laluan mesti sekurang-kurangnya 8 aksara.";
    }
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
      return language === "en"
        ? "Password must contain both letters and numbers."
        : "Kata laluan mesti mengandungi huruf dan nombor.";
    }
    return null;
  };

  const handleCompanyNameChange = (val: string) => {
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({
      ...prev,
      companyName: val,
      slug: prev.slug === "" || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage(language === "en" ? "Password and confirmation do not match." : "Kata laluan dan pengesahan kata laluan tidak sepadan.");
      return;
    }

    const pwError = passwordRuleError(formData.password);
    if (pwError) {
      setErrorMessage(pwError);
      return;
    }

    if (formData.slug.trim().length < 3) {
      setErrorMessage(
        language === "en"
          ? "Subdomain / slug must be at least 3 characters."
          : "Subdomain / slug syarikat mesti sekurang-kurangnya 3 aksara."
      );
      return;
    }

    setDevVerifyUrl("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || (language === "en" ? "Registration failed." : "Pendaftaran gagal."));
      } else {
        setSuccessMessage(
          language === "en"
            ? `Registration successful! We sent a verification link to ${formData.email.trim()}. Redirecting to sign in...`
            : `Pendaftaran berjaya! Pautan pengesahan telah dihantar ke ${formData.email.trim()}. Mengarahkan anda ke halaman log masuk...`
        );
        if (data.devVerifyUrl) {
          // Mod pembangunan tanpa RESEND_API_KEY: paparkan pautan dan jangan ubah hala
          setDevVerifyUrl(data.devVerifyUrl);
        } else {
          setTimeout(() => {
            router.push("/login?registered=true");
          }, 2500);
        }
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, language === "en" ? "Network connection error." : "Ralat rangkaian semasa pendaftaran."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans select-none">
      {/* Language Switcher on Register Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4 flex justify-end mb-4">
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 shadow-sm">
          <button
            type="button"
            onClick={() => setLanguage("ms")}
            className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
              language === "ms" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🇲🇾 BM
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
              language === "en" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🇬🇧 ENG
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-extrabold rounded-full uppercase tracking-widest mb-3">
          QueNombo Cloud SaaS
        </span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {language === "en" ? "Register Your Company" : "Daftar Syarikat Anda"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {language === "en"
            ? "Get started with your smart queue cloud system & modern TV display in 2 minutes."
            : "Mula gunakan sistem giliran pintar & paparan TV moden dalam 2 minit."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-700/60 rounded-3xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-400 animate-in fade-in">
              {successMessage}
              {devVerifyUrl && (
                <div className="mt-3 text-xs text-emerald-300/90">
                  <p className="font-bold uppercase tracking-wider text-[10px]">
                    {language === "en" ? "Development mode: verification link" : "Mod pembangunan: pautan pengesahan"}
                  </p>
                  <a href={devVerifyUrl} className="block break-all font-mono text-emerald-200 underline mt-1">
                    {devVerifyUrl}
                  </a>
                  <Link href="/login?registered=true" className="inline-block mt-2 font-bold text-blue-300 hover:text-blue-200">
                    {language === "en" ? "Continue to sign in →" : "Teruskan ke log masuk →"}
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Maklumat Organisasi */}
            <div className="border-b border-slate-700/80 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">
                {language === "en" ? "1. Organization & Premise Information" : "1. Maklumat Organisasi / Premis"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {language === "en" ? "Company / Clinic / Agency Name *" : "Nama Syarikat / Klinik / Agensi *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === "en" ? "E.g. Dr. Azman Specialist Clinic" : "Cth: Klinik Pakar Dr. Azman"}
                    value={formData.companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {language === "en" ? "Subdomain / Slug *" : "Subdomain / Slug Syarikat *"}
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-900/80 border border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={40}
                      placeholder="dr-azman"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                      className="flex-1 px-4 py-2.5 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500 font-mono"
                    />
                    <span className="px-3 text-xs text-slate-400 font-mono">.quenombo.com</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {language === "en"
                      ? "3-40 characters: lowercase letters, numbers and hyphens. System names (e.g. admin, api, www) are reserved."
                      : "3-40 aksara: huruf kecil, nombor dan sengkang. Nama sistem (cth: admin, api, www) dikhaskan."}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Akaun Pentadbir */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">
                {language === "en" ? "2. Master Administrator Account" : "2. Akaun Pentadbir Utama"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {language === "en" ? "Your Full Name *" : "Nama Penuh Anda *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === "en" ? "E.g. Dr. Azman Shah" : "Cth: Dr. Azman Shah"}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {language === "en" ? "Login Username *" : "Username Log Masuk *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="drazman"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {language === "en" ? "Phone Number (WhatsApp)" : "No. Telefon (WhatsApp)"}
                  </label>
                  <input
                    type="tel"
                    placeholder="0123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {language === "en" ? "Admin Email Address *" : "Emel Pentadbir *"}
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="azman@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {language === "en"
                      ? "A verification link will be sent to this address."
                      : "Pautan pengesahan akan dihantar ke alamat ini."}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {language === "en" ? "Password *" : "Kata Laluan *"}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {language === "en" ? "Min. 8 characters with letters and numbers." : "Min. 8 aksara dengan huruf dan nombor."}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {language === "en" ? "Confirm Password *" : "Sahkan Kata Laluan *"}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading
                ? (language === "en" ? "Registering Organization..." : "Mendaftar Organisasi...")
                : (language === "en" ? "Start 14-Day Free Trial 🚀" : "Daftar Percuma 14 Hari (Free Trial) 🚀")}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-700/60 pt-4 text-xs text-slate-400">
            {language === "en" ? "Already have an account? " : "Sudah mempunyai akaun? "}
            <Link href="/login" className="font-bold text-blue-400 hover:text-blue-300">
              {language === "en" ? "Sign In Here" : "Log Masuk Di Sini"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
