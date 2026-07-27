"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface ReportRow {
  tarikh?: string;
  bulan?: number;
  tahun?: number;
  keterangan: string;
  total_tiket: number;
  total_selesai: number;
  total_batal: number;
  total_lain: number;
  avg_menunggu: string | null;
  avg_layanan: string | null;
  max_menunggu: string | null;
  max_layanan: string | null;
  total_masa: string | null;
}

export default function LaporanKumpulanPage() {
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
      const res = await fetch(
        `/api/laporan/kumpulan?dari=${dari}&hingga=${hingga}&jenis=${jenisLaporan}`
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
        <h1 className="text-2xl font-bold text-gray-800">Laporan Kumpulan Perkhidmatan</h1>
        <p className="text-gray-500 mt-1">{session?.user?.namaCawangan}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Laporan</label>
              <select value={jenisLaporan} onChange={(e) => setJenisLaporan(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="1">Harian</option>
                <option value="2">Bulanan</option>
                <option value="3">Tahunan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dari</label>
              <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hingga</label>
              <input type="date" value={hingga} onChange={(e) => setHingga(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-2 rounded-lg text-sm transition">
            {loading ? "Memuatkan..." : "HANTAR"}
          </button>
        </form>
      </div>

      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">{tajuk}</h3>
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition">Cetak</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white text-center">
                  <th className="px-3 py-3 border border-gray-700 font-medium">Bil</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">{getHeaderLabel()}</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Perkhidmatan</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Transaksi<br/>Tiket</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Transaksi<br/>Selesai</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Transaksi<br/>Batal</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Transaksi<br/>Lain</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Purata Masa<br/>Menunggu</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Purata Masa<br/>Perkhidmatan</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Masa Menunggu<br/>Terlama</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Masa Perkhidmatan<br/>Terlama</th>
                  <th className="px-3 py-3 border border-gray-700 font-medium">Jumlah Masa<br/>Perkhidmatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-center">{idx + 1}</td>
                    <td className="px-3 py-2">{getRowLabel(row)}</td>
                    <td className="px-3 py-2">{row.keterangan}</td>
                    <td className="px-3 py-2 text-center">{row.total_tiket}</td>
                    <td className="px-3 py-2 text-center">{row.total_selesai}</td>
                    <td className="px-3 py-2 text-center">{row.total_batal}</td>
                    <td className="px-3 py-2 text-center">{row.total_lain}</td>
                    <td className="px-3 py-2 text-center">{row.avg_menunggu || "-"}</td>
                    <td className="px-3 py-2 text-center">{row.avg_layanan || "-"}</td>
                    <td className="px-3 py-2 text-center">{row.max_menunggu || "-"}</td>
                    <td className="px-3 py-2 text-center">{row.max_layanan || "-"}</td>
                    <td className="px-3 py-2 text-center">{row.total_masa || "-"}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-3 py-2 text-right" colSpan={3}>Jumlah Keseluruhan</td>
                  <td className="px-3 py-2 text-center">{data.reduce((s, r) => s + r.total_tiket, 0)}</td>
                  <td className="px-3 py-2 text-center">{data.reduce((s, r) => s + r.total_selesai, 0)}</td>
                  <td className="px-3 py-2 text-center">{data.reduce((s, r) => s + r.total_batal, 0)}</td>
                  <td className="px-3 py-2 text-center">{data.reduce((s, r) => s + r.total_lain, 0)}</td>
                  <td className="px-3 py-2 text-center" colSpan={5}>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
