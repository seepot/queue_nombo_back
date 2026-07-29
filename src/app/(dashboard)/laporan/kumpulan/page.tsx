"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function fmt(n: number): string {
  return n.toLocaleString("en-MY");
}

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
  const isAdmin = session?.user?.levelAkses === "1";
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
  const [negeri, setNegeri] = useState("");
  const [cawanganList, setCawanganList] = useState<CawanganOption[]>([]);
  const [selectedCawangan, setSelectedCawangan] = useState("");

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
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !selectedCawangan) return;
    setLoading(true);
    try {
      const cawParam = isAdmin ? `&cawangan=${selectedCawangan}` : "";
      const res = await fetch(
        `/api/laporan/kumpulan?dari=${dari}&hingga=${hingga}&jenis=${jenisLaporan}${cawParam}`
      );
      if (res.ok) {
        const result = await res.json();
        setData(result.data || []);
        setTajuk(result.tajuk || "");
        setActiveJenis(jenisLaporan);
      } else {
        const err = await res.json();
        console.error("API error:", err);
      }
    } catch (e) {
      console.error("Fetch error:", e);
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
          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Negeri <span className="text-red-500">*</span></label>
                <select value={negeri} onChange={(e) => handleNegeriChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Sila pilih Negeri</option>
                  {NEGERI_LIST.map((n) => (<option key={n.code} value={n.code}>{n.name}</option>))}
                </select>
              </div>
              {cawanganList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cawangan <span className="text-red-500">*</span></label>
                  <select value={selectedCawangan} onChange={(e) => setSelectedCawangan(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Sila pilih Cawangan</option>
                    {cawanganList.map((c) => (<option key={c.id_cawangan} value={c.id_cawangan}>{c.nama_cawangan}</option>))}
                  </select>
                </div>
              )}
            </div>
          )}
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Graf Transaksi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.map((row) => ({ label: `${getRowLabel(row)} - ${row.keterangan}`, Tiket: row.total_tiket, Selesai: row.total_selesai, Batal: row.total_batal }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
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
                    <td className="px-3 py-2 text-center">{fmt(row.total_tiket)}</td>
                    <td className="px-3 py-2 text-center">{fmt(row.total_selesai)}</td>
                    <td className="px-3 py-2 text-center">{fmt(row.total_batal)}</td>
                    <td className="px-3 py-2 text-center">{fmt(row.total_lain)}</td>
                    <td className="px-3 py-2 text-center">{row.avg_menunggu || "-"}</td>
                    <td className="px-3 py-2 text-center">{row.avg_layanan || "-"}</td>
                    <td className="px-3 py-2 text-center">{row.max_menunggu || "-"}</td>
                    <td className="px-3 py-2 text-center">{row.max_layanan || "-"}</td>
                    <td className="px-3 py-2 text-center">{row.total_masa || "-"}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-3 py-2 text-right" colSpan={3}>Jumlah Keseluruhan</td>
                  <td className="px-3 py-2 text-center">{fmt(data.reduce((s, r) => s + r.total_tiket, 0))}</td>
                  <td className="px-3 py-2 text-center">{fmt(data.reduce((s, r) => s + r.total_selesai, 0))}</td>
                  <td className="px-3 py-2 text-center">{fmt(data.reduce((s, r) => s + r.total_batal, 0))}</td>
                  <td className="px-3 py-2 text-center">{fmt(data.reduce((s, r) => s + r.total_lain, 0))}</td>
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
