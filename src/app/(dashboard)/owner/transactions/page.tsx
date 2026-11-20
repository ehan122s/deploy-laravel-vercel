import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { TransactionTable } from "@/components/transaction/transaction-table";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

interface OwnerTransactionsPageProps {
  searchParams: {
    branch?: string;
  };
}

export default async function OwnerTransactionsPage({ searchParams }: OwnerTransactionsPageProps) {
  const session = await getSession();
  if (!session || session.role !== Role.OWNER) {
    redirect("/login");
  }

  const branchParam = searchParams.branch || "ALL";
  const allBranches = await DataService.getBranches();

  const transactions = await DataService.getTransactions({
    branchId: branchParam,
    limit: 500,
  });

  return (
    <DashboardShell
      role="OWNER"
      userName={session.name}
      title="Seluruh Riwayat Transaksi"
      subtitle="Arsip lengkap transaksi seluruh cabang dengan fitur pencarian, filter, dan koreksi"
      branches={allBranches}
    >
      <TransactionTable
        transactions={transactions}
        canReverse={true}
        showBranchColumn={true}
      />
    </DashboardShell>
  );
}
