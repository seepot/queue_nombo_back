"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CawanganItem {
  id: number;
  idCawangan: string | null;
  namaCawangan: string;
  alamat1: string | null;
  alamat2: string | null;
  alamat3: string | null;
  alamat4: string | null;
  negeri: string | null;
  noTelefon: string | null;
  no_faks: string | null;
  latitud: string | null;
  longitud: string | null;
  flag: string | null;
}

const NEGERI_NAMES: Record<string, string> = {
  "01": "Johor",
  "02": "Kedah",
  "03": "Kelantan",
  "04": "Melaka",
  "05": "Negeri Sembilan",
  "06": "Pahang",
  "07": "Pulau Pinang",
  "08": "Perak",
  "09": "Perlis",
  "10": "Selangor",
  "11": "Terengganu",
  "12": "Sabah",
  "13": "Sarawak",
  "14": "WP Kuala Lumpur",
  "15": "WP Labuan",
  "16": "WP Putrajaya",
};

export default function CawanganClient({
  cawangan,
}: {
  cawangan: CawanganItem[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [editingItem, setEditingItem] = useState<CawanganItem | null>(null);
  const [editForm, setEditForm] = useState({
    namaCawangan: "",
    alamat1: "",
    alamat2: "",
    alamat3: "",
    alamat4: "",
    negeri: "",
    noTelefon: "",
    no_faks: "",
    latitud: "",
    longitud: "",
    flag: "1",
  });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterNegeri, setFilterNegeri] = useState("");
  const [searchName, setSearchName] = useState("");

  const filteredCawangan = cawangan.filter((c) => {
    const matchNegeri = filterNegeri ? c.negeri === filterNegeri : true;
    const matchName = searchName
      ? c.namaCawangan.toLowerCase().includes(searchName.toLowerCase())
      : true;
    return matchNegeri && matchName;
  });

  const startEdit = (c: CawanganItem) => {
    setEditingItem(c);
    setEditForm({
      namaCawangan: c.namaCawangan || "",
      alamat1: c.alamat1 || "",
      alamat2: c.alamat2 || "",
      alamat3: c.alamat3 || "",
      alamat4: c.alamat4 || "",
      negeri: c.negeri || "",
      noTelefon: c.noTelefon || "",
      no_faks: c.no_faks || "",
      latitud: c.latitud || "",
      longitud: c.longitud || "",
      flag: c.flag || "1",
    });
    setMsg(null);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setLoading(true);
    const res = await fetch("/api/cawangan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingItem.id, ...editForm }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Kemaskini berjaya" });
      setEditingItem(null);
      router.refresh();
    } else {
      setMsg({ type: "error", text: "Kemaskini gagal" });
    }
    setLoading(false);
  };

  const handleDelete = async (c: CawanganItem) => {
    if (!confirm(`Padam cawangan "${c.namaCawangan}"?`)) return;
    const res = await fetch(`/api/cawangan?id=${c.id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg({ type: "success", text: "Cawangan berjaya dipadam" });
      router.refresh();
    } else {
      setMsg({ type: "error", text: "Penghapusan gagal" });
    }
  };

  return (
    <div>
      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingItem(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Kemaskini Cawangan</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Cawangan</label>
                  <input type="text" value={editingItem.idCawangan || ""} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Cawangan</label>
                  <input type="text" value={editForm.namaCawangan} onChange={(e) => setEditForm({ ...editForm, namaCawangan: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat 1</label>
                <input type="text" value={editForm.alamat1} onChange={(e) => setEditForm({ ...editForm, alamat1: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat 2</label>
                <input type="text" value={editForm.alamat2} onChange={(e) => setEditForm({ ...editForm, alamat2: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat 3</label>
                <input type="text" value={editForm.alamat3} onChange={(e) => setEditForm({ ...editForm, alamat3: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat 4</label>
                <input type="text" value={editForm.alamat4} onChange={(e) => setEditForm({ ...editForm, alamat4: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Negeri</label>
                  <select value={editForm.negeri} onChange={(e) => setEditForm({ ...editForm, negeri: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Sila Pilih Negeri</option>
                    <option value="01">Johor</option>
                    <option value="02">Kedah</option>
                    <option value="03">Kelantan</option>
                    <option value="04">Melaka</option>
                    <option value="05">Negeri Sembilan</option>
                    <option value="06">Pahang</option>
                    <option value="07">Pulau Pinang</option>
                    <option value="08">Perak</option>
                    <option value="09">Perlis</option>
                    <option value="10">Selangor</option>
                    <option value="11">Terengganu</option>
                    <option value="12">Sabah</option>
                    <option value="13">Sarawak</option>
                    <option value="14">WP Kuala Lumpur</option>
                    <option value="15">WP Labuan</option>
                    <option value="16">WP Putrajaya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. Telefon</label>
                  <input type="text" value={editForm.noTelefon} onChange={(e) => setEditForm({ ...editForm, noTelefon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. Faks</label>
                  <input type="text" value={editForm.no_faks} onChange={(e) => setEditForm({ ...editForm, no_faks: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                  <input type="text" value={editForm.latitud} onChange={(e) => setEditForm({ ...editForm, latitud: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                <input type="text" value={editForm.longitud} onChange={(e) => setEditForm({ ...editForm, longitud: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menggunakan No Giliran JPJeQ? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editFlag"
                      value="1"
                      checked={editForm.flag === "1"}
                      onChange={(e) => setEditForm({ ...editForm, flag: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Ya</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editFlag"
                      value="0"
                      checked={editForm.flag === "0"}
                      onChange={(e) => setEditForm({ ...editForm, flag: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Tidak</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-lg text-sm transition">
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setEditingItem(null)} className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg text-sm transition">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row gap-3">
          <select
            value={filterNegeri}
            onChange={(e) => setFilterNegeri(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Semua Negeri</option>
            <option value="01">Johor</option>
            <option value="02">Kedah</option>
            <option value="03">Kelantan</option>
            <option value="04">Melaka</option>
            <option value="05">Negeri Sembilan</option>
            <option value="06">Pahang</option>
            <option value="07">Pulau Pinang</option>
            <option value="08">Perak</option>
            <option value="09">Perlis</option>
            <option value="10">Selangor</option>
            <option value="11">Terengganu</option>
            <option value="12">Sabah</option>
            <option value="13">Sarawak</option>
            <option value="14">WP Kuala Lumpur</option>
            <option value="15">WP Labuan</option>
            <option value="16">WP Putrajaya</option>
          </select>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Cari nama cawangan..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-sm text-gray-400 self-center">{filteredCawangan.length} rekod</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nama Cawangan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Negeri</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCawangan.map((c, idx) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3">{c.idCawangan}</td>
                  <td className="px-4 py-3 font-medium">{c.namaCawangan}</td>
                  <td className="px-4 py-3">{NEGERI_NAMES[c.negeri || ""] || c.negeri || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(c)} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium">Edit</button>
                      <button onClick={() => handleDelete(c)} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium">Padam</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
