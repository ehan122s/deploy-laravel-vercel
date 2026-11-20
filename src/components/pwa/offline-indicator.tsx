"use client";

import { usePWA } from "./pwa-provider";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="hidden sm:inline">Online</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
      <WifiOff className="w-3.5 h-3.5 text-amber-700" />
      <span>Offline</span>
    </div>
  );
}

export function OfflineNoticeBanner() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>
        Perangkat Anda sedang OFFLINE. Transaksi keuangan baru dinonaktifkan sementara demi keamanan pembukuan saldo.
      </span>
    </div>
  );
}
