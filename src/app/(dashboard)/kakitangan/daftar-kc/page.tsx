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

interface CawanganOption {
  id_cawangan: string;
  nama_cawangan: string;
}

export default function DaftarKCPage() {
  const router = useRouter();
  const [negeri, setNegeri] = useState("");
  const [cawanganList, setCawanganList] = useState<CawanganOption[]>([]);
  const [form, setForm] = useState({
    cawangan: "",
    nama: "",
    nokp: "",
    username: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleNegeriChange = async (code: string) => {
    setNegeri(code);
    setForm({ ...form, cawangan: "" });
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
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/kakitangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          nokp: form.nokp,
          username: form.username,
          cawangan: form.cawangan,
          akses: 2, // Ketua Cawangan
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Pendaftaran Ketua Cawangan Berjaya" });
        setForm({ cawangan: "", nama: "", nokp: "", username: "" });
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
        <h1 className="text-2xl font-bold text-gray-800">Pendaftaran Ketua Cawangan</h1>
        <p className="text-gray-500 mt-1">Daftar pengguna baharu dengan akses Ketua Cawangan</p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Negeri <span className="text-red-500">*</span>
            </label>
            <select
              value={negeri}
              onChange={(e) => handleNegeriChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                Cawangan <span className="text-red-500">*</span>
              </label>
              <select
                value={form.cawangan}
                onChange={(e) => setForm({ ...form, cawangan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              >
                <option value="">Sila pilih Cawangan</option>
                {cawanganList.map((c) => (
                  <option key={c.id_cawangan} value={c.id_cawangan}>{c.nama_cawangan}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Penuh <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Kad Pengenalan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nokp}
              onChange={(e) => setForm({ ...form, nokp: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="tanpa '-'"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>

          <div className="text-xs text-gray-400">
            Kata laluan default: No. Kad Pengenalan (SHA1)
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg text-sm transition"
          >
            {loading ? "Mendaftar..." : "Daftar Ketua Cawangan"}
          </button>
        </form>
      </div>
    </div>
  );
}
