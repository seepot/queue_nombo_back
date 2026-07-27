"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function DaftarCawanganPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    idCawangan: "",
    negeri: "",
    alamat1: "",
    alamat2: "",
    alamat3: "",
    alamat4: "",
    noTelefon: "",
    noFaks: "",
    latitud: "",
    longitud: "",
    giliran: "1",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cawangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Pendaftaran Cawangan Berjaya" });
        setForm({ idCawangan: "", negeri: "", alamat1: "", alamat2: "", alamat3: "", alamat4: "", noTelefon: "", noFaks: "", latitud: "", longitud: "", giliran: "1" });
      } else {
        setMsg({ type: "error", text: data.error || "Pendaftaran gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Pendaftaran Cawangan Baru</h1>
        <p className="text-gray-500 mt-1">Daftar cawangan baru ke dalam sistem</p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Negeri</label>
              <select
                value={form.negeri}
                onChange={(e) => setForm({ ...form, negeri: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              >
                <option value="">Sila Pilih Negeri</option>
                {NEGERI_LIST.map((n) => (
                  <option key={n.code} value={n.code}>{n.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Cawangan</label>
              <input
                type="text"
                value={form.idCawangan}
                onChange={(e) => setForm({ ...form, idCawangan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="cth: 0105041A"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat 1</label>
            <input type="text" value={form.alamat1} onChange={(e) => setForm({ ...form, alamat1: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat 2</label>
            <input type="text" value={form.alamat2} onChange={(e) => setForm({ ...form, alamat2: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat 3</label>
            <input type="text" value={form.alamat3} onChange={(e) => setForm({ ...form, alamat3: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat 4</label>
            <input type="text" value={form.alamat4} onChange={(e) => setForm({ ...form, alamat4: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Telefon</label>
              <input type="text" value={form.noTelefon} onChange={(e) => setForm({ ...form, noTelefon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Faks</label>
              <input type="text" value={form.noFaks} onChange={(e) => setForm({ ...form, noFaks: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
              <input type="text" value={form.latitud} onChange={(e) => setForm({ ...form, latitud: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
              <input type="text" value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <p className="text-xs text-blue-600 mb-4">
              Untuk mendapatkan koordinat cawangan, pengguna boleh layari laman web{" "}
              <a href="https://www.maps.ie/coordinates.html" target="_blank" className="underline font-medium">MAP</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Menggunakan No Giliran JPJeQ? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="giliran"
                  value="1"
                  checked={form.giliran === "1"}
                  onChange={(e) => setForm({ ...form, giliran: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Ya</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="giliran"
                  value="0"
                  checked={form.giliran === "0"}
                  onChange={(e) => setForm({ ...form, giliran: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Tidak</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
          >
            {loading ? "Mendaftar..." : "Daftar Cawangan"}
          </button>
        </form>
      </div>
    </div>
  );
}
