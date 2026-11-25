import { requireCashierContext } from "@/lib/session-context";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { TransactionTable } from "@/components/transaction/transaction-table";

export default async function CashierHistoryPage() {
  const { session, branch } = await requireCashierContext();

  const transactions = await DataService.getTransactions({
    branchId: branch.id,
    userId: session.userId,
    limit: 100,
  });

  return (
    <DashboardShell
      role="CASHIER"
      userName={session.name}
      branchName={branch.name}
      title="Riwayat Transaksi Kasir"
      subtitle={`Daftar seluruh transaksi yang Anda layani di ${branch.name}`}
    >
      <TransactionTable
        transactions={transactions}
        canReverse={true}
        showBranchColumn={false}
      />
    </DashboardShell>
  );
}
