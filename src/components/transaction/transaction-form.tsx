"use client";

import { useState, useEffect } from "react";
import { createTransactionAction } from "@/app/actions/transaction-actions";
import { calculateTransactionFinancials } from "@/lib/calculations";
import { formatRupiah, parseRupiahInput } from "@/lib/utils";
import { CategoryData, BranchData } from "@/lib/data-service";
import { ReceiptModal } from "./receipt-modal";
import { usePWA } from "@/components/pwa/pwa-provider";
import {
  Coins,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  WifiOff,
  X,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface TransactionInitialDraft {
  fromAi?: boolean;
  categoryCode?: string;
  nominal?: number;
  customerAdmin?: number;
  bankFee?: number;
  customerName?: string;
  paymentMethod?: string;
  notes?: string;
}

interface TransactionFormProps {
  categories: CategoryData[];
  branch: BranchData;
  cashierName: string;
  initialDraft?: TransactionInitialDraft;
}

export function TransactionForm({ categories, branch, cashierName, initialDraft }: TransactionFormProps) {
  const router = useRouter();
  const { isOnline } = usePWA();

  const defaultCatCode =
    initialDraft?.categoryCode && categories.some((c) => c.code === initialDraft.categoryCode)
      ? initialDraft.categoryCode
      : categories[0]?.code || "TF_BRI";

  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>(defaultCatCode);
  const [nominalStr, setNominalStr] = useState<string>(
    initialDraft?.nominal !== undefined && !isNaN(initialDraft.nominal)
      ? String(initialDraft.nominal)
      : "1000000"
  );
  const [customerAdminStr, setCustomerAdminStr] = useState<string>(
    initialDraft?.customerAdmin !== undefined && !isNaN(initialDraft.customerAdmin)
      ? String(initialDraft.customerAdmin)
      : "10000"
  );
  const [bankFeeStr, setBankFeeStr] = useState<string>(
    initialDraft?.bankFee !== undefined && !isNaN(initialDraft.bankFee)
      ? String(initialDraft.bankFee)
      : "5000"
  );
  const [customerName, setCustomerName] = useState<string>(initialDraft?.customerName || "");
  const [paymentMethod, setPaymentMethod] = useState<string>(initialDraft?.paymentMethod || "TUNAI");
  const [notes, setNotes] = useState<string>(initialDraft?.notes || "");

  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmation modal state before submit
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Success receipt modal state
  const [createdTransaction, setCreatedTransaction] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  // Generate unique idempotency key when form loads or resets
  useEffect(() => {
    setIdempotencyKey(`idemp-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
  }, []);

  // Update default fees when category changes
  const handleCategoryChange = (code: string) => {
    setSelectedCategoryCode(code);
    const cat = categories.find((c) => c.code === code);
    if (cat) {
      setCustomerAdminStr(cat.defaultCustomerAdmin.toString());
      setBankFeeStr(cat.defaultBankFee.toString());
    }
  };

  const nominal = parseRupiahInput(nominalStr);
  const customerAdmin = parseRupiahInput(customerAdminStr);
  const bankFee = parseRupiahInput(bankFeeStr);

  const selectedCategory = categories.find((c) => c.code === selectedCategoryCode);

  // Real-time calculation
  const calc = calculateTransactionFinancials({
    categoryCode: selectedCategoryCode,
    nominal,
    customerAdmin,
    bankFee,
  });

  // Check balance sufficiency
  const isCashInsufficient =
    calc.cashFlowChange < 0 && branch.currentCashBalance + calc.cashFlowChange < 0;
  const isBankInsufficient =
    calc.bankFlowChange < 0 && branch.currentBankBalance + calc.bankFlowChange < 0;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isOnline) {
      setErrorMessage("Perangkat Anda sedang offline. Mohon sambungkan internet untuk memproses transaksi.");
      return;
    }

    if (nominal <= 0) {
      setErrorMessage("Nominal transaksi harus lebih besar dari Rp0.");
      return;
    }

    if (isCashInsufficient) {
      setErrorMessage(
        `Kas fisik tidak mencukupi! Tersedia ${formatRupiah(branch.currentCashBalance)}, dibutuhkan ${formatRupiah(Math.abs(calc.cashFlowChange))}`
      );
      return;
    }

    if (isBankInsufficient) {
      setErrorMessage(
        `Saldo rekening/EDC tidak mencukupi! Tersedia ${formatRupiah(branch.currentBankBalance)}, dibutuhkan ${formatRupiah(Math.abs(calc.bankFlowChange))}`
      );
      return;
    }

    // Open confirmation dialog
    setShowConfirmModal(true);
  };

  const handleExecuteTransaction = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createTransactionAction({
        branchId: branch.id,
        categoryCode: selectedCategoryCode,
        nominal,
        customerAdmin,
        bankFee,
        customerName: customerName.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Gagal memproses transaksi.");
        setIsSubmitting(false);
        return;
      }

      setCreatedTransaction(res.transaction);
      setShowReceipt(true);
      setIsSubmitting(false);

      // Regenerate idempotency key for next transaction
      setIdempotencyKey(`idemp-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
      setCustomerName("");
      setNotes("");
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan sistem saat menghubungi server.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form Input Section (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Input Transaksi BRILink
              </h2>
              <p className="text-xs text-slate-500">
                Formulir transaksi mobile-first dengan kalkulasi otomatis
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#002D62] border border-blue-200">
              {branch.name}
            </span>
          </div>

          {initialDraft?.fromAi && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-bold">Pra-Isi dari BRILink AI Assistant</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Nominal dan biaya admin sudah diisi sesuai percakapan Anda. Periksa kembali lalu tekan tombol simpan untuk konfirmasi akhir.
                </p>
              </div>
            </div>
          )}

          {/* Offline alert inside form */}
          {!isOnline && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
              <WifiOff className="w-4 h-4 flex-shrink-0 text-amber-700 mt-0.5" />
              <div>
                <p className="font-bold">Mode Offline Aktif</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Transaksi keuangan tidak dapat diproses saat koneksi terputus untuk mencegah ketidaksesuaian saldo.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px]">Peringatan Validasi</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleOpenConfirm} className="space-y-4">
            {/* 1. Kategori Transaksi */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jenis Layanan <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-blue-800">
                  {selectedCategory?.name}
                </span>
              </div>

              {/* Mobile Touch-Friendly Category Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryCode === cat.code;
                  return (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => handleCategoryChange(cat.code)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-97 no-tap-highlight ${
                        isSelected
                          ? "border-[#002D62] bg-blue-50/80 text-[#002D62] shadow-xs ring-2 ring-[#002D62]"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700"
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{cat.name}</span>
                      <span className="text-[10px] text-slate-500 mt-1 font-medium">
                        Admin: {formatRupiah(cat.defaultCustomerAdmin)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Nominal Transaksi (Numeric Keyboard) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nominal Transaksi (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-black text-slate-400 text-sm">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={nominalStr}
                  onChange={(e) => setNominalStr(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg sm:text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002D62] focus:bg-white transition-all tracking-tight"
                />
              </div>

              {/* Live Rupiah Reading */}
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-slate-400 font-medium">
                  Terbilang: <strong className="text-slate-800">{formatRupiah(nominal)}</strong>
                </span>
              </div>

              {/* Quick Nominal Chips */}
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                {[100000, 200000, 500000, 1000000, 2000000, 5000000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setNominalStr(quick.toString())}
                    className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl transition-all flex-shrink-0"
                  >
                    {quick >= 1000000 ? `${quick / 1000000} Jt` : `${quick / 1000} Rb`}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Biaya Admin Customer & Potongan Bank */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Biaya Admin Customer
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customerAdminStr}
                    onChange={(e) => setCustomerAdminStr(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62] focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Diterima dari nasabah: {formatRupiah(customerAdmin)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Potongan Admin Bank
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={bankFeeStr}
                    onChange={(e) => setBankFeeStr(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62] focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Dipotong sistem bank: {formatRupiah(bankFee)}</p>
              </div>
            </div>

            {/* 4. Data Customer & Metode Bayar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Customer (Opsional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Pak Herman / Ibu Siti"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62] focus:bg-white"
                >
                  <option value="TUNAI">💵 Uang Tunai (Cash)</option>
                  <option value="KARTU_DEBIT">💳 Kartu Debit BRI / EDC</option>
                  <option value="QRIS">📱 QRIS BRI</option>
                  <option value="TRANSFER">📲 Transfer Bank</option>
                </select>
              </div>
            </div>

            {/* 5. Catatan / Rekening */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Catatan / No. Rekening Tujuan / No. Meter
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Rek BRI 0123-01-xxxxxx a.n Ahmad"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62] focus:bg-white"
              />
            </div>

            {/* Big Touch-Friendly Submit Trigger */}
            <button
              type="submit"
              disabled={isSubmitting || !isOnline || isCashInsufficient || isBankInsufficient}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>LANJUTKAN KE KONFIRMASI</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Live Simulation Card (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 lg:sticky lg:top-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Simulasi Neraca Realtime
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                Otomatis
              </span>
            </div>

            {/* Net Profit Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Keuntungan Bersih Transaksi
              </span>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">
                +{formatRupiah(calc.netProfit)}
              </p>
              <div className="mt-2 text-[11px] text-emerald-900/80 font-medium border-t border-emerald-200/60 pt-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>Admin Customer:</span>
                  <span>+{formatRupiah(calc.customerAdmin)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Potongan Bank:</span>
                  <span>-{formatRupiah(calc.bankFee)}</span>
                </div>
              </div>
            </div>

            {/* Cashflow Movements */}
            <div className="space-y-2.5 text-xs">
              {/* Kas Fisik */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>Kas Fisik (Laci):</span>
                  </div>
                  <span
                    className={`font-mono ${
                      calc.cashFlowChange > 0
                        ? "text-blue-700"
                        : calc.cashFlowChange < 0
                        ? "text-amber-700"
                        : "text-slate-600"
                    }`}
                  >
                    {calc.cashFlowChange > 0 ? "+" : ""}
                    {formatRupiah(calc.cashFlowChange)}
                  </span>
                </div>
                {isCashInsufficient && (
                  <p className="mt-1 text-[10px] font-bold text-red-600">
                    ⚠️ Kas fisik tidak cukup! Tersedia: {formatRupiah(branch.currentCashBalance)}
                  </p>
                )}
              </div>

              {/* Saldo Rekening/EDC */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    <span>Saldo Rekening/EDC:</span>
                  </div>
                  <span
                    className={`font-mono ${
                      calc.bankFlowChange > 0
                        ? "text-blue-700"
                        : calc.bankFlowChange < 0
                        ? "text-amber-700"
                        : "text-slate-600"
                    }`}
                  >
                    {calc.bankFlowChange > 0 ? "+" : ""}
                    {formatRupiah(calc.bankFlowChange)}
                  </span>
                </div>
                {isBankInsufficient && (
                  <p className="mt-1 text-[10px] font-bold text-red-600">
                    ⚠️ Kuota bank tidak cukup! Tersedia: {formatRupiah(branch.currentBankBalance)}
                  </p>
                )}
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-700 mt-0.5" />
              <p>
                Seluruh nominal divalidasi oleh backend. Idempotency key melindungi transaksi dari pengiriman ganda.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Submit */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#002D62] flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="font-bold text-sm text-slate-900">Konfirmasi Transaksi</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="text-center py-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  {selectedCategory?.name}
                </span>
                <p className="text-2xl font-black text-[#002D62] tracking-tight mt-0.5">
                  {formatRupiah(nominal)}
                </p>
                {customerName && (
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    Nasabah: {customerName}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Biaya Admin:</span>
                  <span className="font-bold text-slate-800">{formatRupiah(customerAdmin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Potongan Bank:</span>
                  <span className="font-bold text-red-600">-{formatRupiah(bankFee)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-emerald-700">
                  <span>Keuntungan Bersih:</span>
                  <span>+{formatRupiah(calc.netProfit)}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center italic">
                Pastikan nominal dan uang kas telah dihitung sebelum menekan tombol simpan.
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
              >
                Periksa Ulang
              </button>
              <button
                type="button"
                onClick={handleExecuteTransaction}
                className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs shadow transition-all active:scale-98"
              >
                Ya, Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal if Submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-3 border border-slate-200 shadow-2xl">
            <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">Menyimpan Transaksi</h4>
            <p className="text-xs text-slate-500">
              Memvalidasi saldo dan mencatat pembukuan mutasi...
            </p>
          </div>
        </div>
      )}

      {/* Struk Modal Pop-up on Success */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        transaction={createdTransaction}
      />
    </>
  );
}
