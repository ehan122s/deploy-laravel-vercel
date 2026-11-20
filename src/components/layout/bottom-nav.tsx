"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  Building2,
  User,
  PlusCircle,
  History,
} from "lucide-react";

interface BottomNavProps {
  role: "OWNER" | "CASHIER";
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const ownerItems = [
    { name: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { name: "Transaksi", href: "/owner/transactions", icon: Receipt },
    { name: "Laporan", href: "/owner/reports", icon: FileSpreadsheet },
    { name: "Cabang", href: "/owner/branches", icon: Building2 },
    { name: "Profil", href: "/owner/profile", icon: User },
  ];

  const cashierItems = [
    { name: "Dashboard", href: "/cashier", icon: LayoutDashboard },
    {
      name: "Input Trx",
      href: "/cashier/transaction",
      icon: PlusCircle,
      prominent: true,
    },
    { name: "Riwayat", href: "/cashier/history", icon: History },
    { name: "Profil", href: "/cashier/profile", icon: User },
  ];

  const items = role === "OWNER" ? ownerItems : cashierItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 pb-safe select-none">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item: any) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.prominent) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-4 flex flex-col items-center justify-center focus:outline-none group"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-transform active:scale-90 ${
                    isActive
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-200"
                      : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/40"
                  }`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-bold text-emerald-800 mt-1">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                isActive
                  ? "text-[#002D62] font-bold"
                  : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? "bg-blue-50 text-[#002D62]" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
