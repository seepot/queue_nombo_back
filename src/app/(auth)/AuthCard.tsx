"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

/** Bekas kad seragam untuk halaman pengesahan sekunder (lupa / tetap semula kata laluan). */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <div className="inline-flex items-center gap-1 rounded-2xl bg-white border border-slate-200 p-1 text-xs font-bold shadow-xs">
            <button
              onClick={() => setLanguage("ms")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                language === "ms" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇲🇾 BM
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                language === "en" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇬🇧 ENG
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
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

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/70">
          <div className="mb-5">
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/login" className="font-bold text-blue-600 hover:underline">
            {language === "en" ? "← Back to sign in" : "← Kembali ke log masuk"}
          </Link>
        </p>
      </div>
    </div>
  );
}
