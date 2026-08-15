"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Kumpulan {
  id: number;
  keterangan: string | null;
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

interface WaktuOperasi {
  id: number;
  namaHari: string | null;
  waktuMula: string | null;
  waktuTamat: string | null;
  sesi: number | null;
}

interface Props {
  kumpulan: Kumpulan[];
  hariCuti: HariCuti[];
  cutiUmum: CutiUmum[];
  waktuOperasi: WaktuOperasi[];
}

function timeOnly(value: string | null) {
  if (!value) return "-";
  const match = value.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value.slice(0, 5);
}

export default function BukaTemujanjiClient({
  kumpulan,
  hariCuti,
  cutiUmum,
  waktuOperasi,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    tarikh1: "",
    tarikh2: "",
    kump: "",
    bilSlot: "1",
    bilMax: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/temujanji/buka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bilSlot: Number(form.bilSlot || 0),
          bilMax: Number(form.bilMax || 0),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMsg({
          type: "success",
          text: `Draf slot telah dijana. Hari: ${data.daysCreated}, slot: ${data.slotsCreated}, kuota: ${data.placeholdersCreated}.`,
        });
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.error || "Jana slot gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
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

      <div className="rounded-xl border border-orange-300 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          Tetapan Waktu Temujanji
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tarikh Mula
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              onChange={(e) => setForm({ ...form, tarikh1: e.target.value })}
              required
              type="date"
              value={form.tarikh1}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tarikh Hingga
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              onChange={(e) => setForm({ ...form, tarikh2: e.target.value })}
              required
              type="date"
              value={form.tarikh2}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kumpulan Perkhidmatan
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              onChange={(e) => setForm({ ...form, kump: e.target.value })}
              required
              value={form.kump}
            >
              <option value="">Pilih Kumpulan</option>
              {kumpulan.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.keterangan || `Perkhidmatan ${item.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bilangan Temujanji Setiap Slot
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              min={1}
              onChange={(e) => setForm({ ...form, bilSlot: e.target.value })}
              required
              type="number"
              value={form.bilSlot}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Jumlah Temujanji Maksimum Harian
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              min={0}
              onChange={(e) => setForm({ ...form, bilMax: e.target.value })}
              placeholder="Jika perlu"
              type="number"
              value={form.bilMax}
            />
          </div>
          <div className="md:col-span-2">
            <p className="mb-3 text-sm text-gray-500">
              Penambahan waktu adalah 30 minit dari waktu kaunter mula beroperasi.
              Slot yang dijana akan masuk sebagai draf.
            </p>
            <button
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
              disabled={loading}
              type="submit"
            >
              {loading ? "Menjana..." : "Jana"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-800">Hari Cuti Mingguan</h3>
          <div className="flex flex-wrap gap-2">
            {hariCuti.length > 0 ? (
              hariCuti.map((item) => (
                <span
                  className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700"
                  key={item.id}
                >
                  {item.namaHari}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-400">Tiada</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-800">Cuti Umum</h3>
          <div className="max-h-44 space-y-2 overflow-y-auto text-sm text-gray-600">
            {cutiUmum.length > 0 ? (
              cutiUmum.map((item) => (
                <div key={item.id}>
                  <span className="font-medium">{item.tarikh1?.slice(0, 10)}</span>
                  {item.keterangan ? ` - ${item.keterangan}` : ""}
                </div>
              ))
            ) : (
              <p className="text-gray-400">Tiada</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-gray-800">Waktu Operasi Aktif</h3>
          <div className="max-h-44 space-y-2 overflow-y-auto text-sm text-gray-600">
            {waktuOperasi.map((item) => (
              <div key={item.id}>
                <span className="font-medium">{item.namaHari}</span>{" "}
                Sesi {item.sesi || "-"}: {timeOnly(item.waktuMula)} -{" "}
                {timeOnly(item.waktuTamat)}
              </div>
            ))}
            {waktuOperasi.length === 0 && (
              <p className="text-gray-400">Tiada waktu operasi aktif</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
