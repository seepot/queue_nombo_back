"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface HadRow {
  id: number | null;
  kumpulanPerkhidmatan: string | null;
  keterangan?: string;
  noSiri?: number;
  status?: number;
  hadPelanggan1: number;
  hadPelanggan2: number;
  hadPelanggan3: number;
}

interface HadLimitData {
  jenisLimit: number;
  cawanganHad: HadRow;
  perkhidmatanHad: HadRow[];
  tempohMulaScan: number;
  tempohMenungguSelepasImbas: number;
}

interface Props {
  data: HadLimitData;
}

const toInput = (value: number) => String(value || 0);
const toNumber = (value: string) => Math.max(Number(value || 0), 0);

export default function HadLimitClient({ data }: Props) {
  const router = useRouter();
  const [jenisLimit, setJenisLimit] = useState(String(data.jenisLimit || 1));
  const [cawanganHad, setCawanganHad] = useState({
    hadPelanggan1: toInput(data.cawanganHad.hadPelanggan1),
    hadPelanggan2: toInput(data.cawanganHad.hadPelanggan2),
    hadPelanggan3: toInput(data.cawanganHad.hadPelanggan3),
  });
  const [perkhidmatanHad, setPerkhidmatanHad] = useState(
    data.perkhidmatanHad.map((row) => ({
      ...row,
      hadPelanggan1: toInput(row.hadPelanggan1),
      hadPelanggan2: toInput(row.hadPelanggan2),
      hadPelanggan3: toInput(row.hadPelanggan3),
    }))
  );
  const [tempohMulaScan, setTempohMulaScan] = useState(
    toInput(data.tempohMulaScan)
  );
  const [tempohMenungguSelepasImbas, setTempohMenungguSelepasImbas] = useState(
    toInput(data.tempohMenungguSelepasImbas)
  );
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const updatePerkhidmatanHad = (
    index: number,
    field: "hadPelanggan1" | "hadPelanggan2" | "hadPelanggan3",
    value: string
  ) => {
    setPerkhidmatanHad((current) =>
      current.map((row, idx) =>
        idx === index ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);

    const selectedJenisLimit = Number(jenisLimit);
    const rows =
      selectedJenisLimit === 1
        ? [
            {
              id: data.cawanganHad.id,
              kumpulanPerkhidmatan: null,
              hadPelanggan1: toNumber(cawanganHad.hadPelanggan1),
              hadPelanggan2: toNumber(cawanganHad.hadPelanggan2),
              hadPelanggan3: toNumber(cawanganHad.hadPelanggan3),
            },
          ]
        : perkhidmatanHad.map((row) => ({
            id: row.id,
            kumpulanPerkhidmatan: row.kumpulanPerkhidmatan,
            hadPelanggan1: toNumber(row.hadPelanggan1),
            hadPelanggan2: toNumber(row.hadPelanggan2),
            hadPelanggan3: toNumber(row.hadPelanggan3),
          }));

    try {
      const res = await fetch("/api/pentadbiran/had-limit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenisLimit: selectedJenisLimit,
          rows,
          tempohMulaScan: toNumber(tempohMulaScan),
          tempohMenungguSelepasImbas: toNumber(tempohMenungguSelepasImbas),
        }),
      });

      if (res.ok) {
        setMsg({ type: "success", text: "Had limit berjaya dikemaskini" });
        router.refresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: result.error || "Kemaskini gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setSaving(false);
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

      <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-bold text-gray-800">
            Pilihan Penggunaan Had Limit Pelanggan
          </h3>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Jenis Had Limit
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={jenisLimit}
              onChange={(e) => setJenisLimit(e.target.value)}
            >
              <option value="1">Had Limit Mengikut Cawangan</option>
              <option value="2">Had Limit Mengikut Kumpulan Perkhidmatan</option>
            </select>
          </div>
          <button
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
            disabled={saving}
            onClick={handleSave}
            type="button"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-bold text-gray-800">Tetapan Imbas QR</h3>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tempoh Mula Imbas Kod QR Sebelum Operasi Kaunter (minit)
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              min={0}
              type="number"
              value={tempohMulaScan}
              onChange={(e) => setTempohMulaScan(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tempoh Menunggu selepas Imbas (minit)
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              min={0}
              type="number"
              value={tempohMenungguSelepasImbas}
              onChange={(e) => setTempohMenungguSelepasImbas(e.target.value)}
            />
          </div>
        </div>
      </div>

      {jenisLimit === "1" ? (
        <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-bold text-gray-800">
              Tetapan Had Limit Mengikut Cawangan
            </h3>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            {[
              ["hadPelanggan1", "Sesi 1"],
              ["hadPelanggan2", "Sesi 2"],
              ["hadPelanggan3", "Sesi 3"],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  min={0}
                  type="number"
                  value={cawanganHad[field as keyof typeof cawanganHad]}
                  onChange={(e) =>
                    setCawanganHad((current) => ({
                      ...current,
                      [field]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-bold text-gray-800">
              Tetapan Had Limit Mengikut Kumpulan Perkhidmatan
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Kump. Perkhidmatan</th>
                  <th className="px-4 py-2 text-center">Sesi 1</th>
                  <th className="px-4 py-2 text-center">Sesi 2</th>
                  <th className="px-4 py-2 text-center">Sesi 3</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {perkhidmatanHad.map((row, idx) => (
                  <tr key={row.kumpulanPerkhidmatan || idx}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {row.keterangan}
                      </div>
                      <div className="text-xs text-gray-400">
                        Siri {row.noSiri || "-"}
                        {row.status === 0 ? " - Tidak aktif" : ""}
                      </div>
                    </td>
                    {(["hadPelanggan1", "hadPelanggan2", "hadPelanggan3"] as const).map(
                      (field) => (
                        <td key={field} className="px-4 py-3">
                          <input
                            className="mx-auto block w-24 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm"
                            min={0}
                            type="number"
                            value={row[field]}
                            onChange={(e) =>
                              updatePerkhidmatanHad(idx, field, e.target.value)
                            }
                          />
                        </td>
                      )
                    )}
                  </tr>
                ))}
                {perkhidmatanHad.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-400" colSpan={4}>
                      Tiada kumpulan perkhidmatan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
