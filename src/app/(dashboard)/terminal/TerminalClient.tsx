"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { announceQueueNumber, playAirportChime } from "@/lib/voice-announcer";

interface CurrentServing {
  id: string;
  ticketNo: string;
  counterNo: string;
  categoryName: string;
  callCount: number;
  servedAt: string | null;
}

interface WaitingTicket {
  id: string;
  ticketNo: string;
  categoryName: string;
  customerName?: string | null;
  createdAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
  prefixCode: string;
  nextCategoryId?: string | null;
}

export default function TerminalClient({
  branchId,
  branchName,
  counterNo: initialCounterNo,
  counterId: initialCounterId,
  initialServing,
  waitingTickets: initialWaiting,
  categories,
}: {
  branchId: string;
  branchName: string;
  counterNo: string;
  counterId: string;
  initialServing: CurrentServing | null;
  waitingTickets: WaitingTicket[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [currentServing, setCurrentServing] = useState<CurrentServing | null>(initialServing);
  const [waitingList, setWaitingList] = useState<WaitingTicket[]>(initialWaiting);
  const [counterNo, setCounterNo] = useState(initialCounterNo || "1");
  const [counterId, setCounterId] = useState(initialCounterId || "");
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferCatId, setTransferCatId] = useState(categories[0]?.id || "");
  const [manualTicketInput, setManualTicketInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [voiceMode, setVoiceMode] = useState<"ms" | "en" | "bilingual">("ms");

  // Live Timer untuk masa layanan tiket semasa
  useEffect(() => {
    let interval: any;
    if (currentServing) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [currentServing]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTestAudio = async () => {
    setStatusMessage(language === "en" ? "Testing airport chime & speech synthesis..." : "Menguji bunyi chime & sintesis suara...");
    await announceQueueNumber({
      ticketNo: currentServing?.ticketNo || "A1001",
      counterNo: counterNo || "1",
      language: voiceMode,
      chime: true,
    });
  };

  const handleAction = async (
    action: "CALL_NEXT" | "RECALL" | "COMPLETE" | "NO_SHOW" | "TRANSFER" | "COMPLETE_AND_FORWARD",
    extraBody = {}
  ) => {
    setLoading(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/kaunter/panggil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          counterNo,
          counterId,
          action,
          ticketId: currentServing?.id,
          ...extraBody,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (action === "CALL_NEXT") {
          if (data.ticket) {
            setCurrentServing({
              id: data.ticket.id,
              ticketNo: data.ticket.ticketNo,
              counterNo: data.ticket.counterNo,
              categoryName: data.ticket.categoryName || "Perkhidmatan",
              callCount: data.ticket.callCount || 1,
              servedAt: new Date().toISOString(),
            });
            setElapsedSeconds(0);
            setStatusMessage(language === "en" ? `Calling Ticket ${data.ticket.ticketNo}` : `Memanggil Tiket ${data.ticket.ticketNo}`);

            // Enjin Suara & Chime Automatik
            announceQueueNumber({
              ticketNo: data.ticket.ticketNo,
              counterNo: counterNo,
              language: voiceMode,
              chime: true,
            });
          } else {
            setStatusMessage(language === "en" ? "No customers waiting in queue." : "Tiada pelanggan dalam barisan menunggu.");
            setCurrentServing(null);
          }
        } else if (action === "RECALL") {
          if (currentServing) {
            setCurrentServing({
              ...currentServing,
              callCount: currentServing.callCount + 1,
            });
            setStatusMessage(language === "en" ? `Recalled Ticket ${currentServing.ticketNo}` : `Panggilan Semula Tiket ${currentServing.ticketNo}`);

            // Panggil semula dengan Suara & Chime
            announceQueueNumber({
              ticketNo: currentServing.ticketNo,
              counterNo: counterNo,
              language: voiceMode,
              chime: true,
            });
          }
        } else if (action === "COMPLETE" || action === "NO_SHOW" || action === "TRANSFER" || action === "COMPLETE_AND_FORWARD") {
          setCurrentServing(null);
          setElapsedSeconds(0);
          setStatusMessage(
            action === "COMPLETE_AND_FORWARD"
              ? (data.forwarded
                  ? (language === "en" ? `Ticket forwarded to ${data.ticket?.nextCategoryName || "next stage"}.` : `Tiket berjaya dihantar ke ${data.ticket?.nextCategoryName || "peringkat seterusnya"}.`)
                  : (language === "en" ? "Service completed successfully." : "Urusan telah berjaya diselesaikan."))
              : action === "COMPLETE"
              ? (language === "en" ? "Service completed successfully." : "Urusan telah berjaya diselesaikan.")
              : action === "NO_SHOW"
              ? (language === "en" ? "Ticket marked as No Show." : "Tiket ditandakan sebagai Tidak Hadir.")
              : (language === "en" ? "Ticket transferred successfully." : "Tiket berjaya dipindahkan.")
          );
        }

        // Segarkan data
        router.refresh();
      } else {
        setStatusMessage(data.message || (language === "en" ? "Operation failed." : "Operasi gagal."));
      }
    } catch {
      setStatusMessage(language === "en" ? "Network connection error." : "Ralat sambungan pelayan.");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferCatId) return;
    handleAction("TRANSFER", { targetCategoryId: transferCatId });
    setIsTransferOpen(false);
  };

  // Cari kategori peringkat seterusnya bagi tiket yang sedang dilayan
  const currentCategory = categories.find(
    (c) => c.name === currentServing?.categoryName || c.prefixCode === currentServing?.ticketNo?.[0]
  );
  const nextStageCategory = currentCategory?.nextCategoryId
    ? categories.find((c) => c.id === currentCategory.nextCategoryId)
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700">
            {branchName}
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{t("termTitle")}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Voice Language Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setVoiceMode("ms")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                voiceMode === "ms" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
              }`}
            >
              🇲🇾 BM
            </button>
            <button
              onClick={() => setVoiceMode("en")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                voiceMode === "en" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
              }`}
            >
              🇬🇧 EN
            </button>
            <button
              onClick={() => setVoiceMode("bilingual")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                voiceMode === "bilingual" ? "bg-white text-blue-600 shadow-xs" : "text-gray-500"
              }`}
            >
              🌐 BM+EN
            </button>
          </div>

          <button
            onClick={handleTestAudio}
            title="Uji Suara & Chime"
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>🔊</span>
            <span className="hidden sm:inline">{language === "en" ? "Test Voice" : "Uji Suara"}</span>
          </button>

          <label className="text-xs font-semibold text-gray-500 uppercase">{t("termCounter")}:</label>
          <input
            type="text"
            value={counterNo}
            onChange={(e) => setCounterNo(e.target.value)}
            className="w-24 text-center font-bold px-3 py-1.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium rounded-xl flex items-center justify-between animate-in fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-blue-500 hover:text-blue-700 font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Main Terminal Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col (2 Cols): Active Calling Center */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Serving Ticket Big Card */}
          <div className="bg-white rounded-3xl border-2 border-blue-500 shadow-lg p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                {currentServing ? t("termCurrentServing") : t("termReadyToCall")}
              </span>
            </div>

            <div className="absolute top-4 right-4">
              <span className="text-xs font-bold text-gray-400 font-mono">
                {t("termCounter")} #{counterNo}
              </span>
            </div>

            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
              {currentServing ? currentServing.categoryName : t("termNoTicketServing")}
            </p>

            <div className="my-6">
              {currentServing ? (
                <div className="text-7xl sm:text-8xl font-black text-gray-900 tracking-wider font-mono">
                  {currentServing.ticketNo}
                </div>
              ) : (
                <div className="text-6xl sm:text-7xl font-bold text-gray-300 tracking-wider font-mono">
                  ----
                </div>
              )}
            </div>

            {currentServing && (
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500 border-t border-gray-100 pt-4">
                <div>
                  <span className="font-semibold text-gray-400">{language === "en" ? "Calls: " : "Panggilan: "}</span>
                  <span className="font-bold text-gray-700">{currentServing.callCount}x</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-400">{language === "en" ? "Service Time: " : "Masa Layanan: "}</span>
                  <span className="font-mono font-bold text-blue-600 text-base">{formatTimer(elapsedSeconds)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Control Buttons */}
          <div className="space-y-3">
            {nextStageCategory && currentServing && (
              <button
                onClick={() => handleAction("COMPLETE_AND_FORWARD")}
                disabled={loading || !currentServing}
                className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-95 text-white font-black rounded-2xl shadow-lg transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 animate-pulse"
              >
                <span>⏭️</span>
                <span>Selesai &amp; Hantar ke {nextStageCategory.name} ➔</span>
              </button>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => handleAction("CALL_NEXT")}
                disabled={loading}
                className="col-span-2 sm:col-span-2 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-2xl shadow-md transition-all text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>📢</span> {t("termCallNext")}
              </button>

              <button
                onClick={() => handleAction("RECALL")}
                disabled={loading || !currentServing}
                className="py-4 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>🔁</span> {t("termRecall")}
              </button>

              <button
                onClick={() => handleAction("COMPLETE")}
                disabled={loading || !currentServing}
                className="py-4 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>✅</span> {t("termComplete")}
              </button>

              <button
                onClick={() => handleAction("NO_SHOW")}
                disabled={loading || !currentServing}
                className="py-3 px-4 bg-gray-100 hover:bg-red-50 hover:text-red-600 active:scale-95 text-gray-700 font-bold rounded-xl transition text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <span>❌</span> {language === "en" ? "No Show" : "Tidak Hadir"}
              </button>

              <button
                onClick={() => setIsTransferOpen(true)}
                disabled={loading || !currentServing}
                className="py-3 px-4 bg-gray-100 hover:bg-purple-50 hover:text-purple-700 active:scale-95 text-gray-700 font-bold rounded-xl transition text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <span>🔀</span> {t("termTransfer")}
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Waiting Queue List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900 text-sm">{t("termWaitingList")}</h2>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              {waitingList.length} {t("dashPeople")}
            </span>
          </div>

          {/* Carian / Panggilan Nombor Manual */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualTicketInput.trim()) return;
              handleAction("CALL_NEXT", { targetTicketNo: manualTicketInput.trim() });
              setManualTicketInput("");
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Cari / Taip No. Tiket (Cth: P1005)..."
              value={manualTicketInput}
              onChange={(e) => setManualTicketInput(e.target.value.toUpperCase())}
              className="w-full text-xs font-mono font-bold p-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={loading || !manualTicketInput.trim()}
              className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0 disabled:opacity-40"
            >
              📢 Panggil
            </button>
          </form>

          <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {waitingList.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                {t("termNoWaiting")}
              </div>
            ) : (
              waitingList.map((item, idx) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between hover:bg-gray-50/80 px-2 rounded-xl transition gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-black text-gray-900 font-mono">{item.ticketNo}</p>
                        {item.customerName && (
                          <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">
                            • {item.customerName}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">{item.categoryName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => handleAction("CALL_NEXT", { targetTicketId: item.id })}
                      disabled={loading}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1"
                      title={`Panggil terus tiket ${item.ticketNo}`}
                    >
                      <span>📢</span>
                      <span>Panggil</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Pindahan Urusan */}
      {isTransferOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-gray-900 text-base">{language === "en" ? "Transfer Ticket Service" : "Pindah Kategori Urusan Tiket"}</h3>
            <p className="text-xs text-gray-500">
              {language === "en"
                ? `Select target service category to transfer ticket ${currentServing?.ticketNo}:`
                : `Pilih urusan sasaran untuk tiket ${currentServing?.ticketNo}:`}
            </p>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <select
                value={transferCatId}
                onChange={(e) => setTransferCatId(e.target.value)}
                className="w-full text-xs font-bold p-3 border border-gray-300 rounded-xl bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.prefixCode}] {c.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {language === "en" ? "Transfer Now" : "Pindahkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
