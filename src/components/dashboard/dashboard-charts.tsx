"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { formatRupiah, formatRupiahCompact } from "@/lib/utils";

interface DashboardChartsProps {
  trendData: {
    date: string;
    profit: number;
    transactions: number;
    volume: number;
  }[];
  branchComparison?: {
    name: string;
    totalBalance: number;
    cashBalance: number;
    bankBalance: number;
    totalProfit: number;
    txCount: number;
  }[];
}

export function DashboardCharts({ trendData, branchComparison }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 my-4 sm:my-6">
      {/* 1. Tren Keuntungan Harian */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Tren Keuntungan Bersih (7 Hari)
            </h3>
            <p className="text-[11px] text-slate-400">Admin Customer − Potongan Bank</p>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Laba Riil
          </span>
        </div>

        <div className="h-52 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748B" }}
                tickFormatter={(val) => formatRupiahCompact(val)}
              />
              <Tooltip
                formatter={(value: any) => [formatRupiah(Number(value)), "Keuntungan Bersih"]}
                labelStyle={{ fontWeight: "bold", color: "#1E293B", fontSize: "11px" }}
                contentStyle={{ borderRadius: "16px", border: "1px solid #E2E8F0", fontSize: "11px" }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#profitGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Perbandingan Performa Cabang */}
      {branchComparison && branchComparison.length > 0 ? (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Komparasi Saldo Antar Cabang
              </h3>
              <p className="text-[11px] text-slate-400">Cabang 1 vs Cabang 2</p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Multi-Branch
            </span>
          </div>

          <div className="h-52 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparison} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  tickFormatter={(val) => formatRupiahCompact(val)}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatRupiah(Number(value)),
                    name === "cashBalance" ? "Kas Fisik" : name === "bankBalance" ? "Saldo Bank" : "Total Saldo",
                  ]}
                  contentStyle={{ borderRadius: "16px", border: "1px solid #E2E8F0", fontSize: "11px" }}
                />
                <Legend
                  formatter={(val) =>
                    val === "cashBalance" ? "Kas Laci" : val === "bankBalance" ? "Saldo Rekening" : val
                  }
                  wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }}
                />
                <Bar dataKey="cashBalance" fill="#002D62" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bankBalance" fill="#0284C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Alternatif: Volume Transaksi Harian */
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Jumlah Transaksi (7 Hari)
              </h3>
              <p className="text-[11px] text-slate-400">Aktivitas harian nasabah</p>
            </div>
          </div>

          <div className="h-52 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip
                  formatter={(value: any) => [`${value} transaksi`, "Total"]}
                  contentStyle={{ borderRadius: "16px", border: "1px solid #E2E8F0", fontSize: "11px" }}
                />
                <Bar dataKey="transactions" fill="#002D62" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
