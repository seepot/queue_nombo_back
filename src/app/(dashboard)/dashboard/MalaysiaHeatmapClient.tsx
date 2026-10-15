"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import rawGeoData from "./malaysiaGeoData.json";
import rawStateBBoxes from "./stateBBoxes.json";
import BranchCounterDrilldownModal from "./BranchCounterDrilldownModal";

interface BranchItem {
  idCawangan: string;
  namaCawangan: string;
  quota: number;
  issued: number;
  waiting: number;
  served: number;
  cancelled: number;
  utilizationRate: number;
  slaRate: number;
  avgWaitMinutes: number;
  capacityStatus: "critical" | "high" | "moderate" | "low";
}

interface StateItem {
  code: string;
  name: string;
  shortName: string;
  region: "utara" | "tengah" | "selatan" | "timur" | "borneo";
  branchCount: number;
  quota: number;
  issued: number;
  waiting: number;
  served: number;
  cancelled: number;
  utilizationRate: number;
  slaRate: number;
  avgWaitMinutes: number;
  capacityStatus: "critical" | "high" | "moderate" | "low";
  branches: BranchItem[];
}

interface HeatmapData {
  selectedDate: string;
  summary: {
    totalQuota: number;
    totalIssued: number;
    totalWaiting: number;
    totalServed: number;
    overallUtilizationRate: number;
    overallSlaRate: number;
    totalBranches: number;
    totalStates: number;
  };
  states: StateItem[];
}

type MetricMode = "quota" | "waiting" | "sla";
type RegionFilter = "all" | "utara" | "tengah" | "selatan" | "timur" | "borneo";
type LegendFilter = "all" | "critical" | "high" | "moderate" | "low";

interface StatePathConfig {
  code: string;
  name: string;
  short: string;
  region: string;
  labelX: number;
  labelY: number;
  d: string;
}

const MALAYSIA_GEO_PATHS = rawGeoData as Record<string, StatePathConfig>;
const STATE_BBOXES = rawStateBBoxes as Record<
  string,
  {
    code: string;
    name: string;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    viewBox: string;
  }
>;

interface MalaysiaHeatmapClientProps {
  userLevel?: string;
  lockedStateCode?: string;
}

export default function MalaysiaHeatmapClient({
  userLevel,
  lockedStateCode,
}: MalaysiaHeatmapClientProps) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTarikh, setSelectedTarikh] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [metricMode, setMetricMode] = useState<MetricMode>("quota");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [legendFilter, setLegendFilter] = useState<LegendFilter>("all");
  const [selectedStateCode, setSelectedStateCode] = useState<string>(
    lockedStateCode || "10"
  );
  const [isStateFocused, setIsStateFocused] = useState(Boolean(lockedStateCode)); // Auto-focused if locked to state!
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredState, setHoveredState] = useState<StateItem | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Search & Auto-locate state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Counter Drilldown Modal state
  const [drilldownBranch, setDrilldownBranch] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Comparison Tool state
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [compareStateCodeA, setCompareStateCodeA] = useState("10"); // Selangor
  const [compareStateCodeB, setCompareStateCodeB] = useState("01"); // Johor

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const branchPanelRef = useRef<HTMLDivElement>(null);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pentadbiran/peta-haba?tarikh=${selectedTarikh}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedTarikh]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHeatmap();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchHeatmap]);

  const stateDataMap = useMemo(() => {
    const map = new Map<string, StateItem>();
    if (data?.states) {
      for (const s of data.states) {
        map.set(s.code, s);
      }
    }
    return map;
  }, [data]);

  const selectedState = useMemo(() => {
    return stateDataMap.get(selectedStateCode) || data?.states[0] || null;
  }, [stateDataMap, selectedStateCode, data]);

  // Dynamic ViewBox: Zooms directly into selected state bounding box when in focus mode!
  const activeViewBox = useMemo(() => {
    if (isStateFocused && selectedStateCode && STATE_BBOXES[selectedStateCode]) {
      return STATE_BBOXES[selectedStateCode].viewBox;
    }
    return "0 0 1000 420";
  }, [isStateFocused, selectedStateCode]);

  // States to render: in focused mode, only render the selected state; otherwise render all
  const statesToRender = useMemo(() => {
    if (isStateFocused) {
      return Object.entries(MALAYSIA_GEO_PATHS).filter(
        ([code]) => code === selectedStateCode
      );
    }
    return Object.entries(MALAYSIA_GEO_PATHS);
  }, [isStateFocused, selectedStateCode]);

  // Color calculator based on metric mode
  const getStateColor = (state?: StateItem) => {
    if (!state) return "#475569"; // Slate 600
    if (metricMode === "quota") {
      const u = state.utilizationRate;
      if (u >= 95) return "#ef4444"; // Crimson Red (Critical)
      if (u >= 85) return "#f97316"; // Orange (High)
      if (u >= 60) return "#eab308"; // Amber / Yellow (Moderate)
      return "#10b981"; // Emerald Green (Low / Clear)
    }
    if (metricMode === "waiting") {
      const w = state.waiting;
      if (w >= 60) return "#ef4444";
      if (w >= 30) return "#f97316";
      if (w >= 10) return "#eab308";
      return "#10b981";
    }
    if (metricMode === "sla") {
      if (state.issued === 0 && state.served === 0) {
        return "#64748b"; // Neutral Slate 500 (Cuti / Tiada Transaksi)
      }
      const s = state.slaRate;
      if (s >= 90) return "#10b981";
      if (s >= 75) return "#eab308";
      if (s >= 60) return "#f97316";
      return "#ef4444";
    }
    return "#10b981";
  };

  const getMetricDisplayValue = (state: StateItem) => {
    if (metricMode === "quota") return `${state.utilizationRate}%`;
    if (metricMode === "waiting") return `${state.waiting} org`;
    if (metricMode === "sla") {
      return state.issued === 0 && state.served === 0 ? "-" : `${state.slaRate}%`;
    }
    return "";
  };

  // Top rankings (States for National View, Branches for State View!)
  // 1. Penggunaan Kuota Tertinggi: Berdasarkan BILANGAN tiket dikeluarkan (issued count)
  const topBusyStates = useMemo(() => {
    if (!data?.states) return [];
    return [...data.states]
      .filter((s) => s.issued > 0)
      .sort((a, b) => b.issued - a.issued)
      .slice(0, 3);
  }, [data]);

  // 2. SLA Piagam Paling Cekap: Kecualikan negeri yang cuti/tiada transaksi (issued = 0 & served = 0)
  const topSlaStates = useMemo(() => {
    if (!data?.states) return [];
    return [...data.states]
      .filter((s) => s.issued > 0 || s.served > 0)
      .sort((a, b) => {
        if (b.slaRate !== a.slaRate) {
          return b.slaRate - a.slaRate;
        }
        return a.avgWaitMinutes - b.avgWaitMinutes;
      })
      .slice(0, 3);
  }, [data]);

  // Branch Rankings within current selected state
  // 1. Cawangan Paling Tinggi Kuota: Berdasarkan bilangan tiket dikeluarkan
  const topBusyBranches = useMemo(() => {
    if (!selectedState?.branches) return [];
    return [...selectedState.branches]
      .filter((b) => b.issued > 0)
      .sort((a, b) => b.issued - a.issued)
      .slice(0, 3);
  }, [selectedState]);

  // 2. Cawangan Paling Cekap SLA: Kecualikan cawangan cuti/tiada transaksi
  const topSlaBranches = useMemo(() => {
    if (!selectedState?.branches) return [];
    return [...selectedState.branches]
      .filter((b) => b.issued > 0 || b.served > 0)
      .sort((a, b) => {
        if (b.slaRate !== a.slaRate) {
          return b.slaRate - a.slaRate;
        }
        return a.avgWaitMinutes - b.avgWaitMinutes;
      })
      .slice(0, 3);
  }, [selectedState]);

  // Search autocompletion list
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !data) return [];
    const query = searchQuery.toLowerCase();
    const results: Array<{
      type: "state" | "branch";
      stateCode: string;
      title: string;
      subtitle: string;
      utilization: number;
      status: string;
    }> = [];

    for (const s of data.states) {
      if (
        s.name.toLowerCase().includes(query) ||
        s.shortName.toLowerCase().includes(query) ||
        s.code.includes(query)
      ) {
        results.push({
          type: "state",
          stateCode: s.code,
          title: s.name,
          subtitle: `Negeri (${s.branchCount} Cawangan) &bull; Kuota: ${s.utilizationRate}%`,
          utilization: s.utilizationRate,
          status: s.capacityStatus,
        });
      }

      for (const b of s.branches) {
        if (
          b.namaCawangan.toLowerCase().includes(query) ||
          b.idCawangan.toLowerCase().includes(query)
        ) {
          results.push({
            type: "branch",
            stateCode: s.code,
            title: b.namaCawangan,
            subtitle: `Cawangan di ${s.name} &bull; Menunggu: ${b.waiting} org &bull; Kuota: ${b.utilizationRate}%`,
            utilization: b.utilizationRate,
            status: b.capacityStatus,
          });
        }
      }
    }
    return results.slice(0, 8);
  }, [searchQuery, data]);

  // Click state handler: zooms into state and hides others!
  const handleStateClick = (code: string) => {
    setSelectedStateCode(code);
    setIsStateFocused(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Reset back to whole Malaysia map
  const handleResetToNationalView = () => {
    // Level 7 (Pengarah Negeri) is locked to their state — cannot navigate back to national view
    if (lockedStateCode) return;
    setIsStateFocused(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.35, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.35, 0.8));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Export Map as High-Res PNG
  const handleExportPNG = () => {
    if (!svgRef.current) return;
    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 2000;
        canvas.height = 840;
        const context = canvas.getContext("2d");
        if (context) {
          context.fillStyle = "#020617"; // Slate 950 background
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          // Add title & watermark
          context.font = "bold 28px sans-serif";
          context.fillStyle = "#38bdf8";
          const title = isStateFocused
            ? `PETA HABA KAPASITI JPJ NEGERI ${selectedState?.name?.toUpperCase()} - ${selectedTarikh}`
            : `PETA HABA KAPASITI JPJ MALAYSIA - ${selectedTarikh}`;
          context.fillText(title, 40, 50);

          const pngURL = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = `Peta_Haba_JPJ_${isStateFocused ? selectedStateCode : "Malaysia"}_${selectedTarikh}.png`;
          downloadLink.href = pngURL;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      };
      image.src = blobURL;
    } catch {
      alert("Sistem sedang mengeksport peta, sila gunakan butang cetak pelayar jika diperlukan.");
    }
  };

  // Export Data to CSV
  const handleExportCSV = () => {
    if (!data?.states) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Kod Negeri,Nama Negeri,Zon,Jumlah Cawangan,Had Kuota,Tiket Diambil,Menunggu di Ruang Legar,Jumlah Selesai,Penggunaan Kuota (%),Pematuhan SLA (%),Purata Masa Menunggu (Minit),Status Kapasiti\n";

    for (const s of data.states) {
      csvContent += `${s.code},"${s.name}",${s.region},${s.branchCount},${s.quota},${s.issued},${s.waiting},${s.served},${s.utilizationRate}%,${s.slaRate}%,${s.avgWaitMinutes},${s.capacityStatus}\n`;
    }

    csvContent += "\n--- PECAHAN CAWANGAN ---\n";
    csvContent += "ID Cawangan,Nama Cawangan,Negeri,Had Kuota,Tiket Diambil,Menunggu,Selesai,Penggunaan (%),SLA (%),Purata Masa (m),Status\n";

    for (const s of data.states) {
      for (const b of s.branches) {
        csvContent += `${b.idCawangan},"${b.namaCawangan}","${s.name}",${b.quota},${b.issued},${b.waiting},${b.served},${b.utilizationRate}%,${b.slaRate}%,${b.avgWaitMinutes},${b.capacityStatus}\n`;
      }
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Kapasiti_JPJ_${selectedTarikh}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Select Search Item
  const handleSelectSearchResult = (stateCode: string) => {
    handleStateClick(stateCode);
    setSearchQuery("");
    setSearchFocused(false);
    if (branchPanelRef.current) {
      branchPanelRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Heatmap Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-sm border border-blue-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Pusat Geospatial &amp; Kapasiti Kebangsaan
              </span>
              <span className="text-xs font-bold text-blue-200">
                🇲🇾 16 Negeri &amp; Wilayah Persekutuan
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1.5">
              Peta Haba Status Kuota &amp; Kapasiti Cawangan JPJ
            </h2>
            <p className="text-xs text-blue-200/90 mt-0.5 max-w-2xl">
              Visualisasi masa nyata taburan pengambilan kuota tiket, kesesakan ruang legar, dan pematuhan SLA Piagam mengikut sempadan rasmi negeri seluruh Malaysia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              value={selectedTarikh}
              onChange={(e) => setSelectedTarikh(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            />
            <button
              type="button"
              onClick={fetchHeatmap}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition cursor-pointer text-xs font-bold flex items-center gap-1.5"
            >
              <span>🔄</span> Muat Semula
            </button>
            <button
              type="button"
              onClick={() => setShowComparisonModal(true)}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl border border-blue-400 transition cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span>⚖️</span> Banding Negeri
            </button>
          </div>
        </div>

        {/* National Stats Summary Bar */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Penggunaan Kuota Negara
              </span>
              <p className="text-2xl font-black text-white mt-1">
                {data.summary.overallUtilizationRate}%
              </p>
              <span className="text-[11px] text-blue-300">
                {data.summary.totalIssued.toLocaleString()} / {data.summary.totalQuota.toLocaleString()} Tiket
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Jumlah Menunggu Di Ruang Legar
              </span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {data.summary.totalWaiting.toLocaleString()}
              </p>
              <span className="text-[11px] text-blue-300">
                Pelanggan aktif beratur di cawangan
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Kadar Pematuhan SLA Kebangsaan
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {data.summary.overallSlaRate}%
              </p>
              <span className="text-[11px] text-blue-300">
                Sasaran layanan &le; 10 minit
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Jumlah Selesai Hari Ini
              </span>
              <p className="text-2xl font-black text-white mt-1">
                {data.summary.totalServed.toLocaleString()}
              </p>
              <span className="text-[11px] text-blue-300">
                Merentasi {data.summary.totalBranches} cawangan JPJ
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Metric Mode & Search & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Metric Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-full lg:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setMetricMode("quota")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition whitespace-nowrap cursor-pointer ${
              metricMode === "quota"
                ? "bg-blue-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🎟️ Penggunaan Kuota (%)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("waiting")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition whitespace-nowrap cursor-pointer ${
              metricMode === "waiting"
                ? "bg-blue-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⏳ Menunggu di Ruang Legar
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("sla")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition whitespace-nowrap cursor-pointer ${
              metricMode === "sla"
                ? "bg-blue-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⏱️ Prestasi SLA Piagam
          </button>
        </div>

        {/* Smart Search Input with Dropdown */}
        <div className="relative w-full lg:w-72">
          <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5">
            <span className="text-slate-400 mr-2">🔎</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Cari negeri atau cawangan..."
              className="bg-transparent text-xs w-full focus:outline-none text-slate-800 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
              >
                &times;
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in-95">
              {searchResults.map((item, idx) => (
                <button
                  key={`${item.type}-${item.title}-${idx}`}
                  type="button"
                  onClick={() => handleSelectSearchResult(item.stateCode)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-blue-50 transition flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{item.type === "state" ? "🏛️" : "🏢"}</span>
                      <strong className="text-xs text-slate-900 group-hover:text-blue-900">
                        {item.title}
                      </strong>
                    </div>
                    <span
                      className="text-[10px] text-slate-500 block mt-0.5"
                      dangerouslySetInnerHTML={{ __html: item.subtitle }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${
                      item.utilization >= 95
                        ? "bg-rose-100 text-rose-800"
                        : item.utilization >= 85
                        ? "bg-orange-100 text-orange-800"
                        : item.utilization >= 60
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {item.utilization}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export & Visual Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPNG}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Muat Turun Imej Peta Haba (PNG)"
          >
            <span>📸</span> Imej PNG
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Eksport Data Kuota ke CSV"
          >
            <span>📄</span> Data CSV
          </button>
        </div>
      </div>

      {/* Region Filter Bar (Visible in National View) */}
      {!isStateFocused && (
        <div className="flex items-center justify-between gap-2 overflow-x-auto bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold">
          <span className="text-slate-500 font-bold whitespace-nowrap">Tapis Mengikut Zon:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { key: "all", label: "🇲🇾 Semua Negeri" },
              { key: "utara", label: "🏝️ Zon Utara" },
              { key: "tengah", label: "🏙️ Zon Tengah" },
              { key: "selatan", label: "🌴 Zon Selatan" },
              { key: "timur", label: "🌾 Zon Timur" },
              { key: "borneo", label: "🌊 Sabah & Sarawak" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRegionFilter(tab.key as RegionFilter)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  regionFilter === tab.key
                    ? "bg-slate-900 text-white font-black shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Map & Rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Interactive Malaysia Heatmap Canvas (8 Columns) */}
        <div
          ref={mapContainerRef}
          className={`xl:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden ${
            isFullscreen ? "fixed inset-0 z-50 p-6 rounded-none bg-slate-950 border-none" : ""
          }`}
        >
          {/* Top Bar inside Map Canvas */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-black ${isFullscreen ? "text-white" : "text-slate-900"}`}>
                  {isStateFocused
                    ? `Fokus Wilayah: Negeri ${selectedState?.name}`
                    : "Peta Taburan Negeri Malaysia"}
                </h3>
                {loading && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
                    Memuatkan...
                  </span>
                )}
              </div>
              <p className={`text-xs ${isFullscreen ? "text-slate-400" : "text-slate-500"}`}>
                {isStateFocused
                  ? `Paparan terperinci sempadan Negeri ${selectedState?.name}. Klik butang kembali untuk melihat semula seluruh Malaysia.`
                  : "Klik mana-mana negeri pada peta rasmi untuk zum negeri berkenaan dan melihat pecahan cawangan."}
              </p>
            </div>

            {/* Clickable Legend Filter */}
            {!isStateFocused && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setLegendFilter(legendFilter === "low" ? "all" : "low")}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    legendFilter === "low"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  }`}
                  title="Tapis Negeri Lapang (<60%)"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> &lt;60% (Lapang)
                </button>

                <button
                  type="button"
                  onClick={() => setLegendFilter(legendFilter === "moderate" ? "all" : "moderate")}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    legendFilter === "moderate"
                      ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                      : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                  }`}
                  title="Tapis Negeri Sederhana (60-84%)"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> 60-84% (Normal)
                </button>

                <button
                  type="button"
                  onClick={() => setLegendFilter(legendFilter === "high" ? "all" : "high")}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    legendFilter === "high"
                      ? "bg-orange-600 text-white border-orange-700 shadow-xs"
                      : "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100"
                  }`}
                  title="Tapis Negeri Kapasiti Tinggi (85-94%)"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> 85-94% (Tinggi)
                </button>

                <button
                  type="button"
                  onClick={() => setLegendFilter(legendFilter === "critical" ? "all" : "critical")}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    legendFilter === "critical"
                      ? "bg-rose-600 text-white border-rose-700 shadow-xs animate-pulse"
                      : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                  }`}
                  title="Tapis Negeri Kritikal / Penuh (≥95%)"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" /> &ge;95% (Kritikal)
                </button>

                {legendFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setLegendFilter("all")}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition cursor-pointer"
                  >
                    Reset Tapis
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Authentic SVG Vector Map of Malaysia with Dynamic Focus Zoom & Pan Canvas */}
          <div
            className={`w-full relative bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800 select-none ${
              isFullscreen ? "h-[80vh]" : "min-h-[460px] sm:min-h-[500px]"
            }`}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              if (isDragging) {
                setPan({
                  x: pan.x + (e.clientX - dragStart.x) * 0.75,
                  y: pan.y + (e.clientY - dragStart.y) * 0.75,
                });
                setDragStart({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseDown={(e) => {
              setIsDragging(true);
              setDragStart({ x: e.clientX, y: e.clientY });
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => {
              setIsDragging(false);
              setHoveredState(null);
            }}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) handleZoomIn();
              else handleZoomOut();
            }}
          >
            {/* Background Water styling & Geographic Markings */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
            {!isStateFocused && (
              <>
                <div className="absolute top-4 left-6 text-slate-600/70 text-xs font-black tracking-widest uppercase select-none pointer-events-none">
                  SEMENANJUNG MALAYSIA
                </div>
                <div className="absolute top-4 right-8 text-slate-600/70 text-xs font-black tracking-widest uppercase select-none pointer-events-none">
                  SABAH &amp; SARAWAK (BORNEO)
                </div>
                <div className="absolute top-1/2 left-[36%] text-slate-700/60 text-xs font-black tracking-widest uppercase select-none pointer-events-none">
                  LAUT CHINA SELATAN
                </div>
                <div className="absolute bottom-4 left-6 text-slate-700/60 text-xs font-black tracking-widest uppercase select-none pointer-events-none">
                  SELAT MELAKA
                </div>
              </>
            )}

            {/* Back Button Floating at Top-Left in Focus Mode */}
            {isStateFocused && (
              <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2 animate-in fade-in">
                {/* Only show back button if NOT locked to a state (i.e. not Level 7) */}
                {!lockedStateCode && (
                  <button
                    type="button"
                    onClick={handleResetToNationalView}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-2xl flex items-center gap-2 transition cursor-pointer border border-blue-400 hover:scale-105 active:scale-95"
                  >
                    <span>⬅️</span> Papar Semua Negeri (Malaysia)
                  </button>
                )}
                <div className="bg-slate-900/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-700 backdrop-blur-md flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  {lockedStateCode && (
                    <span className="text-amber-400 font-black text-[10px] uppercase tracking-wider">🔒 Negeri Anda:</span>
                  )}
                  <span>Negeri: <strong className="text-blue-300 font-extrabold">{selectedState?.name}</strong></span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-mono text-amber-300 font-black">{selectedState?.utilizationRate}% Kuota</span>
                </div>
              </div>
            )}

            {/* Quick Zoom & Navigation Floating Controls on Map */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-xl">
              <button
                type="button"
                onClick={handleZoomIn}
                className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center transition cursor-pointer"
                title="Zum Masuk (+)"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center transition cursor-pointer"
                title="Zum Keluar (-)"
              >
                &minus;
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center justify-center transition cursor-pointer font-bold"
                title="Reset Paparan (⟲)"
              >
                ⟲
              </button>
              <hr className="border-slate-700 my-0.5" />
              <button
                type="button"
                onClick={toggleFullscreen}
                className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center justify-center transition cursor-pointer font-bold"
                title={isFullscreen ? "Keluar Skrin Penuh (ESC)" : "Mod Skrin Penuh War Room (⛶)"}
              >
                {isFullscreen ? "🗗" : "⛶"}
              </button>
            </div>

            <svg
              ref={svgRef}
              viewBox={activeViewBox}
              className="w-full h-auto max-h-[500px] select-none transition-all duration-500 ease-out"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                cursor: isDragging ? "grabbing" : "grab",
              }}
            >
              <defs>
                <filter id="geo-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.9" />
                </filter>
                <filter id="state-shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Render Selected State (when focused) OR All States (when in national view) */}
              {statesToRender.map(([code, geo]) => {
                const state = stateDataMap.get(code);
                const isSelected = selectedStateCode === code;
                const isRegionFiltered =
                  !isStateFocused && regionFilter !== "all" && state && state.region !== regionFilter;
                const isLegendFiltered =
                  !isStateFocused && legendFilter !== "all" && state && state.capacityStatus !== legendFilter;
                const isFilteredOut = isRegionFiltered || isLegendFiltered;

                const color = getStateColor(state);
                const displayVal = state ? getMetricDisplayValue(state) : "";
                const isCritical = state?.capacityStatus === "critical";

                // In single state focus mode, render larger centered pin and boundary styling
                return (
                  <g
                    key={code}
                    onClick={() => handleStateClick(code)}
                    onMouseEnter={() => state && setHoveredState(state)}
                    onMouseLeave={() => setHoveredState(null)}
                    className="cursor-pointer transition-all duration-200"
                    opacity={isFilteredOut ? 0.2 : 1}
                  >
                    {/* Realistic Geographic Polygon Border */}
                    <path
                      d={geo.d}
                      fill={color}
                      stroke={isSelected ? "#ffffff" : "rgba(255,255,255,0.75)"}
                      strokeWidth={isStateFocused ? 1.5 : isSelected ? 3 : 0.8}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      filter={isSelected ? "url(#geo-glow)" : "url(#state-shadow)"}
                      className="transition-all hover:brightness-110 hover:stroke-white hover:stroke-2"
                    />

                    {/* Live Radar Pulse Animation on Critical States */}
                    {isCritical && (
                      <g className="pointer-events-none">
                        <circle
                          cx={geo.labelX}
                          cy={geo.labelY}
                          r={isStateFocused ? 12 : 22}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={2}
                          className="animate-ping opacity-75"
                        />
                        <circle
                          cx={geo.labelX}
                          cy={geo.labelY}
                          r={isStateFocused ? 20 : 32}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={1.5}
                          className="animate-ping opacity-50"
                        />
                      </g>
                    )}

                    {/* State Center Tag Badge (Optional Toggle) */}
                    {showLabels && (
                      <g className="transition-all hover:scale-110 pointer-events-none">
                        <circle
                          cx={geo.labelX}
                          cy={geo.labelY}
                          r={isStateFocused ? 8 : 13}
                          fill="#0f172a"
                          stroke={isSelected ? "#38bdf8" : isCritical ? "#ef4444" : "#ffffff"}
                          strokeWidth={isSelected || isCritical ? 2 : 1}
                        />

                        {/* State Short Name */}
                        <text
                          x={geo.labelX}
                          y={geo.labelY + (isStateFocused ? 2.5 : 4)}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={isStateFocused ? 5.5 : 8.5}
                          fontWeight="900"
                          fontFamily="system-ui, sans-serif"
                        >
                          {geo.short}
                        </text>

                        {/* State Metric Indicator Tag below */}
                        <rect
                          x={geo.labelX - (isStateFocused ? 14 : 17)}
                          y={geo.labelY + (isStateFocused ? 10 : 15)}
                          width={isStateFocused ? 28 : 34}
                          height={isStateFocused ? 10 : 13}
                          rx={3}
                          fill="rgba(15, 23, 42, 0.9)"
                          stroke={isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.2)"}
                          strokeWidth={0.8}
                        />
                        <text
                          x={geo.labelX}
                          y={geo.labelY + (isStateFocused ? 17 : 24.5)}
                          textAnchor="middle"
                          fill={color}
                          fontSize={isStateFocused ? 6 : 8}
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          {displayVal}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Floating Glassmorphism Tooltip */}
            {hoveredState && (
              <div
                className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700 shadow-2xl text-xs w-56 animate-in fade-in zoom-in-95"
                style={{
                  left: Math.min(mousePos.x + 15, 680),
                  top: Math.max(mousePos.y - 80, 10),
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <strong className="text-sm font-extrabold text-blue-300">
                    {hoveredState.name}
                  </strong>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    Kod: {hoveredState.code}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cawangan:</span>
                    <span className="font-bold">{hoveredState.branchCount} Cawangan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Penggunaan Kuota:</span>
                    <span className="font-bold font-mono text-amber-300">
                      {hoveredState.utilizationRate}% ({hoveredState.issued}/{hoveredState.quota})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Menunggu Ruang Legar:</span>
                    <span className="font-bold font-mono text-blue-300">
                      {hoveredState.waiting} Orang
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pematuhan SLA:</span>
                    <span className="font-bold font-mono text-emerald-400">
                      {hoveredState.slaRate}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Rankings & Highlights (4 Columns) */}
        <div className="xl:col-span-4 space-y-4">
          {/* Top Busy (Branches for State Focus, States for National View) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="text-lg">🔥</span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {isStateFocused || lockedStateCode
                    ? `3 Cawangan Paling Tinggi Kuota (${selectedState?.name || "Negeri"})`
                    : "3 Negeri Paling Tinggi Penggunaan Kuota"}
                </h4>
                <p className="text-[11px] text-slate-400">Menghampiri had kapasiti maksimum</p>
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {(isStateFocused || lockedStateCode ? topBusyBranches : topBusyStates).map((item, idx) => {
                const isBranch = isStateFocused || Boolean(lockedStateCode);
                const name = isBranch ? (item as BranchItem).namaCawangan : (item as StateItem).name;
                const code = isBranch ? (item as BranchItem).idCawangan : (item as StateItem).code;
                const utilization = item.utilizationRate;
                const issued = item.issued;
                const quota = item.quota;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      if (isBranch) {
                        setDrilldownBranch({ id: (item as BranchItem).idCawangan, name: (item as BranchItem).namaCawangan });
                      } else {
                        handleStateClick((item as StateItem).code);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border transition flex items-center justify-between text-left cursor-pointer group ${
                      !isBranch && selectedStateCode === code && isStateFocused
                        ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-400/30"
                        : "border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <strong className="text-xs text-slate-900 block group-hover:text-blue-900 line-clamp-1">
                          {name}
                        </strong>
                        <span className="text-[10px] text-slate-500">
                          {utilization}% daripada {quota} kuota
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black font-mono text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      {issued} Tiket
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top SLA Compliant (Branches for State Focus, States for National View) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="text-lg">🏆</span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {isStateFocused || lockedStateCode
                    ? `3 Cawangan Paling Cekap SLA (${selectedState?.name || "Negeri"})`
                    : "3 Negeri Paling Cekap SLA Piagam"}
                </h4>
                <p className="text-[11px] text-slate-400">Kadar layanan &le; 10 minit tertinggi</p>
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {(isStateFocused || lockedStateCode ? topSlaBranches : topSlaStates).map((item, idx) => {
                const isBranch = isStateFocused || Boolean(lockedStateCode);
                const name = isBranch ? (item as BranchItem).namaCawangan : (item as StateItem).name;
                const code = isBranch ? (item as BranchItem).idCawangan : (item as StateItem).code;
                const sla = item.slaRate;
                const avgWait = item.avgWaitMinutes;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      if (isBranch) {
                        setDrilldownBranch({ id: (item as BranchItem).idCawangan, name: (item as BranchItem).namaCawangan });
                      } else {
                        handleStateClick((item as StateItem).code);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border transition flex items-center justify-between text-left cursor-pointer group ${
                      !isBranch && selectedStateCode === code && isStateFocused
                        ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/30"
                        : "border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <strong className="text-xs text-slate-900 block group-hover:text-emerald-900 line-clamp-1">
                          {name}
                        </strong>
                        <span className="text-[10px] text-slate-500">
                          Purata masa: {avgWait} minit
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {sla}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tag Labels Toggle Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <strong className="text-xs font-bold text-slate-800 block">
                Penunjuk Label &amp; Tag
              </strong>
              <p className="text-[11px] text-slate-500">Papar kod negeri dan metrik di atas peta</p>
            </div>
            <button
              type="button"
              onClick={() => setShowLabels(!showLabels)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                showLabels
                  ? "bg-blue-900 text-white border-blue-900"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }`}
            >
              {showLabels ? "Aktif" : "Mati"}
            </button>
          </div>
        </div>
      </div>

      {/* Selected State Drill-Down Branch Matrix Panel */}
      {selectedState && (
        <div
          ref={branchPanelRef}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Zon {selectedState.region.toUpperCase()} &bull; Kod {selectedState.code}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {selectedState.branchCount} Cawangan
                </span>
                {isStateFocused && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Mod Zum Fokus Aktif
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                Pecahan Cawangan JPJ Negeri: {selectedState.name}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Kadar Penggunaan Negeri
                </span>
                <span className="text-lg font-black font-mono text-blue-950">
                  {selectedState.utilizationRate}% ({selectedState.issued} / {selectedState.quota})
                </span>
              </div>
            </div>
          </div>

          {/* Branch Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {selectedState.branches.length > 0 ? (
              selectedState.branches.map((b) => (
                <div
                  key={b.idCawangan}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-xs hover:border-blue-400 hover:bg-white transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-sm font-bold text-slate-900 truncate" title={b.namaCawangan}>
                        {b.namaCawangan}
                      </strong>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                          b.capacityStatus === "critical"
                            ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                            : b.capacityStatus === "high"
                            ? "bg-orange-100 text-orange-800 border-orange-300"
                            : b.capacityStatus === "moderate"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {b.capacityStatus === "critical"
                          ? "Kritikal"
                          : b.capacityStatus === "high"
                          ? "Tinggi"
                          : b.capacityStatus === "moderate"
                          ? "Normal"
                          : "Lapang"}
                      </span>
                    </div>

                    {/* Quota Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-600 font-semibold mb-1">
                        <span>Kuota Tiket:</span>
                        <span className="font-mono">
                          {b.issued} / {b.quota} ({b.utilizationRate}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            b.utilizationRate >= 95
                              ? "bg-rose-600"
                              : b.utilizationRate >= 80
                              ? "bg-orange-500"
                              : b.utilizationRate >= 50
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${b.utilizationRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats details */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Menunggu
                        </span>
                        <span className="font-black font-mono text-blue-900">
                          {b.waiting} Orang
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Selesai
                        </span>
                        <span className="font-black font-mono text-emerald-700">
                          {b.served}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      SLA:{" "}
                      <strong className={b.issued > 0 || b.served > 0 ? "text-emerald-700 font-bold" : "text-slate-400 font-normal"}>
                        {b.issued > 0 || b.served > 0 ? `${b.slaRate}%` : "-"}
                      </strong>
                    </span>
                    <span>
                      Purata:{" "}
                      <strong className={b.issued > 0 || b.served > 0 || b.waiting > 0 ? "text-slate-800 font-bold" : "text-slate-400 font-normal"}>
                        {b.issued > 0 || b.served > 0 || b.waiting > 0 ? `${b.avgWaitMinutes}m` : "-"}
                      </strong>
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setDrilldownBranch({
                          id: b.idCawangan,
                          name: b.namaCawangan,
                        })
                      }
                      className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <span>🖥️</span> Pusat Kawalan Kaunter
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                Tiada rekod cawangan aktif bagi negeri ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-by-Side State Comparison Modal */}
      {showComparisonModal && data && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Alat Perbandingan Eksekutif
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Perbandingan Kapasiti Dwi-Negeri
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* State Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
                <label className="text-xs font-bold text-blue-950 block">Pilih Negeri A:</label>
                <select
                  value={compareStateCodeA}
                  onChange={(e) => setCompareStateCodeA(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {data.states.map((s) => (
                    <option key={`a-${s.code}`} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                <label className="text-xs font-bold text-indigo-950 block">Pilih Negeri B:</label>
                <select
                  value={compareStateCodeB}
                  onChange={(e) => setCompareStateCodeB(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {data.states.map((s) => (
                    <option key={`b-${s.code}`} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Metrics Grid */}
            {(() => {
              const stateA = stateDataMap.get(compareStateCodeA);
              const stateB = stateDataMap.get(compareStateCodeB);
              if (!stateA || !stateB) return null;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <h4 className="text-base font-black text-blue-950">{stateA.name}</h4>
                      <p className="text-3xl font-black text-blue-900 mt-2">
                        {stateA.utilizationRate}%
                      </p>
                      <span className="text-xs text-slate-500 block">Kadar Penggunaan Kuota</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <h4 className="text-base font-black text-indigo-950">{stateB.name}</h4>
                      <p className="text-3xl font-black text-indigo-900 mt-2">
                        {stateB.utilizationRate}%
                      </p>
                      <span className="text-xs text-slate-500 block">Kadar Penggunaan Kuota</span>
                    </div>
                  </div>

                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-black">
                      <tr>
                        <th className="p-3 text-left">{stateA.name}</th>
                        <th className="p-3 text-center">Metrik</th>
                        <th className="p-3 text-right">{stateB.name}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-bold text-slate-800">{stateA.branchCount} Cawangan</td>
                        <td className="p-3 text-center text-slate-500">Bilangan Cawangan</td>
                        <td className="p-3 text-right font-bold text-slate-800">{stateB.branchCount} Cawangan</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">{stateA.issued.toLocaleString()} / {stateA.quota.toLocaleString()}</td>
                        <td className="p-3 text-center text-slate-500">Tiket Diambil / Had Kuota</td>
                        <td className="p-3 text-right font-bold text-slate-800">{stateB.issued.toLocaleString()} / {stateB.quota.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-blue-700">{stateA.waiting} Orang</td>
                        <td className="p-3 text-center text-slate-500">Pelanggan Menunggu</td>
                        <td className="p-3 text-right font-bold text-blue-700">{stateB.waiting} Orang</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-emerald-700">{stateA.slaRate}%</td>
                        <td className="p-3 text-center text-slate-500">Pematuhan SLA Piagam</td>
                        <td className="p-3 text-right font-bold text-emerald-700">{stateB.slaRate}%</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">{stateA.avgWaitMinutes} Minit</td>
                        <td className="p-3 text-center text-slate-500">Purata Masa Menunggu</td>
                        <td className="p-3 text-right font-bold text-slate-800">{stateB.avgWaitMinutes} Minit</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup Perbandingan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Counter Drilldown Modal */}
      {drilldownBranch && (
        <BranchCounterDrilldownModal
          idCawangan={drilldownBranch.id}
          namaCawangan={drilldownBranch.name}
          onClose={() => setDrilldownBranch(null)}
        />
      )}
    </div>
  );
}
