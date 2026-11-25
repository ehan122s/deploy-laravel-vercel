import { requireCashierContext } from "@/lib/session-context";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { TransactionTable } from "@/components/transaction/transaction-table";
import { formatRupiah } from "@/lib/utils";
import { Coins, CreditCard, TrendingUp, Calendar, FileText } from "lucide-react";

interface CashierReportsPageProps {
  searchParams: {
    range?: string;
  };
}

export default async function CashierReportsPage({ searchParams }: CashierReportsPageProps) {
  const { session, branch } = await requireCashierContext();

  const range = searchParams.range || "TODAY";
  const now = new Date();
  let startDate: string | undefined;

  if (range === "TODAY") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (range === "YESTERDAY") {
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    startDate = y.toISOString();
  } else if (range === "7DAYS") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    startDate = d.toISOString();
  } else if (range === "MONTH") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  const transactions = await DataService.getTransactions({
    branchId: branch.id,
    userId: session.userId,
    startDate,
  });

  const completed = transactions.filter((t) => t.status === "COMPLETED");
  const totalVolume = completed.reduce((acc, t) => acc + t.nominal, 0);
  const totalCustomerAdmin = completed.reduce((acc, t) => acc + t.customerAdmin, 0);
  const totalBankFee = completed.reduce((acc, t) => acc + t.bankFee, 0);
  const totalNetProfit = completed.reduce((acc, t) => acc + t.netProfit, 0);
  const totalCashIn = completed.reduce((acc, t) => acc + t.cashReceived, 0);
  const totalCashOut = completed.reduce((acc, t) => acc + t.cashGiven, 0);

  return (
    <DashboardShell
      role="CASHIER"
      userName={session.name}
      branchName={branch.name}
      title="Laporan Pembukuan Kasir"
      subtitle={`Rekapitulasi transaksi ${branch.name}`}
    >
      <div className="space-y-6">
        {/* Date Filter Tabs */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
              Periode:
            </span>
            <div className="flex gap-1.5">
              {[
                { label: "Hari Ini", key: "TODAY" },
                { label: "Kemarin", key: "YESTERDAY" },
                { label: "7 Hari Terakhir", key: "7DAYS" },
                { label: "Bulan Ini", key: "MONTH" },
                { label: "Semua", key: "ALL" },
              ].map((item) => (
                <a
                  key={item.key}
                  href={`/cashier/reports?range=${item.key}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    range === item.key
                      ? "bg-[#002D62] text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Jumlah Transaksi Sukses</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{completed.length} Trx</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Volume: {formatRupiah(totalVolume)}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Admin Customer Diterima</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{formatRupiah(totalCustomerAdmin)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pot. Bank: -{formatRupiah(totalBankFee)}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-emerald-700">Laba Bersih Kasir</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">+{formatRupiah(totalNetProfit)}</p>
            <p className="text-[11px] text-emerald-700/70 mt-0.5">Admin - Potongan Bank</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Arus Kas Fisik Laci</p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              Masuk: <span className="text-blue-600">{formatRupiah(totalCashIn)}</span>
            </p>
            <p className="text-sm font-bold text-slate-800">
              Keluar: <span className="text-red-600">{formatRupiah(totalCashOut)}</span>
            </p>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-800">Detail Transaksi Periode Terpilih</h3>
          <TransactionTable transactions={transactions} canReverse={false} showBranchColumn={false} />
        </div>
      </div>
    </DashboardShell>
  );
}
