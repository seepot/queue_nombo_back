"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { CounterRecommendation, HourlyForecastItem } from "@/lib/ai-queue";

export default function AiOptimaClient({
  initialRecommendations,
  initialForecast,
  branchName,
  branchId,
}: {
  initialRecommendations: CounterRecommendation;
  initialForecast: HourlyForecastItem[];
  branchName: string;
  branchId: string;
}) {
  const { language, t } = useLanguage();
  const [recommendation, setRecommendation] = useState<CounterRecommendation>(initialRecommendations);
  const [forecast, setForecast] = useState<HourlyForecastItem[]>(initialForecast);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/ai/forecast?branchId=${branchId}`);
      const data = await res.json();
      if (data.success) {
        setRecommendation(data.recommendations);
        setForecast(data.hourlyForecast);
      }
    } catch {
      alert(language === "en" ? "Failed to refresh AI forecast." : "Ralat semasa memuat semula data AI.");
    } finally {
      setRefreshing(false);
    }
  };

  const isCritical = recommendation.status === "CRITICAL_SURGE";
  const isWarning = recommendation.status === "SURGE_WARNING";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
              {t("navAIOptima")}
            </span>
            <span className="text-xs font-mono text-gray-500">v2.4 Predictive Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {language === "en" ? "AI Predictive Queue Optimization & Surge Alerts" : "Pengoptimuman Giliran Pintar & Ramalan AI"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {language === "en"
              ? `Real-time queuing telemetry and 4-hour workload prediction for ${branchName}.`
              : `Analisis telemetri giliran langsung dan unjuran bebanan 4-jam seterusnya bagi ${branchName}.`}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          {refreshing ? (language === "en" ? "Analyzing..." : "Menganalisis...") : (language === "en" ? "⚡ Recompute AI Forecast" : "⚡ Kira Semula Ramalan AI")}
        </button>
      </div>

      {/* Surge Alert Banner */}
      <div
        className={`p-6 rounded-3xl border shadow-md transition-all ${
          isCritical
            ? "bg-red-500/10 border-red-500/30 text-red-950"
            : isWarning
            ? "bg-amber-500/10 border-amber-500/30 text-amber-950"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-950"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="text-3xl">
              {isCritical ? "🚨" : isWarning ? "⚠️" : "✨"}
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase tracking-wide">
                {isCritical
                  ? (language === "en" ? "Critical Queue Surge Detected" : "Lonjakan Giliran Kritikal Dikesan")
                  : isWarning
                  ? (language === "en" ? "Warning: High Counter Workload" : "Amaran Peningkatan Bebanan Kaunter")
                  : (language === "en" ? "Optimal & Stable Operating Status" : "Status Operasi Cemerlang & Terkawal")}
              </h3>
              <p className="text-xs font-medium opacity-90 max-w-3xl">
                {recommendation.actionMessage}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs uppercase font-bold text-gray-500 block">{language === "en" ? "Efficiency Score (OEI)" : "Indeks Kecekapan (OEI)"}</span>
            <span className="text-3xl font-black text-purple-700 font-mono">
              {recommendation.efficiencyScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Metrics & Smart Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase">{language === "en" ? "Currently Open Counters" : "Kaunter Dibuka Semasa"}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900 font-mono">
              {recommendation.activeCounters}
            </span>
            <span className="text-xs text-gray-500">{t("dashCountersOperating")}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-xs space-y-1 bg-gradient-to-br from-purple-50/50 to-white">
          <p className="text-xs font-bold text-purple-700 uppercase flex items-center gap-1">
            <span>🤖</span> {language === "en" ? "AI Recommended Counters" : "Kaunter Disyorkan AI"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-purple-700 font-mono">
              {recommendation.recommendedCounters}
            </span>
            <span className="text-xs text-purple-600 font-semibold">
              {recommendation.recommendedCounters > recommendation.activeCounters
                ? `(+${recommendation.recommendedCounters - recommendation.activeCounters} counters)`
                : `(${language === "en" ? "Optimum Capacity" : "Kapasiti Optimum"})`}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase">{language === "en" ? "Current Avg Wait Time" : "Masa Menunggu Semasa"}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900 font-mono">
              ~{recommendation.currentAvgWaitMinutes}
            </span>
            <span className="text-xs text-gray-500">{language === "en" ? "min / ticket" : "minit / tiket"}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-xs space-y-1 bg-gradient-to-br from-emerald-50/50 to-white">
          <p className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1">
            <span>🎯</span> {language === "en" ? "Projected Wait After Scaling" : "Sasaran Masa Lepas Pengoptimuman"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-emerald-700 font-mono">
              ~{recommendation.projectedWaitMinutes}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              {language === "en" ? `min (Saves ~${Math.max(0, recommendation.currentAvgWaitMinutes - recommendation.projectedWaitMinutes)} min)` : `minit (Jimat ~${Math.max(0, recommendation.currentAvgWaitMinutes - recommendation.projectedWaitMinutes)} min)`}
            </span>
          </div>
        </div>
      </div>

      {/* 4-Hour Future Traffic & Capacity Forecast Chart */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              {language === "en" ? "4-Hour Forward Traffic & Staffing Forecast" : "Unjuran Trafik & Keperluan Staf 4-Jam Ke Hadapan"}
            </h2>
            <p className="text-xs text-gray-500">
              {language === "en"
                ? "Poisson-arrival predictive model based on historical queuing demand and time of day."
                : "Model ramalan waktu puncak berasaskan data sejarah dan kebarangkalian ketibaan Poisson."}
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="timeSlot" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "none",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar dataKey="predictedArrivals" fill="#6366f1" radius={[6, 6, 0, 0]} name={language === "en" ? "Predicted Arrivals" : "Ramalan Ketibaan (Pelanggan)"} />
              <Bar dataKey="recommendedCounters" fill="#10b981" radius={[6, 6, 0, 0]} name={language === "en" ? "Recommended Counters" : "Disyorkan Buka (Kaunter)"} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
