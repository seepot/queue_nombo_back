"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface TicketData {
  id: string;
  ticketNo: string;
  status: string;
  counterNo: string | null;
  categoryName: string;
  branchName: string;
  tenantName: string;
  waitingAhead: number;
  estimatedMinutes: number;
  calledAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function TicketClient({ initialTicket }: { initialTicket: TicketData }) {
  const { language, setLanguage, t } = useLanguage();
  const [ticket, setTicket] = useState<TicketData>(initialTicket);
  const [lastStatus, setLastStatus] = useState(initialTicket.status);

  // CSAT Rating States
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([t("csatFastService"), t("csatFriendlyStaff")]);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const TAG_OPTIONS = [
    t("csatFastService"),
    t("csatFriendlyStaff"),
    t("csatClearExplanation"),
    t("csatComfortableSpace"),
    t("csatShortWait"),
    t("csatCleanCounter"),
  ];

  // Amaran bunyi pelayar apabila dipanggil
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      // Getaran telefon haptik
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 500]);
      }
    } catch {
      // Audio autoplay policy
    }
  };

  // Polling status tiket setiap 3 saat
  useEffect(() => {
    if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED" || ticket.status === "NO_SHOW") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tickets/${ticket.id}`);
        const data = await res.json();

        if (data.success && data.ticket) {
          const updated = data.ticket;
          setTicket((prev) => ({
            ...prev,
            status: updated.status,
            counterNo: updated.counterNo,
            waitingAhead: updated.waitingAhead ?? prev.waitingAhead,
            estimatedMinutes: updated.estimatedMinutes ?? prev.estimatedMinutes,
            calledAt: updated.calledAt ?? prev.calledAt,
            completedAt: updated.completedAt ?? prev.completedAt,
          }));

          if (lastStatus !== "CALLING" && updated.status === "CALLING") {
            playAlertSound();
          }
          setLastStatus(updated.status);
        }
      } catch (err) {
        console.error("Gagal mendapatkan status terkini tiket:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [ticket.id, ticket.status, lastStatus]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);

    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          rating,
          tags: selectedTags,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackSubmitted(true);
      }
    } catch {
      alert("Ralat semasa menghantar maklum balas.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const isCalling = ticket.status === "CALLING";
  const isCompleted = ticket.status === "COMPLETED";

  return (
    <div
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors duration-500 font-sans ${
        isCalling
          ? "bg-emerald-600 text-white"
          : isCompleted
          ? "bg-slate-900 text-white"
          : "bg-gradient-to-b from-blue-50 to-slate-100 text-gray-900"
      }`}
    >
      {/* Top Header & Language Switcher */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <div className="text-left">
          <span
            className={`inline-block px-3 py-1 text-xs font-extrabold rounded-full tracking-wider uppercase mb-1 ${
              isCalling
                ? "bg-white text-emerald-900 shadow-sm"
                : isCompleted
                ? "bg-slate-800 text-slate-300"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {ticket.tenantName}
          </span>
          <h1 className="text-lg font-bold tracking-tight">{ticket.branchName}</h1>
        </div>

        {/* Language switch */}
        <div className="flex items-center bg-white/20 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-sm">
          <button
            type="button"
            onClick={() => setLanguage("ms")}
            className={`px-2 py-0.5 text-xs font-black rounded-lg transition-all ${
              language === "ms"
                ? "bg-white text-blue-900 shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            🇲🇾 BM
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2 py-0.5 text-xs font-black rounded-lg transition-all ${
              language === "en"
                ? "bg-white text-blue-900 shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            🇬🇧 EN
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-sm w-full mx-auto my-auto py-4">
        {/* If Not Completed: Normal Ticket Display */}
        {!isCompleted ? (
          <div className="bg-white text-gray-900 rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            {/* Status Tag */}
            <div>
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                  isCalling
                    ? "bg-emerald-500 text-white shadow-lg animate-pulse"
                    : ticket.status === "SERVING"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {isCalling
                  ? t("tktPleaseProceed")
                  : ticket.status === "SERVING"
                  ? t("tktBeingServed")
                  : t("tktWaiting")}
              </span>
            </div>

            {/* Ticket Hero Box */}
            <div className="space-y-1 py-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {t("tktYourTurn")}
              </p>
              <div
                className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${
                  isCalling ? "text-emerald-600 scale-105" : "text-gray-900"
                }`}
              >
                {ticket.ticketNo}
              </div>
            </div>

            {/* Waiting Ahead Stats (Hanya jika WAITING) */}
            {ticket.status === "WAITING" && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase">{t("tktAhead")}</p>
                  <p className="text-2xl font-black text-blue-600 mt-1 font-mono">
                    {ticket.waitingAhead} <span className="text-xs font-sans text-gray-500">{t("dashPeople")}</span>
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase">{t("tktEstWait")}</p>
                  <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
                    ~{ticket.estimatedMinutes} <span className="text-xs font-sans text-gray-500">min</span>
                  </p>
                </div>
              </div>
            )}

            {/* Calling Message (Jika CALLING) */}
            {isCalling && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold animate-bounce">
                {t("tktCallingMsg", { counter: ticket.counterNo || "1" })}
              </div>
            )}

            {/* Helpful Notice */}
            <p className="text-xs text-gray-400">
              {t("tktDocNotice")}
            </p>
          </div>
        ) : (
          /* CSAT Feedback Form (Apabila Urusan Selesai) */
          <div className="bg-white text-gray-900 rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-300">
            {!feedbackSubmitted ? (
              <form onSubmit={handleFeedbackSubmit} className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-2">
                    ✨
                  </div>
                  <h2 className="text-xl font-black text-gray-900">
                    {t("csatTitle")}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {t("csatDesc", { ticketNo: ticket.ticketNo })}
                  </p>
                </div>

                {/* 5-Star Interactive Rating */}
                <div className="flex justify-center items-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-4xl transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                    >
                      {star <= rating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>

                <p className="text-center text-xs font-bold text-gray-500">
                  {rating === 5 && "🤩 Cemerlang / Excellent"}
                  {rating === 4 && "😊 Memuaskan / Good"}
                  {rating === 3 && "😐 Sederhana / Average"}
                  {rating === 2 && "😕 Kurang Memuaskan / Poor"}
                  {rating === 1 && "😡 Tidak Memuaskan / Terrible"}
                </p>

                {/* Quick Compliment Tags */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">{t("csatTagsTitle")}</p>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedTags.includes(tag)
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Comment */}
                <div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ulasan atau cadangan penambahbaikan (Pilihan)..."
                    rows={2}
                    className="w-full text-xs p-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {submittingFeedback ? t("loading") : t("csatSubmit")}
                </button>
              </form>
            ) : (
              /* Thank You Message */
              <div className="text-center py-8 space-y-3">
                <div className="text-5xl animate-bounce">🎉</div>
                <h3 className="text-xl font-black text-gray-900">{t("csatThankYou")}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t("csatThankYouDesc")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Live Sync Indicator */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold opacity-80">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t("tktLiveSync")}</span>
        </div>
      </div>
    </div>
  );
}
