"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface DeviceItem {
  id: string;
  deviceName: string;
  deviceUid: string;
  deviceType: string;
  isPaired: boolean;
  branchId: string | null;
  branchName: string | null;
  lastHeartbeat: string;
  isOnline: boolean;
}

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

export default function DeviceManagerClient({
  devices: initialDevices,
  branches,
}: {
  devices: DeviceItem[];
  branches: BranchOption[];
}) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [devices] = useState<DeviceItem[]>(initialDevices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || "");
  const [customDeviceName, setCustomDeviceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const onlineCount = devices.filter((d) => d.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/devices/confirm-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinInput,
          branchId: selectedBranch,
          deviceName: customDeviceName || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || (language === "en" ? "Device paired successfully!" : "Peranti berjaya dipadankan!"));
        setPinInput("");
        setCustomDeviceName("");
        setIsModalOpen(false);
        router.refresh();
      } else {
        setErrorMessage(data.message || (language === "en" ? "Failed to pair device." : "Gagal memadankan peranti."));
      }
    } catch {
      setErrorMessage(language === "en" ? "Network error during pairing." : "Ralat rangkaian semasa memadankan peranti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2">
            {t("navDevices")}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === "en" ? "TV & Kiosk Device Screen Management" : "Pengurusan Peranti TV & Kiosk"}
          </h1>
          <p className="text-sm text-gray-500">
            {language === "en"
              ? "Monitor TV display connections and pair new screen displays using a 6-digit PIN code."
              : "Pantau status sambungan paparan skrin TV dan padankan peranti baharu menggunakan kod PIN 6-digit."}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {language === "en" ? "+ Pair New Device (PIN)" : "Padankan Peranti Baru (+ PIN)"}
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="text-lg leading-none cursor-pointer">&times;</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{language === "en" ? "Total TV Screens" : "Jumlah Skrin TV"}</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{devices.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl">
            📺
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{language === "en" ? "Online Displays" : "Status Online"}</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{onlineCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl">
            🟢
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{language === "en" ? "Offline Displays" : "Status Offline"}</p>
            <p className="text-3xl font-black text-gray-500 mt-1">{offlineCount}</p>
          </div>
          <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center font-bold text-xl">
            ⚪
          </div>
        </div>
      </div>

      {/* Device List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900">{language === "en" ? "Registered TV Display Screens" : "Senarai Paparan Skrin Berdaftar"}</h2>
        </div>

        {devices.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <p className="text-4xl mb-3">📺</p>
            <p className="font-bold text-gray-700">{language === "en" ? "No TV display screens registered yet." : "Tiada peranti didaftarkan lagi."}</p>
            <p className="text-xs text-gray-400 mt-1">
              {language === "en"
                ? "Open the TV Display app on Android TV or browser, and enter the PIN above."
                : "Buka aplikasi TV Display pada Android TV / pelayar, dan tekan butang di atas untuk memasukkan PIN."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">{language === "en" ? "Device Name" : "Nama Peranti"}</th>
                  <th className="px-6 py-3.5">{language === "en" ? "Branch" : "Cawangan"}</th>
                  <th className="px-6 py-3.5">{language === "en" ? "Type" : "Jenis"}</th>
                  <th className="px-6 py-3.5">{language === "en" ? "Last Heartbeat" : "Heartbeat Terakhir"}</th>
                  <th className="px-6 py-3.5">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{device.deviceName}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{device.deviceUid}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {device.branchName || (language === "en" ? "— Unpaired —" : "— Belum Dipadankan —")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-medium">
                        {device.deviceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleString(language === "en" ? "en-US" : "ms-MY") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          device.isOnline
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            device.isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                          }`}
                        />
                        {device.isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pairing PIN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
            <div>
              <h3 className="text-lg font-black text-gray-900">{language === "en" ? "Pair New TV Display Screen" : "Padankan Skrin Paparan TV Baru"}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {language === "en"
                  ? "Enter the 6-digit PIN displayed on your TV Screen (Android TV / Web app)."
                  : "Masukkan kod PIN 6-digit yang tertera pada skrin TV anda (Android TV / Web app)."}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handlePairSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === "en" ? "6-Digit PIN Code *" : "Kod PIN 6-Digit *"}
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Cth: 482910"
                  className="w-full text-center tracking-widest font-mono text-2xl font-black p-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === "en" ? "Assign to Branch *" : "Tetapkan Cawangan *"}
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-300 rounded-2xl bg-white focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code}] {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === "en" ? "Display Label / Location (Optional)" : "Nama Paparan / Lokasi (Pilihan)"}
                </label>
                <input
                  type="text"
                  value={customDeviceName}
                  onChange={(e) => setCustomDeviceName(e.target.value)}
                  placeholder="Cth: TV Lobi Utama Aras 1"
                  className="w-full text-xs p-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || pinInput.length !== 6}
                  className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? t("loading") : (language === "en" ? "Confirm & Pair TV" : "Sahkan & Padankan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
