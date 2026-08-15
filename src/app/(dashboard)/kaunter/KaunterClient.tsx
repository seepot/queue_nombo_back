"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Kaunter {
  id: number;
  noKaunter: string | null;
  namaKaunter: string | null;
  idPerkhidmatanKumpulan: number | null;
  susunanKeutamaan: string | null;
  zon: string | null;
  jumlahTransaksi?: number;
  noTerakhir?: number | null;
  tarikh?: string | null;
  tempohMasa?: string | null;
}

interface Kumpulan {
  id: number;
  keterangan: string | null;
}

interface Zon {
  id: number;
  zon: string;
  catatan: string;
}

interface Props {
  kaunters: Kaunter[];
  kumpulan: Kumpulan[];
  zon: Zon[];
  namaCawangan: string;
}

export default function KaunterClient({ kaunters, kumpulan, zon, namaCawangan }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState<Kaunter | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState({
    noKaunter: "",
    kumpulan: "",
    utama1: "",
    utama2: "",
    utama3: "",
    utama4: "",
    utama5: "",
    zon: "",
  });

  const getKumpulanName = (id: number | null) => {
    if (!id) return "-";
    return kumpulan.find((k) => k.id === id)?.keterangan || "-";
  };

  const getSusunanNames = (susunan: string | null) => {
    if (!susunan) return "-";
    return susunan
      .split(",")
      .map((id, i) => {
        const name = kumpulan.find((k) => k.id === Number(id.trim()))?.keterangan;
        return `${i + 1}.${name || id}`;
      })
      .join("\n");
  };

  const getZonName = (zonId: string | null) => {
    if (!zonId) return "-";
    const item = zon.find((z) => String(z.id) === String(zonId));
    if (!item) return zonId;
    return item.catatan ? `${item.zon} - ${item.catatan}` : item.zon;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const susunan = [formData.utama1, formData.utama2, formData.utama3, formData.utama4, formData.utama5]
      .filter(Boolean)
      .join(",");

    const res = await fetch("/api/kaunter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noKaunter: formData.noKaunter,
        idPerkhidmatanKumpulan: Number(formData.kumpulan) || null,
        susunanKeutamaan: susunan || null,
        zon: formData.zon || null,
      }),
    });

    if (res.ok) {
      setMsg({ type: "success", text: "Pendaftaran Kaunter Berjaya" });
      setShowForm(false);
      setFormData({ noKaunter: "", kumpulan: "", utama1: "", utama2: "", utama3: "", utama4: "", utama5: "", zon: "" });
      router.refresh();
    } else {
      setMsg({ type: "error", text: "Pendaftaran gagal" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Adakah anda pasti untuk memadamkan kaunter ini?")) return;
    const res = await fetch(`/api/kaunter?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg({ type: "success", text: "Kaunter berjaya dipadamkan" });
      router.refresh();
    } else {
      setMsg({ type: "error", text: "Penghapusan gagal" });
    }
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
          <button onClick={() => setMsg(null)} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cawangan</th>
                <th className="px-4 py-3 text-left font-medium">Kaunter</th>
                <th className="px-4 py-3 text-left font-medium">Zon/Aras</th>
                <th className="px-4 py-3 text-left font-medium">Perkhidmatan</th>
                <th className="px-4 py-3 text-left font-medium">Jumlah Transaksi</th>
                <th className="px-4 py-3 text-left font-medium">No. Terakhir</th>
                <th className="px-4 py-3 text-left font-medium">Tarikh</th>
                <th className="px-4 py-3 text-left font-medium">Tempoh Masa</th>
                <th className="px-4 py-3 text-left font-medium">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kaunters.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Tiada kaunter didaftarkan
                  </td>
                </tr>
              ) : (
                kaunters.map((k) => (
                  <tr key={k.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{namaCawangan}</td>
                    <td className="px-4 py-3">{k.noKaunter || "-"}</td>
                    <td className="px-4 py-3">{getZonName(k.zon)}</td>
                    <td className="px-4 py-3">{getKumpulanName(k.idPerkhidmatanKumpulan)}</td>
                    <td className="px-4 py-3">{k.jumlahTransaksi ?? 0}</td>
                    <td className="px-4 py-3">{k.noTerakhir ?? "-"}</td>
                    <td className="px-4 py-3">{k.tarikh || "-"}</td>
                    <td className="px-4 py-3">{k.tempohMasa || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewItem(k)}
                          className="px-2 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs font-medium"
                        >
                          Lihat
                        </button>
                        <button
                          onClick={() => handleDelete(k.id)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium"
                        >
                          Padam
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tambah Kaunter button */}
      <div className="mt-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          {showForm ? "Tutup" : "+ Tambah Kaunter"}
        </button>
      </div>

      {/* Registration Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Pendaftaran Kaunter Baru
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No Kaunter
                </label>
                <input
                  type="text"
                  value={formData.noKaunter}
                  onChange={(e) => setFormData({ ...formData, noKaunter: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zon/Aras
                </label>
                <select
                  value={formData.zon}
                  onChange={(e) => setFormData({ ...formData, zon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Sila Pilih Zon/Aras</option>
                  {zon.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.catatan ? `${z.zon} - ${z.catatan}` : z.zon}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kumpulan Perkhidmatan
                </label>
                <select
                  value={formData.kumpulan}
                  onChange={(e) => setFormData({ ...formData, kumpulan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                >
                  <option value="">Sila Pilih Kumpulan</option>
                  {kumpulan.map((k) => (
                    <option key={k.id} value={k.id}>{k.keterangan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Susunan Keutamaan
                </label>
                {[1, 2, 3, 4, 5].map((n) => (
                  <select
                    key={n}
                    value={formData[`utama${n}` as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [`utama${n}`]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                  >
                    <option value="">Pilihan {n}</option>
                    {kumpulan.map((k) => (
                      <option key={k.id} value={k.id}>{k.keterangan}</option>
                    ))}
                  </select>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg text-sm transition"
                >
                  Tutup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setViewItem(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Maklumat Kaunter
              </h3>
              <button
                onClick={() => setViewItem(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  No Kaunter
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  Kaunter {viewItem.noKaunter}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Zon/Aras
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  {getZonName(viewItem.zon)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Perkhidmatan Kaunter
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  {getKumpulanName(viewItem.idPerkhidmatanKumpulan)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Perkhidmatan Dijalankan
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm max-h-48 overflow-y-auto whitespace-pre-line">
                  {getSusunanNames(viewItem.susunanKeutamaan)}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewItem(null)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg text-sm transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
