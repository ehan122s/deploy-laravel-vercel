"use server";

import { DataService } from "@/lib/data-service";
import { verifyPassword, signToken, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export interface AuthState {
  error?: string;
  success?: boolean;
}

export async function loginAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!username || !password) {
    return { error: "Username dan password wajib diisi." };
  }

  const user = await DataService.getUserByUsername(username);
  if (!user) {
    return { error: "Username atau password salah." };
  }

  if (!user.isActive) {
    return { error: "Akun Anda telah dinonaktifkan oleh Owner. Hubungi admin cabang." };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return { error: "Username atau password salah." };
  }

  // Get branch details if cashier
  let branchName: string | null = null;
  let branchCode: string | null = null;

  if (user.branchId) {
    const branch = await DataService.getBranchById(user.branchId);
    if (branch) {
      branchName = branch.name;
      branchCode = branch.code;
    }
  }

  // Generate JWT token
  const token = await signToken({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
    branchName,
    branchCode,
  });

  setSessionCookie(token);

  await DataService.logAudit({
    userId: user.id,
    userName: user.name,
    branchId: user.branchId,
    action: "LOGIN",
    resource: "AUTH",
    details: `Pengguna ${user.name} (${user.role}) berhasil masuk ke sistem.`,
  });

  // Redirect to appropriate dashboard
  if (user.role === Role.OWNER) {
    redirect("/owner");
  } else {
    redirect("/cashier");
  }
}

export async function logoutAction() {
  const session = await getSession();
  if (session) {
    await DataService.logAudit({
      userId: session.userId,
      userName: session.name,
      branchId: session.branchId || null,
      action: "LOGOUT",
      resource: "AUTH",
      details: `Pengguna ${session.name} keluar dari sistem.`,
    });
  }
  clearSessionCookie();
  redirect("/login");
}
