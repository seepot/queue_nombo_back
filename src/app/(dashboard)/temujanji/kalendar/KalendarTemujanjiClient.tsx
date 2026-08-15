"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SlotRow {
  id: number;
  tarikh: string | null;
  masa: string | null;
  kump_perkhidmatan: string | null;
  keterangan: string | null;
  bilangan: number | null;
  bil_tlh_isi: number | null;
  status: number | null;
}

interface TemujanjiRow {
  id: number;
  tempahan_masa_id: number | null;
  masa: string | null;
  nama: string | null;
  nopengenalan: string | null;
  notelefon: string | null;
  emel: string | null;
  tujuan_transaksi: string | null;
  is_pending: number | null;
  keterangan: string | null;
  tarikh: string | null;
  urusniaga: number | null;
  kategori: number | null;
}

interface Props {
  canEdit: boolean;
  ringkasanSlot: SlotRow[];
  temujanji: TemujanjiRow[];
  view: string;
}

export default function KalendarTemujanjiClient({
  canEdit,
  ringkasanSlot,
  temujanji,
  view,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<TemujanjiRow | null>(null);
  const [form, setForm] = useState({
    nama: "",
    nopengenalan: "",
    notelefon: "",
    emel: "",
    tujuanTransaksi: "",
    kategori: "",
  });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [loading, setLoading] = useState<string | null>(null);

  const openEdit = (row: TemujanjiRow) => {
    setEditing(row);
    setForm({
      nama: row.nama || "",
      nopengenalan: row.nopengenalan || "",
      notelefon: row.notelefon || "",
      emel: row.emel || "",
      tujuanTransaksi: row.tujuan_transaksi || "",
      kategori: row.kategori == null ? "" : String(row.kategori),
    });
    setMsg(null);
  };

  const save = async () => {
    if (!editing) return;

    setLoading("save");
    setMsg(null);

    try {
      const res = await fetch("/api/temujanji/kalendar-slot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          urusniaga: editing.urusniaga,
          ...form,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setEditing(null);
        setMsg({ type: "success", text: "Temujanji berjaya dikemaskini" });
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.error || "Kemaskini gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(null);
    }
  };

  const clearSlot = async (row: TemujanjiRow) => {
    if (!window.confirm("Kosongkan rekod temujanji untuk slot ini?")) return;

    setLoading(`clear-${row.id}`);
    setMsg(null);

    try {
      const res = await fetch(`/api/temujanji/kalendar-slot?id=${row.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMsg({ type: "success", text: "Slot telah dikosongkan" });
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.error || "Clear slot gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {msg && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            msg.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-orange-300 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-bold text-gray-800">Slot Harian</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {view !== "harian" && <th className="px-4 py-2 text-left">Tarikh</th>}
                  <th className="px-4 py-2 text-left">Masa</th>
                  <th className="px-4 py-2 text-left">Perkhidmatan</th>
                  <th className="px-4 py-2 text-center">Kuota</th>
                  <th className="px-4 py-2 text-center">Diisi</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ringkasanSlot.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {view !== "harian" && (
                      <td className="px-4 py-2">{row.tarikh || "-"}</td>
                    )}
                    <td className="px-4 py-2 font-medium">{row.masa || "-"}</td>
                    <td className="px-4 py-2">
                      {row.keterangan || row.kump_perkhidmatan || "-"}
                    </td>
                    <td className="px-4 py-2 text-center">{row.bilangan || 0}</td>
                    <td className="px-4 py-2 text-center">{row.bil_tlh_isi || 0}</td>
                    <td className="px-4 py-2 text-center">
                      {row.status === 1 ? "Aktif" : row.status === 5 ? "Batal" : "Penuh/Tutup"}
                    </td>
                  </tr>
                ))}
                {ringkasanSlot.length === 0 && (
                  <tr>
                    <td
                      colSpan={view === "harian" ? 5 : 6}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      Tiada slot untuk paparan ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-orange-300 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-bold text-gray-800">Senarai Temujanji</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {view !== "harian" && <th className="px-4 py-2 text-left">Tarikh</th>}
                  <th className="px-4 py-2 text-left">Masa</th>
                  <th className="px-4 py-2 text-left">Nama</th>
                  <th className="px-4 py-2 text-left">No KP</th>
                  <th className="px-4 py-2 text-left">Perkhidmatan</th>
                  <th className="px-4 py-2 text-left">Tujuan</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  {canEdit && <th className="px-4 py-2 text-right">Tindakan</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {temujanji.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {view !== "harian" && (
                      <td className="px-4 py-2">{row.tarikh || "-"}</td>
                    )}
                    <td className="px-4 py-2 font-medium">{row.masa || "-"}</td>
                    <td className="px-4 py-2">{row.nama || "-"}</td>
                    <td className="px-4 py-2">{row.nopengenalan || "-"}</td>
                    <td className="px-4 py-2">{row.keterangan || "-"}</td>
                    <td className="px-4 py-2">{row.tujuan_transaksi || "-"}</td>
                    <td className="px-4 py-2 text-center">
                      {row.is_pending === 5 ? "Batal" : row.nama ? "Aktif" : "Kosong"}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                            onClick={() => openEdit(row)}
                            type="button"
                          >
                            Kemaskini
                          </button>
                          <button
                            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            disabled={loading === `clear-${row.id}` || !row.nama}
                            onClick={() => clearSlot(row)}
                            type="button"
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {temujanji.length === 0 && (
                  <tr>
                    <td
                      colSpan={(view === "harian" ? 6 : 7) + (canEdit ? 1 : 0)}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      Tiada temujanji untuk paparan ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {canEdit && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Kemaskini Temujanji</h3>
                <p className="text-sm text-gray-500">
                  {editing.tarikh} {editing.masa} - {editing.keterangan || "-"}
                </p>
              </div>
              <button
                className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                onClick={() => setEditing(null)}
                type="button"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  value={form.nama}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  No Pengenalan
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  onChange={(e) => setForm({ ...form, nopengenalan: e.target.value })}
                  value={form.nopengenalan}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  No Telefon
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  onChange={(e) => setForm({ ...form, notelefon: e.target.value })}
                  value={form.notelefon}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Emel</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  onChange={(e) => setForm({ ...form, emel: e.target.value })}
                  value={form.emel}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  placeholder="Contoh: 1"
                  type="number"
                  value={form.kategori}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tujuan Transaksi
                </label>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  onChange={(e) => setForm({ ...form, tujuanTransaksi: e.target.value })}
                  value={form.tujuanTransaksi}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => setEditing(null)}
                type="button"
              >
                Batal
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loading === "save"}
                onClick={save}
                type="button"
              >
                {loading === "save" ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
