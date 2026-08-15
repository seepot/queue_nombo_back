"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CawanganData {
  id: number;
  idCawangan: string | null;
  namaCawangan: string;
  latitud: string | null;
  longitud: string | null;
  radius: number | null;
}

interface Props {
  data: CawanganData | null;
}

export default function KoordinatRadiusClient({ data }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    latitud: data?.latitud || "",
    longitud: data?.longitud || "",
    radius: data?.radius == null ? "" : String(data.radius),
  });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/pentadbiran/koordinat-radius", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMsg({ type: "success", text: "Koordinat dan radius berjaya dikemaskini" });
        router.refresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: result.error || "Kemaskini gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <p className="text-gray-400">Tiada data cawangan</p>;

  return (
    <div className="space-y-4">
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
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nama Cawangan
            </label>
            <input
              type="text"
              value={data.namaCawangan}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Latitud
              </label>
              <input
                type="text"
                value={form.latitud}
                onChange={(e) => setForm({ ...form, latitud: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Contoh: 3.139003"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Longitud
              </label>
              <input
                type="text"
                value={form.longitud}
                onChange={(e) => setForm({ ...form, longitud: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Contoh: 101.686855"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Radius Imbas Kod QR (meter)
            </label>
            <input
              type="number"
              min={0}
              value={form.radius}
              onChange={(e) => setForm({ ...form, radius: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Menyimpan..." : "Kemaskini"}
          </button>
        </form>
      </div>
    </div>
  );
}
