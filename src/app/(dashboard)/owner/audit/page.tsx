import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { ShieldAlert, ShieldCheck, UserCheck, RotateCcw, Building2, KeyRound } from "lucide-react";

export default async function OwnerAuditPage() {
  const session = await getSession();
  if (!session || session.role !== Role.OWNER) {
    redirect("/login");
  }

  const allBranches = await DataService.getBranches();
  const logs = await DataService.getAuditLogs(150);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE_TRANSACTION":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Transaksi Baru</span>;
      case "REVERSE_TRANSACTION":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">Reversal / Koreksi</span>;
      case "ADJUST_BALANCE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Mutasi Modal</span>;
      case "CREATE_CASHIER":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Buat Kasir</span>;
      case "LOGIN":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Masuk Sistem</span>;
      case "LOGOUT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Keluar Sistem</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600">{action}</span>;
    }
  };

  return (
    <DashboardShell
      role="OWNER"
      userName={session.name}
      title="Audit Log & Keamanan"
      subtitle="Rekam jejak setiap aktivitas finansial, login, koreksi, dan perubahan modal untuk akuntabilitas 100%"
      branches={allBranches}
    >
      <div className="space-y-4">
        {/* Mobile Timeline Cards (Screens < md) */}
        <div className="md:hidden space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Riwayat Audit Log ({logs.length})
            </h3>
          </div>

          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-xs text-slate-800">{log.userName || "System"}</span>
                {getActionBadge(log.action)}
              </div>

              <p className="text-xs text-slate-700 font-medium">{log.details}</p>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                <span>{new Date(log.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="font-mono">{log.ipAddress || "127.0.0.1"}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Tabular View (Screens >= md) */}
        <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#002D62]" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">Catatan Audit Keamanan (Immutable Log)</h3>
                <p className="text-xs text-slate-500">
                  Data aktivitas tersimpan kronologis dengan timestamp terverifikasi
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total {logs.length} catatan aktivitas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Aktivitas</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Detail Peristiwa</th>
                  <th className="py-3 px-4">Alamat IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {log.userName || "System"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.resource}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">{log.details}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
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
