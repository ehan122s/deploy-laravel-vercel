"use client";

import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth-actions";
import { ShieldAlert, Clock, LogOut } from "lucide-react";

// Auto logout timeout: 20 minutes (1200 seconds)
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
// Warning starts 60 seconds before logout
const WARNING_BEFORE_MS = 60 * 1000;

export function InactivityTimer() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    setShowWarning(false);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Set warning trigger
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(60);

      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set final logout trigger
    timerRef.current = setTimeout(() => {
      logoutAction();
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      // Only reset if warning modal is not actively showing
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showWarning]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-spin" />
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-base text-slate-800">Sesi Akan Berakhir</h3>
          <p className="text-xs text-slate-500">
            Tidak ada aktivitas terdeteksi. Demi keamanan dana Anda, akun akan otomatis keluar dalam:
          </p>
        </div>

        <div className="py-2">
          <span className="text-4xl font-black text-[#002D62] font-mono">
            {secondsRemaining}s
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={resetTimer}
            className="flex-1 py-3 px-4 bg-[#002D62] hover:bg-[#003B7E] text-white font-bold rounded-xl text-xs transition-colors"
          >
            Lanjutkan Sesi
          </button>
          <button
            onClick={() => logoutAction()}
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
