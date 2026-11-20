"use client";

import { useState } from "react";
import { usePWA } from "./pwa-provider";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import Link from "next/link";

export function InstallBanner() {
  const { isStandalone, isInstalled, canInstall, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  // If already running standalone or installed or dismissed, hide!
  if (isStandalone || isInstalled || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    if (canInstall) {
      await promptInstall();
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#001D40] via-[#002D62] to-[#0A4384] text-white p-3.5 rounded-2xl shadow-lg border border-blue-400/20 flex items-center justify-between gap-3 mb-4 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
          <img
            src="/icons/icon-192x192.png"
            alt="BRILink"
            className="w-full h-full object-contain rounded-lg"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold truncate">Install BRILink di HP</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-400 text-slate-950 uppercase">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-blue-200 truncate">
            Buka cepat dari Home Screen tanpa address bar browser
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {canInstall ? (
          <button
            onClick={handleInstall}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        ) : (
          <Link
            href="/install"
            className="px-3 py-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-white text-xs font-semibold rounded-xl border border-blue-300/30 transition-colors flex items-center gap-1"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Panduan</span>
          </Link>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-blue-300 hover:text-white rounded-lg transition-colors"
          title="Tutup banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
