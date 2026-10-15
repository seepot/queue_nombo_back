"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface AppointmentData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  categoryName: string;
  ticketId: string | null;
  notes: string | null;
}

export default function AppointmentClient({
  appointments: initialAppointments,
  branchName,
  tenantSlug,
}: {
  appointments: AppointmentData[];
  branchName: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [appointments] = useState<AppointmentData[]>(initialAppointments);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const filtered = appointments.filter(
    (a) =>
      a.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.customerPhone.includes(searchTerm)
  );

  const handleManualCheckIn = async (appointmentId: string) => {
    setLoadingId(appointmentId);
    setAlertMessage(null);

    try {
      const res = await fetch("/api/appointments/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        setAlertMessage(
          language === "en"
            ? `Check-in successful! Priority Queue Number: ${data.ticket.ticketNo}`
            : `Daftar masuk berjaya! Nombor Giliran Keutamaan: ${data.ticket.ticketNo}`
        );
        router.refresh();
      } else {
        setAlertMessage(data.message || (language === "en" ? "Failed to check in." : "Gagal mendaftar masuk."));
      }
    } catch {
      setAlertMessage(language === "en" ? "Network error during check-in." : "Ralat rangkaian semasa mendaftar masuk.");
    } finally {
      setLoadingId(null);
    }
  };

  const todayStr = new Date().toISOString().substring(0, 10);
  const todayCount = appointments.filter((a) => a.appointmentDate.startsWith(todayStr)).length;
  const checkedInCount = appointments.filter((a) => a.status === "CHECKED_IN").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2">
            {t("navAppointments")}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === "en" ? `Customer Appointments List (${branchName})` : `Senarai Temujanji Pelanggan (${branchName})`}
          </h1>
          <p className="text-sm text-gray-500">
            {language === "en"
              ? "Monitor appointment attendance and perform check-ins to issue priority queue tickets."
              : "Pantau kehadiran temujanji dan lakukan daftar masuk ke barisan giliran keutamaan."}
          </p>
        </div>

        <a
          href={`/book/${tenantSlug}`}
          target="_blank"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          {language === "en" ? "+ Open Public Booking Form ↗" : "+ Buka Borang Tempahan Awam ↗"}
        </a>
      </div>

      {alertMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <span>{alertMessage}</span>
          <button onClick={() => setAlertMessage(null)} className="text-lg leading-none cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase">{language === "en" ? "Total Appointments" : "Jumlah Temujanji"}</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{appointments.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-blue-600 uppercase">{language === "en" ? "Today's Appointments" : "Temujanji Hari Ini"}</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{todayCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase">{language === "en" ? "Attended (Checked-In)" : "Telah Hadir (Checked-In)"}</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{checkedInCount}</p>
        </div>
      </div>

      {/* Appointments Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-gray-900 text-base">{language === "en" ? "Appointment Records" : "Senarai Rekod Temujanji"}</h2>
          <input
            type="text"
            placeholder={language === "en" ? "Search name or phone..." : "Cari nama atau no. telefon..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">{language === "en" ? "Customer" : "Pelanggan"}</th>
                <th className="px-6 py-3.5">{language === "en" ? "Service" : "Urusan"}</th>
                <th className="px-6 py-3.5">{language === "en" ? "Date & Time" : "Tarikh & Masa"}</th>
                <th className="px-6 py-3.5">{t("status")}</th>
                <th className="px-6 py-3.5 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-400">
                    {language === "en" ? "No appointment records found." : "Tiada rekod temujanji ditemui."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{a.customerName}</div>
                      <div className="text-xs text-gray-400 font-mono">{a.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-800">{a.categoryName}</td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-blue-600">{a.timeSlot}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(a.appointmentDate).toLocaleDateString(language === "en" ? "en-US" : "ms-MY")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          a.status === "CHECKED_IN"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : a.status === "CONFIRMED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {a.status === "CHECKED_IN"
                          ? (language === "en" ? "Attended" : "Telah Hadir")
                          : a.status === "CONFIRMED"
                          ? (language === "en" ? "Confirmed" : "Disahkan")
                          : a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {a.status === "CONFIRMED" ? (
                        <button
                          disabled={loadingId === a.id}
                          onClick={() => handleManualCheckIn(a.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {loadingId === a.id ? t("loading") : (language === "en" ? "Check In ➔" : "Daftar Masuk ➔")}
                        </button>
                      ) : a.status === "CHECKED_IN" ? (
                        <span className="text-xs text-gray-400 font-mono">
                          {language === "en" ? "Queue Issued" : "Tiket Dikeluarkan"}
                        </span>
                      ) : null}
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
