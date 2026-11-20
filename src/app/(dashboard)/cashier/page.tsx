import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { TransactionTable } from "@/components/transaction/transaction-table";
import { formatRupiah } from "@/lib/utils";
import {
  Coins,
  CreditCard,
  PlusCircle,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CashierDashboardPage() {
  const session = await getSession();
  if (!session || !session.branchId) {
    redirect("/login");
  }

  const branch = await DataService.getBranchById(session.branchId);
  if (!branch) {
    redirect("/login");
  }

  // Get cashier's transactions today
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayTransactions = await DataService.getTransactions({
    branchId: branch.id,
    userId: session.userId,
    startDate: startOfDay,
    limit: 15,
  });

  const completedToday = todayTransactions.filter((t) => t.status === "COMPLETED");
  const countToday = completedToday.length;
  const profitToday = completedToday.reduce((acc, t) => acc + t.netProfit, 0);
  const moneyInToday = completedToday.reduce((acc, t) => acc + t.cashReceived + t.bankReceived, 0);
  const moneyOutToday = completedToday.reduce((acc, t) => acc + t.cashGiven + t.bankDeducted, 0);

  return (
    <DashboardShell
      role="CASHIER"
      userName={session.name}
      branchName={branch.name}
      title="Dashboard Kasir"
      subtitle={`Layanan ${branch.name}`}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Mobile Banking Hero Card */}
        <div className="bg-gradient-to-br from-[#001D40] via-[#002D62] to-[#0A4384] rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-blue-950/20 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[11px] font-semibold backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>Shift: {session.name}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Siap Melayani Nasabah
              </h2>
              <p className="text-xs text-blue-200 max-w-md">
                Hitung uang fisik dengan teliti. Saldo kas & rekening terpotong otomatis saat transaksi.
              </p>
            </div>

            {/* Giant Thumb-Friendly Button */}
            <Link
              href="/cashier/transaction"
              className="w-full sm:w-auto py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              <PlusCircle className="w-5 h-5 text-slate-950" />
              <span>+ INPUT TRANSAKSI</span>
            </Link>
          </div>
        </div>

        {/* Realtime Balances (Strictly separated CASH vs BANK) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Saldo Kas Fisik (Laci) */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kas Fisik (Laci)
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {formatRupiah(branch.currentCashBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 hidden sm:block">Uang tunai di laci cabang</p>
          </div>

          {/* 2. Saldo Rekening / EDC */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                Saldo Rekening/EDC
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {formatRupiah(branch.currentBankBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 hidden sm:block">Kuota transfer penampung</p>
          </div>

          {/* 3. Transaksi Hari Ini */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                Transaksi Hari Ini
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {countToday} <span className="text-xs font-semibold text-slate-400">Trx</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1 hidden sm:block">Dilayani hari ini</p>
          </div>

          {/* 4. Keuntungan Hari Ini */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Laba Dihasilkan
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-xl font-black text-emerald-600 tracking-tight">
              +{formatRupiah(profitToday)}
            </p>
            <p className="text-[10px] text-emerald-700/70 mt-1 hidden sm:block">Admin - Potongan Bank</p>
          </div>
        </div>

        {/* Arus Kas Masuk & Keluar Hari Ini */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-semibold">Total Uang Masuk Hari Ini</p>
              <p className="text-base font-bold text-slate-800 truncate">{formatRupiah(moneyInToday)}</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-semibold">Total Uang Keluar Hari Ini</p>
              <p className="text-base font-bold text-slate-800 truncate">{formatRupiah(moneyOutToday)}</p>
            </div>
          </div>
        </div>

        {/* Tabel / Card List Transaksi Terbaru Hari Ini */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-sm text-slate-900">Transaksi Terbaru Hari Ini</h3>
            <Link
              href="/cashier/history"
              className="text-xs font-semibold text-[#002D62] hover:underline"
            >
              Semua Riwayat →
            </Link>
          </div>

          <TransactionTable
            transactions={todayTransactions}
            canReverse={true}
            showBranchColumn={false}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
