"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface ReportRow {
  tarikh?: string;
  bulan?: number;
  tahun?: number;
  bil_tiket: number;
  bil_selesai: number;
  bil_batal: number;
  batal_kaunter: number;
  batal_cust: number;
}

export default function LaporanPerkhidmatanPage() {
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
        `/api/laporan/transaksi?dari=${dari}&hingga=${hingga}&jenis=${jenisLaporan}&jenis_laporan=perkhidmatan`
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
        <h1 className="text-2xl font-bold text-gray-800">Laporan Perkhidmatan</h1>
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
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition"
            >
              Cetak
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white text-center">
                  <th className="px-4 py-3 border border-gray-700 font-medium" rowSpan={2}>Bil</th>
                  <th className="px-4 py-3 border border-gray-700 font-medium" rowSpan={2}>{getHeaderLabel()}</th>
                  <th className="px-4 py-3 border border-gray-700 font-medium" rowSpan={2}>Bilangan Transaksi</th>
                  <th className="px-4 py-3 border border-gray-700 font-medium" rowSpan={2}>Transaksi Selesai</th>
                  <th className="px-4 py-3 border border-gray-700 font-medium" colSpan={3}>Transaksi Batal</th>
                </tr>
                <tr className="bg-gray-800 text-white text-center">
                  <th className="px-4 py-2 border border-gray-700 font-medium">Pelanggan</th>
                  <th className="px-4 py-2 border border-gray-700 font-medium">Kaunter</th>
                  <th className="px-4 py-2 border border-gray-700 font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">{idx + 1}</td>
                    <td className="px-4 py-3">{getRowLabel(row)}</td>
                    <td className="px-4 py-3 text-center">{row.bil_tiket}</td>
                    <td className="px-4 py-3 text-center">{row.bil_selesai}</td>
                    <td className="px-4 py-3 text-center">{row.batal_cust}</td>
                    <td className="px-4 py-3 text-center">{row.batal_kaunter}</td>
                    <td className="px-4 py-3 text-center">{row.batal_cust + row.batal_kaunter}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 text-right" colSpan={2}>Jumlah</td>
                  <td className="px-4 py-3 text-center">{data.reduce((s, r) => s + r.bil_tiket, 0)}</td>
                  <td className="px-4 py-3 text-center">{data.reduce((s, r) => s + r.bil_selesai, 0)}</td>
                  <td className="px-4 py-3 text-center">{data.reduce((s, r) => s + r.batal_cust, 0)}</td>
                  <td className="px-4 py-3 text-center">{data.reduce((s, r) => s + r.batal_kaunter, 0)}</td>
                  <td className="px-4 py-3 text-center">{data.reduce((s, r) => s + r.batal_cust + r.batal_kaunter, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
