"use client";

import { useState } from "react";

const NEGERI_LIST = [
  { code: "01", name: "Johor" },
  { code: "02", name: "Kedah" },
  { code: "03", name: "Kelantan" },
  { code: "04", name: "Melaka" },
  { code: "05", name: "Negeri Sembilan" },
  { code: "06", name: "Pahang" },
  { code: "07", name: "Pulau Pinang" },
  { code: "08", name: "Perak" },
  { code: "09", name: "Perlis" },
  { code: "10", name: "Selangor" },
  { code: "11", name: "Terengganu" },
  { code: "12", name: "Sabah" },
  { code: "13", name: "Sarawak" },
  { code: "14", name: "WP Kuala Lumpur" },
  { code: "15", name: "WP Labuan" },
  { code: "16", name: "WP Putrajaya" },
];

interface CawanganOption {
  id_cawangan: string;
  nama_cawangan: string;
}

interface KaunterRow {
  nama_cawangan: string;
  keterangan: string | null;
  no_kaunter: string | null;
  bil_tiket: number;
}

export default function MaklumatKaunterPage() {
  const [negeri, setNegeri] = useState("");
  const [cawanganList, setCawanganList] = useState<CawanganOption[]>([]);
  const [selectedCawangan, setSelectedCawangan] = useState("");
  const [data, setData] = useState<KaunterRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleNegeriChange = async (code: string) => {
    setNegeri(code);
    setSelectedCawangan("");
    setCawanganList([]);
    if (!code) return;

    try {
      const res = await fetch(`/api/cawangan/list?negeri=${code}`);
      if (res.ok) {
        const result = await res.json();
        setCawanganList(result.data);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negeri) return;
    setLoading(true);
    try {
      const url = selectedCawangan
        ? `/api/cawangan/kaunter-info?negeri=${negeri}&cawangan=${selectedCawangan}`
        : `/api/cawangan/kaunter-info?negeri=${negeri}`;
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Maklumat Pengoperasian Kaunter</h1>
        <p className="text-gray-500 mt-1">Maklumat kaunter mengikut cawangan</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Negeri <span className="text-red-500">*</span>
            </label>
            <select
              value={negeri}
              onChange={(e) => handleNegeriChange(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="">Sila pilih Negeri</option>
              {NEGERI_LIST.map((n) => (
                <option key={n.code} value={n.code}>{n.name}</option>
              ))}
            </select>
          </div>

          {cawanganList.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cawangan
              </label>
              <select
                value={selectedCawangan}
                onChange={(e) => setSelectedCawangan(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Semua Cawangan</option>
                {cawanganList.map((c) => (
                  <option key={c.id_cawangan} value={c.id_cawangan}>
                    {c.nama_cawangan}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
          >
            {loading ? "Mencari..." : "Cari"}
          </button>
        </form>
      </div>

      {/* Results */}
      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">Maklumat Kaunter</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Bil</th>
                  <th className="px-4 py-2 text-left">Cawangan</th>
                  <th className="px-4 py-2 text-left">Perkhidmatan</th>
                  <th className="px-4 py-2 text-center">Kaunter</th>
                  <th className="px-4 py-2 text-center">Bil. Tiket</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.filter((row) => row.no_kaunter && row.keterangan).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2">{row.nama_cawangan}</td>
                    <td className="px-4 py-2">{row.keterangan}</td>
                    <td className="px-4 py-2 text-center">{row.no_kaunter}</td>
                    <td className="px-4 py-2 text-center">{row.bil_tiket}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-2 text-right" colSpan={4}>Jumlah</td>
                  <td className="px-4 py-2 text-center">{data.filter((r) => r.no_kaunter && r.keterangan).reduce((s, r) => s + r.bil_tiket, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
