"use server";

import { DataService } from "@/lib/data-service";
import { getSession, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { AccountType, MutationType, Role } from "@prisma/client";

export async function createTransactionAction(data: {
  branchId?: string;
  categoryCode: string;
  nominal: number;
  customerAdmin: number;
  bankFee: number;
  customerName?: string;
  paymentMethod?: string;
  notes?: string;
  idempotencyKey?: string;
}) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
  }

  // Branch determination:
  // If cashier, always enforce their assigned branch! Cashier cannot tamper branchId.
  let branchId = session.branchId;
  if (session.role === Role.OWNER) {
    branchId = data.branchId || session.branchId;
  }

  if (!branchId) {
    return { success: false, error: "Cabang tidak terdeteksi." };
  }

  try {
    const tx = await DataService.createTransaction({
      branchId,
      userId: session.userId,
      categoryCode: data.categoryCode,
      nominal: Number(data.nominal),
      customerAdmin: Number(data.customerAdmin),
      bankFee: Number(data.bankFee),
      customerName: data.customerName,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      idempotencyKey: data.idempotencyKey,
    });

    revalidatePath("/cashier");
    revalidatePath("/cashier/history");
    revalidatePath("/cashier/transaction");
    revalidatePath("/owner");
    revalidatePath("/owner/transactions");
    revalidatePath("/owner/mutations");

    return { success: true, transaction: tx };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memproses transaksi." };
  }
}

export async function reverseTransactionAction(data: {
  transactionId: string;
  reason: string;
}) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
  }

  if (!data.reason || data.reason.trim().length < 5) {
    return { success: false, error: "Alasan koreksi/pembatalan wajib diisi minimal 5 karakter." };
  }

  try {
    const tx = await DataService.reverseTransaction({
      transactionId: data.transactionId,
      reversalReason: data.reason.trim(),
      userId: session.userId,
    });

    revalidatePath("/cashier");
    revalidatePath("/cashier/history");
    revalidatePath("/owner");
    revalidatePath("/owner/transactions");
    revalidatePath("/owner/mutations");

    return { success: true, transaction: tx };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal melakukan reversal transaksi." };
  }
}

export async function adjustBalanceAction(data: {
  branchId: string;
  accountType: AccountType;
  mutationType: MutationType;
  amount: number;
  reason: string;
  targetBranchId?: string;
}) {
  const session = await getSession();
  if (!session || session.role !== Role.OWNER) {
    return { success: false, error: "Hanya Owner yang memiliki wewenang mengelola saldo cabang." };
  }

  if (!data.reason || data.reason.trim().length < 4) {
    return { success: false, error: "Alasan perubahan saldo wajib diisi." };
  }

  if (Number(data.amount) <= 0) {
    return { success: false, error: "Nominal perubahan saldo harus lebih besar dari 0." };
  }

  try {
    const res = await DataService.adjustBalance({
      branchId: data.branchId,
      userId: session.userId,
      accountType: data.accountType,
      mutationType: data.mutationType,
      amount: Number(data.amount),
      reason: data.reason.trim(),
      targetBranchId: data.targetBranchId,
    });

    revalidatePath("/owner");
    revalidatePath("/owner/branches");
    revalidatePath("/owner/mutations");

    return { success: true, message: res.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memperbarui saldo." };
  }
}

export async function createCashierAction(data: {
  username: string;
  password: string;
  name: string;
  branchId: string;
}) {
  const session = await getSession();
  if (!session || session.role !== Role.OWNER) {
    return { success: false, error: "Hanya Owner yang berhak mendaftarkan akun kasir." };
  }

  if (!data.username || data.username.length < 3) {
    return { success: false, error: "Username minimal 3 karakter." };
  }

  if (!data.password || data.password.length < 5) {
    return { success: false, error: "Password kasir minimal 5 karakter." };
  }

  if (!data.name || !data.branchId) {
    return { success: false, error: "Nama kasir dan penugasan cabang wajib dipilih." };
  }

  try {
    const passwordHash = await hashPassword(data.password);
    const user = await DataService.createCashier({
      username: data.username,
      passwordHash,
      name: data.name,
      branchId: data.branchId,
    });

    revalidatePath("/owner/cashiers");
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal membuat akun kasir." };
  }
}

export async function toggleCashierStatusAction(data: {
  userId: string;
  isActive: boolean;
}) {
  const session = await getSession();
  if (!session || session.role !== Role.OWNER) {
    return { success: false, error: "Hanya Owner yang berhak mengubah status kasir." };
  }

  try {
    const user = await DataService.toggleUserStatus(data.userId, data.isActive);
    revalidatePath("/owner/cashiers");
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal mengubah status kasir." };
  }
}
