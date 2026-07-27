"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  nama: string | null;
  uname: string | null;
  nokp: string | null;
  levelAkses: number | null;
  catatan: string | null;
}

interface Props {
  users: User[];
  skip: number;
}

export default function KakitanganList({ users, skip }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nama: "", nokp: "", uname: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.nama || "").toLowerCase().includes(q) ||
      (u.uname || "").toLowerCase().includes(q) ||
      (u.nokp || "").toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const headers = ["Bil", "Nama", "Username", "No KP", "Tahap Akses", "Status"];
    const rows = filteredUsers.map((u, i) => [
      i + 1,
      u.nama || "",
      u.uname || "",
      u.nokp || "",
      `Level ${u.levelAkses}`,
      u.catatan !== "inactive" ? "Aktif" : "Tidak Aktif",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "senarai_kakitangan.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printContent = document.getElementById("kakitangan-table");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Senarai Kakitangan</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              h2 { margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <h2>Senarai Kakitangan</h2>
            ${printContent.outerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportPDF = () => {
    // Use print dialog as PDF (browser Save as PDF)
    handlePrint();
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({
      nama: user.nama || "",
      nokp: user.nokp || "",
      uname: user.uname || "",
    });
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ nama: "", nokp: "", uname: "" });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/kakitangan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Kemaskini berjaya" });
        setEditingId(null);
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.error || "Kemaskini gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Padam kakitangan "${user.nama}"?`)) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/kakitangan?id=${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Penghapusan berjaya" });
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.error || "Penghapusan gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const isCurrentlyActive = user.catatan !== "inactive";
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/kakitangan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, active: !isCurrentlyActive }),
      });
      if (res.ok) {
        setMsg({
          type: "success",
          text: `Kakitangan ${!isCurrentlyActive ? "diaktifkan" : "dinyahaktifkan"}`,
        });
        router.refresh();
      } else {
        const data = await res.json();
        setMsg({ type: "error", text: data.error || "Gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset kata laluan "${user.nama}" kepada No KP?`)) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/kakitangan/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, nokp: user.nokp }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Tetapan semula katalaluan berjaya" });
      } else {
        const data = await res.json();
        setMsg({ type: "error", text: data.error || "Gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {msg && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            msg.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelEdit}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Maklumat Kakitangan</h3>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                <input type="text" value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No KP</label>
                <input type="text" value={editForm.nokp} onChange={(e) => setEditForm({ ...editForm, nokp: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Pengguna</label>
                <input type="text" value={editForm.uname} onChange={(e) => setEditForm({ ...editForm, uname: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg text-sm transition">
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={cancelEdit} className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg text-sm transition">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Export bar */}
      <div className="px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, username, no KP..."
          className="flex-1 max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition">CSV</button>
          <button onClick={handleExportPDF} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition">PDF</button>
          <button onClick={handlePrint} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition">Cetak</button>
        </div>
      </div>

      <div className="overflow-x-auto" id="kakitangan-table">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Username</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">No. KP</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tahap Akses</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((u, idx) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{skip + idx + 1}</td>
                <td className="px-4 py-3 font-medium">{u.nama}</td>
                <td className="px-4 py-3">{u.uname}</td>
                <td className="px-4 py-3">{u.nokp || "-"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    Level {u.levelAkses}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={loading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      u.catatan !== "inactive" ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      u.catatan !== "inactive" ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(u)} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium">Edit</button>
                    <button onClick={() => handleResetPassword(u)} disabled={loading} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium disabled:bg-yellow-300">Reset</button>
                    <button onClick={() => handleDelete(u)} disabled={loading} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium disabled:bg-red-300">Padam</button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Tiada rekod kakitangan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
