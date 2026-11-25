import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connected = await DataService.isDatabaseConnected();
    const branches = await DataService.getBranches();

    return NextResponse.json({
      status: "ok",
      database: connected ? "postgresql" : "fallback",
      branches: branches.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        cashBalance: b.currentCashBalance,
        bankBalance: b.currentBankBalance,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Health check error";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
