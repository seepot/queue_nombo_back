"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DraftSlot {
  id: number;
  cawangan: string | null;
  keterangan: string | null;
  tarikh: string | null;
  bilangan: number | null;
  status: number | null;
  masa: string | null;
  urusniaga: number | null;
}

interface Props {
  initialMula: string;
  initialTamat: string;
  slots: DraftSlot[];
  tarikh: string[];
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00+08:00`).toLocaleDateString("ms-MY", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DrafSlotClient({
  initialMula,
  initialTamat,
  slots,
  tarikh,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<DraftSlot | null>(null);
  const [bilangan, setBilangan] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [loading, setLoading] = useState<string | null>(null);

  const groupedSlots = tarikh.map((date) => ({
    tarikh: date,
    slots: slots.filter((slot) => slot.tarikh === date),
  }));

  const openEdit = (slot: DraftSlot) => {
    setEditing(slot);
    setBilangan(String(slot.bilangan || 0));
  };

  const runAction = async (action: "publish" | "jana_semula") => {
    if (tarikh.length === 0) {
      setMsg({ type: "error", text: "Tiada tarikh draf untuk diproses" });
      return;
    }

    const confirmText =
      action === "publish"
        ? "Slot akan dibuka untuk tempahan. Anda pasti?"
        : "Semua slot draf dalam julat ini akan dihapuskan. Anda pasti?";

    if (!window.confirm(confirmText)) return;

    setLoading(action);
    setMsg(null);

    try {
      const res = await fetch("/api/temujanji/draf-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, tarikh }),
      });

      if (res.ok) {
        setMsg({
          type: "success",
          text:
            action === "publish"
              ? "Slot telah berjaya dibuka untuk tempahan"
              : "Slot telah berjaya dihapuskan",
        });
        router.refresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: result.error || "Tindakan gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(null);
    }
  };

  const updateSlot = async () => {
    if (!editing) return;

    setLoading(`edit-${editing.id}`);
    setMsg(null);

    try {
      const res = await fetch("/api/temujanji/draf-slot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, bilangan: Number(bilangan || 0) }),
      });

      if (res.ok) {
        setMsg({ type: "success", text: "Rekod telah dikemaskini" });
        setEditing(null);
        router.refresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: result.error || "Kemaskini gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(null);
    }
  };

  const deleteSlot = async (slot: DraftSlot) => {
    if (!window.confirm("Anda pasti untuk menghapuskan rekod ini?")) return;

    setLoading(`delete-${slot.id}`);
    setMsg(null);

    try {
      const res = await fetch(`/api/temujanji/draf-slot?id=${slot.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMsg({ type: "success", text: "Slot telah berjaya dihapuskan" });
        router.refresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: result.error || "Padam slot gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(null);
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

      <form className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tarikh Mula
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              defaultValue={initialMula}
              name="mula"
              type="date"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tarikh Hingga
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              defaultValue={initialTamat}
              name="tamat"
              type="date"
            />
          </div>
          <button
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            type="submit"
          >
            Pilih
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <button
          className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:text-blue-300"
          disabled={loading === "jana_semula" || slots.length === 0}
          onClick={() => runAction("jana_semula")}
          type="button"
        >
          {loading === "jana_semula" ? "Memproses..." : "Jana Semula Slot"}
        </button>
        <button
          className="rounded-lg border border-green-200 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:text-green-300"
          disabled={loading === "publish" || slots.length === 0}
          onClick={() => runAction("publish")}
          type="button"
        >
          {loading === "publish" ? "Memproses..." : "Buka untuk Tempahan"}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-orange-300 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-bold text-gray-800">Draf Slot Temujanji</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Masa</th>
                <th className="px-4 py-2 text-left">Urusniaga</th>
                <th className="px-4 py-2 text-center">Bilangan Temujanji/Slot</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupedSlots.map((group) => (
                <>
                  <tr className="bg-gray-50" key={`${group.tarikh}-heading`}>
                    <td className="px-4 py-2 font-bold text-gray-800" colSpan={5}>
                      {formatDate(group.tarikh)}
                    </td>
                  </tr>
                  {group.slots.map((slot) => (
                    <tr className="hover:bg-gray-50" key={slot.id}>
                      <td className="px-4 py-2 font-medium">{slot.masa || "-"}</td>
                      <td className="px-4 py-2">{slot.keterangan || "-"}</td>
                      <td className="px-4 py-2 text-center">{slot.bilangan || 0}</td>
                      <td className="px-4 py-2 text-center">
                        {slot.status === 0 ? "Draf" : "Aktif"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            onClick={() => openEdit(slot)}
                            type="button"
                          >
                            Kemaskini
                          </button>
                          <button
                            className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
                            disabled={loading === `delete-${slot.id}`}
                            onClick={() => deleteSlot(slot)}
                            type="button"
                          >
                            {loading === `delete-${slot.id}` ? "..." : "Padam"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
              {slots.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Tiada draf slot untuk julat tarikh ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              Kemaskini Slot
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Masa
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  readOnly
                  value={editing.masa || ""}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Bilangan Slot
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  min={0}
                  onChange={(e) => setBilangan(e.target.value)}
                  type="number"
                  value={bilangan}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                onClick={() => setEditing(null)}
                type="button"
              >
                Tutup
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loading === `edit-${editing.id}`}
                onClick={updateSlot}
                type="button"
              >
                {loading === `edit-${editing.id}` ? "Menyimpan..." : "Kemaskini"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
