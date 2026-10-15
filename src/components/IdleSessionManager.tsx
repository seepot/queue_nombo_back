"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";

// Inactivity timeout: 15 minutes total, warning shown in the last 60 seconds
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_DURATION_MS = 60 * 1000; // 60 seconds countdown
const IDLE_TRIGGER_MS = IDLE_TIMEOUT_MS - WARNING_DURATION_MS; // 14 minutes

export default function IdleSessionManager() {
  const { data: session } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  const lastActivityRef = useRef<number>(0);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWarningOpenRef = useRef<boolean>(false);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    isWarningOpenRef.current = false;
    await signOut({ callbackUrl: "/login?reason=idle" });
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isWarningOpenRef.current) {
      setShowWarning(false);
      isWarningOpenRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    lastActivityRef.current = Date.now();

    // Activity event listeners
    const handleActivity = () => {
      // Only reset timer if warning modal is not currently open
      if (!isWarningOpenRef.current) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    // Check interval every 1 second
    checkIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        // Time is up -> log out automatically
        handleLogout();
      } else if (elapsed >= IDLE_TRIGGER_MS) {
        // Warning threshold reached -> show warning modal
        const secondsLeft = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        setRemainingSeconds(secondsLeft);
        if (!isWarningOpenRef.current) {
          isWarningOpenRef.current = true;
          setShowWarning(true);
        }
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [session, handleLogout]);

  if (!showWarning) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-amber-200">
        <div className="flex items-center gap-3 text-amber-600 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-6 w-6 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 id="idle-title" className="text-lg font-bold text-gray-900">
              Peringatan Sesi Tidak Aktif
            </h3>
            <p className="text-xs text-gray-500">Keselamatan Sistem JPJeQ</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Tiada aktiviti dikesan untuk beberapa ketika. Sesi anda akan ditamatkan secara automatik
          dalam masa:
        </p>

        <div className="my-5 flex justify-center">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-6 py-3 text-center">
            <span className="text-3xl font-extrabold text-amber-700 tracking-wider">
              {remainingSeconds}
            </span>
            <span className="ml-1 text-sm font-medium text-amber-600">saat</span>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            Log Keluar Sekarang
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition"
          >
            Kekal Log Masuk
          </button>
        </div>
      </div>
    </div>
  );
}
