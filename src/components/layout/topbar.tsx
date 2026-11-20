"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Building2, Calendar, Store, Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { usePWA } from "@/components/pwa/pwa-provider";
import Link from "next/link";

interface TopbarProps {
  title: string;
  subtitle?: string;
  role: "OWNER" | "CASHIER";
  branchName?: string | null;
  branches?: { id: string; name: string; code: string }[];
}

export function Topbar({ title, subtitle, role, branchName, branches = [] }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentBranch = searchParams.get("branch") || "ALL";
  const { canInstall, isStandalone, isInstalled, promptInstall } = usePWA();

  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    setDateStr(
      now.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val === "ALL") {
      params.delete("branch");
    } else {
      params.set("branch", val);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs select-none">
      {/* Title & Mobile Branding */}
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile App Icon */}
          <div className="md:hidden w-8 h-8 rounded-xl bg-[#001D40] flex items-center justify-center p-1 flex-shrink-0 shadow-sm">
            <img
              src="/icons/icon-192x192.png"
              alt="Logo"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Status indicator on mobile */}
        <div className="sm:hidden flex items-center gap-1.5 flex-shrink-0">
          <OfflineIndicator />
        </div>
      </div>

      {/* Controls & Badges */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between sm:justify-end">
        {/* Branch Filter for Owner */}
        {role === "OWNER" && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs text-xs flex-1 sm:flex-initial">
            <Store className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <select
              value={currentBranch}
              onChange={handleBranchChange}
              className="bg-transparent font-bold text-[#002D62] outline-none cursor-pointer text-xs w-full sm:w-auto"
            >
              <option value="ALL">Semua Cabang (Gabungan)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Branch Display for Cashier */}
        {role === "CASHIER" && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs">
            <Building2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
            <span className="font-bold text-emerald-800 truncate max-w-[150px]">
              {branchName || "Cabang BRILink"}
            </span>
          </div>
        )}

        {/* Install PWA Quick Button if not installed */}
        {!isStandalone && !isInstalled && (
          <div className="flex items-center">
            {canInstall ? (
              <button
                onClick={() => promptInstall()}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition-all"
                title="Install Aplikasi di HP"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Install PWA</span>
              </button>
            ) : (
              <Link
                href="/install"
                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#002D62] border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                title="Panduan Install"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install</span>
              </Link>
            )}
          </div>
        )}

        {/* Offline indicator on desktop */}
        <div className="hidden sm:flex items-center">
          <OfflineIndicator />
        </div>

        {/* Realtime Date Badge (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{dateStr}</span>
        </div>
      </div>
    </header>
  );
}
