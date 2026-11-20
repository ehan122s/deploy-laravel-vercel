import { getSession } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { TransactionForm } from "@/components/transaction/transaction-form";
import { redirect } from "next/navigation";

export default async function CashierTransactionPage() {
  const session = await getSession();
  if (!session || !session.branchId) {
    redirect("/login");
  }

  const branch = await DataService.getBranchById(session.branchId);
  if (!branch) {
    redirect("/login");
  }

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
