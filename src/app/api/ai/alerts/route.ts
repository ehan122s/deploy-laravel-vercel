import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAIUserContext } from "@/lib/session-context";
import { runAnomalyScan, updateAlertState } from "@/lib/ai/anomaly-detector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getAIUserContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scan = await runAnomalyScan(ctx, ctx.role === Role.OWNER ? "ALL" : ctx.branchId || "");
    const unreadCount = scan.alerts.filter((a) => !a.isRead).length;

    return NextResponse.json({
      ...scan,
      unreadCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memindai alert.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAIUserContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const alertId = typeof body?.alertId === "string" ? body.alertId : "";
    const action = body?.action === "RESOLVE" ? "RESOLVE" : "READ";

    if (!alertId) {
      return NextResponse.json({ error: "alertId wajib diisi." }, { status: 400 });
    }

    await updateAlertState(ctx, alertId, action);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui alert.";
    const status = msg.includes("Hanya Owner") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
