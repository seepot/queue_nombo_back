"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CawanganData {
  id: number;
  idCawangan: string | null;
  namaCawangan: string;
  alamat1: string | null;
  alamat2: string | null;
  alamat3: string | null;
  alamat4: string | null;
  noTelefon: string | null;
  no_faks: string | null;
  radius: number | null;
  sela_masa: number | null;
}

interface Props {
  data: CawanganData | null;
}

export default function PentadbiranInfoClient({ data }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    alamat1: data?.alamat1 || "",
    alamat2: data?.alamat2 || "",
    alamat3: data?.alamat3 || "",
    alamat4: data?.alamat4 || "",
    noTelefon: data?.noTelefon || "",
    no_faks: data?.no_faks || "",
    radius: data?.radius || 0,
  });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/pentadbiran/info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Maklumat telah dikemaskini" });
        router.refresh();
      } else {
        setMsg({ type: "error", text: "Kemaskini gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <p className="text-gray-400">Tiada data cawangan</p>;

  return (
    <div>
      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Cawangan</label>
            <input type="text" value={data.namaCawangan} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Telefon</label>
              <input type="text" value={form.noTelefon} onChange={(e) => setForm({ ...form, noTelefon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Faks</label>
              <input type="text" value={form.no_faks} onChange={(e) => setForm({ ...form, no_faks: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Radius (meter)</label>
            <input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>

          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-2 rounded-lg text-sm transition">
            {loading ? "Menyimpan..." : "Kemaskini"}
          </button>
        </form>
      </div>
    </div>
  );
}
