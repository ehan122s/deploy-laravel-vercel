"use client";

import { useState } from "react";
import { adjustBalanceAction } from "@/app/actions/transaction-actions";
import { formatRupiah, parseRupiahInput } from "@/lib/utils";
import { BranchData } from "@/lib/data-service";
import { AccountType, MutationType } from "@prisma/client";
import {
  Coins,
  CreditCard,
  ArrowRightLeft,
  PlusCircle,
  MinusCircle,
  Settings2,
  X,
  AlertCircle,
  Building2,
} from "lucide-react";

interface BranchAdjustModalProps {
  branches: BranchData[];
}

export function BranchAdjustModal({ branches }: BranchAdjustModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState(branches[0]?.id || "");
  const [accountType, setAccountType] = useState<AccountType>(AccountType.CASH);
  const [mutationType, setMutationType] = useState<MutationType>(MutationType.CAPITAL_INJECTION);
  const [targetBranchId, setTargetBranchId] = useState(branches[1]?.id || "");
  const [amountStr, setAmountStr] = useState("1000000");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = parseRupiahInput(amountStr);
  const selectedBranch = branches.find((b) => b.id === sourceBranchId);

  const handleOpen = (type: MutationType, branchId?: string) => {
    setMutationType(type);
    if (branchId) setSourceBranchId(branchId);
    setError(null);
    setReason("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError("Nominal harus lebih besar dari Rp0.");
      return;
    }

    if (reason.trim().length < 4) {
      setError("Alasan perubahan saldo wajib diisi minimal 4 karakter.");
      return;
    }

    if (mutationType === MutationType.INTER_BRANCH_TRANSFER && sourceBranchId === targetBranchId) {
      setError("Cabang sumber dan cabang tujuan tidak boleh sama.");
      return;
    }

    setLoading(true);

    const res = await adjustBalanceAction({
      branchId: sourceBranchId,
      accountType,
      mutationType,
      amount,
      reason,
      targetBranchId: mutationType === MutationType.INTER_BRANCH_TRANSFER ? targetBranchId : undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Gagal melakukan penyesuaian saldo.");
      return;
    }

    setIsOpen(false);
  };

  return (
    <>
      {/* Quick Action Trigger Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleOpen(MutationType.CAPITAL_INJECTION)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tambah Modal Cabang</span>
        </button>

        <button
          onClick={() => handleOpen(MutationType.INTER_BRANCH_TRANSFER)}
          className="px-3.5 py-2 bg-[#002D62] hover:bg-[#003B7E] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Transfer Antar-Cabang</span>
        </button>

        <button
          onClick={() => handleOpen(MutationType.CAPITAL_WITHDRAWAL)}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <MinusCircle className="w-4 h-4 text-slate-600" />
          <span>Tarik Modal Owner</span>
        </button>

        <button
          onClick={() => handleOpen(MutationType.ADJUSTMENT)}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Settings2 className="w-4 h-4 text-slate-600" />
          <span>Penyesuaian Berita Acara</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#002D62]">
                <Building2 className="w-5 h-5" />
                <h3 className="font-bold text-base">Kelola Saldo & Mutasi Modal Cabang</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Jenis Aksi */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jenis Operasi Keuangan
                </label>
                <select
                  value={mutationType}
                  onChange={(e) => setMutationType(e.target.value as MutationType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62]"
                >
                  <option value={MutationType.CAPITAL_INJECTION}>
                    💰 Tambah Modal (Setor Kas / Kuota Bank Baru)
                  </option>
                  <option value={MutationType.CAPITAL_WITHDRAWAL}>
                    📤 Penarikan Modal (Owner Tarik Dana Keluar)
                  </option>
                  <option value={MutationType.INTER_BRANCH_TRANSFER}>
                    🔄 Transfer Saldo Antar Cabang 1 & Cabang 2
                  </option>
                  <option value={MutationType.ADJUSTMENT}>
                    ⚖️ Penyesuaian Saldo Berita Acara (Opname Fisik)
                  </option>
                  <option value={MutationType.INITIAL_BALANCE}>
                    🏁 Ubah Saldo Awal Penetapan
                  </option>
                </select>
              </div>

              {/* Cabang Sumber & Cabang Tujuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {mutationType === MutationType.INTER_BRANCH_TRANSFER
                      ? "Cabang Sumber (Keluar)"
                      : "Pilih Cabang"}
                  </label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {mutationType === MutationType.INTER_BRANCH_TRANSFER && (
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cabang Tujuan (Masuk)
                    </label>
                    <select
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      {branches
                        .filter((b) => b.id !== sourceBranchId)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Jenis Akun Saldo: Kas Fisik vs Rekening Bank */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Akun Saldo yang Dipengaruhi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType(AccountType.CASH)}
                    className={`p-3 rounded-xl border flex items-center gap-2 font-semibold transition-all ${
                      accountType === AccountType.CASH
                        ? "border-[#002D62] bg-blue-50/70 text-[#002D62] ring-1 ring-[#002D62]"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Kas Fisik (Laci)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType(AccountType.BANK)}
                    className={`p-3 rounded-xl border flex items-center gap-2 font-semibold transition-all ${
                      accountType === AccountType.BANK
                        ? "border-[#002D62] bg-blue-50/70 text-[#002D62] ring-1 ring-[#002D62]"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Saldo Rekening / EDC</span>
                  </button>
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, ""))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002D62]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Terbilang: {formatRupiah(amount)}
                </p>
              </div>

              {/* Alasan Perubahan */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alasan Perubahan / Berita Acara <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Tambahan modal weekend / Setoran tunai hasil transfer"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#002D62] hover:bg-[#003B7E] text-white rounded-xl font-bold shadow-sm disabled:opacity-50"
                >
                  {loading ? "Menyimpan Mutasi..." : "Simpan Mutasi Saldo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
