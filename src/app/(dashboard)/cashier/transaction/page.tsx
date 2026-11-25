import { requireCashierContext } from "@/lib/session-context";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { TransactionForm } from "@/components/transaction/transaction-form";

export default async function CashierTransactionPage() {
  const { session, branch } = await requireCashierContext();

  const categories = await DataService.getCategories();

  return (
    <DashboardShell
      role="CASHIER"
      userName={session.name}
      branchName={branch.name}
      title="Input Transaksi Pelanggan"
      subtitle={`Layanan Kasir - ${branch.name}`}
    >
      <TransactionForm
        categories={categories}
        branch={branch}
        cashierName={session.name}
      />
    </DashboardShell>
  );
}
