import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { logoutAction } from "@/app/actions/auth-actions";
import {
  User,
  Building2,
  FileSpreadsheet,
  History,
  Download,
  LogOut,
  Smartphone,
  ChevronRight,
  Info,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CashierProfilePage() {
  const session = await getSession();
  if (!session || !session.branchId) {
    redirect("/login");
  }

  const branch = await DataService.getBranchById(session.branchId);
  if (!branch) {
    redirect("/login");
  }

  const menuItems = [
    {
      title: "Laporan Harian Kasir",
      desc: "Rekap pendapatan admin & laba shift Anda",
      href: "/cashier/reports",
      icon: FileSpreadsheet,
      badge: "Laporan",
    },
    {
      title: "Riwayat Transaksi Cabang",
      desc: "Daftar seluruh transaksi yang Anda layani",
      href: "/cashier/history",
      icon: History,
      badge: "Riwayat",
    },
    {
      title: "Panduan Instalasi PWA",
      desc: "Pasang aplikasi ke Layar Utama HP Android",
      href: "/install",
      icon: Smartphone,
      badge: "PWA",
    },
  ];

  return (
    <DashboardShell
      role="CASHIER"
      userName={session.name}
      branchName={branch.name}
      title="Profil Kasir"
      subtitle={`Bertugas di ${branch.name}`}
    >
      <div className="max-w-xl mx-auto space-y-5">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <User className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 truncate">{session.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                KASIR
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">@{session.username}</p>
            <p className="text-xs text-[#002D62] font-semibold flex items-center gap-1 mt-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>{branch.name}</span>
            </p>
          </div>
        </div>

        {/* Quick Shift Status */}
        <div className="bg-gradient-to-r from-blue-900 to-[#002D62] text-white p-4 rounded-3xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold">Shift Aktif Kasir</p>
              <p className="text-[11px] text-blue-200">Siap melayani transaksi nasabah</p>
            </div>
          </div>
          <Link
            href="/cashier/transaction"
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all active:scale-95"
          >
            + Transaksi
          </Link>
        </div>

        {/* Menu Navigation Items */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
          <div className="px-5 py-3.5 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            Akses Menu Kasir
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#002D62] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800">{item.title}</p>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </Link>
            );
          })}
        </div>

        {/* Application & PWA Info */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Informasi Sistem Mobile PWA</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Versi Aplikasi</span>
            <span className="font-mono font-bold text-slate-800">1.0.1 (PWA Mobile)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Status Akun</span>
            <span className="text-emerald-700 font-semibold">Aktif & Terverifikasi</span>
          </div>
        </div>

        {/* Logout Action Button */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-100 active:scale-98 text-red-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-red-200 transition-all shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun Kasir</span>
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
