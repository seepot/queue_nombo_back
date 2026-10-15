"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { speakKioskGuidance } from "@/lib/voice-announcer";
import { generateLocalOfflineTicket } from "@/lib/offline-sync";

interface CategoryInfo {
  id: string;
  name: string;
  prefixCode: string;
  estimatedMinutes: number;
  waitingCount: number;
}

interface BranchKioskData {
  id: string;
  name: string;
  code: string;
  address: string | null;
  tenantName: string;
  tenantSlug: string;
  categories: CategoryInfo[];
}

export default function KioskClient({ branch }: { branch: BranchKioskData }) {
  const { language, setLanguage, t } = useLanguage();
  const [categories] = useState(branch.categories);
  const [selectedCat, setSelectedCat] = useState<CategoryInfo | null>(null);
  const [phoneNo, setPhoneNo] = useState("");
  const [showNumpad, setShowNumpad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<{
    id: string;
    ticketNo: string;
    categoryName: string;
    waitingAhead: number;
  } | null>(null);
  const [autoResetTimer, setAutoResetTimer] = useState<number>(6);

  // Auto reset screen countdown when ticket is issued
  useEffect(() => {
    let interval: any;
    if (issuedTicket) {
      setAutoResetTimer(6);
      interval = setInterval(() => {
        setAutoResetTimer((prev) => {
          if (prev <= 1) {
            setIssuedTicket(null);
            setSelectedCat(null);
            setPhoneNo("");
            setShowNumpad(false);
            return 6;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [issuedTicket]);

  const handleCategoryPress = (cat: CategoryInfo) => {
    setSelectedCat(cat);
    setShowNumpad(true);
  };

  const handleNumpadInput = (num: string) => {
    if (phoneNo.length < 11) {
      setPhoneNo((prev) => prev + num);
    }
  };

  const handleNumpadDelete = () => {
    setPhoneNo((prev) => prev.slice(0, -1));
  };

  const handleIssueTicket = async () => {
    if (!selectedCat) return;
    setLoading(true);

    try {
      const res = await fetch("/api/tickets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branch.id,
          categoryId: selectedCat.id,
          phoneNo: phoneNo.trim() || undefined,
          requestType: "KIOSK",
        }),
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        setIssuedTicket({
          id: data.ticket.id,
          ticketNo: data.ticket.ticketNo,
          categoryName: selectedCat.name,
          waitingAhead: data.ticket.waitingAhead || selectedCat.waitingCount,
        });
        setShowNumpad(false);

        // Panduan Suara Kiosk & Cetakan
        speakKioskGuidance(
          language === "en"
            ? `Ticket ${data.ticket.ticketNo} generated. Please collect your ticket slip.`
            : `Tiket ${data.ticket.ticketNo} berjaya dikeluarkan. Sila ambil slip nombor giliran anda.`,
          language
        );

        // Buka cetakan slip terma dalam tetingkap cetak
        window.open(`/ticket/${data.ticket.id}/print`, "_blank", "width=400,height=600");
      } else {
        alert(data.message || (language === "en" ? "Error generating ticket." : "Ralat menjana tiket."));
      }
    } catch {
      // Offline fallback: Jana tiket setempat
      const offlineTicket = generateLocalOfflineTicket({
        prefixCode: selectedCat.prefixCode,
        branchId: branch.id,
        categoryId: selectedCat.id,
        categoryName: selectedCat.name,
        phoneNo: phoneNo.trim() || undefined,
      });

      setIssuedTicket({
        id: offlineTicket.id,
        ticketNo: offlineTicket.ticketNo,
        categoryName: selectedCat.name,
        waitingAhead: selectedCat.waitingCount,
      });
      setShowNumpad(false);

      speakKioskGuidance(
        language === "en"
          ? `Offline ticket ${offlineTicket.ticketNo} generated. Please collect your ticket slip.`
          : `Tiket luar talian ${offlineTicket.ticketNo} dikeluarkan. Sila ambil slip nombor giliran anda.`,
        language
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col justify-between p-6 sm:p-10 font-sans select-none overflow-hidden">
      {/* Top Kiosk Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div>
          <span className="inline-block px-3.5 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-400 text-xs font-black rounded-full uppercase tracking-widest mb-1.5">
            {branch.tenantName}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {branch.name}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t("kioskDesc")}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher for Visitors */}
          <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700 shadow-lg">
            <button
              type="button"
              onClick={() => setLanguage("ms")}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                language === "ms"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇲🇾 BM
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                language === "en"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇬🇧 ENG
            </button>
          </div>

          <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Touch Area */}
      <div className="my-auto py-6">
        {!issuedTicket ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {t("kioskTitle")}
              </h2>
              <p className="text-sm text-slate-400">
                {t("kioskDesc")}
              </p>
            </div>

            {/* Giant Category Touch Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryPress(cat)}
                  className="bg-slate-800/90 hover:bg-blue-900/60 active:scale-95 border-2 border-slate-700 hover:border-blue-500 rounded-3xl p-6 sm:p-8 text-left transition-all shadow-xl hover:shadow-blue-500/20 cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-2">
                    <span className="w-14 h-14 rounded-2xl bg-blue-600 group-hover:bg-blue-500 text-white font-mono font-black text-2xl flex items-center justify-center shadow-lg">
                      {cat.prefixCode}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-300">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {t("kioskWaitingCount", { count: cat.waitingCount })} • ~{(cat.waitingCount + 1) * cat.estimatedMinutes} min
                      </p>
                    </div>
                  </div>

                  <span className="text-3xl text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-transform">
                    ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Big Ticket Issued Screen */
          <div className="max-w-md mx-auto bg-slate-800/95 border-2 border-emerald-500/60 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl mx-auto flex items-center justify-center text-3xl">
              🎟️
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{t("kioskTicketPrinted")}</p>
              <h2 className="text-5xl font-black font-mono text-white mt-1 tracking-tight">
                {issuedTicket.ticketNo}
              </h2>
              <p className="text-sm font-bold text-slate-300 mt-2">{issuedTicket.categoryName}</p>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700/80 space-y-1">
              <p className="text-xs text-slate-400">{t("kioskAheadOfYou")}</p>
              <p className="text-2xl font-black text-blue-400">{issuedTicket.waitingAhead} {t("dashPeople")}</p>
            </div>

            <p className="text-xs text-slate-400">
              {t("kioskTakeSlip")}
            </p>

            <div className="pt-2">
              <span className="inline-block px-4 py-1.5 bg-slate-900 text-slate-400 text-xs font-mono rounded-full border border-slate-700">
                {t("kioskAutoReset", { sec: autoResetTimer })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal Numpad for Phone (Optional) */}
      {showNumpad && selectedCat && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <span className="px-3 py-1 bg-blue-600/30 border border-blue-400/40 text-blue-400 text-xs font-bold rounded-full uppercase font-mono">
                {selectedCat.name}
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                {t("kioskEnterPhone")}
              </h3>
            </div>

            {/* Display Field */}
            <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 text-center">
              <span className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-emerald-400">
                {phoneNo ? phoneNo : <span className="text-slate-600 text-lg">0123456789</span>}
              </span>
            </div>

            {/* Touch Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumpadInput(num)}
                  className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-90 font-black text-2xl text-white transition-all shadow-md cursor-pointer border border-slate-700"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleNumpadDelete}
                className="h-16 rounded-2xl bg-red-950/60 hover:bg-red-900 active:scale-90 font-bold text-sm text-red-400 transition-all border border-red-800/50 cursor-pointer flex items-center justify-center"
              >
                ⌫ Padam
              </button>
              <button
                type="button"
                onClick={() => handleNumpadInput("0")}
                className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-90 font-black text-2xl text-white transition-all shadow-md cursor-pointer border border-slate-700"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleIssueTicket()}
                className="h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-90 font-black text-xs uppercase tracking-wider text-white transition-all shadow-md cursor-pointer flex items-center justify-center"
              >
                Langkau ➔
              </button>
            </div>

            {/* Submit / Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNumpad(false)}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-300 transition cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleIssueTicket}
                className="flex-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
              >
                {loading ? t("loading") : t("kioskPrintBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="flex items-center justify-between text-slate-500 text-xs pt-4 border-t border-slate-900">
        <p>QueNombo Smart Kiosk Cloud v2.5</p>
        <p>{branch.address || "Semua hak cipta terpelihara."}</p>
      </div>
    </div>
  );
}
