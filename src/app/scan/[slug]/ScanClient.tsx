"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

interface CategoryItem {
  id: string;
  name: string;
  prefixCode: string;
  startNumber: number;
  estimatedMinutes: number;
  waitingCount: number;
}

interface BranchData {
  id: string;
  name: string;
  code: string;
  address: string | null;
  tenantName: string;
  tenantSlug: string;
  categories: CategoryItem[];
}

export default function ScanClient({ branch }: { branch: BranchData }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(branch.categories[0]?.id || "");
  const [customerName, setCustomerName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGetTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    if (!selectedCategory) {
      setErrorMessage("Sila pilih satu kategori perkhidmatan.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/tickets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branch.id,
          categoryId: selectedCategory,
          customerName: customerName || undefined,
          phoneNo: phoneNo || undefined,
          requestType: "QR_WEB",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Gagal menjana nombor giliran.");
      } else {
        // Terus redirect ke halaman tiket peribadi pelanggan
        router.push(`/ticket/${data.ticket.id}`);
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Ralat rangkaian. Sila cuba sebentar lagi."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-gray-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <div className="text-center pt-3 pb-2">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold rounded-full tracking-wider uppercase mb-2">
          {branch.tenantName}
        </span>
        <h1 className="text-2xl font-black text-gray-900">{branch.name}</h1>
        {branch.address && (
          <p className="text-xs text-gray-500 mt-0.5 max-w-sm mx-auto">{branch.address}</p>
        )}
      </div>

      {/* Main Selection Card */}
      <div className="max-w-md w-full mx-auto my-auto py-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6">
          <div className="text-center border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Ambil Nombor Giliran Maya</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Pilih urusan anda di bawah untuk menyertai barisan giliran.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl animate-in fade-in">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleGetTicket} className="space-y-4">
            {/* Category Radio Cards */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Pilih Jenis Urusan Anda:
              </label>

              {branch.categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 shadow-xs"
                        : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-10 h-10 rounded-xl font-mono font-bold flex items-center justify-center text-lg ${
                          isSelected ? "bg-blue-600 text-white shadow-xs" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {cat.prefixCode}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">{cat.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cat.waitingCount} orang menunggu • ~{(cat.waitingCount + 1) * cat.estimatedMinutes} min
                        </p>
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="category"
                      value={cat.id}
                      checked={isSelected}
                      onChange={() => setSelectedCategory(cat.id)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>

            {/* Optional Customer Info */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nama Anda (Pilihan)
                </label>
                <input
                  type="text"
                  placeholder="Cth: Ahmad"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  No. Telefon untuk Notifikasi WhatsApp (Pilihan)
                </label>
                <input
                  type="tel"
                  placeholder="Cth: 0123456789"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-600/30 transition-all text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {loading ? "Menjana Tiket..." : "Ambil Nombor Giliran ➔"}
            </button>
          </form>
        </div>

        {/* Instructions */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Tiket digital akan dijana serta-merta tanpa perlu memasang aplikasi.
        </p>
      </div>

      {/* Footer Branding */}
      <div className="text-center pb-2 text-xs text-gray-400">
        Dikuasakan oleh <span className="font-bold text-blue-600">QueNombo</span>
      </div>
    </div>
  );
}
