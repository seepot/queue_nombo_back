"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CategoryOption {
  id: string;
  name: string;
  prefixCode: string;
}

interface BranchInfo {
  id: string;
  name: string;
  code: string;
  address: string | null;
  tenantName: string;
  tenantSlug: string;
  categories: CategoryOption[];
}

export default function BookingClient({ branch }: { branch: BranchInfo }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(branch.categories[0]?.id || "");
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [timeSlot, setTimeSlot] = useState("10:00");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState<{
    appointment: any;
    googleCalendarUrl: string;
  } | null>(null);

  const TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  ];

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branch.id,
          categoryId: selectedCategory,
          appointmentDate,
          timeSlot,
          customerName,
          customerPhone,
          customerEmail,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Gagal membuat tempahan temujanji.");
      } else {
        setSuccessData({
          appointment: data.appointment,
          googleCalendarUrl: data.calendar?.googleCalendarUrl || "",
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ralat sambungan rangkaian.");
    } finally {
      setLoading(false);
    }
  };

  const handleImmediateCheckIn = async () => {
    if (!successData?.appointment?.id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/appointments/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: successData.appointment.id }),
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        router.push(`/ticket/${data.ticket.id}`);
      }
    } catch {
      alert("Ralat semasa mendaftar masuk.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-gray-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="text-center pt-3 pb-2">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold rounded-full tracking-wider uppercase mb-2">
          Tempahan Temujanji Maya
        </span>
        <h1 className="text-2xl font-black text-gray-900">{branch.tenantName}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{branch.name}</p>
      </div>

      {/* Main Form or Success View */}
      <div className="max-w-md w-full mx-auto my-auto py-4">
        {!successData ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pilih Slot Masa Hadapan</h2>
              <p className="text-xs text-gray-500">Pilih tarikh dan masa yang sesuai untuk urusan anda.</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl animate-in fade-in">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleBooking} className="space-y-4">
              {/* 1. Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  1. Tarikh Temujanji *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* 2. Service Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  2. Kategori Urusan *
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {branch.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.prefixCode}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Time Slots */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  3. Pilih Slot Masa *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = timeSlot === slot;
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setTimeSlot(slot)}
                        className={`py-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Customer Info */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Penuh Anda *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmad Zaki"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    No. Telefon (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0123456789"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-600/30 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? "Mengesahkan..." : "Sahkan Tempahan Temujanji ➔"}
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation View */
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center text-3xl">
              ✅
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Temujanji Anda Disahkan!</h2>
              <p className="text-xs text-gray-500 mt-1">
                Sila simpan butiran temujanji di bawah atau tambah ke kalendar telefon anda.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Urusan:</span>
                <span className="font-bold text-gray-900">{successData.appointment.category?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Tarikh:</span>
                <span className="font-bold text-blue-600 font-mono">
                  {new Date(successData.appointment.appointmentDate).toLocaleDateString("ms-MY")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Masa:</span>
                <span className="font-bold text-blue-600 font-mono">{successData.appointment.timeSlot}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Nama:</span>
                <span className="font-bold text-gray-900">{successData.appointment.customerName}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {successData.googleCalendarUrl && (
                <a
                  href={successData.googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  📅 Tambah ke Google Calendar
                </a>
              )}

              <button
                onClick={handleImmediateCheckIn}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                🎟️ Daftar Masuk & Ambil Tiket Keutamaan Sekarang
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-2 text-xs text-gray-400">
        Dikuasakan oleh <span className="font-bold text-blue-600">QueNombo</span>
      </div>
    </div>
  );
}
