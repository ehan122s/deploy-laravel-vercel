import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { BranchAdjustModal } from "@/components/branch/branch-adjust-modal";
import { formatRupiah } from "@/lib/utils";
import { Coins, CreditCard, Building2, History, ArrowDownLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

export default async function OwnerBranchesPage() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    redirect("/login");
  }

  const branches = await DataService.getBranches();
  const mutations = await DataService.getMutations("ALL", 20);

  return (
    <DashboardShell
      role="OWNER"
      userName={session.name}
      title="Manajemen Saldo & Modal Cabang"
      subtitle="Kelola saldo awal, penambahan modal, penarikan modal, dan transfer antar cabang"
      branches={branches}
    >
      <div className="space-y-6">
        {/* Top Action Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Operasi Keuangan Modal</h3>
            <p className="text-xs text-slate-500">
              Setiap perubahan saldo wajib menyertakan alasan dan otomatis tercatat ke riwayat mutasi
            </p>
          </div>
          <BranchAdjustModal branches={branches} />
        </div>

        {/* Branch Cards (Cabang 1 vs Cabang 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map((b) => {
            const totalInitial = b.initialCashBalance + b.initialBankBalance;
            const totalCurrent = b.currentCashBalance + b.currentBankBalance;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#002D62] flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{b.name}</h3>
                      <p className="text-xs text-slate-500">
                        Kode: <span className="font-mono font-semibold">{b.code}</span> • {b.phone || "-"}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Operasional Aktif
                  </span>
                </div>

                {/* Saldo Berjalan (Realtime) */}
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Total Saldo Berjalan
                  </span>
                  <p className="text-3xl font-black text-[#002D62] tracking-tight">
                    {formatRupiah(totalCurrent)}
                  </p>
                </div>

                {/* Sub Balances: Kas Fisik vs Bank */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>Kas Fisik (Laci)</span>
                    </div>
                    <p className="text-lg font-extrabold text-slate-900">
                      {formatRupiah(b.currentCashBalance)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Awal: {formatRupiah(b.initialCashBalance)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1">
                      <CreditCard className="w-4 h-4 text-sky-600" />
                      <span>Saldo Rekening/EDC</span>
                    </div>
                    <p className="text-lg font-extrabold text-slate-900">
                      {formatRupiah(b.currentBankBalance)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Awal: {formatRupiah(b.initialBankBalance)}
                    </p>
                  </div>
                </div>

                {/* Info Lokasi */}
                <p className="text-xs text-slate-400 italic">
                  Alamat: {b.address || "Belum diatur"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Tabel Mutasi Terkini */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-sm text-slate-800">Riwayat Mutasi Saldo Terbaru</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Akun</th>
                  <th className="py-3 px-4">Jenis Mutasi</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-right">Saldo Sebelum</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">Saldo Sesudah</th>
                  <th className="py-3 px-4">Pelaksana</th>
                  <th className="py-3 px-4">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mutations.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {m.branchName || m.branchId}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.accountType === "CASH"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-sky-50 text-sky-800 border border-sky-200"
                        }`}
                      >
                        {m.accountType === "CASH" ? "Kas Fisik" : "Saldo Bank"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {m.mutationType}
                    </td>
                    <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                      <span className={m.flowDirection === "IN" ? "text-emerald-600" : "text-rose-600"}>
                        {m.flowDirection === "IN" ? "+" : "-"}
                        {formatRupiah(m.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                      {formatRupiah(m.balanceBefore)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(m.balanceAfter)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{m.userName || "-"}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
