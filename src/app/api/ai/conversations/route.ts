import { NextRequest, NextResponse } from "next/server";
import { getAIUserContext } from "@/lib/session-context";
import { AIMessageItem } from "@/lib/ai/ai-types";
import {
  deleteConversation,
  getConversationMessages,
  listUserConversations,
} from "@/lib/ai/ai-storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAIUserContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId") || undefined;
    const conversations = await listUserConversations(ctx);

    const activeId = conversationId || conversations[0]?.id || null;
    const activeMessages: AIMessageItem[] = activeId
      ? await getConversationMessages(ctx, activeId)
      : [];

    return NextResponse.json({
      conversations,
      activeConversationId: activeId,
      messages: activeMessages,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat riwayat percakapan.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAIUserContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId") || undefined;
    const deletedCount = await deleteConversation(ctx, conversationId);
    return NextResponse.json({ success: true, deletedCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus riwayat percakapan.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
