"use client";

import Link from "next/link";
import { AITransactionDraftPayload } from "@/lib/ai/ai-types";
import { formatRupiah } from "@/lib/utils";
import { ArrowRight, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

interface AITransactionDraftCardProps {
  draft: AITransactionDraftPayload;
  userRole: "OWNER" | "CASHIER";
}

export function AITransactionDraftCard({ draft, userRole }: AITransactionDraftCardProps) {
  return (
    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 sm:p-4 text-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
            Draft Transaksi ({draft.branchName})
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          Menunggu Konfirmasi
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Layanan</p>
          <p className="font-bold text-slate-900 mt-0.5">{draft.categoryName}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Nominal</p>
          <p className="font-black text-slate-900 mt-0.5">{formatRupiah(draft.nominal)}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Admin / Pot. Bank</p>
          <p className="font-semibold text-slate-700 mt-0.5">
            {formatRupiah(draft.customerAdmin)} / {formatRupiah(draft.bankFee)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Laba Bersih</p>
          <p className="font-black text-emerald-700 mt-0.5">{formatRupiah(draft.netProfit)}</p>
        </div>
      </div>

      {!draft.sufficientBalance && draft.insufficiencyReason && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{draft.insufficiencyReason}</span>
        </div>
      )}

      <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-[#002D62] flex-shrink-0 mt-0.5" />
        <span>
          Transaksi belum disimpan. Anda tetap perlu melakukan konfirmasi akhir di formulir resmi.
        </span>
      </div>

      {userRole === "CASHIER" ? (
        <Link
          href={draft.formUrl}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <span>Lanjutkan ke Formulir Transaksi (Isi Otomatis)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <p className="text-[11px] font-semibold text-[#002D62] bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
          Catatan: Pencatatan transaksi kasir dilakukan melalui akun Kasir cabang {draft.branchName}.
        </p>
      )}
    </div>
  );
}
