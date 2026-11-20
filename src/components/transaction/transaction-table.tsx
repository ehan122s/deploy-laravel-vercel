"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { TransactionData } from "@/lib/data-service";
import { reverseTransactionAction } from "@/app/actions/transaction-actions";
import { ReceiptModal } from "./receipt-modal";
import {
  Search,
  Printer,
  RotateCcw,
  AlertTriangle,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  User,
  CreditCard,
  Coins,
} from "lucide-react";
import * as XLSX from "xlsx";

interface TransactionTableProps {
  transactions: TransactionData[];
  canReverse?: boolean;
  showBranchColumn?: boolean;
}

export function TransactionTable({
  transactions,
  canReverse = true,
  showBranchColumn = false,
}: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Reversal Modal State
  const [reversalTarget, setReversalTarget] = useState<TransactionData | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptTarget, setReceiptTarget] = useState<TransactionData | null>(null);

  // Filter logic
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.categoryName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || t.categoryCode === categoryFilter;
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenReversal = (t: TransactionData) => {
    setReversalTarget(t);
    setReversalReason("");
    setReversalError(null);
  };

  const handleConfirmReversal = async () => {
    if (!reversalTarget) return;
    if (reversalReason.trim().length < 5) {
      setReversalError("Alasan koreksi/pembatalan wajib diisi minimal 5 karakter.");
      return;
    }

    setIsReversing(true);
    setReversalError(null);

    const res = await reverseTransactionAction({
      transactionId: reversalTarget.id,
      reason: reversalReason.trim(),
    });

    setIsReversing(false);

    if (!res.success) {
      setReversalError(res.error || "Gagal melakukan reversal.");
      return;
    }

    setReversalTarget(null);
  };

  const handleExportExcel = () => {
    const dataToExport = filtered.map((t, idx) => ({
      No: idx + 1,
      "No. Transaksi": t.transactionNo,
      Waktu: new Date(t.createdAt).toLocaleString("id-ID"),
      Cabang: t.branchName || t.branchId,
      Kasir: t.cashierName || t.userId,
      "Jenis Layanan": t.categoryName,
      Nasabah: t.customerName || "-",
      "Nominal (Rp)": t.nominal,
      "Admin Nasabah (Rp)": t.customerAdmin,
      "Potongan Bank (Rp)": t.bankFee,
      "Laba Bersih (Rp)": t.netProfit,
      Metode: t.paymentMethod,
      Status: t.status,
      "Alasan Reversal": t.reversalReason || "-",
      Catatan: t.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Transaksi");
    XLSX.writeFile(wb, `Laporan-Transaksi-${Date.now()}.xlsx`);
  };

  const uniqueCategories = Array.from(new Set(transactions.map((t) => t.categoryCode))).map(
    (code) => {
      const match = transactions.find((t) => t.categoryCode === code);
      return { code, name: match?.categoryName || code };
    }
  );

  return (
    <div className="space-y-3.5">
      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari transaksi, nasabah..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#002D62] focus:bg-white text-slate-800"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#002D62] max-w-[130px] sm:max-w-none truncate"
          >
            <option value="ALL">Semua Layanan</option>
            {uniqueCategories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#002D62]"
          >
            <option value="ALL">Semua Status</option>
            <option value="COMPLETED">Sukses</option>
            <option value="REVERSED">Dibatalkan</option>
          </select>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Download Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
          <p className="text-xs sm:text-sm">Tidak ada transaksi yang cocok dengan pencarian.</p>
        </div>
      ) : (
        <>
          {/* ========================================================
              MOBILE CARD LIST VIEW (Screens < md) - BRImo/Mobile Banking Style
              ======================================================== */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((t) => {
              const isTarik = t.categoryCode.includes("TARIK");
              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-2 transition-all ${
                    t.status === "REVERSED"
                      ? "border-red-200 bg-red-50/20 opacity-80"
                      : "border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {/* Card Header: Service & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#002D62]" />
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {t.categoryName}
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {t.transactionNo} • {new Date(t.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${
                        t.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {t.status === "COMPLETED" ? "Sukses" : "Reversal"}
                    </span>
                  </div>

                  {/* Card Body: Nominal & Net Profit */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Nominal Pokok
                      </span>
                      <p className="text-base font-black text-slate-900 tracking-tight">
                        {formatRupiah(t.nominal)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Laba Bersih
                      </span>
                      <p className="text-xs font-black text-emerald-600">
                        {t.status === "COMPLETED" ? `+${formatRupiah(t.netProfit)}` : "Rp0"}
                      </p>
                    </div>
                  </div>

                  {/* Card Meta: Customer & Admin Breakdown */}
                  <div className="bg-slate-50 rounded-xl p-2 text-[10px] text-slate-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Nasabah:</span>
                      <span className="font-semibold text-slate-700">{t.customerName || "-"}</span>
                    </div>
                    {showBranchColumn && (
                      <div className="flex justify-between">
                        <span>Cabang:</span>
                        <span className="font-semibold text-slate-700">{t.branchName || t.branchId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Admin Customer:</span>
                      <span className="font-medium">{formatRupiah(t.customerAdmin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Potongan Bank:</span>
                      <span className="text-red-600 font-medium">-{formatRupiah(t.bankFee)}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">Kasir: {t.cashierName || "-"}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReceiptTarget(t)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-[#002D62] text-[11px] font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Struk</span>
                      </button>

                      {canReverse && t.status === "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => handleOpenReversal(t)}
                          className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold flex items-center gap-1 hover:bg-red-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Koreksi</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================
              DESKTOP TABULAR VIEW (Screens >= md)
              ======================================================== */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No. Transaksi</th>
                    <th className="py-3 px-4">Waktu</th>
                    {showBranchColumn && <th className="py-3 px-4">Cabang</th>}
                    <th className="py-3 px-4">Kasir</th>
                    <th className="py-3 px-4">Layanan</th>
                    <th className="py-3 px-4">Nasabah</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                    <th className="py-3 px-4 text-right">Admin</th>
                    <th className="py-3 px-4 text-right">Pot. Bank</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Laba Bersih</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        t.status === "REVERSED" ? "bg-red-50/30 opacity-75" : ""
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
                      {showBranchColumn && (
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          <span className="font-semibold">{t.branchName || t.branchId}</span>
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {t.cashierName || t.userId}
                      </td>
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
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {t.status === "COMPLETED" ? "Sukses" : "Dibatalkan"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReceiptTarget(t)}
                            title="Cetak Bukti Struk"
                            className="p-1.5 rounded-lg bg-blue-50 text-[#002D62] hover:bg-blue-100 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {canReverse && t.status === "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => handleOpenReversal(t)}
                              title="Koreksi / Reversal Transaksi"
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Struk Modal */}
      <ReceiptModal
        isOpen={!!receiptTarget}
        onClose={() => setReceiptTarget(null)}
        transaction={receiptTarget}
      />

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-slate-800">Koreksi / Reversal Transaksi</h3>
              </div>
              <button
                onClick={() => setReversalTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p>
                  <strong className="text-slate-800">No. Transaksi:</strong> {reversalTarget.transactionNo}
                </p>
                <p>
                  <strong className="text-slate-800">Layanan:</strong> {reversalTarget.categoryName}
                </p>
                <p>
                  <strong className="text-slate-800">Nominal:</strong> {formatRupiah(reversalTarget.nominal)}
                </p>
                <p>
                  <strong className="text-slate-800">Laba yang Dikoreksi:</strong>{" "}
                  {formatRupiah(reversalTarget.netProfit)}
                </p>
              </div>

              <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
                ⚠️ Reversal akan mengembalikan saldo kas fisik dan saldo rekening/EDC ke kondisi semula serta
                mencatat pembukuan mutasi balik. Transaksi tidak akan dihapus permanen untuk audit.
              </p>

              {reversalError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {reversalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Alasan Koreksi / Pembatalan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Contoh: Nasabah salah memberikan nomor rekening tujuan / Salah nominal kasir"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isReversing}
                onClick={handleConfirmReversal}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isReversing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Konfirmasi Reversal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
