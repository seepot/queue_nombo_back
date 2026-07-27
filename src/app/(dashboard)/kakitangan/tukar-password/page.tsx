"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function TukarPasswordPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (form.newPassword !== form.confirmPassword) {
      setMsg({ type: "error", text: "Pengesahan kata laluan baru tidak sepadan" });
      return;
    }

    if (form.newPassword.length < 6) {
      setMsg({ type: "error", text: "Kata laluan baru mestilah sekurang-kurangnya 6 aksara" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/kakitangan/tukar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: form.oldPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Kata laluan berjaya dikemaskini" });
        setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setMsg({ type: "error", text: data.error || "Kemaskini gagal" });
      }
    } catch {
      setMsg({ type: "error", text: "Ralat rangkaian" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Kemaskini Katalaluan</h1>
        <p className="text-gray-500 mt-1">Tukar kata laluan akaun anda</p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Nama:</span> {session?.user?.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kata Laluan Lama
            </label>
            <input
              type="password"
              value={form.oldPassword}
              onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Masukkan kata laluan lama"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kata Laluan Baru
            </label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Masukkan kata laluan baru"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pengesahan Kata Laluan Baru
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Masukkan sekali lagi kata laluan baru"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg text-sm transition"
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </div>
    </div>
  );
}
