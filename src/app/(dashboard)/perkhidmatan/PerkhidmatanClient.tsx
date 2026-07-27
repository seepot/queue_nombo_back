"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Kumpulan {
  id: number;
  keterangan: string;
  noSiri: number | null;
  noTerkini: number | null;
  status: number | null;
  idPerkhidmatan: string | null;
}

interface Perkhidmatan {
  id: number;
  keterangan: string;
}

interface Props {
  kumpulan: Kumpulan[];
  perkhidmatan: Perkhidmatan[];
}

export default function PerkhidmatanClient({ kumpulan, perkhidmatan }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    keterangan: "",
    noSiri: "",
    isPelbagai: "0",
    idPerkhidmatan: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ keterangan: string; noSiri: string; selectedPerkhidmatan: string[] }>({
    keterangan: "",
    noSiri: "",
    selectedPerkhidmatan: [],
  });
  const [viewItem, setViewItem] = useState<Kumpulan | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/perkhidmatan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Pendaftaran berjaya" });
      setFormData({ keterangan: "", noSiri: "", isPelbagai: "0", idPerkhidmatan: "" });
      setShowForm(false);
      router.refresh();
    } else {
      setMsg({ type: "error", text: "Pendaftaran gagal" });
    }
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Padam kumpulan perkhidmatan "${nama}"?`)) return;
    const res = await fetch(`/api/perkhidmatan?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg({ type: "success", text: "Perkhidmatan berjaya dihapuskan" });
      router.refresh();
    } else {
      setMsg({ type: "error", text: "Penghapusan gagal" });
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: number | null) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    await fetch("/api/perkhidmatan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    router.refresh();
  };

  const startEdit = (k: Kumpulan) => {
    const currentIds = k.idPerkhidmatan
      ? k.idPerkhidmatan.split(",").map((s) => s.trim())
      : [];
    setEditingId(k.id);
    setEditForm({
      keterangan: k.keterangan,
      noSiri: String(k.noSiri || ""),
      selectedPerkhidmatan: currentIds,
    });
    setMsg(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const res = await fetch("/api/perkhidmatan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        keterangan: editForm.keterangan,
        noSiri: editForm.noSiri,
        idPerkhidmatan: editForm.selectedPerkhidmatan.join(","),
      }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Kemaskini berjaya" });
      setEditingId(null);
      router.refresh();
    } else {
      setMsg({ type: "error", text: "Kemaskini gagal" });
    }
  };

  const togglePerkhidmatanCheckbox = (id: string) => {
    setEditForm((prev) => ({
      ...prev,
      selectedPerkhidmatan: prev.selectedPerkhidmatan.includes(id)
        ? prev.selectedPerkhidmatan.filter((p) => p !== id)
        : [...prev.selectedPerkhidmatan, id],
    }));
  };

  // Get perkhidmatan names from IDs as numbered list
  const getPerkhidmatanList = (idStr: string | null) => {
    if (!idStr) return "-";
    const ids = idStr.split(",").map((s) => s.trim());
    const names = ids
      .map((id) => perkhidmatan.find((p) => String(p.id) === id)?.keterangan)
      .filter(Boolean);
    if (names.length === 0) return "-";
    return names.map((name, i) => `${i + 1}.${name}`).join("\n");
  };

  // Get perkhidmatan names from IDs
  const getPerkhidmatanNames = (idStr: string | null) => {
    if (!idStr) return "-";
    const ids = idStr.split(",").map((s) => s.trim());
    const names = ids
      .map((id) => perkhidmatan.find((p) => String(p.id) === id)?.keterangan)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "-";
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

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          {showForm ? "Tutup" : "+ Tambah Kumpulan"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Daftar Kumpulan Perkhidmatan Baru
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kumpulan
              </label>
              <input
                type="text"
                value={formData.keterangan}
                onChange={(e) =>
                  setFormData({ ...formData, keterangan: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Siri (Prefix)
              </label>
              <input
                type="text"
                value={formData.noSiri}
                onChange={(e) =>
                  setFormData({ ...formData, noSiri: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="cth: 1000, 2000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Perkhidmatan
              </label>
              <select
                value={formData.idPerkhidmatan}
                onChange={(e) =>
                  setFormData({ ...formData, idPerkhidmatan: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Pilih Perkhidmatan</option>
                {perkhidmatan.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.keterangan}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                Daftar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nama Kumpulan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">No. Siri</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">No. Terkini</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kumpulan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Tiada kumpulan perkhidmatan didaftarkan
                  </td>
                </tr>
              ) : (
                kumpulan.map((k, idx) => (
                    <tr key={k.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{k.keterangan}</td>
                      <td className="px-4 py-3">{k.noSiri || "-"}</td>
                      <td className="px-4 py-3">{k.noTerkini || "0"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(k.id, k.status)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            k.status === 1 ? "bg-green-500" : "bg-gray-300"
                          }`}
                          title={k.status === 1 ? "Aktif - klik untuk nyahaktif" : "Tidak Aktif - klik untuk aktifkan"}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              k.status === 1 ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewItem(k)}
                            className="px-2 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs font-medium"
                          >
                            Lihat
                          </button>
                          <button
                            onClick={() => startEdit(k)}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(k.id, k.keterangan)}
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

      {/* View Modal */}
      {viewItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setViewItem(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Paparan Maklumat Kumpulan
              </h3>
              <button
                onClick={() => setViewItem(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Kumpulan
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  {viewItem.keterangan}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Perkhidmatan Dijalankan
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm max-h-48 overflow-y-auto whitespace-pre-line">
                  {getPerkhidmatanList(viewItem.idPerkhidmatan)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  No Siri
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  {viewItem.noSiri || "-"}
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

      {/* Edit Modal */}
      {editingId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditingId(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Kemaskini Maklumat Kumpulan
              </h3>
              <button
                onClick={() => setEditingId(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Kumpulan
                </label>
                <input
                  type="text"
                  value={editForm.keterangan}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Perkhidmatan Dijalankan
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                  {perkhidmatan.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={editForm.selectedPerkhidmatan.includes(String(p.id))}
                        onChange={() => togglePerkhidmatanCheckbox(String(p.id))}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span>{p.keterangan}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  No Siri
                </label>
                <input
                  type="text"
                  value={editForm.noSiri}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition"
              >
                Simpan
              </button>
              <button
                onClick={() => setEditingId(null)}
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
