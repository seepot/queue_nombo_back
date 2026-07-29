"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Format number with thousand separator
function fmt(n: number): string {
  return n.toLocaleString("en-MY");
}

interface ReportRow {
  tarikh?: string;
  bulan?: number;
  tahun?: number;
  bil_tiket: number;
  bil_selesai: number;
  bil_batal: number;
  batal_cust: number;
  batal_kaunter: number;
  bil_lain: number;
  purata_masa_menunggu: string | null;
  purata_masa_layanan: string | null;
  masa?: string;
  jum?: number;
}

export default function LaporanTransaksiPage() {
  const { data: session } = useSession();
  const [dari, setDari] = useState(
    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [hingga, setHingga] = useState(
    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [jenisLaporan, setJenisLaporan] = useState("1");
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tajuk, setTajuk] = useState("");
  const [activeJenis, setActiveJenis] = useState("1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const hg = jenisLaporan === "4" ? dari : hingga;
      const res = await fetch(
        `/api/laporan/transaksi?dari=${dari}&hingga=${hg}&jenis=${jenisLaporan}`
      );
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
        setTajuk(result.tajuk);
        setActiveJenis(jenisLaporan);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getHeaderLabel = () => {
    if (activeJenis === "1") return "Tarikh";
    if (activeJenis === "2") return "Bulan";
    return "Tahun";
  };

  const getRowLabel = (row: ReportRow) => {
    if (activeJenis === "1") return row.tarikh || "-";
    if (activeJenis === "2") {
      const months = ["", "Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
      return `${months[row.bulan || 0]} ${row.tahun}`;
    }
    return String(row.tahun || "-");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Transaksi</h1>
        <p className="text-gray-500 mt-1">
          {session?.user?.namaCawangan}
        </p>
      </div>

      {/* Filter Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Laporan
              </label>
              <select
                value={jenisLaporan}
                onChange={(e) => setJenisLaporan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="1">Harian</option>
                <option value="2">Bulanan</option>
                <option value="3">Tahunan</option>
                <option value="4">Mengikut Jam</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dari
              </label>
              <input
                type="date"
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            {jenisLaporan !== "4" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hingga
                </label>
                <input
                  type="date"
                  value={hingga}
                  onChange={(e) => setHingga(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
          >
            {loading ? "Memuatkan..." : "HANTAR"}
          </button>
        </form>
      </div>

      {/* Chart */}
      {data.length > 0 && activeJenis !== "4" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Graf Transaksi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.map((row) => ({ label: getRowLabel(row), Tiket: row.bil_tiket, Selesai: row.bil_selesai, Batal: row.bil_batal }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Tiket" fill="#3b82f6" />
              <Bar dataKey="Selesai" fill="#22c55e" />
              <Bar dataKey="Batal" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results Table */}
      {data.length > 0 && activeJenis !== "4" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">{tajuk}</h3>
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition">Cetak</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{getHeaderLabel()}</th>
                  <th className="px-4 py-3 text-left font-medium">Bil. Tiket</th>
                  <th className="px-4 py-3 text-left font-medium">Selesai</th>
                  <th className="px-4 py-3 text-left font-medium">Batal</th>
                  <th className="px-4 py-3 text-left font-medium">Batal (Pelanggan)</th>
                  <th className="px-4 py-3 text-left font-medium">Batal (Kaunter)</th>
                  <th className="px-4 py-3 text-left font-medium">Lain-lain</th>
                  <th className="px-4 py-3 text-left font-medium">Purata Menunggu</th>
                  <th className="px-4 py-3 text-left font-medium">Purata Layanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{getRowLabel(row)}</td>
                    <td className="px-4 py-3">{fmt(row.bil_tiket)}</td>
                    <td className="px-4 py-3">{fmt(row.bil_selesai)}</td>
                    <td className="px-4 py-3">{fmt(row.bil_batal)}</td>
                    <td className="px-4 py-3">{fmt(row.batal_cust)}</td>
                    <td className="px-4 py-3">{fmt(row.batal_kaunter)}</td>
                    <td className="px-4 py-3">{fmt(row.bil_lain)}</td>
                    <td className="px-4 py-3">{row.purata_masa_menunggu || "-"}</td>
                    <td className="px-4 py-3">{row.purata_masa_layanan || "-"}</td>
                  </tr>
                ))}
                {/* Totals */}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3">Jumlah</td>
                  <td className="px-4 py-3">{fmt(data.reduce((s, r) => s + (r.bil_tiket || 0), 0))}</td>
                  <td className="px-4 py-3">{fmt(data.reduce((s, r) => s + (r.bil_selesai || 0), 0))}</td>
                  <td className="px-4 py-3">{fmt(data.reduce((s, r) => s + (r.bil_batal || 0), 0))}</td>
                  <td className="px-4 py-3">{fmt(data.reduce((s, r) => s + (r.batal_cust || 0), 0))}</td>
                  <td className="px-4 py-3">{fmt(data.reduce((s, r) => s + (r.batal_kaunter || 0), 0))}</td>
                  <td className="px-4 py-3">{fmt(data.reduce((s, r) => s + (r.bil_lain || 0), 0))}</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hourly Results Table */}
      {data.length > 0 && activeJenis === "4" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">{tajuk}</h3>
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition">Cetak</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white text-center">
                  <th className="px-4 py-3 border border-gray-700 font-medium">Bil</th>
                  <th className="px-4 py-3 border border-gray-700 font-medium">Tarikh</th>
                  <th className="px-4 py-3 border border-gray-700 font-medium">Jam</th>
                  <th className="px-4 py-3 border border-gray-700 font-medium">Jumlah Tiket</th>
                  <th className="px-4 py-3 border border-gray-700 font-medium">Tiket Dibatalkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">{idx + 1}</td>
                    <td className="px-4 py-3 text-center">{row.tarikh || "-"}</td>
                    <td className="px-4 py-3 text-center">{row.masa || "-"}</td>
                    <td className="px-4 py-3 text-center">{fmt(row.bil_tiket)}</td>
                    <td className="px-4 py-3 text-center">{fmt(row.batal_cust || 0)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 text-right" colSpan={3}>Jumlah</td>
                  <td className="px-4 py-3 text-center">{fmt(data.reduce((s, r) => s + r.bil_tiket, 0))}</td>
                  <td className="px-4 py-3 text-center">{fmt(data.reduce((s, r) => s + (r.batal_cust || 0), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
