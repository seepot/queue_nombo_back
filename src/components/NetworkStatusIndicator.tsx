"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type NetworkStatus = "online" | "degraded" | "offline";

export default function NetworkStatusIndicator() {
  const [status, setStatus] = useState<NetworkStatus>("online");
  const [latency, setLatency] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const failCountRef = useRef(0);

  const checkConnection = useCallback(async () => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      setStatus("offline");
      setLatency(null);
      return;
    }

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("/api/health", {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const pingTime = Math.round(performance.now() - startTime);
        setLatency(pingTime);
        failCountRef.current = 0;
        if (pingTime > 800) {
          setStatus("degraded");
        } else {
          setStatus("online");
        }
      } else {
        failCountRef.current += 1;
        if (failCountRef.current >= 2) {
          setStatus("offline");
          setLatency(null);
        }
      }
    } catch {
      failCountRef.current += 1;
      if (failCountRef.current >= 2) {
        setStatus("offline");
        setLatency(null);
      }
    }
  }, []);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    await checkConnection();
    setIsRetrying(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkConnection();
    }, 0);

    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setStatus("offline");
      setLatency(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(checkConnection, 20000); // Check every 20s

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  return (
    <>
      {/* Offline Alert Banner (Shown at the top of the viewport when offline) */}
      {status === "offline" && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2.5 shadow-lg flex items-center justify-between text-xs sm:text-sm animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 font-medium">
            <svg
              className="w-5 h-5 animate-pulse shrink-0 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span>
              <strong>Amaran Sambungan:</strong> Sambungan ke pelayan terputus. Sila semak rangkaian
              anda sebelum membuat panggilan tiket.
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="ml-3 px-3 py-1 bg-white text-red-700 font-semibold rounded-md hover:bg-red-50 text-xs transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isRetrying ? "Menyambung..." : "Cuba Semula"}
          </button>
        </div>
      )}

      {/* Header Badge */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          title="Status Sambungan Rangkaian"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 hover:bg-slate-200 border border-slate-200/80 text-xs font-medium text-slate-700 transition cursor-pointer"
        >
          {status === "online" && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline text-slate-600">Online</span>
              {latency !== null && (
                <span className="font-mono text-[10px] text-slate-500">{latency}ms</span>
              )}
            </>
          )}

          {status === "degraded" && (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span className="hidden sm:inline text-amber-700">Perlahan</span>
              {latency !== null && (
                <span className="font-mono text-[10px] text-amber-600">{latency}ms</span>
              )}
            </>
          )}

          {status === "offline" && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-red-700 font-semibold">Offline</span>
            </>
          )}
        </button>

        {/* Small Tooltip / Popover on click */}
        {showDetails && (
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white p-3 shadow-xl border border-slate-200 z-50 text-xs text-slate-600 animate-in fade-in"
            onClick={() => setShowDetails(false)}
          >
            <div className="flex items-center justify-between font-semibold text-slate-800 mb-1.5">
              <span>Status Rangkaian</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                  status === "online"
                    ? "bg-emerald-100 text-emerald-800"
                    : status === "degraded"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Masa tindak balas pelayan JPJeQ:{" "}
              <strong>{latency !== null ? `${latency} ms` : "Tiada respon"}</strong>
            </p>
            <button
              type="button"
              onClick={handleManualRetry}
              disabled={isRetrying}
              className="w-full py-1 text-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition cursor-pointer"
            >
              {isRetrying ? "Menyemak..." : "Uji Sambungan"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
