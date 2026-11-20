"use client";

import { Printer, Download, X, CheckCircle2, Building2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import jsPDF from "jspdf";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    transactionNo: string;
    branchName?: string;
    cashierName?: string;
    categoryName: string;
    customerName?: string | null;
    nominal: number;
    customerAdmin: number;
    bankFee?: number;
    netProfit?: number;
    paymentMethod: string;
    notes?: string | null;
    createdAt: string;
  } | null;
}

export function ReceiptModal({ isOpen, onClose, transaction }: ReceiptModalProps) {
  if (!isOpen || !transaction) return null;

  const totalPaidByCustomer =
    transaction.categoryName.includes("Tarik") || transaction.categoryName.includes("TARIK")
      ? transaction.nominal
      : transaction.nominal + transaction.customerAdmin;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 160], // Thermal receipt size
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("AGEN BRILINK", 40, 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(transaction.branchName || "Cabang BRILink", 40, 15, { align: "center" });
    doc.text("Struk Bukti Transaksi Sah", 40, 19, { align: "center" });
    doc.line(5, 22, 75, 22);

    doc.setFontSize(8);
    let y = 28;
    doc.text(`No. Reff : ${transaction.transactionNo}`, 5, y);
    y += 5;
    doc.text(`Tanggal  : ${new Date(transaction.createdAt).toLocaleString("id-ID")}`, 5, y);
    y += 5;
    doc.text(`Kasir    : ${transaction.cashierName || "-"}`, 5, y);
    y += 5;
    if (transaction.customerName) {
      doc.text(`Nasabah  : ${transaction.customerName}`, 5, y);
      y += 5;
    }
    doc.line(5, y, 75, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text(`Layanan : ${transaction.categoryName}`, 5, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Nominal  : ${formatRupiah(transaction.nominal)}`, 5, y);
    y += 5;
    doc.text(`Admin    : ${formatRupiah(transaction.customerAdmin)}`, 5, y);
    y += 5;
    doc.line(5, y, 75, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`TOTAL    : ${formatRupiah(totalPaidByCustomer)}`, 5, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Terima kasih atas kepercayaan Anda", 40, y, { align: "center" });
    y += 4;
    doc.text("Simpan struk ini sebagai bukti pembayaran sah", 40, y, { align: "center" });

    doc.save(`struk-${transaction.transactionNo}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="bg-[#002D62] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Bukti Transaksi Berhasil</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Preview Paper */}
        <div id="printable-receipt" className="p-6 bg-slate-50 text-slate-800 font-mono text-xs select-none">
          <div className="bg-white p-5 rounded-xl border border-dashed border-slate-300 shadow-xs">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-[#002D62] mb-1">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#002D62]">AGEN BRILINK</h4>
              <p className="text-[10px] text-slate-500">{transaction.branchName || "Cabang BRILink"}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">STRUK BUKTI TRANSAKSI</p>
            </div>

            <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Reff:</span>
                <span className="font-bold text-slate-800">{transaction.transactionNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu:</span>
                <span>{new Date(transaction.createdAt).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir:</span>
                <span>{transaction.cashierName || "-"}</span>
              </div>
              {transaction.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Nasabah:</span>
                  <span className="font-semibold">{transaction.customerName}</span>
                </div>
              )}
            </div>

            <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300 text-[11px]">
              <div className="font-bold text-slate-900 pb-1">{transaction.categoryName}</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-bold">{formatRupiah(transaction.nominal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biaya Admin:</span>
                <span>{formatRupiah(transaction.customerAdmin)}</span>
              </div>
            </div>

            <div className="pt-3 pb-2 flex justify-between text-xs font-bold text-[#002D62]">
              <span>TOTAL DITERIMA:</span>
              <span>{formatRupiah(totalPaidByCustomer)}</span>
            </div>

            <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
              <p>Terima kasih atas kunjungan Anda.</p>
              <p>Struk ini merupakan bukti transaksi yang sah.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 bg-[#002D62] hover:bg-[#003B7E] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  );
}
