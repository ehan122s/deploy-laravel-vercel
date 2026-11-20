"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { TransactionData, BranchData, UserData } from "@/lib/data-service";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  Filter,
  TrendingUp,
  Coins,
  CreditCard,
  Building2,
  Receipt,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportViewProps {
  branches: BranchData[];
  cashiers: UserData[];
  initialTransactions: TransactionData[];
}

export function ReportView({ branches, cashiers, initialTransactions }: ReportViewProps) {
  const [period, setPeriod] = useState<string>("THIS_MONTH");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedCashier, setSelectedCashier] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Filtering
  const filtered = initialTransactions.filter((t) => {
    // 1. Branch filter
    if (selectedBranch !== "ALL" && t.branchId !== selectedBranch) return false;

    // 2. Cashier filter
    if (selectedCashier !== "ALL" && t.userId !== selectedCashier) return false;

    // 3. Category filter
    if (selectedCategory !== "ALL" && t.categoryCode !== selectedCategory) return false;

    // 4. Period filter
    const txTime = new Date(t.createdAt).getTime();
    const now = new Date();

    if (period === "TODAY") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (txTime < start) return false;
    } else if (period === "YESTERDAY") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (txTime < start || txTime >= end) return false;
    } else if (period === "7DAYS") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
      if (txTime < start) return false;
    } else if (period === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      if (txTime < start) return false;
    } else if (period === "PREV_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      if (txTime < start || txTime >= end) return false;
    } else if (period === "THIS_YEAR") {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      if (txTime < start) return false;
    } else if (period === "CUSTOM") {
      if (customStart && txTime < new Date(customStart).getTime()) return false;
      if (customEnd && txTime > new Date(customEnd + "T23:59:59").getTime()) return false;
    }

    return true;
  });

  const completed = filtered.filter((t) => t.status === "COMPLETED");
  const reversed = filtered.filter((t) => t.status === "REVERSED");

  const totalVolume = completed.reduce((acc, t) => acc + t.nominal, 0);
  const totalCustomerAdmin = completed.reduce((acc, t) => acc + t.customerAdmin, 0);
  const totalBankFee = completed.reduce((acc, t) => acc + t.bankFee, 0);
  const totalNetProfit = completed.reduce((acc, t) => acc + t.netProfit, 0);

  const totalMoneyIn = completed.reduce((acc, t) => acc + t.cashReceived + t.bankReceived, 0);
  const totalMoneyOut = completed.reduce((acc, t) => acc + t.cashGiven + t.bankDeducted, 0);

  // Export Excel
  const handleExportExcel = () => {
    const rows = filtered.map((t, idx) => ({
      No: idx + 1,
      "No. Transaksi": t.transactionNo,
      Waktu: new Date(t.createdAt).toLocaleString("id-ID"),
      Cabang: t.branchName || t.branchId,
      Kasir: t.cashierName || t.userId,
      "Layanan BRILink": t.categoryName,
      Nasabah: t.customerName || "-",
      "Nominal (Rp)": t.nominal,
      "Admin Customer (Rp)": t.customerAdmin,
      "Potongan Bank (Rp)": t.bankFee,
      "Laba Bersih (Rp)": t.status === "COMPLETED" ? t.netProfit : 0,
      Metode: t.paymentMethod,
      Status: t.status,
      "Catatan/Keterangan": t.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, `Laporan-Keuangan-BRILink-${Date.now()}.xlsx`);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN KEUANGAN & PEMBUKUAN AGEN BRILINK", 14, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Periode: ${period} | Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 21);
    doc.text(
      `Cabang: ${selectedBranch === "ALL" ? "Semua Cabang" : selectedBranch} | Total Transaksi: ${completed.length} Sukses, ${reversed.length} Batal`,
      14,
      26
    );

    // Summary Box
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total Volume: ${formatRupiah(totalVolume)} | Laba Bersih: ${formatRupiah(totalNetProfit)} | Total Uang Masuk: ${formatRupiah(totalMoneyIn)}`,
      14,
      32
    );

    const tableRows = filtered.map((t) => [
      t.transactionNo,
      new Date(t.createdAt).toLocaleDateString("id-ID"),
      t.branchName || t.branchId,
      t.cashierName || "-",
      t.categoryName,
      t.customerName || "-",
      formatRupiah(t.nominal),
      formatRupiah(t.customerAdmin),
      formatRupiah(t.bankFee),
      formatRupiah(t.status === "COMPLETED" ? t.netProfit : 0),
      t.status,
    ]);

    autoTable(doc, {
      head: [
        [
          "No. TRX",
          "Tanggal",
          "Cabang",
          "Kasir",
          "Layanan",
          "Nasabah",
          "Nominal",
          "Admin",
          "Pot. Bank",
          "Laba",
          "Status",
        ],
      ],
      body: tableRows,
      startY: 36,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 45, 98], textColor: 255 },
    });

    doc.save(`Laporan-Keuangan-BRILink-${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Filter Control Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Filter className="w-4 h-4 text-[#002D62]" />
            <h3 className="font-bold text-sm">Filter Laporan Keuangan</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Periode */}
          <div>
            <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
              Periode Waktu
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              <option value="TODAY">Hari Ini</option>
              <option value="YESTERDAY">Kemarin</option>
              <option value="7DAYS">7 Hari Terakhir</option>
              <option value="THIS_MONTH">Bulan Ini</option>
              <option value="PREV_MONTH">Bulan Sebelumnya</option>
              <option value="THIS_YEAR">Tahun Ini</option>
              <option value="CUSTOM">Rentang Tanggal Custom</option>
              <option value="ALL">Semua Waktu</option>
            </select>
          </div>

          {/* Cabang */}
          <div>
            <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
              Filter Cabang
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              <option value="ALL">Semua Cabang (Pusat & Pasar)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kasir */}
          <div>
            <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
              Filter Kasir
            </label>
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              <option value="ALL">Semua Kasir</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kategori */}
          <div>
            <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
              Jenis Layanan
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              <option value="ALL">Semua Layanan</option>
              <option value="TF_BRI">Transfer Sesama BRI</option>
              <option value="TF_INTERBANK">Transfer Antarbank</option>
              <option value="TARIK_TUNAI">Tarik Tunai</option>
              <option value="SETOR_TUNAI">Setor Tunai</option>
              <option value="PLN_TOKEN">Token Listrik PLN</option>
              <option value="PULSA_DATA">Pulsa / Data</option>
              <option value="TOPUP_EWALLET">Top Up E-Wallet</option>
              <option value="PAYMENT_BILLS">Bayar Tagihan/BPJS</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if CUSTOM selected */}
        {period === "CUSTOM" && (
          <div className="flex items-center gap-3 pt-2 text-xs">
            <div>
              <span className="font-semibold text-slate-500 mr-2">Mulai:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <span className="font-semibold text-slate-500 mr-2">Sampai:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Laba Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            Total Keuntungan Bersih
          </span>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            +{formatRupiah(totalNetProfit)}
          </p>
          <div className="mt-2 text-[11px] text-emerald-800/80 flex justify-between border-t border-slate-100 pt-2 font-medium">
            <span>Admin: +{formatRupiah(totalCustomerAdmin)}</span>
            <span>Bank: -{formatRupiah(totalBankFee)}</span>
          </div>
        </div>

        {/* 2. Total Volume / Omset */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Total Volume Transaksi
          </span>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(totalVolume)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
            Dari {completed.length} transaksi sukses ({reversed.length} dibatalkan)
          </p>
        </div>

        {/* 3. Uang Masuk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-1">
            Total Uang Masuk
          </span>
          <p className="text-2xl font-black text-[#002D62] tracking-tight">
            {formatRupiah(totalMoneyIn)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
            Tunai diterima + Kuota EDC masuk
          </p>
        </div>

        {/* 4. Uang Keluar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block mb-1">
            Total Uang Keluar
          </span>
          <p className="text-2xl font-black text-rose-600 tracking-tight">
            {formatRupiah(totalMoneyOut)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
            Tunai diserahkan + Debet rekening
          </p>
        </div>
      </div>

      {/* Mobile Card List (Screens < md) */}
      <div className="md:hidden space-y-2.5">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 px-1">
          Daftar Transaksi ({filtered.length} data)
        </h4>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-400 border border-slate-200">
            Tidak ada transaksi pada filter periode ini.
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-2 ${
                t.status === "REVERSED" ? "border-red-200 bg-red-50/20 opacity-75" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                <div>
                  <h5 className="font-bold text-xs text-slate-900">{t.categoryName}</h5>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {t.transactionNo} • {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    t.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {t.status === "COMPLETED" ? "Sukses" : "Reversal"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Nominal Pokok</span>
                  <p className="text-base font-black text-slate-900">{formatRupiah(t.nominal)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase">Laba Bersih</span>
                  <p className="text-xs font-black text-emerald-600">
                    {t.status === "COMPLETED" ? `+${formatRupiah(t.netProfit)}` : "Rp0"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-2 text-[10px] text-slate-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Cabang / Kasir:</span>
                  <span className="font-medium text-slate-700">{t.branchName || t.branchId} • {t.cashierName || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nasabah:</span>
                  <span className="font-semibold text-slate-700">{t.customerName || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admin Customer:</span>
                  <span>{formatRupiah(t.customerAdmin)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Potongan Bank:</span>
                  <span className="text-red-600">-{formatRupiah(t.bankFee)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Detailed Table (Screens >= md) */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-800">
            Daftar Transaksi ({filtered.length} baris data)
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No. TRX</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Layanan</th>
                <th className="py-3 px-4">Nasabah</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-right">Admin</th>
                <th className="py-3 px-4 text-right">Pot. Bank</th>
                <th className="py-3 px-4 text-right font-bold text-emerald-700">Laba Bersih</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Tidak ada transaksi pada filter periode ini.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      t.status === "REVERSED" ? "bg-red-50/20 text-slate-400" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {t.transactionNo}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {t.branchName || t.branchId}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{t.cashierName || "-"}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{t.categoryName}</td>
                    <td className="py-3 px-4 text-slate-600">{t.customerName || "-"}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatRupiah(t.nominal)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                      {formatRupiah(t.customerAdmin)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 whitespace-nowrap">
                      -{formatRupiah(t.bankFee)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {t.status === "COMPLETED" ? `+${formatRupiah(t.netProfit)}` : "Rp0"}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {t.status === "COMPLETED" ? "Sukses" : "Reversal"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
