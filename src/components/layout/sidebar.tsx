"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  FileSpreadsheet,
  History,
  ShieldAlert,
  PlusCircle,
  Clock,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth-actions";

interface SidebarProps {
  role: "OWNER" | "CASHIER";
  userName: string;
  branchName?: string | null;
}

export function Sidebar({ role, userName, branchName }: SidebarProps) {
  const pathname = usePathname();

  const ownerNav = [
    { name: "Dashboard Overview", href: "/owner", icon: LayoutDashboard },
    { name: "Manajemen Saldo Cabang", href: "/owner/branches", icon: Building2 },
    { name: "Monitoring Kasir", href: "/owner/cashiers", icon: Users },
    { name: "Semua Transaksi", href: "/owner/transactions", icon: Receipt },
    { name: "Riwayat Mutasi Saldo", href: "/owner/mutations", icon: History },
    { name: "Laporan Keuangan", href: "/owner/reports", icon: FileSpreadsheet },
    { name: "Audit Log & Keamanan", href: "/owner/audit", icon: ShieldAlert },
  ];

  const cashierNav = [
    { name: "Dashboard Kasir", href: "/cashier", icon: LayoutDashboard },
    { name: "Input Transaksi Baru", href: "/cashier/transaction", icon: PlusCircle, highlight: true },
    { name: "Riwayat Transaksi", href: "/cashier/history", icon: Receipt },
    { name: "Laporan Harian Kasir", href: "/cashier/reports", icon: FileSpreadsheet },
  ];

  const navItems = role === "OWNER" ? ownerNav : cashierNav;

  return (
    <aside className="hidden md:flex w-64 bg-[#001D40] text-slate-100 flex-col h-screen sticky top-0 border-r border-blue-950 flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-blue-900/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md shadow-black/20 flex-shrink-0">
          <Building2 className="w-6 h-6 text-[#002D62]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-sm tracking-tight text-white uppercase truncate">BRILink Agent</h2>
          <p className="text-[11px] text-blue-300 font-medium truncate">
            {role === "OWNER" ? "Owner Portal" : branchName || "Kasir Portal"}
          </p>
        </div>
      </div>

      {/* User Info Capsule */}
      <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-blue-900/40 border border-blue-800/40 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-semibold text-white truncate">{userName}</p>
          <span
            className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              role === "OWNER"
                ? "bg-amber-400 text-slate-900"
                : "bg-emerald-400 text-slate-900"
            }`}
          >
            {role}
          </span>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Keluar"
            className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-800/60 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-blue-300 uppercase">
          Menu Utama
        </div>
        {navItems.map((item: any) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-2 ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-75" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#002D62] text-white font-semibold border border-blue-400/30 shadow-sm"
                  : "text-blue-100/80 hover:bg-blue-900/40 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-300" : "text-blue-300/70"}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-300" />}
            </Link>
          );
        })}
      </nav>

      {/* System Footer info */}
      <div className="p-4 border-t border-blue-900/50 text-[11px] text-blue-300/70 flex items-center justify-between">
        <span>BRILink v1.0</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Aktif
        </span>
      </div>
    </aside>
  );
}
