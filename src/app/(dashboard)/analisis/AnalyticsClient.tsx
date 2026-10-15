"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface AnalyticsData {
  summary: {
    totalTickets: number;
    completedTickets: number;
    noShowTickets: number;
    avgWaitMinutes: string;
    avgServiceMinutes: string;
    slaRate: number;
    noShowRate: number;
  };
  hourlyData: Array<{ hour: string; count: number }>;
  categoryData: Array<{ name: string; count: number }>;
  staffPerformance: Array<{
    name: string;
    servedCount: number;
    avgServiceMinutes: string;
  }>;
}

interface BranchOption {
  id: string;
  name: string;
}

export default function AnalyticsClient({
  initialData,
  branches,
}: {
  initialData: AnalyticsData;
  branches: BranchOption[];
}) {
  const { language, t } = useLanguage();
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranch(branchId);
    try {
      const res = await fetch(`/api/reports/analytics?branchId=${branchId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load branch analytics:", err);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/reports/export?branchId=${selectedBranch}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan_quenombo_${selectedBranch}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV Export error:", err);
      alert(language === "en" ? "Failed to download CSV export." : "Gagal memuat turun fail CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs">
        <div>
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2">
            {t("navAnalytics")}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === "en" ? "SLA Performance Analysis & Peak Hours Distribution" : "Analisis Prestasi SLA & Taburan Waktu Puncak"}
          </h1>
          <p className="text-sm text-gray-500">
            {language === "en"
              ? "Monitor customer waiting times, counter efficiency, and service charter SLA compliance."
              : "Pantau masa menunggu pelanggan, kecekapan kaunter, dan pematuhan piagam perkhidmatan."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {branches.length > 1 && (
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">{language === "en" ? "All Branches" : "Semua Cawangan"}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>📥</span> {exporting ? (language === "en" ? "Generating CSV..." : "Menjana CSV...") : (language === "en" ? "Export CSV Report" : "Eksport Laporan CSV")}
          </button>
        </div>
      </div>

      {/* 4 Metric Hero Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Purata Masa Menunggu */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {language === "en" ? "Avg Waiting Time (AWT)" : "Purata Masa Menunggu (AWT)"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600">{data.summary.avgWaitMinutes}</span>
            <span className="text-xs text-gray-400 font-semibold">{language === "en" ? "minutes" : "minit"}</span>
          </div>
          <p className="text-[11px] text-gray-400">{language === "en" ? "Charter Target: < 15 min" : "Sasaran Piagam: < 15 minit"}</p>
        </div>

        {/* 2. Purata Masa Layanan */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {language === "en" ? "Avg Service Time (AST)" : "Purata Masa Layanan (AST)"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{data.summary.avgServiceMinutes}</span>
            <span className="text-xs text-gray-400 font-semibold">{language === "en" ? "minutes" : "minit"}</span>
          </div>
          <p className="text-[11px] text-gray-400">{language === "en" ? "Counter interaction time" : "Masa perbincangan kaunter"}</p>
        </div>

        {/* 3. Pematuhan SLA */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {language === "en" ? "SLA Compliance Rate" : "Kadar Pematuhan SLA"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">{data.summary.slaRate}%</span>
            <span className="text-xs text-emerald-600 font-bold">{language === "en" ? "Excellent" : "Cemerlang"}</span>
          </div>
          <p className="text-[11px] text-gray-400">{language === "en" ? "Served within target SLA" : "Dilayan dalam tempoh sasaran"}</p>
        </div>

        {/* 4. Kadar No-Show */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {language === "en" ? "Missed Rate (No-Show)" : "Kadar Terlepas (No-Show)"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">{data.summary.noShowRate}%</span>
            <span className="text-xs text-gray-400 font-semibold">({data.summary.noShowTickets} {language === "en" ? "tickets" : "tiket"})</span>
          </div>
          <p className="text-[11px] text-gray-400">{language === "en" ? "Customers absent" : "Pelanggan tidak hadir"}</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Hours Hourly Traffic Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <div>
            <h2 className="font-bold text-gray-900 text-base">
              {language === "en" ? "Peak Hours Traffic Distribution" : "Taburan Waktu Puncak (Peak Hours)"}
            </h2>
            <p className="text-xs text-gray-500">
              {language === "en" ? "Ticket intake volume by operating hour (8:00 AM - 5:00 PM)." : "Volum kemasukan tiket mengikut jam operasi harian (8:00 AM - 5:00 PM)."}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b" }} />
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
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} name={language === "en" ? "Total Tickets" : "Jumlah Tiket"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <div>
            <h2 className="font-bold text-gray-900 text-base">{language === "en" ? "Service Categories Breakdown" : "Pecahan Urusan"}</h2>
            <p className="text-xs text-gray-500">{language === "en" ? "Demand ratio by service type." : "Nisbah permintaan mengikut kategori."}</p>
          </div>

          <div className="space-y-3 pt-2">
            {data.categoryData.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>{cat.name}</span>
                  <span className="font-mono text-blue-600">{cat.count} {language === "en" ? "tickets" : "tiket"}</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{
                      width: `${
                        data.summary.totalTickets > 0
                          ? Math.round((cat.count / data.summary.totalTickets) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">{language === "en" ? "Staff & Counter Performance Ranking" : "Prestasi Kaunter & Staf Bertugas"}</h2>
          <p className="text-xs text-gray-500">{language === "en" ? "Productivity and average customer handling time per counter." : "Produktiviti dan purata kepantasan layanan mengikut staf kaunter."}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3.5">{language === "en" ? "Staff / Counter" : "Staf / Kaunter"}</th>
                <th className="px-6 py-3.5">{language === "en" ? "Completed Tickets" : "Tiket Selesai"}</th>
                <th className="px-6 py-3.5">{language === "en" ? "Avg Service Time (AST)" : "Purata Masa Layanan"}</th>
                <th className="px-6 py-3.5 text-right">{language === "en" ? "Efficiency Status" : "Status Kecekapan"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.staffPerformance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-400">
                    {language === "en" ? "No counter service data recorded yet." : "Belum ada rekod layanan staf kaunter."}
                  </td>
                </tr>
              ) : (
                data.staffPerformance.map((staff, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-gray-900">{staff.name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">
                      {staff.servedCount} {language === "en" ? "tickets" : "tiket"}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700">{staff.avgServiceMinutes} {language === "en" ? "min" : "minit"}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {language === "en" ? "High Productivity" : "Produktif Tinggi"}
                      </span>
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
