"use client";

import { useState } from "react";

interface Kumpulan {
  id: number;
  keterangan: string;
}

interface HariCuti {
  id: number;
  namaHari: string;
}

interface CutiUmum {
  id: number;
  tarikh1: string;
  keterangan: string | null;
}

interface WaktuOperasi {
  id: number;
  namaHari: string | null;
  waktuMula: string | null;
  waktuTamat: string | null;
  sesi: string | null;
}

interface Props {
  kumpulan: Kumpulan[];
  hariCuti: HariCuti[];
  cutiUmum: CutiUmum[];
  waktuOperasi: WaktuOperasi[];
}

export default function TemujanjiClient({
  kumpulan,
  hariCuti,
  cutiUmum,
  waktuOperasi,
}: Props) {
  const [activeTab, setActiveTab] = useState<"create" | "cancel" | "list">("create");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    tarikh1: "",
    tarikh2: "",
    kump: "",
    bilSlot: 5,
    bilMax: 50,
  });

  const [cancelData, setCancelData] = useState({
    tarikh1: "",
    tarikh2: "",
    catatan: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/temujanji", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage(`Slot temujanji telah diwujudkan. (${data.slotsCreated} slot)`);
    } else {
      setMessage("Ralat: Gagal mewujudkan slot temujanji.");
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Adakah anda pasti untuk membatalkan slot ini?")) return;

    setLoading(true);
    const res = await fetch("/api/temujanji", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cancelData),
    });

    setLoading(false);
    if (res.ok) {
      setMessage("Slot temujanji telah dibatalkan.");
    }
  };

  const tabs = [
    { key: "create" as const, label: "Wujudkan Slot" },
    { key: "cancel" as const, label: "Batalkan Slot" },
    { key: "list" as const, label: "Maklumat" },
  ];

  return (
    <div>
      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Create Slots */}
      {activeTab === "create" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Wujudkan Slot Temujanji
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarikh Mula
              </label>
              <input
                type="date"
                value={formData.tarikh1}
                onChange={(e) =>
                  setFormData({ ...formData, tarikh1: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarikh Akhir
              </label>
              <input
                type="date"
                value={formData.tarikh2}
                onChange={(e) =>
                  setFormData({ ...formData, tarikh2: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kumpulan Perkhidmatan
              </label>
              <select
                value={formData.kump}
                onChange={(e) =>
                  setFormData({ ...formData, kump: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              >
                <option value="">Pilih Kumpulan</option>
                {kumpulan.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.keterangan}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bilangan Slot Per Masa
              </label>
              <input
                type="number"
                value={formData.bilSlot}
                onChange={(e) =>
                  setFormData({ ...formData, bilSlot: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Had Maksimum Harian
              </label>
              <input
                type="number"
                value={formData.bilMax}
                onChange={(e) =>
                  setFormData({ ...formData, bilMax: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                min={1}
                required
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Wujudkan Slot"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Slots */}
      {activeTab === "cancel" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Batalkan Slot Temujanji
          </h3>
          <form onSubmit={handleCancel} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarikh Mula
              </label>
              <input
                type="date"
                value={cancelData.tarikh1}
                onChange={(e) =>
                  setCancelData({ ...cancelData, tarikh1: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarikh Akhir
              </label>
              <input
                type="date"
                value={cancelData.tarikh2}
                onChange={(e) =>
                  setCancelData({ ...cancelData, tarikh2: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan Pembatalan
              </label>
              <textarea
                value={cancelData.catatan}
                onChange={(e) =>
                  setCancelData({ ...cancelData, catatan: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={3}
                required
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Batalkan Slot"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info */}
      {activeTab === "list" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Waktu Operasi
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Hari</th>
                    <th className="px-4 py-2 text-left">Mula</th>
                    <th className="px-4 py-2 text-left">Tamat</th>
                    <th className="px-4 py-2 text-left">Sesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {waktuOperasi.map((w) => (
                    <tr key={w.id}>
                      <td className="px-4 py-2">{w.namaHari}</td>
                      <td className="px-4 py-2">{w.waktuMula}</td>
                      <td className="px-4 py-2">{w.waktuTamat}</td>
                      <td className="px-4 py-2">{w.sesi || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Hari Cuti Mingguan
              </h3>
              <div className="flex flex-wrap gap-2">
                {hariCuti.length > 0 ? (
                  hariCuti.map((h) => (
                    <span
                      key={h.id}
                      className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
                    >
                      {h.namaHari}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">Tiada hari cuti ditetapkan</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Cuti Umum
              </h3>
              {cutiUmum.length > 0 ? (
                <ul className="space-y-2">
                  {cutiUmum.map((c) => (
                    <li key={c.id} className="text-sm text-gray-600">
                      <span className="font-medium">{c.tarikh1}</span>
                      {c.keterangan && ` - ${c.keterangan}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm">Tiada cuti umum didaftarkan</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
