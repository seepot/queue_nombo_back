"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ZonRow {
  id: number;
  zon: string;
  catatan: string;
}

interface Props {
  zon: ZonRow[];
}

export default function ZonClient({ zon }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ zon: "", catatan: "" });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/pentadbiran/zon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setForm({ zon: "", catatan: "" });
        setMsg({ type: "success", text: "Zon/Aras telah direkodkan" });
        router.refresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: result.error || "Simpan zon gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Anda pasti untuk menghapuskan rekod?")) return;

    setDeletingId(id);
    setMsg(null);

    try {
      const res = await fetch("/api/pentadbiran/zon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setMsg({ type: "success", text: "Zon telah berjaya dihapuskan" });
        router.refresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: result.error || "Padam zon gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            msg.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Zon/Aras
            </label>
            <input
              type="text"
              value={form.zon}
              onChange={(e) => setForm({ ...form, zon: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              maxLength={25}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Catatan
            </label>
            <input
              type="text"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              maxLength={50}
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? "Menyimpan..." : "Tambah"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-bold text-gray-800">Senarai Zon/Aras</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Bil</th>
                <th className="px-4 py-2 text-left">Zon/Aras</th>
                <th className="px-4 py-2 text-left">Catatan</th>
                <th className="px-4 py-2 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {zon.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Tiada rekod zon
                  </td>
                </tr>
              ) : (
                zon.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.zon}</td>
                    <td className="px-4 py-3 text-gray-600">{row.catatan}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:text-red-300"
                      >
                        {deletingId === row.id ? "Memadam..." : "Padam"}
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
