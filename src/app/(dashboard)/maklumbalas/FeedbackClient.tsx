"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface FeedbackItem {
  id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  counterNo: string | null;
  ticketNo: string;
  createdAt: string;
}

interface CSATSummary {
  avgRating: string;
  positiveRate: number;
  totalFeedbacks: number;
  starDistribution: Record<number, number>;
  topTags: Array<{ tag: string; count: number }>;
}

export default function FeedbackClient({
  feedbacks,
  summary,
  branchName,
}: {
  feedbacks: FeedbackItem[];
  summary: CSATSummary;
  branchName: string;
}) {
  const { language, t } = useLanguage();
  const [filterRating, setFilterRating] = useState<number | "ALL">("ALL");

  const filteredFeedbacks = feedbacks.filter((f) =>
    filterRating === "ALL" ? true : f.rating === filterRating
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div>
        <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2">
          {t("navFeedback")}
        </span>
        <h1 className="text-2xl font-bold text-gray-900">
          {language === "en" ? `Customer Feedback & CSAT Star Ratings (${branchName})` : `Analisis Maklum Balas & Penarafan Bintang (${branchName})`}
        </h1>
        <p className="text-sm text-gray-500">
          {language === "en"
            ? "Monitor real-time customer satisfaction after completing counter service interactions."
            : "Pantau tahap kepuasan pelanggan secara langsung selepas mereka selesai berurusan di kaunter."}
        </p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* CSAT Score */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg space-y-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-100">
            {language === "en" ? "Average CSAT Score" : "Purata Skor CSAT"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black">{summary.avgRating}</span>
            <span className="text-xl font-bold text-amber-200">/ 5.0 ★</span>
          </div>
          <p className="text-xs text-amber-100 pt-2">
            {language === "en" ? "Based on " : "Berasaskan "}
            <strong>{summary.totalFeedbacks}</strong> {language === "en" ? "ratings" : "penilaian"}
          </p>
        </div>

        {/* Positive Rate */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {language === "en" ? "Positive Sentiment (4-5 Stars)" : "Sentimen Positif (4-5 Bintang)"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-emerald-600">{summary.positiveRate}%</span>
          </div>
          <p className="text-xs text-gray-400 pt-2">
            {language === "en" ? "Highly satisfied customers" : "Pelanggan berpuas hati tinggi"}
          </p>
        </div>

        {/* Top Compliments */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {language === "en" ? "Top Compliments" : "Pujian Paling Popular"}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {summary.topTags.length === 0 ? (
              <span className="text-xs text-gray-400">{language === "en" ? "No tags yet" : "Tiada tag lagi"}</span>
            ) : (
              summary.topTags.map((tItem) => (
                <span
                  key={tItem.tag}
                  className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl"
                >
                  {tItem.tag} ({tItem.count})
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Feedbacks List */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-bold text-gray-900 text-base">{language === "en" ? "Customer Reviews Stream" : "Senarai Ulasan Langsung"}</h2>

          {/* Rating Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterRating("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterRating === "ALL"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("all")} ({feedbacks.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                onClick={() => setFilterRating(star)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filterRating === star
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {star} ★ ({summary.starDistribution[star] || 0})
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredFeedbacks.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              {language === "en" ? "No customer feedback for this filter." : "Tiada rekod maklum balas untuk penapis ini."}
            </div>
          ) : (
            filteredFeedbacks.map((f) => (
              <div key={f.id} className="p-6 hover:bg-gray-50/50 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-500 font-bold text-base">
                      {"★".repeat(f.rating)}
                      <span className="text-gray-200">{"★".repeat(5 - f.rating)}</span>
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                      {f.ticketNo}
                    </span>
                    {f.counterNo && (
                      <span className="text-xs text-gray-400">
                        Kaunter {f.counterNo}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {f.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {f.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-medium rounded-lg"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Comment */}
                  {f.comment && (
                    <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-2xl border border-gray-100 italic">
                      &ldquo;{f.comment}&rdquo;
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 text-xs text-gray-400 font-mono">
                  {new Date(f.createdAt).toLocaleString(language === "en" ? "en-US" : "ms-MY")}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
