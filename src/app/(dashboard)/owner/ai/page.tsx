import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { DataService } from "@/lib/data-service";
import { getAIUserContext } from "@/lib/session-context";
import { getConversationMessages, listUserConversations } from "@/lib/ai/ai-storage";
import { getUnreadAlertCount } from "@/lib/ai/anomaly-detector";
import { DashboardShell } from "@/components/layout/dashboard-layout";
import { AIChatWorkspace } from "@/components/ai/ai-chat-workspace";

interface OwnerAIPageProps {
  searchParams: {
    prompt?: string;
  };
}

export default async function OwnerAIPage({ searchParams }: OwnerAIPageProps) {
  const ctx = await getAIUserContext();
  if (!ctx || ctx.role !== Role.OWNER) {
    redirect("/login");
  }

  const [branches, conversations, unreadAlertCount] = await Promise.all([
    DataService.getBranches(),
    listUserConversations(ctx),
    getUnreadAlertCount(ctx),
  ]);

  const activeConvId = !searchParams.prompt ? conversations[0]?.id || null : null;
  const initialMessages =
    activeConvId ? await getConversationMessages(ctx, activeConvId) : [];

  return (
    <DashboardShell
      role="OWNER"
      userName={ctx.name}
      title="BRILink AI Assistant"
      subtitle="Asisten keuangan cerdas berbasis data aktual Hani BRILink & Rahmat Berkah"
      branches={branches}
    >
      <AIChatWorkspace
        role="OWNER"
        userName={ctx.name}
        initialConversations={conversations}
        initialConversationId={activeConvId}
        initialMessages={initialMessages}
        initialPrompt={searchParams.prompt}
        unreadAlertCount={unreadAlertCount}
      />
    </DashboardShell>
  );
}
