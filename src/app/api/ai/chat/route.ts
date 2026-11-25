import { NextRequest, NextResponse } from "next/server";
import { getAIUserContext } from "@/lib/session-context";
import { processAIChatMessage } from "@/lib/ai/ai-agent-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAIUserContext();
    if (!ctx) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message : "";
    const conversationId =
      typeof body?.conversationId === "string" ? body.conversationId : undefined;

    if (!message.trim()) {
      return NextResponse.json(
        { error: "Pesan pertanyaan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const result = await processAIChatMessage(ctx, message, conversationId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan pada AI Assistant.";
    const status = msg.includes("Batas") ? 429 : msg.includes("ditolak") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
