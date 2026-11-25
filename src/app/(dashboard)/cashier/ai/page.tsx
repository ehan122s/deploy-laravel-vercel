import { redirect } from "next/navigation";
import { getAIUserContext, requireCashierContext } from "@/lib/session-context";
import { getConversationMessages, listUserConversations } from "@/lib/ai/ai-storage";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { AIChatWorkspace } from "@/components/ai/ai-chat-workspace";

interface CashierAIPageProps {
  searchParams: {
    prompt?: string;
  };
}

export default async function CashierAIPage({ searchParams }: CashierAIPageProps) {
  const { branch } = await requireCashierContext();
  const ctx = await getAIUserContext();
  if (!ctx) {
    redirect("/login?reauth=1");
  }

  const conversations = await listUserConversations(ctx);
  const activeConvId = !searchParams.prompt ? conversations[0]?.id || null : null;
  const initialMessages =
    activeConvId ? await getConversationMessages(ctx, activeConvId) : [];

  return (
    <DashboardShell
      role="CASHIER"
      userName={ctx.name}
      branchName={branch.name}
      title="BRILink AI Assistant"
      subtitle={`Asisten transaksi & pembukuan cabang ${branch.name}`}
    >
      <AIChatWorkspace
        role="CASHIER"
        userName={ctx.name}
        branchName={branch.name}
        initialConversations={conversations}
        initialConversationId={activeConvId}
        initialMessages={initialMessages}
        initialPrompt={searchParams.prompt}
      />
    </DashboardShell>
  );
}
