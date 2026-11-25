import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { CashierManager } from "@/components/cashier/cashier-manager";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function OwnerCashiersPage() {
  const session = await getSession();
  if (!session || session.role !== Role.OWNER) {
    redirect("/login");
  }

  const allBranches = await DataService.getBranches();
  const allUsers = await DataService.getUsers();
  const allTransactions = await DataService.getTransactions({ limit: 1000 });

  const cashiers = allUsers
    .filter((u) => u.role === Role.CASHIER)
    .map((c) => {
      const branch = allBranches.find((b) => b.id === c.branchId);
      const userTx = allTransactions.filter((t) => t.userId === c.id && t.status === "COMPLETED");
      const totalProfit = userTx.reduce((acc, t) => acc + t.netProfit, 0);

      return {
        ...c,
        branchName: branch?.name,
        totalTransactions: userTx.length,
        totalProfit,
      };
    });

  return (
    <DashboardShell
      role="OWNER"
      userName={session.name}
      title="Monitoring & Manajemen Kasir"
      subtitle={`Kelola akun kasir untuk ${allBranches.map((b) => b.name).join(" & ") || "semua cabang"}`}
      branches={allBranches}
    >
      <CashierManager cashiers={cashiers} branches={allBranches} />
    </DashboardShell>
  );
}
