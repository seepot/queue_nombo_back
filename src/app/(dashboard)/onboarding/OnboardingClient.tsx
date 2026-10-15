"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface BranchInfo {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  tenantName: string;
  tenantSlug: string;
  categories: Array<{
    id: string;
    name: string;
    prefixCode: string;
    startNumber: number;
  }>;
  counters: Array<{
    id: string;
    counterNo: string;
    name: string | null;
    zone: string | null;
  }>;
}

export default function OnboardingClient({ branch }: { branch: BranchInfo }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [branchName, setBranchName] = useState(branch.name);
  const [categories, setCategories] = useState(branch.categories);
  const [counters, setCounters] = useState(branch.counters);
  const [newCatName, setNewCatName] = useState("");
  const [newCatPrefix, setNewCatPrefix] = useState("C");

  const addCategory = () => {
    if (!newCatName) return;
    setCategories([
      ...categories,
      {
        id: `temp-${Date.now()}`,
        name: newCatName,
        prefixCode: newCatPrefix.toUpperCase(),
        startNumber: (categories.length + 1) * 1000 + 1,
      },
    ]);
    setNewCatName("");
    setNewCatPrefix(String.fromCharCode(newCatPrefix.charCodeAt(0) + 1));
  };

  const addCounter = () => {
    const nextNo = (counters.length + 1).toString();
    setCounters([
      ...counters,
      {
        id: `temp-counter-${Date.now()}`,
        counterNo: nextNo,
        name: `Kaunter ${nextNo}`,
        zone: "Zon Utama",
      },
    ]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 font-sans">
      {/* Header & Steps Indicator */}
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2">
          Persediaan Awal (Onboarding Wizard)
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Selamat Datang ke QueNombo, {branch.tenantName}! 🎉
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Selesaikan 3 langkah mudah ini untuk memulakan operasi giliran cawangan anda.
        </p>

        {/* Steps Progress */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
          {[
            { num: 1, label: "Cawangan" },
            { num: 2, label: "Kategori Urusan" },
            { num: 3, label: "Kaunter" },
            { num: 4, label: "Siap & Panduan" },
          ].map((step) => (
            <div key={step.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  currentStep === step.num
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : currentStep > step.num
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {currentStep > step.num ? "✓" : step.num}
              </div>
              <span className="text-xs font-semibold text-gray-700 hidden sm:inline">{step.label}</span>
              {step.num < 4 && <div className="w-6 sm:w-10 h-0.5 bg-gray-200"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Branch Details */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Langkah 1: Tetapan Cawangan Utama</h2>
            <p className="text-xs text-gray-500">Sesuaikan nama cawangan dan maklumat asas premis anda.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Nama Cawangan Premis
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 space-y-1">
              <p className="font-bold">💡 Pautan Premis Anda:</p>
              <p className="font-mono text-blue-900">
                https://{branch.tenantSlug}.quenombo.com/
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm cursor-pointer"
            >
              Seterusnya: Kategori Urusan →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Service Categories */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Langkah 2: Jenis Urusan / Kategori Perkhidmatan</h2>
            <p className="text-xs text-gray-500">
              Pelanggan akan memilih kategori ini semasa mengambil nombor giliran (cth: Kod &apos;A&apos; untuk Pertanyaan).
            </p>
          </div>

          <div className="space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-600 text-white font-mono font-bold flex items-center justify-center text-lg shadow-xs">
                    {cat.prefixCode}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{cat.name}</p>
                    <p className="text-xs text-gray-400 font-mono">Bermula Nombor: {cat.startNumber}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md">
                  Aktif
                </span>
              </div>
            ))}
          </div>

          {/* Add Category */}
          <div className="p-4 bg-gray-50/50 border border-dashed border-gray-300 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase">+ Tambah Kategori Urusan Baru</p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={2}
                value={newCatPrefix}
                onChange={(e) => setNewCatPrefix(e.target.value.toUpperCase())}
                placeholder="Kod"
                className="w-16 text-center font-mono font-bold px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white uppercase"
              />
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Cth: Kaunter Ubat / Farmasi"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm bg-white"
              />
              <button
                type="button"
                onClick={addCategory}
                className="px-4 py-2 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-black cursor-pointer"
              >
                Tambah
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              ← Kembali
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm cursor-pointer"
            >
              Seterusnya: Kaunter Fizikal →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Counters */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Langkah 3: Konfigurasi Kaunter Perkhidmatan</h2>
            <p className="text-xs text-gray-500">
              Staf akan log masuk ke kaunter ini melalui Terminal Panggilan untuk memanggil giliran.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {counters.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-gray-900 text-white font-bold flex items-center justify-center text-sm">
                    {c.counterNo}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.zone || "Zon Utama"}</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
            ))}
          </div>

          <button
            onClick={addCounter}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs border border-dashed border-gray-300 cursor-pointer"
          >
            + Tambah Kaunter Baru (Kaunter {counters.length + 1})
          </button>

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              ← Kembali
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm cursor-pointer"
            >
              Selesai & Lihat Panduan Mula Pantas →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Ready & Quick Start */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center text-3xl">
            🚀
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Semua Telah Bersedia!</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Sistem QueNombo cawangan anda kini aktif. Anda boleh terus memulakan operasi dengan langkah berikut:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
            <Link
              href="/terminal"
              className="p-5 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-2xl transition-all group"
            >
              <div className="text-2xl mb-2">🖥️</div>
              <h3 className="font-bold text-blue-900 text-sm group-hover:text-blue-700">Terminal Panggilan Staf</h3>
              <p className="text-xs text-blue-700/80 mt-1">
                Buka terminal ini di PC/tablet kaunter untuk memanggil nombor giliran.
              </p>
            </Link>

            <Link
              href="/peranti"
              className="p-5 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 rounded-2xl transition-all group"
            >
              <div className="text-2xl mb-2">📺</div>
              <h3 className="font-bold text-purple-900 text-sm group-hover:text-purple-700">Padankan Skrin TV</h3>
              <p className="text-xs text-purple-700/80 mt-1">
                Masukkan kod PIN 6-digit dari TV Display anda untuk paparan langsung.
              </p>
            </Link>
          </div>

          <div className="pt-6 border-t border-gray-100 flex items-center justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-8 py-3.5 bg-gray-900 hover:bg-black text-white font-extrabold rounded-2xl text-sm shadow-md cursor-pointer"
            >
              Masuk ke Dashboard Utama ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
