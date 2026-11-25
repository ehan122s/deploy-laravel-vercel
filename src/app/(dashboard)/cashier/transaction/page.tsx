import { requireCashierContext } from "@/lib/session-context";
import { DataService } from "@/lib/data-service";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { TransactionForm } from "@/components/transaction/transaction-form";

interface CashierTransactionPageProps {
  searchParams: {
    fromAi?: string;
    category?: string;
    nominal?: string;
    admin?: string;
    bankFee?: string;
    customerName?: string;
    paymentMethod?: string;
    notes?: string;
  };
}

export default async function CashierTransactionPage({ searchParams }: CashierTransactionPageProps) {
  const { session, branch } = await requireCashierContext();

  const categories = await DataService.getCategories();

  const initialDraft =
    searchParams.fromAi === "1"
      ? {
          fromAi: true,
          categoryCode: searchParams.category,
          nominal: searchParams.nominal ? Number(searchParams.nominal) : undefined,
          customerAdmin: searchParams.admin ? Number(searchParams.admin) : undefined,
          bankFee: searchParams.bankFee ? Number(searchParams.bankFee) : undefined,
          customerName: searchParams.customerName,
          paymentMethod: searchParams.paymentMethod,
          notes: searchParams.notes,
        }
      : undefined;

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
        initialDraft={initialDraft}
      />
    </DashboardShell>
  );
}
