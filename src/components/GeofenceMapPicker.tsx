"use client";

import { useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent } from "leaflet";

interface GeofenceMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  onLocationChange: (lat: number, lng: number) => void;
}

interface SearchResultItem {
  displayName: string;
  lat: number;
  lon: number;
}

export default function GeofenceMapPicker({
  latitude,
  longitude,
  radiusMeters,
  onLocationChange,
}: GeofenceMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);

  // Default ke Kuala Lumpur jika belum ada koordinat
  const defaultLat = latitude || 3.139;
  const defaultLng = longitude || 101.6869;

  const [currentPos, setCurrentPos] = useState({ lat: defaultLat, lng: defaultLng });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Pastikan CSS Leaflet disuntik jika belum wujud
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Fix icon default Leaflet dalam Next.js Webpack
      const customIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const initialLat = latitude || 3.139;
      const initialLng = longitude || 101.6869;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 15);
        mapInstanceRef.current = map;

        // OpenStreetMap Tile Layer (100% Percuma)
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Marker Pin Boleh Drag
        const marker = L.marker([initialLat, initialLng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        // Bulatan Geofence Radius
        const circle = L.circle([initialLat, initialLng], {
          radius: radiusMeters || 500,
          color: "#2563eb",
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);
        circleRef.current = circle;

        // Event bila marker di-drag
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          circle.setLatLng(pos);
          setCurrentPos({ lat: pos.lat, lng: pos.lng });
          onLocationChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
        });

        // Event bila user klik pada mana-mana titik peta
        map.on("click", (e: LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          circle.setLatLng([lat, lng]);
          setCurrentPos({ lat, lng });
          onLocationChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        });
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // Peta dimulakan sekali sahaja; koordinat awal dan onLocationChange sengaja dibaca semasa pemasangan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kemas kini bulatan apabila radius bertukar dari slider/input
  useEffect(() => {
    if (circleRef.current && radiusMeters) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // Fungsi untuk memindahkan pin ke lokasi yang dipilih
  const setPinToLocation = (lat: number, lon: number, label?: string) => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16);
      markerRef.current.setLatLng([lat, lon]);
      circleRef.current.setLatLng([lat, lon]);
      setCurrentPos({ lat, lng: lon });
      onLocationChange(Number(lat.toFixed(6)), Number(lon.toFixed(6)));
      setSearchResults([]);
      if (label) {
        setSearchFeedback(`📍 Lokasi Dipilih: ${label.slice(0, 80)}...`);
      }
    }
  };

  // Carian Alamat / Tempat Melalui Server Proxy /api/geocoding/search
  const handleSearchPlace = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchFeedback(null);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (data.success && data.results && data.results.length > 0) {
        setSearchResults(data.results);
        // Terus pindahkan ke hasil carian pertama yang paling tepat
        const topResult = data.results[0];
        setPinToLocation(topResult.lat, topResult.lon, topResult.displayName);
      } else {
        setSearchFeedback("❌ Tiada lokasi ditemui di Malaysia untuk carian tersebut. Sila cuba nama tempat lain.");
      }
    } catch {
      setSearchFeedback("❌ Ralat membuat carian. Sila semak sambungan rangkaian.");
    } finally {
      setIsSearching(false);
    }
  };

  // Pengesanan Lokasi Semasa via Browser GPS
  const handleGetLiveLocation = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!navigator.geolocation) {
      alert("Pelayar anda tidak menyokong Geolocation GPS.");
      return;
    }

    setIsGettingGps(true);
    setSearchFeedback(null);
    setSearchResults([]);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setPinToLocation(newLat, newLng, "Lokasi GPS Semasa Anda");
        setIsGettingGps(false);
      },
      () => {
        alert("Gagal mengesan lokasi GPS. Sila pastikan anda membenarkan akses lokasi pelayar.");
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Search Bar & GPS Button */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 w-full">
          <input
            type="text"
            placeholder="🔍 Cari tempat / alamat di Malaysia (Cth: Bangi Sentral, Hospital Shah Alam, KLCC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleSearchPlace(e);
              }
            }}
            className="w-full p-2.5 text-xs border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSearchPlace(e);
            }}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {isSearching ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mencari...</span>
              </>
            ) : (
              <span>Cari Lokasi 🔎</span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleGetLiveLocation}
          disabled={isGettingGps}
          className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <span>📍</span>
          <span>{isGettingGps ? "Mengesan GPS..." : "Guna GPS Saya"}</span>
        </button>
      </div>

      {/* Matching Search Results Dropdown List */}
      {searchResults.length > 1 && (
        <div className="p-3 bg-white border-2 border-blue-200 rounded-2xl shadow-lg space-y-1.5">
          <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
            📍 Hasil Carian Ditemui (Klik untuk pilih lokasi tepat):
          </p>
          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPinToLocation(item.lat, item.lon, item.displayName);
                }}
                className="w-full text-left py-2 px-2 hover:bg-blue-50/80 rounded-xl transition text-xs text-gray-700 flex items-start gap-2 cursor-pointer"
              >
                <span className="text-blue-600 font-bold shrink-0">#{idx + 1}</span>
                <span className="truncate">{item.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Message */}
      {searchFeedback && (
        <p className="text-[11px] font-bold text-blue-800 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
          {searchFeedback}
        </p>
      )}

      {/* Interactive Map Container */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-80 z-10" />

        {/* Floating Instruction Badge */}
        <div className="absolute bottom-2 left-2 z-20 bg-black/75 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-[10px] font-bold pointer-events-none flex items-center gap-1.5">
          <span>💡</span>
          <span>Klik mana-mana titik pada peta atau tarik pin untuk alihkan lokasi premis.</span>
        </div>
      </div>

      {/* Coordinate & Geofence Specs Display */}
      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Latitude</span>
            <span className="font-mono font-black text-slate-900">{currentPos.lat.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Longitude</span>
            <span className="font-mono font-black text-slate-900">{currentPos.lng.toFixed(6)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-bold">
            🔵 Radius Geofence: <strong>{radiusMeters} Meter</strong>
          </span>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg font-black">
            🗺️ OpenStreetMap Active
          </span>
        </div>
      </div>
    </div>
  );
}
