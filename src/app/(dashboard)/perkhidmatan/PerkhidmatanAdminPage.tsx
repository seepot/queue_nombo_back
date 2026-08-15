"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Perkhidmatan {
  id: number;
  keterangan: string | null;
}

interface Props {
  perkhidmatan: Perkhidmatan[];
}

const PAGE_SIZE = 20;
type SortKey = "id" | "keterangan";
type SortDirection = "asc" | "desc";

export default function PerkhidmatanAdminPage({ perkhidmatan }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [viewItem, setViewItem] = useState<Perkhidmatan | null>(null);
  const [viewKumpulan, setViewKumpulan] = useState<Array<{ keterangan: string; id_cawangan: string; nama_cawangan: string }>>([]);
  const [loadingView, setLoadingView] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleView = async (p: Perkhidmatan) => {
    setViewItem(p);
    setLoadingView(true);
    try {
      const res = await fetch(`/api/perkhidmatan/master/view?id=${p.id}`);
      if (res.ok) {
        const result = await res.json();
        setViewKumpulan(result.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingView(false);
    }
  };

  const filtered = perkhidmatan.filter((p) =>
    search ? (p.keterangan || "").toLowerCase().includes(search.toLowerCase()) : true
  );
  const sorted = [...filtered].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    if (sortKey === "id") return (a.id - b.id) * direction;
    return (a.keterangan || "").localeCompare(b.keterangan || "", "ms") * direction;
  });
  const totalPages = Math.max(Math.ceil(sorted.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startRecord = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(safePage * PAGE_SIZE, sorted.length);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/perkhidmatan/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keterangan: newName }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Pendaftaran Perkhidmatan Berjaya" });
        setNewName("");
        setShowAdd(false);
        router.refresh();
      } else {
        setMsg({ type: "error", text: "Pendaftaran gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/perkhidmatan/master", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, keterangan: editName }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Kemaskini Perkhidmatan Berjaya" });
        setEditingId(null);
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

  const handleDelete = async (id: number, nama: string | null) => {
    if (!confirm(`Padam perkhidmatan "${nama}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/perkhidmatan/master?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMsg({ type: "success", text: "Perkhidmatan Berjaya Dihapuskan" });
        router.refresh();
      } else {
        setMsg({ type: "error", text: "Penghapusan gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
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

      {/* Add form */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Tambah Perkhidmatan
        </button>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Tambah Perkhidmatan Baru</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAdd}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perkhidmatan</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama perkhidmatan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-lg text-sm transition">
                  {loading ? "..." : "Daftar"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg text-sm transition">Tutup</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Kemaskini Perkhidmatan</h3>
              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perkhidmatan</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleEdit} disabled={loading} className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-lg text-sm transition">
                {loading ? "..." : "Simpan"}
              </button>
              <button onClick={() => setEditingId(null)} className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg text-sm transition">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewItem(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Kumpulan Perkhidmatan Menggunakan</h3>
              <button onClick={() => setViewItem(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <span className="font-medium">ID:</span> {viewItem.id} &nbsp;|&nbsp; <span className="font-medium">Perkhidmatan:</span> {viewItem.keterangan}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingView ? (
                <p className="text-gray-400 text-center py-4">Memuatkan...</p>
              ) : viewKumpulan.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Kumpulan</th>
                      <th className="px-3 py-2 text-left">Cawangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewKumpulan.map((k, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2">{k.keterangan}</td>
                        <td className="px-3 py-2">{k.nama_cawangan} ({k.id_cawangan})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-center py-4">Tiada kumpulan perkhidmatan menggunakan perkhidmatan ini</p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setViewItem(null)} className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg text-sm transition">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari perkhidmatan..."
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <button
                    className="inline-flex items-center gap-1 hover:text-blue-700"
                    onClick={() => handleSort("id")}
                    type="button"
                  >
                    ID <span className="text-xs">{sortIcon("id")}</span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <button
                    className="inline-flex items-center gap-1 hover:text-blue-700"
                    onClick={() => handleSort("keterangan")}
                    type="button"
                  >
                    Perkhidmatan <span className="text-xs">{sortIcon("keterangan")}</span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{p.id}</td>
                  <td className="px-4 py-3 font-medium">{p.keterangan}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(p)}
                        className="px-2 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs font-medium"
                      >
                        Lihat
                      </button>
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.keterangan || ""); }}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium"
                      >
                        Kemaskini
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.keterangan)}
                        disabled={loading}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium disabled:bg-red-300"
                      >
                        Padam
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">Tiada perkhidmatan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-gray-500">
            Papar {startRecord}-{endRecord} daripada {sorted.length} rekod
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => setPage((value) => Math.max(value - 1, 1))}
              type="button"
            >
              Sebelum
            </button>
            <span className="px-2 text-gray-600">
              Halaman {safePage} / {totalPages}
            </span>
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={safePage >= totalPages}
              onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
              type="button"
            >
              Seterusnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
