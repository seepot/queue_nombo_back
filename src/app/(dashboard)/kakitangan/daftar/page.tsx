"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function DaftarKakitanganPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    nama: "",
    nokp: "",
    username: "",
    akses: "3", // default to Staff Kaunter
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
          cawangan: session?.user?.idCawangan,
          akses: Number(form.akses),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMsg({ type: "success", text: "Pendaftaran Kakitangan Berjaya" });
        setForm({ nama: "", nokp: "", username: "", akses: "3" });
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
        <h1 className="text-2xl font-bold text-gray-800">Daftar Kakitangan Baru</h1>
        <p className="text-gray-500 mt-1">
          Pendaftaran pengguna baru untuk cawangan {session?.user?.namaCawangan}
        </p>
      </div>

      {msg && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            msg.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Penuh
            </label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Kad Pengenalan
            </label>
            <input
              type="text"
              value={form.nokp}
              onChange={(e) => setForm({ ...form, nokp: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="tanpa '-'"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              value={form.akses}
              onChange={(e) => setForm({ ...form, akses: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="3">Kakitangan</option>
              <option value="2">Admin Cawangan</option>
              <option value="4">ID Tiket</option>
              <option value="5">Auto QR</option>
            </select>
          </div>

          <div className="text-xs text-gray-400">
            Kata laluan default: No. Kad Pengenalan (SHA1)
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg text-sm transition"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>
      </div>
    </div>
  );
}
