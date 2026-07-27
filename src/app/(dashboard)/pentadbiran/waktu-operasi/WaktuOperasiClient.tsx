"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";

interface WaktuOperasi {
  id: number;
  namaHari: string | null;
  waktuMula: string | null;
  waktuTamat: string | null;
  sesi: number | null;
  statusAktif: number;
}

interface HariCuti {
  id: number;
  namaHari: string | null;
}

interface CutiUmum {
  id: number;
  tarikh1: string | null;
  keterangan: string | null;
}

interface Props {
  waktuOperasi: WaktuOperasi[];
  hariCuti: HariCuti[];
  cutiUmum: CutiUmum[];
}

const HARI_MAP: Record<string, string> = {
  MON: "Isnin",
  TUE: "Selasa",
  WED: "Rabu",
  THU: "Khamis",
  FRI: "Jumaat",
  SAT: "Sabtu",
  SUN: "Ahad",
};

function formatTimeFromISO(val: string | null): string {
  if (!val) return "-";
  const match = val.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  return val;
}

export default function WaktuOperasiClient({ waktuOperasi, hariCuti, cutiUmum }: Props) {
  const router = useRouter();
  const [showAddCuti, setShowAddCuti] = useState(false);
  const [cutiForm, setCutiForm] = useState({ tarikh: "", keterangan: "" });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ waktuMula: "", waktuTamat: "", sesi: "" });

  const startEditWaktu = (w: WaktuOperasi) => {
    setEditingId(w.id);
    setEditForm({
      waktuMula: formatTimeFromISO(w.waktuMula) || "",
      waktuTamat: formatTimeFromISO(w.waktuTamat) || "",
      sesi: String(w.sesi || ""),
    });
  };

  const handleSaveWaktu = async () => {
    if (!editingId) return;
    const res = await fetch("/api/pentadbiran/waktu-operasi", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        waktuMula: editForm.waktuMula,
        waktuTamat: editForm.waktuTamat,
        sesi: editForm.sesi ? Number(editForm.sesi) : null,
      }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Waktu operasi dikemaskini" });
      setEditingId(null);
      router.refresh();
    } else {
      setMsg({ type: "error", text: "Kemaskini gagal" });
    }
  };

  const handleToggleWaktuStatus = async (id: number, currentStatus: number) => {
    const res = await fetch("/api/pentadbiran/waktu-operasi", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, statusAktif: currentStatus === 1 ? 0 : 1 }),
    });
    if (res.ok) router.refresh();
  };

  const handleDeleteWaktu = async (id: number) => {
    if (!confirm("Padam waktu operasi ini?")) return;
    const res = await fetch(`/api/pentadbiran/waktu-operasi?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg({ type: "success", text: "Waktu operasi dipadam" });
      router.refresh();
    }
  };

  const handleAddCuti = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/pentadbiran/cuti-umum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cutiForm),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Cuti umum berjaya ditambah" });
      setCutiForm({ tarikh: "", keterangan: "" });
      setShowAddCuti(false);
      router.refresh();
    }
  };

  const handleSyncCuti = async () => {
    const year = new Date(Date.now() + 8 * 60 * 60 * 1000).getFullYear();
    if (!confirm(`Sync cuti umum Malaysia untuk tahun ${year}?`)) return;
    setMsg(null);
    try {
      const res = await fetch("/api/pentadbiran/sync-cuti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: data.message });
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.error || "Sync gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    }
  };

  const handleDeleteCuti = async (id: number) => {
    if (!confirm("Padam cuti ini?")) return;
    const res = await fetch(`/api/pentadbiran/cuti-umum?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg({ type: "success", text: "Cuti berjaya dipadam" });
      router.refresh();
    }
  };

  const handleToggleHari = async (hari: string, isCurrentlyCuti: boolean) => {
    const res = await fetch("/api/pentadbiran/hari-cuti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hari, remove: isCurrentlyCuti }),
    });
    if (res.ok) router.refresh();
  };

  const cutiHariSet = new Set(hariCuti.map((h) => h.namaHari));

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {/* Waktu Operasi */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Waktu Operasi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Hari</th>
                <th className="px-4 py-2 text-left">Waktu Mula</th>
                <th className="px-4 py-2 text-left">Waktu Tamat</th>
                <th className="px-4 py-2 text-left">Sesi</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {waktuOperasi.map((w) =>
                editingId === w.id ? (
                  <tr key={w.id} className="bg-yellow-50">
                    <td className="px-4 py-2">{HARI_MAP[w.namaHari || ""] || w.namaHari}</td>
                    <td className="px-4 py-2">
                      <TimePicker
                        value={editForm.waktuMula}
                        onChange={(val) => setEditForm({ ...editForm, waktuMula: val || "" })}
                        disableClock={false}
                        format="HH:mm"
                        className="border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <TimePicker
                        value={editForm.waktuTamat}
                        onChange={(val) => setEditForm({ ...editForm, waktuTamat: val || "" })}
                        disableClock={false}
                        format="HH:mm"
                        className="border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editForm.sesi}
                        onChange={(e) => setEditForm({ ...editForm, sesi: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${w.statusAktif === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {w.statusAktif === 1 ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={handleSaveWaktu} className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium">
                          Simpan
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-medium">
                          Batal
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={w.id}>
                    <td className="px-4 py-2">{HARI_MAP[w.namaHari || ""] || w.namaHari}</td>
                    <td className="px-4 py-2">{formatTimeFromISO(w.waktuMula)}</td>
                    <td className="px-4 py-2">{formatTimeFromISO(w.waktuTamat)}</td>
                    <td className="px-4 py-2">{w.sesi || "-"}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleToggleWaktuStatus(w.id, w.statusAktif)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${w.statusAktif === 1 ? "bg-green-500" : "bg-gray-300"}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${w.statusAktif === 1 ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => startEditWaktu(w)} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteWaktu(w.id)} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium">
                          Padam
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hari Cuti Mingguan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Hari Cuti Mingguan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(HARI_MAP).map(([code, name]) => {
            const isCuti = cutiHariSet.has(code);
            return (
              <button
                key={code}
                onClick={() => handleToggleHari(code, isCuti)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  isCuti
                    ? "bg-red-100 text-red-700 border-2 border-red-300"
                    : "bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {name}
                <span className="block text-xs mt-1">{isCuti ? "Cuti" : "Operasi"}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">Klik untuk tukar status cuti/operasi</p>
      </div>

      {/* Cuti Umum */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Cuti Umum</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSyncCuti}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              Sync Cuti Malaysia
            </button>
            <button
              onClick={() => setShowAddCuti(!showAddCuti)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              {showAddCuti ? "Tutup" : "+ Tambah Cuti"}
            </button>
          </div>
        </div>

        {showAddCuti && (
          <form onSubmit={handleAddCuti} className="flex gap-3 mb-4">
            <input
              type="date"
              value={cutiForm.tarikh}
              onChange={(e) => setCutiForm({ ...cutiForm, tarikh: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              type="text"
              value={cutiForm.keterangan}
              onChange={(e) => setCutiForm({ ...cutiForm, keterangan: e.target.value })}
              placeholder="Keterangan cuti"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Simpan
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Tarikh</th>
                <th className="px-4 py-2 text-left">Keterangan</th>
                <th className="px-4 py-2 text-left">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cutiUmum.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-gray-400">Tiada cuti umum</td>
                </tr>
              ) : (
                cutiUmum.map((c, idx) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2">{c.tarikh1 ? c.tarikh1.slice(0, 10) : "-"}</td>
                    <td className="px-4 py-2">{c.keterangan || "-"}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDeleteCuti(c.id)}
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
