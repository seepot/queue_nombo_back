"use client";

import { useState } from "react";
import Link from "next/link";

export default function PricingClient() {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans py-16 px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <span className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-400 text-xs font-extrabold rounded-full tracking-widest uppercase">
          Pakej Harga & Langganan SaaS
        </span>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          Sistem Giliran Pintar Tanpa Kos Perkakasan Mahal
        </h1>
        <p className="text-base text-slate-400 max-w-2xl mx-auto">
          Pilih pelan yang sesuai untuk perniagaan anda. Guna TV sedia ada, tablet, dan telefon pintar tanpa perlu membeli dispenser tiket mekanikal.
        </p>

        {/* Switcher */}
        <div className="pt-4 flex items-center justify-center">
          <div className="bg-slate-800 p-1.5 rounded-2xl border border-slate-700 inline-flex items-center">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === "MONTHLY" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Bayaran Bulanan
            </button>
            <button
              onClick={() => setBillingCycle("YEARLY")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "YEARLY" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Bayaran Tahunan</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full font-bold">
                Jimat 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-6xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Starter */}
        <div className="bg-slate-800/80 rounded-3xl p-8 border border-slate-700 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">STARTER</h3>
            <p className="text-xs text-slate-400 mt-1">Klinik tunggal, kedai cermin mata, atau salun.</p>
            <div className="my-6">
              <span className="text-4xl font-black text-white">
                RM {billingCycle === "YEARLY" ? "470" : "49"}
              </span>
              <span className="text-xs text-slate-400">/{billingCycle === "YEARLY" ? "tahun" : "bulan"}</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2">✓ <strong>1 Cawangan Premis</strong></li>
              <li className="flex items-center gap-2">✓ <strong>2 Kaunter Panggilan</strong></li>
              <li className="flex items-center gap-2">✓ 1 Paparan Skrin TV</li>
              <li className="flex items-center gap-2">✓ Penjana Poster Kod QR Pintu</li>
              <li className="flex items-center gap-2">✓ Tiket Digital Mudah Alih</li>
            </ul>
          </div>
          <Link
            href="/register"
            className="mt-8 block text-center py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Cuba Percuma 14 Hari
          </Link>
        </div>

        {/* Pro */}
        <div className="bg-gradient-to-b from-blue-900/60 to-slate-800/90 rounded-3xl p-8 border-2 border-blue-500 shadow-2xl relative flex flex-col justify-between">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
            Paling Disyorkan ⭐
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">PRO / BUSINESS</h3>
            <p className="text-xs text-slate-400 mt-1">Pusat rawatan, agensi awam, dan perkhidmatan sibuk.</p>
            <div className="my-6">
              <span className="text-4xl font-black text-white">
                RM {billingCycle === "YEARLY" ? "1,430" : "149"}
              </span>
              <span className="text-xs text-slate-400">/{billingCycle === "YEARLY" ? "tahun" : "bulan"}</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-200">
              <li className="flex items-center gap-2 font-bold text-blue-300">✓ Sehingga 3 Cawangan</li>
              <li className="flex items-center gap-2 font-bold text-blue-300">✓ Sehingga 10 Kaunter Panggilan</li>
              <li className="flex items-center gap-2">✓ Skrin TV Display Tanpa Had</li>
              <li className="flex items-center gap-2">✓ <strong>300 Notifikasi WhatsApp/bln</strong></li>
              <li className="flex items-center gap-2">✓ Laporan Analitik SLA Penuh</li>
            </ul>
          </div>
          <Link
            href="/register"
            className="mt-8 block text-center py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all"
          >
            Mula Percuma Sekarang 🚀
          </Link>
        </div>

        {/* Enterprise */}
        <div className="bg-slate-800/80 rounded-3xl p-8 border border-slate-700 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">ENTERPRISE</h3>
            <p className="text-xs text-slate-400 mt-1">Rangkaian francais, hospital, dan badan berkanun.</p>
            <div className="my-6">
              <span className="text-4xl font-black text-white">
                RM {billingCycle === "YEARLY" ? "7,670" : "799"}
              </span>
              <span className="text-xs text-slate-400">/{billingCycle === "YEARLY" ? "tahun" : "bulan"}</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2 font-bold">✓ Cawangan & Kaunter Tanpa Had</li>
              <li className="flex items-center gap-2">✓ <strong>2,000 Notifikasi WhatsApp/bln</strong></li>
              <li className="flex items-center gap-2">✓ Custom Subdomain & White-label</li>
              <li className="flex items-center gap-2">✓ Akses API & Integrasi Luaran</li>
              <li className="flex items-center gap-2">✓ Sokongan Jurutera Dedikasi 24/7</li>
            </ul>
          </div>
          <Link
            href="/register"
            className="mt-8 block text-center py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Hubungi Jualan
          </Link>
        </div>
      </div>
    </div>
  );
}
