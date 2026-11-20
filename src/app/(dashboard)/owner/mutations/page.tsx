import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { formatRupiah } from "@/lib/utils";
import { History, FileSpreadsheet, ArrowDownLeft, ArrowUpRight, Coins, CreditCard } from "lucide-react";
import { redirect } from "next/navigation";

interface OwnerMutationsPageProps {
  searchParams: {
    branch?: string;
  };
}

export default async function OwnerMutationsPage({ searchParams }: OwnerMutationsPageProps) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    redirect("/login");
  }

  const branchParam = searchParams.branch || "ALL";
  const allBranches = await DataService.getBranches();
  const mutations = await DataService.getMutations(branchParam, 200);

  return (
    <DashboardShell
      role="OWNER"
      userName={session.name}
      title="Buku Besar & Mutasi Saldo"
      subtitle="Pencatatan mutasi kas fisik dan rekening bank secara berurutan dan transparan"
      branches={allBranches}
    >
      <div className="space-y-4">
        {/* Mobile Card List (Screens < md) */}
        <div className="md:hidden space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Riwayat Mutasi Saldo ({mutations.length})
            </h3>
          </div>

          {mutations.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-400 border border-slate-200">
              Belum ada mutasi saldo untuk cabang ini.
            </div>
          ) : (
            mutations.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    {m.accountType === "CASH" ? (
                      <span className="p-1 rounded-lg bg-amber-50 text-amber-700">
                        <Coins className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-lg bg-sky-50 text-sky-700">
                        <CreditCard className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className="font-bold text-xs text-slate-800">{m.mutationType}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      m.accountType === "CASH"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-sky-50 text-sky-800 border border-sky-200"
                    }`}
                  >
                    {m.accountType === "CASH" ? "Kas Fisik" : "Saldo Bank"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Nominal Mutasi:</span>
                  <span
                    className={`font-mono text-sm font-black ${
                      m.flowDirection === "IN" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {m.flowDirection === "IN" ? "+" : "-"}
                    {formatRupiah(m.amount)}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-2 text-[10px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Cabang:</span>
                    <span className="font-semibold text-slate-700">{m.branchName || m.branchId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saldo Sebelum:</span>
                    <span>{formatRupiah(m.balanceBefore)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Saldo Sesudah:</span>
                    <span>{formatRupiah(m.balanceAfter)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span>Waktu:</span>
                    <span>{new Date(m.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 italic">{m.description}</p>
              </div>
            ))
          )}
        </div>

        {/* Desktop Tabular View (Screens >= md) */}
        <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-500" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">Catatan Mutasi Saldo (Audit Trail)</h3>
                <p className="text-xs text-slate-500">
                  Setiap rupiah pergerakan kas dan bank tercatat otomatis tanpa bisa dimanipulasi
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Akun</th>
                  <th className="py-3 px-4">Tipe Mutasi</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-right">Saldo Sebelum</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">Saldo Sesudah</th>
                  <th className="py-3 px-4">Pelaksana</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mutations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Belum ada riwayat mutasi untuk cabang ini.
                    </td>
                  </tr>
                ) : (
                  mutations.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
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
                      <td className="py-3 px-4 text-slate-600 max-w-sm truncate">{m.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
