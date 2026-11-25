import { prisma } from "../db";
import { DataService } from "../data-service";
import {
  AIConversationSummary,
  AIMessageItem,
  AIStructuredPayload,
  AIUserContext,
} from "./ai-types";
import { redactSensitiveData } from "./ai-security";

interface MemoryConversation {
  id: string;
  userId: string;
  branchId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AIMessageItem[];
}

const memoryConversations = new Map<string, MemoryConversation>();

function parseStructuredData(raw: string | null): AIStructuredPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AIStructuredPayload;
  } catch {
    return null;
  }
}

export async function listUserConversations(ctx: AIUserContext): Promise<AIConversationSummary[]> {
  if (await DataService.isDatabaseConnected()) {
    const convs = await prisma.aIConversation.findMany({
      where: { userId: ctx.userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return convs.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.messages[0]?.content.slice(0, 80),
    }));
  }

  return Array.from(memoryConversations.values())
    .filter((c) => c.userId === ctx.userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      lastMessage: c.messages[c.messages.length - 1]?.content.slice(0, 80),
    }));
}

export async function getConversationMessages(
  ctx: AIUserContext,
  conversationId: string
): Promise<AIMessageItem[]> {
  if (await DataService.isDatabaseConnected()) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId: ctx.userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
        },
      },
    });
    if (!conv) return [];

    return conv.messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
      toolName: m.toolName,
      structuredData: parseStructuredData(m.structuredData),
      tokensUsed: m.tokensUsed,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  const mem = memoryConversations.get(conversationId);
  if (!mem || mem.userId !== ctx.userId) return [];
  return mem.messages;
}

export async function createOrGetConversation(
  ctx: AIUserContext,
  conversationId: string | undefined,
  firstMessagePreview: string
): Promise<{ id: string; title: string }> {
  const safeTitle =
    firstMessagePreview.replace(/\s+/g, " ").trim().slice(0, 48) || "Percakapan BRILink AI";

  if (await DataService.isDatabaseConnected()) {
    if (conversationId) {
      const existing = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId: ctx.userId },
      });
      if (existing) {
        return { id: existing.id, title: existing.title };
      }
    }

    const created = await prisma.aIConversation.create({
      data: {
        userId: ctx.userId,
        branchId: ctx.branchId || undefined,
        title: safeTitle,
      },
    });
    return { id: created.id, title: created.title };
  }

  if (conversationId && memoryConversations.has(conversationId)) {
    const existing = memoryConversations.get(conversationId)!;
    if (existing.userId === ctx.userId) {
      return { id: existing.id, title: existing.title };
    }
  }

  const now = new Date().toISOString();
  const id = `conv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  memoryConversations.set(id, {
    id,
    userId: ctx.userId,
    branchId: ctx.branchId,
    title: safeTitle,
    createdAt: now,
    updatedAt: now,
    messages: [],
  });
  return { id, title: safeTitle };
}

export async function appendChatMessage(params: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolName?: string | null;
  structuredData?: AIStructuredPayload | null;
  tokensUsed?: number;
}): Promise<AIMessageItem> {
  const safeStructured = params.structuredData
    ? JSON.stringify(redactSensitiveData(params.structuredData))
    : null;

  if (await DataService.isDatabaseConnected()) {
    const [msg] = await prisma.$transaction([
      prisma.aIMessage.create({
        data: {
          conversationId: params.conversationId,
          role: params.role,
          content: params.content,
          toolName: params.toolName || null,
          structuredData: safeStructured,
          tokensUsed: params.tokensUsed || 0,
        },
      }),
      prisma.aIConversation.update({
        where: { id: params.conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
      toolName: msg.toolName,
      structuredData: params.structuredData || null,
      tokensUsed: msg.tokensUsed,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  const item: AIMessageItem = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    conversationId: params.conversationId,
    role: params.role,
    content: params.content,
    toolName: params.toolName || null,
    structuredData: params.structuredData || null,
    tokensUsed: params.tokensUsed || 0,
    createdAt: new Date().toISOString(),
  };

  const conv = memoryConversations.get(params.conversationId);
  if (conv) {
    conv.messages.push(item);
    conv.updatedAt = item.createdAt;
  }
  return item;
}

export async function deleteConversation(
  ctx: AIUserContext,
  conversationId?: string
): Promise<number> {
  if (await DataService.isDatabaseConnected()) {
    if (conversationId) {
      const res = await prisma.aIConversation.deleteMany({
        where: { id: conversationId, userId: ctx.userId },
      });
      return res.count;
    }

    const res = await prisma.aIConversation.deleteMany({
      where: { userId: ctx.userId },
    });
    return res.count;
  }

  if (conversationId) {
    const existing = memoryConversations.get(conversationId);
    if (existing && existing.userId === ctx.userId) {
      memoryConversations.delete(conversationId);
      return 1;
    }
    return 0;
  }

  let deleted = 0;
  for (const [id, conv] of Array.from(memoryConversations.entries())) {
    if (conv.userId === ctx.userId) {
      memoryConversations.delete(id);
      deleted++;
    }
  }
  return deleted;
}
