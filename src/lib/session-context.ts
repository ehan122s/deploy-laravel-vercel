import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession, SessionPayload } from "./auth";
import { DataService, BranchData } from "./data-service";
import { AIUserContext } from "./ai/ai-types";

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

/**
 * Resolves live authenticated user & branch scope from PostgreSQL for AI API routes and pages.
 * Verifies user is still active in database (prevents deactivated cashier access).
 */
export async function getAIUserContext(): Promise<AIUserContext | null> {
  const session = await getSession();
  if (!session) return null;

  const dbUser = await DataService.getUserByUsername(session.username);
  if (!dbUser || !dbUser.isActive) return null;

  let branch: BranchData | null = null;
  if (dbUser.branchId) {
    branch = await DataService.getBranchById(dbUser.branchId);
  } else if (session.branchCode) {
    branch = await DataService.getBranchById(session.branchCode);
  }

  return {
    userId: dbUser.id,
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role,
    branchId: dbUser.role === Role.OWNER ? null : branch?.id || dbUser.branchId,
    branchName: dbUser.role === Role.OWNER ? null : branch?.name || session.branchName || null,
    branchCode: dbUser.role === Role.OWNER ? null : branch?.code || session.branchCode || null,
  };
}
