"use client";

import { AIReportPayload } from "@/lib/ai/ai-types";
import { formatRupiah } from "@/lib/utils";
import { FileSpreadsheet, FileText, Printer, TrendingUp, Building2 } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AIReportCardProps {
  report: AIReportPayload;
}

export function AIReportCard({ report }: AIReportCardProps) {
  const s = report.summary;
  const cmp = report.comparisonWithPrevious;

  const handleExportExcel = () => {
    const summaryRows = [
      { Metrik: "Judul Laporan", Nilai: report.title },
      { Metrik: "Cakupan Cabang", Nilai: report.branchScope },
      { Metrik: "Periode", Nilai: report.periodLabel },
      { Metrik: "Jumlah Transaksi Sukses", Nilai: s.transactionCount },
      { Metrik: "Transaksi Dibatalkan", Nilai: s.reversedCount },
      { Metrik: "Total Nominal Transaksi", Nilai: s.totalNominal },
      { Metrik: "Total Uang Masuk", Nilai: s.totalMoneyIn },
      { Metrik: "Total Uang Keluar", Nilai: s.totalMoneyOut },
      { Metrik: "Total Admin Customer", Nilai: s.totalCustomerAdmin },
      { Metrik: "Total Potongan Bank", Nilai: s.totalBankFee },
      { Metrik: "Keuntungan Bersih", Nilai: s.totalNetProfit },
      { Metrik: "Saldo Akhir Kas Fisik", Nilai: s.endingCashBalance },
      { Metrik: "Saldo Akhir Rekening/EDC", Nilai: s.endingBankBalance },
      { Metrik: "Saldo Akhir Gabungan", Nilai: s.endingTotalBalance },
    ];

    const txRows = report.transactions.map((t, idx) => ({
      No: idx + 1,
      "No. Transaksi": t.transactionNo,
      Waktu: new Date(t.createdAt).toLocaleString("id-ID"),
      Cabang: t.branchName,
      Kasir: t.cashierName,
      Layanan: t.categoryName,
      Nasabah: t.customerName,
      "Nominal (Rp)": t.nominal,
      "Admin Customer (Rp)": t.customerAdmin,
      "Potongan Bank (Rp)": t.bankFee,
      "Laba Bersih (Rp)": t.netProfit,
      Status: t.status,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Ringkasan");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(txRows.length > 0 ? txRows : [{ Info: "Belum ada transaksi pada periode ini" }]),
      "Detail Transaksi"
    );
    XLSX.writeFile(wb, `AI-Laporan-BRILink-${Date.now()}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(report.title.toUpperCase(), 14, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Periode: ${report.periodLabel} | Dicetak: ${new Date(report.generatedAt).toLocaleString("id-ID")}`,
      14,
      21
    );
    doc.text(
      `Cabang: ${report.branchScope} | Transaksi: ${s.transactionCount} Sukses, ${s.reversedCount} Batal | Saldo Akhir: ${formatRupiah(s.endingTotalBalance)}`,
      14,
      26
    );

    doc.setFont("helvetica", "bold");
    doc.text(
      `Nominal: ${formatRupiah(s.totalNominal)} | Uang Masuk: ${formatRupiah(s.totalMoneyIn)} | Uang Keluar: ${formatRupiah(s.totalMoneyOut)} | Laba Bersih: ${formatRupiah(s.totalNetProfit)}`,
      14,
      32
    );

    const rows = report.transactions.map((t) => [
      t.transactionNo,
      new Date(t.createdAt).toLocaleDateString("id-ID"),
      t.branchName,
      t.cashierName,
      t.categoryName,
      formatRupiah(t.nominal),
      formatRupiah(t.customerAdmin),
      formatRupiah(t.bankFee),
      formatRupiah(t.netProfit),
      t.status,
    ]);

    autoTable(doc, {
      head: [
        ["No. TRX", "Tanggal", "Cabang", "Kasir", "Layanan", "Nominal", "Admin", "Pot. Bank", "Laba", "Status"],
      ],
      body: rows.length > 0 ? rows : [["-", "-", "-", "-", "Belum ada transaksi", "-", "-", "-", "-", "-"]],
      startY: 36,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [0, 45, 98], textColor: 255 },
    });

    doc.save(`AI-Laporan-BRILink-${Date.now()}.pdf`);
  };

  const handlePrint = () => {
    const printWin = window.open("", "_blank", "width=900,height=650");
    if (!printWin) return;

    const branchRowsHtml = report.branches
      .map(
        (b) => `
        <tr>
          <td>${b.branchName}</td>
          <td>${b.transactionCount}</td>
          <td>${formatRupiah(b.nominalTotal)}</td>
          <td>${formatRupiah(b.moneyIn)}</td>
          <td>${formatRupiah(b.moneyOut)}</td>
          <td>${formatRupiah(b.netProfitTotal)}</td>
          <td>${formatRupiah(b.totalBalance)}</td>
        </tr>`
      )
      .join("");

    printWin.document.write(`
      <html>
        <head>
          <title>${report.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 18px; margin-bottom: 4px; color: #002d62; }
            p { font-size: 12px; color: #475569; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #002d62; color: #fff; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
            .box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; }
            .label { font-size: 10px; color: #64748b; text-transform: uppercase; }
            .val { font-size: 14px; font-weight: bold; margin-top: 4px; }
          </style>
        </head>
        <body>
          <h1>${report.title}</h1>
          <p>Periode: <strong>${report.periodLabel}</strong> | Cakupan: ${report.branchScope}</p>
          <p>Dibuat oleh BRILink AI Assistant pada ${new Date(report.generatedAt).toLocaleString("id-ID")}</p>
          <div class="grid">
            <div class="box"><div class="label">Jumlah Transaksi</div><div class="val">${s.transactionCount}</div></div>
            <div class="box"><div class="label">Total Nominal</div><div class="val">${formatRupiah(s.totalNominal)}</div></div>
            <div class="box"><div class="label">Keuntungan Bersih</div><div class="val">${formatRupiah(s.totalNetProfit)}</div></div>
            <div class="box"><div class="label">Uang Masuk</div><div class="val">${formatRupiah(s.totalMoneyIn)}</div></div>
            <div class="box"><div class="label">Uang Keluar</div><div class="val">${formatRupiah(s.totalMoneyOut)}</div></div>
            <div class="box"><div class="label">Saldo Akhir</div><div class="val">${formatRupiah(s.endingTotalBalance)}</div></div>
          </div>
          <table>
            <thead>
              <tr><th>Cabang</th><th>Trx</th><th>Nominal</th><th>Masuk</th><th>Keluar</th><th>Laba Bersih</th><th>Saldo Akhir</th></tr>
            </thead>
            <tbody>${branchRowsHtml}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="mt-3 rounded-2xl border border-blue-200 bg-slate-50/90 p-3.5 sm:p-4 text-slate-800 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#002D62]">
            <Building2 className="w-3.5 h-3.5" />
            {report.title}
          </span>
          <p className="text-[11px] text-slate-500">Periode: {report.periodLabel}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          {s.transactionCount} Transaksi
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="bg-white rounded-xl p-2.5 border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Nominal</p>
          <p className="font-extrabold text-slate-900 mt-0.5">{formatRupiah(s.totalNominal)}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-slate-200">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Keuntungan Bersih</p>
          <p className="font-black text-emerald-700 mt-0.5">{formatRupiah(s.totalNetProfit)}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-slate-200 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-blue-700 uppercase">Saldo Akhir</p>
          <p className="font-extrabold text-[#002D62] mt-0.5">{formatRupiah(s.endingTotalBalance)}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Uang Masuk</p>
          <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(s.totalMoneyIn)}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Uang Keluar</p>
          <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(s.totalMoneyOut)}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-slate-200 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Admin / Pot. Bank</p>
          <p className="font-semibold text-slate-700 mt-0.5 text-[11px]">
            {formatRupiah(s.totalCustomerAdmin)} / {formatRupiah(s.totalBankFee)}
          </p>
        </div>
      </div>

      {/* Period comparison */}
      <div className="flex items-center gap-1.5 text-[11px] bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-2 text-[#002D62]">
        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Dibandingkan <strong>{cmp.previousPeriodLabel}</strong> ({formatRupiah(cmp.previousNetProfit)}):{" "}
          <strong className={cmp.profitDelta >= 0 ? "text-emerald-700" : "text-rose-700"}>
            {cmp.profitDelta >= 0 ? "+" : ""}
            {formatRupiah(cmp.profitDelta)}
          </strong>
          {cmp.profitGrowthPercent !== null ? ` (${cmp.profitGrowthPercent >= 0 ? "+" : ""}${cmp.profitGrowthPercent}%)` : ""}
        </span>
      </div>

      {/* Export & Print buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleExportPDF}
          className="flex-1 min-w-[100px] py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Export PDF</span>
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex-1 min-w-[100px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 min-w-[90px] py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
        </button>
      </div>
    </div>
  );
}
