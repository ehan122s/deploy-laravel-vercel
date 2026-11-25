import { AccountType, FlowDirection, MutationType, Role, TransactionStatus } from "@prisma/client";
import { prisma } from "../db";
import { DataService, MutationData, TransactionData } from "../data-service";
import { formatRupiah } from "../utils";
import { AIAlertItem, AIAlertsPayload, AIUserContext } from "./ai-types";

interface DetectedCandidate {
  branchId: string | null;
  transactionId: string | null;
  alertType: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  description: string;
  dedupeKey: string;
}

const memoryAlerts = new Map<string, AIAlertItem>();

function checkAccountBalanceChain(
  branchId: string,
  branchName: string,
  accountType: AccountType,
  currentBalance: number,
  mutations: MutationData[]
): DetectedCandidate[] {
  const findings: DetectedCandidate[] = [];
  const label = accountType === AccountType.CASH ? "Kas Fisik" : "Saldo Rekening/EDC";

  if (currentBalance < 0) {
    findings.push({
      branchId,
      transactionId: null,
      alertType: "BALANCE_DISCREPANCY",
      severity: "CRITICAL",
      title: `Saldo ${label} Negatif — ${branchName}`,
      description: `Indikasi untuk diperiksa: saldo ${label} tercatat ${formatRupiah(currentBalance)}. Mohon lakukan pengecekan mutasi atau penyesuaian saldo berita acara.`,
      dedupeKey: `neg-${branchId}-${accountType}-${currentBalance}`,
    });
  } else if (currentBalance < 500_000) {
    findings.push({
      branchId,
      transactionId: null,
      alertType: "BALANCE_DISCREPANCY",
      severity: "INFO",
      title: `Saldo ${label} Menipis — ${branchName}`,
      description: `Indikasi untuk diperiksa: sisa ${label} sebesar ${formatRupiah(currentBalance)} (di bawah Rp500.000). Pertimbangkan penambahan modal operasional.`,
      dedupeKey: `low-${branchId}-${accountType}-${new Date().toISOString().slice(0, 10)}`,
    });
  }

  const accountMuts = mutations
    .filter((m) => m.branchId === branchId && m.accountType === accountType)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (accountMuts.length > 0) {
    const latest = accountMuts[accountMuts.length - 1];
    const diffLatest = Math.abs(latest.balanceAfter - currentBalance);
    if (diffLatest > 1) {
      findings.push({
        branchId,
        transactionId: null,
        alertType: "BALANCE_DISCREPANCY",
        severity: "CRITICAL",
        title: `Selisih Saldo ${label} — ${branchName}`,
        description: `Indikasi untuk diperiksa: saldo berjalan (${formatRupiah(currentBalance)}) berbeda sebesar ${formatRupiah(diffLatest)} dari mutasi terakhir (${formatRupiah(latest.balanceAfter)}).`,
        dedupeKey: `mismatch-${branchId}-${accountType}-${Math.round(currentBalance)}-${Math.round(latest.balanceAfter)}`,
      });
    }

    // Check continuity across mutation chain
    let netSum = 0;
    for (const m of accountMuts) {
      netSum += m.flowDirection === FlowDirection.IN ? m.amount : -m.amount;
    }
    const diffSum = Math.abs(netSum - currentBalance);
    if (diffSum > 1 && diffLatest <= 1) {
      findings.push({
        branchId,
        transactionId: null,
        alertType: "BALANCE_DISCREPANCY",
        severity: "WARNING",
        title: `Perbedaan Akumulasi Mutasi ${label} — ${branchName}`,
        description: `Indikasi untuk diperiksa: total akumulasi riwayat mutasi (${formatRupiah(netSum)}) memiliki selisih ${formatRupiah(diffSum)} terhadap saldo aktif (${formatRupiah(currentBalance)}).`,
        dedupeKey: `sum-mismatch-${branchId}-${accountType}-${Math.round(diffSum)}`,
      });
    }
  }

  return findings;
}

function detectTransactionAnomalies(
  branchId: string,
  branchName: string,
  branchTxs: TransactionData[],
  branchMutations: MutationData[]
): DetectedCandidate[] {
  const findings: DetectedCandidate[] = [];
  const completed = branchTxs.filter((t) => t.status === TransactionStatus.COMPLETED);
  const pending = branchTxs.filter((t) => t.status === TransactionStatus.PENDING);

  // 1. Transaksi PENDING belum diselesaikan
  for (const p of pending.slice(0, 5)) {
    findings.push({
      branchId,
      transactionId: p.id,
      alertType: "PENDING_TRANSACTION",
      severity: "WARNING",
      title: `Transaksi Belum Selesai (${p.transactionNo}) — ${branchName}`,
      description: `Indikasi untuk diperiksa: transaksi ${p.categoryName} sebesar ${formatRupiah(p.nominal)} berstatus PENDING dan belum selesai diproses.`,
      dedupeKey: `pending-${p.id}`,
    });
  }

  // 2. Kerugian admin (bankFee > customerAdmin) atau nominal tidak wajar
  const avgNominal =
    completed.length >= 5
      ? completed.reduce((acc, t) => acc + t.nominal, 0) / completed.length
      : 0;

  for (const t of completed.slice(0, 100)) {
    if (t.netProfit < 0) {
      findings.push({
        branchId,
        transactionId: t.id,
        alertType: "UNUSUAL_NOMINAL",
        severity: "WARNING",
        title: `Margin Admin Negatif (${t.transactionNo}) — ${branchName}`,
        description: `Indikasi untuk diperiksa: potongan bank (${formatRupiah(t.bankFee)}) lebih besar dari biaya admin customer (${formatRupiah(t.customerAdmin)}), menghasilkan selisih ${formatRupiah(t.netProfit)}.`,
        dedupeKey: `negprofit-${t.id}`,
      });
    } else if (t.nominal >= 10_000_000 || (avgNominal > 0 && t.nominal >= 2_000_000 && t.nominal > avgNominal * 3)) {
      findings.push({
        branchId,
        transactionId: t.id,
        alertType: "UNUSUAL_NOMINAL",
        severity: "INFO",
        title: `Transaksi Nominal Besar (${t.transactionNo}) — ${branchName}`,
        description: `Indikasi untuk diperiksa: transaksi ${t.categoryName} tercatat sebesar ${formatRupiah(t.nominal)}, lebih tinggi dari pola nominal rata-rata cabang.`,
        dedupeKey: `highnom-${t.id}`,
      });
    }
  }

  // 3. Potensi transaksi duplikat (kategori, nominal, admin sama dalam 5 menit)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCompleted = completed
    .filter((t) => new Date(t.createdAt).getTime() >= sevenDaysAgo)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (let i = 1; i < recentCompleted.length; i++) {
    const prev = recentCompleted[i - 1];
    const curr = recentCompleted[i];
    const diffMs = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();

    if (
      diffMs <= 5 * 60 * 1000 &&
      prev.categoryCode === curr.categoryCode &&
      prev.nominal === curr.nominal &&
      prev.customerAdmin === curr.customerAdmin
    ) {
      findings.push({
        branchId,
        transactionId: curr.id,
        alertType: "POTENTIAL_DUPLICATE",
        severity: "WARNING",
        title: `Potensi Transaksi Ganda — ${branchName}`,
        description: `Indikasi untuk diperiksa: ${prev.transactionNo} dan ${curr.transactionNo} (${curr.categoryName} sebesar ${formatRupiah(curr.nominal)}) tercatat dalam jeda ${Math.max(1, Math.round(diffMs / 1000))} detik.`,
        dedupeKey: `dup-${prev.id}-${curr.id}`,
      });
    }
  }

  // 4. Lonjakan transaksi atau penurunan keuntungan hari ini vs rata-rata 7 hari sebelumnya
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const prev7Start = todayStart - 7 * 24 * 60 * 60 * 1000;

  const todayTx = completed.filter((t) => new Date(t.createdAt).getTime() >= todayStart);
  const prevWeekTx = completed.filter((t) => {
    const ts = new Date(t.createdAt).getTime();
    return ts >= prev7Start && ts < todayStart;
  });

  if (prevWeekTx.length > 0) {
    const activeDayKeys = new Set(prevWeekTx.map((t) => t.createdAt.slice(0, 10)));
    const activeDays = Math.max(1, activeDayKeys.size);
    const avgDailyCount = prevWeekTx.length / activeDays;
    const avgDailyProfit = prevWeekTx.reduce((acc, t) => acc + t.netProfit, 0) / activeDays;
    const todayProfit = todayTx.reduce((acc, t) => acc + t.netProfit, 0);

    if (activeDays >= 2 && todayTx.length >= 5 && todayTx.length > avgDailyCount * 2.5) {
      findings.push({
        branchId,
        transactionId: null,
        alertType: "TRANSACTION_SPIKE",
        severity: "INFO",
        title: `Lonjakan Volume Transaksi — ${branchName}`,
        description: `Indikasi untuk diperiksa: hari ini tercatat ${todayTx.length} transaksi, meningkat signifikan dibanding rata-rata harian sebelumnya (${avgDailyCount.toFixed(1)} transaksi/hari).`,
        dedupeKey: `spike-${branchId}-${now.toISOString().slice(0, 10)}`,
      });
    }

    if (activeDays >= 2 && now.getHours() >= 17 && avgDailyProfit > 0 && todayProfit < avgDailyProfit * 0.4) {
      findings.push({
        branchId,
        transactionId: null,
        alertType: "PROFIT_DROP",
        severity: "WARNING",
        title: `Penurunan Keuntungan Harian — ${branchName}`,
        description: `Indikasi untuk diperiksa: laba bersih hari ini (${formatRupiah(todayProfit)}) lebih rendah dari rata-rata 7 hari terakhir (${formatRupiah(avgDailyProfit)}).`,
        dedupeKey: `drop-${branchId}-${now.toISOString().slice(0, 10)}`,
      });
    }
  }

  // 5. Aktivitas pembukuan tidak biasa (banyak reversal atau adjustment besar dalam 24 jam)
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentReversals = branchTxs.filter(
    (t) =>
      t.status === TransactionStatus.REVERSED &&
      t.reversedAt &&
      new Date(t.reversedAt).getTime() >= dayAgo
  );
  if (recentReversals.length >= 3) {
    findings.push({
      branchId,
      transactionId: null,
      alertType: "UNUSUAL_ACTIVITY",
      severity: "WARNING",
      title: `Frekuensi Koreksi/Reversal Tinggi — ${branchName}`,
      description: `Indikasi untuk diperiksa: terdapat ${recentReversals.length} koreksi/reversal transaksi dalam 24 jam terakhir pada ${branchName}.`,
      dedupeKey: `rev-freq-${branchId}-${now.toISOString().slice(0, 10)}`,
    });
  }

  const largeManualAdjustments = branchMutations.filter(
    (m) =>
      (m.mutationType === MutationType.ADJUSTMENT || m.mutationType === MutationType.CAPITAL_WITHDRAWAL) &&
      m.amount >= 5_000_000 &&
      new Date(m.createdAt).getTime() >= dayAgo
  );
  for (const adj of largeManualAdjustments.slice(0, 3)) {
    findings.push({
      branchId,
      transactionId: null,
      alertType: "UNUSUAL_ACTIVITY",
      severity: "INFO",
      title: `Penyesuaian/Penarikan Dana Besar — ${branchName}`,
      description: `Indikasi untuk diperiksa: tercatat mutasi ${adj.mutationType} sebesar ${formatRupiah(adj.amount)} (${adj.description}).`,
      dedupeKey: `adj-large-${adj.id}`,
    });
  }

  return findings;
}

export async function runAnomalyScan(
  ctx: AIUserContext,
  targetBranchId: string = "ALL"
): Promise<AIAlertsPayload> {
  const allBranches = await DataService.getBranches();
  const scopedBranchId =
    ctx.role === Role.CASHIER ? ctx.branchId || "" : targetBranchId;

  const targetBranches =
    scopedBranchId && scopedBranchId !== "ALL"
      ? allBranches.filter((b) => b.id === scopedBranchId)
      : allBranches;

  const [allTransactions, allMutations] = await Promise.all([
    DataService.getTransactions({
      branchId: scopedBranchId === "ALL" ? undefined : scopedBranchId,
      limit: 500,
    }),
    DataService.getMutations(scopedBranchId === "ALL" ? "ALL" : scopedBranchId, 300),
  ]);

  const candidates: DetectedCandidate[] = [];

  for (const b of targetBranches) {
    const bTxs = allTransactions.filter((t) => t.branchId === b.id);
    const bMuts = allMutations.filter((m) => m.branchId === b.id);

    // Owner gets full balance discrepancy + audit anomalies; cashier gets operational warnings only for own branch
    if (ctx.role === Role.OWNER) {
      candidates.push(
        ...checkAccountBalanceChain(b.id, b.name, AccountType.CASH, b.currentCashBalance, bMuts),
        ...checkAccountBalanceChain(b.id, b.name, AccountType.BANK, b.currentBankBalance, bMuts)
      );
    }

    const txAnomalies = detectTransactionAnomalies(b.id, b.name, bTxs, bMuts).filter((item) =>
      ctx.role === Role.OWNER
        ? true
        : item.alertType === "POTENTIAL_DUPLICATE" ||
          item.alertType === "PENDING_TRANSACTION" ||
          item.alertType === "UNUSUAL_NOMINAL"
    );
    candidates.push(...txAnomalies);
  }

  const branchNameMap = new Map(allBranches.map((b) => [b.id, b.name]));
  const dbConnected = await DataService.isDatabaseConnected();

  if (dbConnected) {
    for (const c of candidates) {
      try {
        await prisma.aIAlert.upsert({
          where: { dedupeKey: c.dedupeKey },
          update: {
            title: c.title,
            description: c.description,
            severity: c.severity,
          },
          create: {
            branchId: c.branchId || undefined,
            transactionId: c.transactionId || undefined,
            alertType: c.alertType,
            severity: c.severity,
            title: c.title,
            description: c.description,
            dedupeKey: c.dedupeKey,
          },
        });
      } catch (err) {
        console.warn("Alert upsert note:", err);
      }
    }

    const saved = await prisma.aIAlert.findMany({
      where:
        scopedBranchId && scopedBranchId !== "ALL"
          ? { branchId: scopedBranchId, resolvedAt: null }
          : { resolvedAt: null },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: 30,
    });

    const filteredSaved =
      ctx.role === Role.OWNER
        ? saved
        : saved.filter(
            (a) =>
              a.alertType === "POTENTIAL_DUPLICATE" ||
              a.alertType === "PENDING_TRANSACTION" ||
              a.alertType === "UNUSUAL_NOMINAL"
          );

    const mapped: AIAlertItem[] = filteredSaved.map((a) => ({
      id: a.id,
      branchId: a.branchId,
      branchName: a.branchId ? branchNameMap.get(a.branchId) || null : null,
      transactionId: a.transactionId,
      alertType: a.alertType,
      severity: a.severity,
      title: a.title,
      description: a.description,
      isRead: a.isRead,
      resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    }));

    return {
      kind: "alerts",
      scannedAt: new Date().toISOString(),
      totalAlerts: mapped.length,
      alerts: mapped,
    };
  }

  // Fallback alert store
  for (const c of candidates) {
    if (!memoryAlerts.has(c.dedupeKey)) {
      memoryAlerts.set(c.dedupeKey, {
        id: c.dedupeKey,
        branchId: c.branchId,
        branchName: c.branchId ? branchNameMap.get(c.branchId) || null : null,
        transactionId: c.transactionId,
        alertType: c.alertType,
        severity: c.severity,
        title: c.title,
        description: c.description,
        isRead: false,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const list = Array.from(memoryAlerts.values())
    .filter((a) => !a.resolvedAt && (scopedBranchId === "ALL" || a.branchId === scopedBranchId))
    .slice(0, 30);

  return {
    kind: "alerts",
    scannedAt: new Date().toISOString(),
    totalAlerts: list.length,
    alerts: list,
  };
}

export async function getUnreadAlertCount(ctx: AIUserContext): Promise<number> {
  if (ctx.role !== Role.OWNER) return 0;
  try {
    const scan = await runAnomalyScan(ctx, "ALL");
    return scan.alerts.filter((a) => !a.isRead).length;
  } catch {
    return 0;
  }
}

export async function updateAlertState(
  ctx: AIUserContext,
  alertId: string,
  action: "READ" | "RESOLVE"
): Promise<void> {
  if (ctx.role !== Role.OWNER) {
    throw new Error("Hanya Owner yang dapat menandai status peringatan sistem.");
  }

  if (await DataService.isDatabaseConnected()) {
    await prisma.aIAlert.update({
      where: { id: alertId },
      data:
        action === "RESOLVE"
          ? { isRead: true, resolvedAt: new Date() }
          : { isRead: true },
    });
    await DataService.logAudit({
      userId: ctx.userId,
      userName: ctx.name,
      branchId: null,
      action: `AI_ALERT_${action}`,
      resource: "AIAlert",
      details: `Owner menandai alert AI ${alertId} sebagai ${action === "RESOLVE" ? "selesai diperiksa" : "telah dibaca"}.`,
    });
    return;
  }

  const existing = memoryAlerts.get(alertId);
  if (existing) {
    existing.isRead = true;
    if (action === "RESOLVE") {
      existing.resolvedAt = new Date().toISOString();
    }
  }
}
