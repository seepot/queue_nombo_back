"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Staff {
  id: number;
  nama: string | null;
  uname: string | null;
  nokp: string | null;
}

interface Kaunter {
  id: number;
  no_kaunter: string;
  keterangan: string;
}

interface Jadual {
  id: number;
  nokp: string;
  id_kaunter: number;
  tarikh_mula: string | null;
  tarikh_tamat: string | null;
  nama: string | null;
  no_kaunter: string | null;
  keterangan: string | null;
}

interface Props {
  staff: Staff[];
  kaunters: Kaunter[];
  jadualList: Jadual[];
}

export default function JadualClient({ staff, kaunters, jadualList }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    kakitangan: "",
    kaunter: "",
    tarikhmula: new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    tarikhakhir: new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  });
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/jadual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Pendaftaran Tugas Berjaya" });
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.error || "Pendaftaran gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Padam jadual ini?")) return;
    const res = await fetch(`/api/jadual?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg({ type: "success", text: "Jadual berjaya dipadam" });
      router.refresh();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return dateStr.slice(0, 10);
  };

  return (
    <div>
      {msg && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            msg.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {msg.text}
          <button
            onClick={() => setMsg(null)}
            className="ml-2 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Registration Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Daftar Jadual Kerja
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kakitangan
            </label>
            <select
              value={formData.kakitangan}
              onChange={(e) =>
                setFormData({ ...formData, kakitangan: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="">Sila pilih Kakitangan</option>
              {staff.map((s) => (
                <option key={s.id} value={s.nokp || s.uname || ""}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kaunter
            </label>
            <select
              value={formData.kaunter}
              onChange={(e) =>
                setFormData({ ...formData, kaunter: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="">Sila pilih Kaunter</option>
              {kaunters.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.no_kaunter} - {k.keterangan}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarikh Bertugas
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={formData.tarikhmula}
                onChange={(e) =>
                  setFormData({ ...formData, tarikhmula: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
              <span className="text-sm text-gray-500">Hingga</span>
              <input
                type="date"
                value={formData.tarikhakhir}
                onChange={(e) =>
                  setFormData({ ...formData, tarikhakhir: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
          >
            {loading ? "Menyimpan..." : "SIMPAN"}
          </button>
        </form>
      </div>

      {/* Senarai Jadual */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Senarai Jadual Bertugas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Kakitangan
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Kaunter
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Perkhidmatan
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Tarikh Mula
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Tarikh Tamat
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Tindakan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jadualList.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Tiada jadual bertugas didaftarkan
                  </td>
                </tr>
              ) : (
                jadualList.map((j, idx) => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{j.nama || j.nokp}</td>
                    <td className="px-4 py-3">{j.no_kaunter || "-"}</td>
                    <td className="px-4 py-3">{j.keterangan || "-"}</td>
                    <td className="px-4 py-3">{formatDate(j.tarikh_mula)}</td>
                    <td className="px-4 py-3">{formatDate(j.tarikh_tamat)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(j.id)}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium"
                      >
                        Padam
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
