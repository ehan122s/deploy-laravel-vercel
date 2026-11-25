import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession, SessionPayload } from "./auth";
import { DataService, BranchData } from "./data-service";

/**
 * Ensures the caller is an authenticated cashier with an active branch record.
 * Falls back to branchCode if branchId changed across database reseeds.
 */
export async function requireCashierContext(): Promise<{
  session: SessionPayload;
  branch: BranchData;
}> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === Role.OWNER && !session.branchId) {
    redirect("/owner");
  }

  if (!session.branchId && !session.branchCode) {
    redirect("/login?reauth=1");
  }

  let branch = session.branchId ? await DataService.getBranchById(session.branchId) : null;
  if (!branch && session.branchCode) {
    branch = await DataService.getBranchById(session.branchCode);
  }

  if (!branch) {
    redirect("/login?reauth=1");
  }

  return { session, branch };
}
