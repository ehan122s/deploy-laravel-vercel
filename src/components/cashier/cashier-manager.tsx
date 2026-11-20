"use client";

import { useState } from "react";
import { createCashierAction, toggleCashierStatusAction } from "@/app/actions/transaction-actions";
import { UserData, BranchData } from "@/lib/data-service";
import { formatRupiah } from "@/lib/utils";
import {
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Building2,
  KeyRound,
  User,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
} from "lucide-react";

interface CashierManagerProps {
  cashiers: (UserData & {
    branchName?: string;
    totalTransactions: number;
    totalProfit: number;
  })[];
  branches: BranchData[];
}

export function CashierManager({ cashiers, branches }: CashierManagerProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await createCashierAction({
      username: username.trim(),
      password,
      name: name.trim(),
      branchId,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Gagal membuat akun kasir.");
      return;
    }

    setUsername("");
    setPassword("");
    setName("");
    setIsOpenModal(false);
  };

  const handleToggleStatus = async (user: UserData) => {
    setToggleLoadingId(user.id);
    await toggleCashierStatusAction({
      userId: user.id,
      isActive: !user.isActive,
    });
    setToggleLoadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800">Daftar Akun Kasir BRILink</h3>
          <p className="text-xs text-slate-500">
            Kelola akses login, penugasan cabang kasir, dan pantau performa masing-masing kasir
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsOpenModal(true);
          }}
          className="px-4 py-2 bg-[#002D62] hover:bg-[#003B7E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Buat Akun Kasir Baru</span>
        </button>
      </div>

      {/* Cashier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cashiers.map((c) => (
          <div
            key={c.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
              c.isActive ? "border-slate-200 hover:border-blue-300" : "border-red-200 bg-red-50/20"
            }`}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    c.isActive ? "bg-blue-50 text-[#002D62]" : "bg-red-100 text-red-700"
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">@{c.username}</p>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  c.isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {c.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Penugasan Cabang:</span>
                <span className="font-bold text-slate-800">{c.branchName || "Belum diatur"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Transaksi Dilayani:</span>
                <span className="font-bold text-slate-800">{c.totalTransactions} transaksi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Laba Bersih Dihasilkan:</span>
                <span className="font-bold text-emerald-600">+{formatRupiah(c.totalProfit)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Terdaftar: {new Date(c.createdAt).toLocaleDateString("id-ID")}
              </span>

              <button
                type="button"
                disabled={toggleLoadingId === c.id}
                onClick={() => handleToggleStatus(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  c.isActive
                    ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                }`}
              >
                {c.isActive ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Nonaktifkan</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Aktifkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Buat Akun Kasir Baru */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#002D62]">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base">Buat Akun Kasir Baru</h3>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
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

            <form onSubmit={handleCreateCashier} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap Kasir <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rina Anggraini"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: kasir3"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password Sementara <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 5 karakter"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Penugasan Cabang <span className="text-red-500">*</span>
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D62]"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Kasir hanya dapat melihat dan memproses transaksi pada cabang ini.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#002D62] hover:bg-[#003B7E] text-white rounded-xl font-bold shadow-sm disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Buat Akun Kasir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
