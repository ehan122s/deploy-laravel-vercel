import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { TransactionTable } from "@/components/transaction/transaction-table";
import { formatRupiah, formatRupiahCompact } from "@/lib/utils";
import {
  Coins,
  CreditCard,
  Building2,
  TrendingUp,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Users,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface OwnerDashboardPageProps {
  searchParams: {
    branch?: string;
  };
}

export default async function OwnerDashboardPage({ searchParams }: OwnerDashboardPageProps) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    redirect("/login");
  }

  const branchParam = searchParams.branch || "ALL";
  const allBranches = await DataService.getBranches();
  const stats = await DataService.getDashboardStats(branchParam);

  const selectedBranch =
    branchParam !== "ALL" ? allBranches.find((b) => b.id === branchParam) : null;

  // Recent transactions for the selected branch filter
  const recentTransactions = await DataService.getTransactions({
    branchId: branchParam,
    limit: 15,
  });

  return (
    <DashboardShell
      role="OWNER"
      userName={session.name}
      title="Dashboard Owner"
      subtitle={
        selectedBranch
          ? `Monitoring: ${selectedBranch.name}`
          : "Monitoring Gabungan Cabang 1 & Cabang 2"
      }
      branches={allBranches}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* KPI Cards Header (Responsive Mobile-First Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Total Seluruh Saldo */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Saldo
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-[#002D62] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(stats.totalBalance)}
            </p>
            <div className="mt-2 text-[10px] text-slate-400 hidden sm:flex justify-between border-t border-slate-100 pt-1.5 font-medium">
              <span>Kas: {formatRupiahCompact(stats.totalCashBalance)}</span>
              <span>Bank: {formatRupiahCompact(stats.totalBankBalance)}</span>
            </div>
          </div>

          {/* 2. Keuntungan Bersih Hari Ini */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Laba Hari Ini
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-2xl font-black text-emerald-600 tracking-tight">
              +{formatRupiah(stats.todayNetProfit)}
            </p>
            <div className="mt-2 text-[10px] text-emerald-800/80 hidden sm:flex justify-between border-t border-emerald-100 pt-1.5 font-medium">
              <span>Admin: +{formatRupiahCompact(stats.todayCustomerAdmin)}</span>
              <span>Bank: -{formatRupiahCompact(stats.todayBankFee)}</span>
            </div>
          </div>

          {/* 3. Keuntungan Bersih Bulan Ini */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-blue-900 uppercase tracking-wider">
                Laba Bulan Ini
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-2xl font-black text-[#002D62] tracking-tight">
              +{formatRupiah(stats.monthNetProfit)}
            </p>
            <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-1.5 font-medium hidden sm:block">
              Omzet: {formatRupiahCompact(stats.monthVolume)}
            </p>
          </div>

          {/* 4. Transaksi Hari Ini */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                Trx Hari Ini
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.todayCount} <span className="text-xs font-semibold text-slate-400">Trx</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-1.5 font-medium hidden sm:block">
              Vol: {formatRupiahCompact(stats.todayVolume)}
            </p>
          </div>
        </div>

        {/* Ringkasan Arus Kas Masuk vs Keluar Hari Ini */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 p-4 rounded-3xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total Uang Masuk Hari Ini
                </p>
                <p className="text-base sm:text-lg font-black text-emerald-700">
                  {formatRupiah(stats.todayMoneyIn)}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-700/80 font-medium hidden xs:inline">
              Tunai + Rekening
            </span>
          </div>

          <div className="bg-gradient-to-r from-rose-500/10 to-red-500/5 p-4 rounded-3xl border border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                  Total Uang Keluar Hari Ini
                </p>
                <p className="text-base sm:text-lg font-black text-rose-700">
                  {formatRupiah(stats.todayMoneyOut)}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-rose-700/80 font-medium hidden xs:inline">
              Tarik + Transfer
            </span>
          </div>
        </div>

        {/* Saldo Masing-masing Cabang (Cabang 1 vs Cabang 2) */}
        {branchParam === "ALL" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {stats.branchBreakdown.map((b) => (
              <div
                key={b.id}
                className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#002D62]">{b.name}</h3>
                    <p className="text-[10px] text-slate-400">Kode: {b.code}</p>
                  </div>
                  <Link
                    href={`/owner?branch=${b.id}`}
                    className="text-xs font-bold text-[#002D62] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <span>Pilih Cabang</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Kas Laci</p>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5 truncate">
                      {formatRupiahCompact(b.cashBalance)}
                    </p>
                  </div>
                  <div className="p-2 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Saldo Bank</p>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5 truncate">
                      {formatRupiahCompact(b.bankBalance)}
                    </p>
                  </div>
                  <div className="p-2 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[9px] font-bold text-emerald-700 uppercase">Laba Riil</p>
                    <p className="text-[11px] font-bold text-emerald-700 mt-0.5 truncate">
                      +{formatRupiahCompact(b.totalProfit)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Responsive Recharts */}
        <DashboardCharts
          trendData={stats.last7Days}
          branchComparison={branchParam === "ALL" ? stats.branchBreakdown : undefined}
        />

        {/* Tabel / Card List Transaksi Terkini */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Transaksi Terkini
              </h3>
              <p className="text-xs text-slate-400 hidden sm:block">
                Pencatatan transaksi terbaru dari kedua cabang secara realtime
              </p>
            </div>
            <Link
              href="/owner/transactions"
              className="text-xs font-bold text-[#002D62] hover:underline"
            >
              Semua Transaksi →
            </Link>
          </div>

          <TransactionTable
            transactions={recentTransactions}
            canReverse={true}
            showBranchColumn={true}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
