import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { ReportView } from "@/components/reports/report-view";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function OwnerReportsPage() {
  const session = await getSession();
  if (!session || session.role !== Role.OWNER) {
    redirect("/login");
  }

  const allBranches = await DataService.getBranches();
  const allUsers = await DataService.getUsers();
  const cashiers = allUsers.filter((u) => u.role === Role.CASHIER);
  const transactions = await DataService.getTransactions({ limit: 1000 });

  return (
    <DashboardShell
      role="OWNER"
      userName={session.name}
      title="Laporan Keuangan & Pembukuan Agen"
      subtitle="Analisis omset, mutasi uang masuk/keluar, biaya admin, dan laba bersih riil dengan fitur Export Excel & PDF"
      branches={allBranches}
    >
      <ReportView
        branches={allBranches}
        cashiers={cashiers}
        initialTransactions={transactions}
      />
    </DashboardShell>
  );
}
