import { Role, TransactionStatus } from "@prisma/client";
import { DataService, TransactionData } from "../data-service";
import { calculateTransactionFinancials } from "../calculations";
import { formatRupiah } from "../utils";
import {
  AIReportBranchItem,
  AIReportPayload,
  AIStructuredPayload,
  AITransactionDraftPayload,
  AIUserContext,
} from "./ai-types";
import { enforceBranchScope, redactSensitiveData } from "./ai-security";
import { runAnomalyScan } from "./anomaly-detector";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AIToolExecutionResult {
  toolName: string;
  ok: boolean;
  data: Record<string, unknown>;
  structuredPayload?: AIStructuredPayload;
}

function getWibNow(): { year: number; month: number; day: number; dayOfWeek: number } {
  const shifted = new Date(Date.now() + WIB_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(), // 0 = Sun, 1 = Mon
  };
}

function wibDayStart(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - WIB_OFFSET_MS);
}

export function resolvePeriodRange(
  periodInput?: string,
  specificDate?: string,
  monthInput?: number,
  yearInput?: number
): {
  label: string;
  start: Date;
  end: Date;
  prevLabel: string;
  prevStart: Date;
  prevEnd: Date;
} {
  const wib = getWibNow();
  const p = (periodInput || "today").toLowerCase().trim();

  if (specificDate && /^\d{4}-\d{2}-\d{2}$/.test(specificDate)) {
    const [y, m, d] = specificDate.split("-").map(Number);
    const start = wibDayStart(y, m - 1, d);
    const end = wibDayStart(y, m - 1, d + 1);
    const prevStart = wibDayStart(y, m - 1, d - 1);
    const prevEnd = start;
    return {
      label: `Tanggal ${specificDate}`,
      start,
      end,
      prevLabel: "Hari sebelumnya",
      prevStart,
      prevEnd,
    };
  }

  if (monthInput && monthInput >= 1 && monthInput <= 12) {
    const y = yearInput || wib.year;
    const mIdx = monthInput - 1;
    const start = wibDayStart(y, mIdx, 1);
    const end = wibDayStart(y, mIdx + 1, 1);
    const prevStart = wibDayStart(y, mIdx - 1, 1);
    const prevEnd = start;
    const label = new Date(Date.UTC(y, mIdx, 15)).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    return {
      label: `Bulan ${label}`,
      start,
      end,
      prevLabel: "Bulan sebelumnya",
      prevStart,
      prevEnd,
    };
  }

  if (p === "yesterday" || p === "kemarin") {
    const start = wibDayStart(wib.year, wib.month, wib.day - 1);
    const end = wibDayStart(wib.year, wib.month, wib.day);
    return {
      label: "Kemarin",
      start,
      end,
      prevLabel: "2 hari lalu",
      prevStart: wibDayStart(wib.year, wib.month, wib.day - 2),
      prevEnd: start,
    };
  }

  if (p === "current_week" || p === "this_week" || p === "minggu_ini" || p === "7_days") {
    const diffToMonday = wib.dayOfWeek === 0 ? 6 : wib.dayOfWeek - 1;
    const start = wibDayStart(wib.year, wib.month, wib.day - diffToMonday);
    const end = wibDayStart(wib.year, wib.month, wib.day + 1);
    return {
      label: "Minggu Ini",
      start,
      end,
      prevLabel: "Minggu sebelumnya",
      prevStart: wibDayStart(wib.year, wib.month, wib.day - diffToMonday - 7),
      prevEnd: start,
    };
  }

  if (p === "last_month" || p === "bulan_lalu") {
    const start = wibDayStart(wib.year, wib.month - 1, 1);
    const end = wibDayStart(wib.year, wib.month, 1);
    return {
      label: "Bulan Lalu",
      start,
      end,
      prevLabel: "2 Bulan lalu",
      prevStart: wibDayStart(wib.year, wib.month - 2, 1),
      prevEnd: start,
    };
  }

  if (p === "this_month" || p === "current_month" || p === "bulan_ini") {
    const start = wibDayStart(wib.year, wib.month, 1);
    const end = wibDayStart(wib.year, wib.month + 1, 1);
    return {
      label: "Bulan Ini",
      start,
      end,
      prevLabel: "Bulan lalu",
      prevStart: wibDayStart(wib.year, wib.month - 1, 1),
      prevEnd: start,
    };
  }

  if (p === "this_year" || p === "tahun_ini") {
    const start = wibDayStart(wib.year, 0, 1);
    const end = wibDayStart(wib.year + 1, 0, 1);
    return {
      label: `Tahun ${wib.year}`,
      start,
      end,
      prevLabel: `Tahun ${wib.year - 1}`,
      prevStart: wibDayStart(wib.year - 1, 0, 1),
      prevEnd: start,
    };
  }

  // Default: today
  const start = wibDayStart(wib.year, wib.month, wib.day);
  const end = wibDayStart(wib.year, wib.month, wib.day + 1);
  return {
    label: "Hari Ini",
    start,
    end,
    prevLabel: "Kemarin",
    prevStart: wibDayStart(wib.year, wib.month, wib.day - 1),
    prevEnd: start,
  };
}

function aggregateTransactions(txs: TransactionData[]) {
  const completed = txs.filter((t) => t.status === TransactionStatus.COMPLETED);
  const reversed = txs.filter((t) => t.status === TransactionStatus.REVERSED);
  const pending = txs.filter((t) => t.status === TransactionStatus.PENDING);

  const totalNominal = completed.reduce((acc, t) => acc + t.nominal, 0);
  const totalCustomerAdmin = completed.reduce((acc, t) => acc + t.customerAdmin, 0);
  const totalBankFee = completed.reduce((acc, t) => acc + t.bankFee, 0);
  const totalNetProfit = completed.reduce((acc, t) => acc + t.netProfit, 0);
  const totalMoneyIn = completed.reduce((acc, t) => acc + t.cashReceived + t.bankReceived, 0);
  const totalMoneyOut = completed.reduce((acc, t) => acc + t.cashGiven + t.bankDeducted, 0);

  return {
    transactionCount: completed.length,
    reversedCount: reversed.length,
    pendingCount: pending.length,
    totalNominal,
    totalMoneyIn,
    totalMoneyOut,
    totalCustomerAdmin,
    totalBankFee,
    totalNetProfit,
  };
}

function matchCategoryCode(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("antar") || q.includes("bca") || q.includes("mandiri") || q.includes("bni") || q.includes("interbank")) {
    return "TF_INTERBANK";
  }
  if (q.includes("tarik")) return "TARIK_TUNAI";
  if (q.includes("setor")) return "SETOR_TUNAI";
  if (q.includes("pln") || q.includes("token") || q.includes("listrik")) return "PLN_TOKEN";
  if (q.includes("pulsa") || q.includes("kuota") || q.includes("paket")) return "PULSA_DATA";
  if (q.includes("dana") || q.includes("ovo") || q.includes("gopay") || q.includes("shopee") || q.includes("top up") || q.includes("topup") || q.includes("ewallet")) {
    return "TOPUP_EWALLET";
  }
  if (q.includes("bpjs") || q.includes("pdam") || q.includes("cicilan") || q.includes("tagihan") || q.includes("bayar")) {
    return "PAYMENT_BILLS";
  }
  if (q.includes("transfer") || q.includes("tf") || q.includes("kirim")) return "TF_BRI";
  return "LAINNYA";
}

export function getToolDefinitions(role: Role): AIToolDefinition[] {
  const commonTools: AIToolDefinition[] = [
    {
      name: "get_branch_balance",
      description:
        "Mengambil saldo kas fisik (laci), saldo rekening bank/EDC, dan total saldo cabang secara aktual dari database.",
      parameters: {
        type: "object",
        properties: {
          branch: {
            type: "string",
            description: "Nama atau kode cabang opsional (misal: 'Hani BRILink', 'Rahmat Berkah', 'cabang 1', 'cabang 2', atau 'ALL').",
          },
        },
      },
    },
    {
      name: "get_transaction_summary",
      description:
        "Mengambil ringkasan transaksi aktual: jumlah transaksi, nominal total, uang masuk, uang keluar, total admin customer, potongan bank, dan keuntungan bersih.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Periode: 'today', 'yesterday', 'current_week', 'this_month', 'last_month', 'this_year'.",
          },
          branch: {
            type: "string",
            description: "Filter cabang opsional (hanya berlaku bagi Owner).",
          },
        },
      },
    },
    {
      name: "get_daily_profit",
      description:
        "Menghitung keuntungan bersih harian, biaya admin customer, dan potongan bank beserta perbandingan dengan hari sebelumnya.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Tanggal spesifik format YYYY-MM-DD (opsional, default hari ini).",
          },
          branch: {
            type: "string",
            description: "Filter cabang opsional.",
          },
        },
      },
    },
    {
      name: "get_monthly_profit",
      description:
        "Menghitung keuntungan bersih bulanan beserta perbandingan terhadap bulan sebelumnya.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "Bulan 1-12 (opsional, default bulan ini)." },
          year: { type: "number", description: "Tahun misal 2026 (opsional)." },
          branch: { type: "string", description: "Filter cabang opsional." },
        },
      },
    },
    {
      name: "get_cashier_performance",
      description:
        "Melihat performa jumlah transaksi dan laba bersih kasir pada periode tertentu.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Periode: 'today', 'current_week', 'this_month', 'last_month'.",
          },
          branch: { type: "string", description: "Filter cabang opsional (khusus Owner)." },
        },
      },
    },
    {
      name: "get_transaction_history",
      description:
        "Mengambil daftar riwayat transaksi terbaru sesuai periode atau kategori layanan.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "Periode: 'today', 'yesterday', 'current_week', 'this_month'." },
          branch: { type: "string", description: "Filter cabang opsional." },
          categoryCode: { type: "string", description: "Kode kategori opsional misal TF_BRI, TARIK_TUNAI, SETOR_TUNAI." },
          limit: { type: "number", description: "Maksimal jumlah transaksi yang diambil (default 10)." },
        },
      },
    },
    {
      name: "generate_financial_report",
      description:
        "Membuat laporan keuangan terstruktur lengkap siap ekspor PDF, Excel, dan cetak untuk cabang atau periode tertentu.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Periode: 'today', 'yesterday', 'current_week', 'this_month', 'last_month', 'this_year'.",
          },
          branch: { type: "string", description: "Filter cabang opsional." },
        },
      },
    },
    {
      name: "prepare_transaction_draft",
      description:
        "Menyiapkan ringkasan draft input transaksi dan tautan pra-isi ke formulir transaksi resmi. TIDAK PERNAH menyimpan transaksi otomatis.",
      parameters: {
        type: "object",
        properties: {
          categoryQuery: {
            type: "string",
            description: "Jenis transaksi, misal 'Transfer Sesama BRI', 'Transfer Antarbank', 'Tarik Tunai', 'Setor Tunai', 'Token PLN', 'Pulsa', 'Top Up'.",
          },
          nominal: { type: "number", description: "Nominal transaksi pokok dalam Rupiah." },
          customerAdmin: { type: "number", description: "Biaya admin yang dibayar customer dalam Rupiah." },
          bankFee: { type: "number", description: "Potongan biaya admin bank dalam Rupiah." },
          customerName: { type: "string", description: "Nama customer opsional." },
          paymentMethod: { type: "string", description: "Metode pembayaran opsional: TUNAI, TRANSFER, KARTU_DEBIT." },
          notes: { type: "string", description: "Catatan transaksi opsional." },
        },
        required: ["categoryQuery", "nominal"],
      },
    },
  ];

  if (role === Role.OWNER) {
    commonTools.push(
      {
        name: "compare_branches",
        description:
          "Membandingkan performa jumlah transaksi, nominal, uang masuk/keluar, saldo, dan keuntungan bersih antara Hani BRILink dan Rahmat Berkah.",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              description: "Periode perbandingan: 'today', 'yesterday', 'current_week', 'this_month', 'last_month'.",
            },
          },
        },
      },
      {
        name: "detect_balance_discrepancy",
        description:
          "Memindai database untuk mendeteksi selisih saldo kas/rekening, transaksi duplikat, nominal tidak wajar, pending, lonjakan/penurunan laba.",
        parameters: {
          type: "object",
          properties: {
            branch: { type: "string", description: "Filter cabang opsional atau 'ALL'." },
          },
        },
      }
    );
  }

  return commonTools;
}

export async function executeAITool(
  ctx: AIUserContext,
  toolName: string,
  rawArgs: Record<string, unknown> = {}
): Promise<AIToolExecutionResult> {
  const branches = await DataService.getBranches();
  const branchArg = typeof rawArgs.branch === "string" ? rawArgs.branch : undefined;

  switch (toolName) {
    case "get_branch_balance": {
      const scope = enforceBranchScope(ctx, branchArg, branches);
      if (!scope.allowed) {
        return { toolName, ok: false, data: { error: scope.deniedReason } };
      }

      const targetBranches =
        scope.branchId === "ALL" ? branches : branches.filter((b) => b.id === scope.branchId);

      const items = targetBranches.map((b) => ({
        branchId: b.id,
        branchCode: b.code,
        branchName: b.name,
        cashBalance: b.currentCashBalance,
        bankBalance: b.currentBankBalance,
        totalBalance: b.currentCashBalance + b.currentBankBalance,
        initialCashBalance: b.initialCashBalance,
        initialBankBalance: b.initialBankBalance,
      }));

      return {
        toolName,
        ok: true,
        data: {
          scope: scope.branchName,
          branches: items,
          combinedTotalBalance: items.reduce((acc, b) => acc + b.totalBalance, 0),
          combinedCashBalance: items.reduce((acc, b) => acc + b.cashBalance, 0),
          combinedBankBalance: items.reduce((acc, b) => acc + b.bankBalance, 0),
        },
      };
    }

    case "get_transaction_summary":
    case "get_daily_profit":
    case "get_monthly_profit": {
      const scope = enforceBranchScope(ctx, branchArg, branches);
      if (!scope.allowed) {
        return { toolName, ok: false, data: { error: scope.deniedReason } };
      }

      const defaultPeriod =
        toolName === "get_monthly_profit"
          ? "this_month"
          : typeof rawArgs.period === "string"
            ? rawArgs.period
            : "today";

      const range = resolvePeriodRange(
        defaultPeriod,
        typeof rawArgs.date === "string" ? rawArgs.date : undefined,
        typeof rawArgs.month === "number" ? rawArgs.month : undefined,
        typeof rawArgs.year === "number" ? rawArgs.year : undefined
      );

      const [currentTxs, prevTxs] = await Promise.all([
        DataService.getTransactions({
          branchId: scope.branchId,
          startDate: range.start.toISOString(),
          endDate: range.end.toISOString(),
          userId: ctx.role === Role.CASHIER ? ctx.userId : undefined,
        }),
        DataService.getTransactions({
          branchId: scope.branchId,
          startDate: range.prevStart.toISOString(),
          endDate: range.prevEnd.toISOString(),
          userId: ctx.role === Role.CASHIER ? ctx.userId : undefined,
        }),
      ]);

      const agg = aggregateTransactions(currentTxs);
      const prevAgg = aggregateTransactions(prevTxs);
      const profitDelta = agg.totalNetProfit - prevAgg.totalNetProfit;

      return {
        toolName,
        ok: true,
        data: {
          periodLabel: range.label,
          branchScope: scope.branchName,
          ...agg,
          previousPeriodLabel: range.prevLabel,
          previousNetProfit: prevAgg.totalNetProfit,
          previousTransactionCount: prevAgg.transactionCount,
          profitDelta,
        },
      };
    }

    case "compare_branches": {
      if (ctx.role !== Role.OWNER) {
        return {
          toolName,
          ok: false,
          data: { error: "Akses ditolak: perbandingan antar cabang hanya tersedia untuk Owner." },
        };
      }

      const range = resolvePeriodRange(
        typeof rawArgs.period === "string" ? rawArgs.period : "this_month"
      );

      const txs = await DataService.getTransactions({
        branchId: "ALL",
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      });

      const comparison = branches.map((b) => {
        const bTx = txs.filter((t) => t.branchId === b.id);
        const agg = aggregateTransactions(bTx);
        return {
          branchId: b.id,
          branchCode: b.code,
          branchName: b.name,
          cashBalance: b.currentCashBalance,
          bankBalance: b.currentBankBalance,
          totalBalance: b.currentCashBalance + b.currentBankBalance,
          ...agg,
        };
      });

      const sortedByProfit = [...comparison].sort((a, b) => b.totalNetProfit - a.totalNetProfit);
      const leader = sortedByProfit[0];
      const runnerUp = sortedByProfit[1];

      return {
        toolName,
        ok: true,
        data: {
          periodLabel: range.label,
          branches: comparison,
          topBranchName: leader?.branchName || null,
          profitDifference: leader && runnerUp ? leader.totalNetProfit - runnerUp.totalNetProfit : 0,
        },
      };
    }

    case "get_cashier_performance": {
      const scope = enforceBranchScope(ctx, branchArg, branches);
      if (!scope.allowed) {
        return { toolName, ok: false, data: { error: scope.deniedReason } };
      }

      const range = resolvePeriodRange(
        typeof rawArgs.period === "string" ? rawArgs.period : "this_month"
      );

      const [users, txs] = await Promise.all([
        DataService.getUsers(),
        DataService.getTransactions({
          branchId: scope.branchId,
          startDate: range.start.toISOString(),
          endDate: range.end.toISOString(),
          userId: ctx.role === Role.CASHIER ? ctx.userId : undefined,
        }),
      ]);

      const branchMap = new Map(branches.map((b) => [b.id, b.name]));
      const visibleCashiers = users.filter((u) => {
        if (ctx.role === Role.CASHIER) return u.id === ctx.userId;
        if (u.role !== Role.CASHIER) return false;
        if (scope.branchId !== "ALL") return u.branchId === scope.branchId;
        return true;
      });

      const performance = visibleCashiers.map((c) => {
        const cTx = txs.filter((t) => t.userId === c.id);
        const agg = aggregateTransactions(cTx);
        return {
          name: c.name,
          username: c.username,
          branchName: c.branchId ? branchMap.get(c.branchId) || "-" : "-",
          isActive: c.isActive,
          ...agg,
        };
      });

      return {
        toolName,
        ok: true,
        data: {
          periodLabel: range.label,
          branchScope: scope.branchName,
          cashiers: redactSensitiveData(performance),
        },
      };
    }

    case "get_transaction_history": {
      const scope = enforceBranchScope(ctx, branchArg, branches);
      if (!scope.allowed) {
        return { toolName, ok: false, data: { error: scope.deniedReason } };
      }

      const range = resolvePeriodRange(
        typeof rawArgs.period === "string" ? rawArgs.period : "today"
      );
      const limit = Math.min(25, Math.max(1, Number(rawArgs.limit) || 10));

      const txs = await DataService.getTransactions({
        branchId: scope.branchId,
        categoryCode: typeof rawArgs.categoryCode === "string" ? rawArgs.categoryCode : undefined,
        userId: ctx.role === Role.CASHIER ? ctx.userId : undefined,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        limit,
      });

      return {
        toolName,
        ok: true,
        data: {
          periodLabel: range.label,
          branchScope: scope.branchName,
          count: txs.length,
          transactions: txs.map((t) => ({
            transactionNo: t.transactionNo,
            branchName: t.branchName,
            cashierName: t.cashierName,
            categoryName: t.categoryName,
            customerName: t.customerName || "-",
            nominal: t.nominal,
            customerAdmin: t.customerAdmin,
            bankFee: t.bankFee,
            netProfit: t.netProfit,
            status: t.status,
            createdAt: t.createdAt,
          })),
        },
      };
    }

    case "detect_balance_discrepancy": {
      if (ctx.role !== Role.OWNER) {
        return {
          toolName,
          ok: false,
          data: { error: "Akses ditolak: deteksi selisih saldo & audit sistem hanya tersedia untuk Owner." },
        };
      }

      const scope = enforceBranchScope(ctx, branchArg, branches);
      if (!scope.allowed) {
        return { toolName, ok: false, data: { error: scope.deniedReason } };
      }

      const scan = await runAnomalyScan(ctx, scope.branchId);
      return {
        toolName,
        ok: true,
        data: {
          branchScope: scope.branchName,
          totalAlerts: scan.totalAlerts,
          alerts: scan.alerts,
        },
        structuredPayload: scan,
      };
    }

    case "generate_financial_report": {
      const scope = enforceBranchScope(ctx, branchArg, branches);
      if (!scope.allowed) {
        return { toolName, ok: false, data: { error: scope.deniedReason } };
      }

      const range = resolvePeriodRange(
        typeof rawArgs.period === "string" ? rawArgs.period : "this_month"
      );

      const [txs, prevTxs] = await Promise.all([
        DataService.getTransactions({
          branchId: scope.branchId,
          startDate: range.start.toISOString(),
          endDate: range.end.toISOString(),
          userId: ctx.role === Role.CASHIER ? ctx.userId : undefined,
        }),
        DataService.getTransactions({
          branchId: scope.branchId,
          startDate: range.prevStart.toISOString(),
          endDate: range.prevEnd.toISOString(),
          userId: ctx.role === Role.CASHIER ? ctx.userId : undefined,
        }),
      ]);

      const agg = aggregateTransactions(txs);
      const prevAgg = aggregateTransactions(prevTxs);
      const targetBranches =
        scope.branchId === "ALL" ? branches : branches.filter((b) => b.id === scope.branchId);

      const branchItems: AIReportBranchItem[] = targetBranches.map((b) => {
        const bTxs = txs.filter((t) => t.branchId === b.id);
        const bAgg = aggregateTransactions(bTxs);
        return {
          branchId: b.id,
          branchCode: b.code,
          branchName: b.name,
          cashBalance: b.currentCashBalance,
          bankBalance: b.currentBankBalance,
          totalBalance: b.currentCashBalance + b.currentBankBalance,
          transactionCount: bAgg.transactionCount,
          nominalTotal: bAgg.totalNominal,
          moneyIn: bAgg.totalMoneyIn,
          moneyOut: bAgg.totalMoneyOut,
          customerAdminTotal: bAgg.totalCustomerAdmin,
          bankFeeTotal: bAgg.totalBankFee,
          netProfitTotal: bAgg.totalNetProfit,
        };
      });

      const endingCashBalance = targetBranches.reduce((acc, b) => acc + b.currentCashBalance, 0);
      const endingBankBalance = targetBranches.reduce((acc, b) => acc + b.currentBankBalance, 0);
      const profitDelta = agg.totalNetProfit - prevAgg.totalNetProfit;
      const profitGrowthPercent =
        prevAgg.totalNetProfit > 0
          ? Number(((profitDelta / prevAgg.totalNetProfit) * 100).toFixed(1))
          : null;

      const reportPayload: AIReportPayload = {
        kind: "report",
        title: `Laporan Keuangan ${scope.branchName}`,
        branchScope: scope.branchName,
        periodLabel: range.label,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        generatedAt: new Date().toISOString(),
        summary: {
          ...agg,
          endingCashBalance,
          endingBankBalance,
          endingTotalBalance: endingCashBalance + endingBankBalance,
        },
        comparisonWithPrevious: {
          previousPeriodLabel: range.prevLabel,
          previousNetProfit: prevAgg.totalNetProfit,
          previousTransactionCount: prevAgg.transactionCount,
          profitDelta,
          profitGrowthPercent,
        },
        branches: branchItems,
        transactions: txs.slice(0, 200).map((t) => ({
          transactionNo: t.transactionNo,
          createdAt: t.createdAt,
          branchName: t.branchName || "-",
          cashierName: t.cashierName || "-",
          categoryName: t.categoryName,
          customerName: t.customerName || "-",
          nominal: t.nominal,
          customerAdmin: t.customerAdmin,
          bankFee: t.bankFee,
          netProfit: t.status === TransactionStatus.COMPLETED ? t.netProfit : 0,
          status: t.status,
        })),
      };

      return {
        toolName,
        ok: true,
        data: {
          title: reportPayload.title,
          periodLabel: reportPayload.periodLabel,
          summary: reportPayload.summary,
          comparisonWithPrevious: reportPayload.comparisonWithPrevious,
          branches: reportPayload.branches,
        },
        structuredPayload: reportPayload,
      };
    }

    case "prepare_transaction_draft": {
      const categories = await DataService.getCategories();
      const rawCat = typeof rawArgs.categoryQuery === "string" ? rawArgs.categoryQuery : "TF_BRI";
      const matchedCode =
        categories.find((c) => c.code.toLowerCase() === rawCat.toLowerCase())?.code ||
        matchCategoryCode(rawCat);
      const category = categories.find((c) => c.code === matchedCode) || categories[0];

      const nominal = Math.max(0, Number(rawArgs.nominal) || 0);
      if (nominal <= 0) {
        return {
          toolName,
          ok: false,
          data: { error: "Nominal transaksi harus lebih besar dari Rp0." },
        };
      }

      const customerAdmin =
        rawArgs.customerAdmin !== undefined && rawArgs.customerAdmin !== null
          ? Math.max(0, Number(rawArgs.customerAdmin))
          : category.defaultCustomerAdmin;

      const bankFee =
        rawArgs.bankFee !== undefined && rawArgs.bankFee !== null
          ? Math.max(0, Number(rawArgs.bankFee))
          : category.defaultBankFee;

      const calc = calculateTransactionFinancials({
        categoryCode: category.code,
        nominal,
        customerAdmin,
        bankFee,
      });

      // Target branch for cashier or first branch for owner preview
      const targetBranch =
        ctx.role === Role.CASHIER && ctx.branchId
          ? branches.find((b) => b.id === ctx.branchId) || branches[0]
          : branches[0];

      let sufficientBalance = true;
      let insufficiencyReason: string | undefined;

      if (targetBranch) {
        if (calc.cashFlowChange < 0 && targetBranch.currentCashBalance + calc.cashFlowChange < 0) {
          sufficientBalance = false;
          insufficiencyReason = `Saldo Kas Fisik ${targetBranch.name} (${formatRupiah(targetBranch.currentCashBalance)}) tidak mencukupi kebutuhan kas ${formatRupiah(Math.abs(calc.cashFlowChange))}.`;
        } else if (calc.bankFlowChange < 0 && targetBranch.currentBankBalance + calc.bankFlowChange < 0) {
          sufficientBalance = false;
          insufficiencyReason = `Saldo Rekening/EDC ${targetBranch.name} (${formatRupiah(targetBranch.currentBankBalance)}) tidak mencukupi kebutuhan transfer ${formatRupiah(Math.abs(calc.bankFlowChange))}.`;
        }
      }

      const params = new URLSearchParams({
        fromAi: "1",
        category: category.code,
        nominal: String(calc.nominal),
        admin: String(calc.customerAdmin),
        bankFee: String(calc.bankFee),
      });
      if (typeof rawArgs.customerName === "string" && rawArgs.customerName.trim()) {
        params.set("customerName", rawArgs.customerName.trim());
      }
      if (typeof rawArgs.paymentMethod === "string" && rawArgs.paymentMethod.trim()) {
        params.set("paymentMethod", rawArgs.paymentMethod.trim());
      }
      if (typeof rawArgs.notes === "string" && rawArgs.notes.trim()) {
        params.set("notes", rawArgs.notes.trim());
      }

      const draft: AITransactionDraftPayload = {
        kind: "transaction_draft",
        categoryCode: category.code,
        categoryName: category.name,
        branchId: targetBranch?.id || "",
        branchName: targetBranch?.name || "Cabang",
        nominal: calc.nominal,
        customerAdmin: calc.customerAdmin,
        bankFee: calc.bankFee,
        netProfit: calc.netProfit,
        cashFlowChange: calc.cashFlowChange,
        bankFlowChange: calc.bankFlowChange,
        customerName: typeof rawArgs.customerName === "string" ? rawArgs.customerName : undefined,
        paymentMethod: typeof rawArgs.paymentMethod === "string" ? rawArgs.paymentMethod : "TUNAI",
        notes: typeof rawArgs.notes === "string" ? rawArgs.notes : undefined,
        sufficientBalance,
        insufficiencyReason,
        formUrl:
          ctx.role === Role.OWNER
            ? `/owner/transactions`
            : `/cashier/transaction?${params.toString()}`,
      };

      return {
        toolName,
        ok: true,
        data: {
          ...draft,
          requiresUserConfirmation: true,
          note: "Draft siap. Minta konfirmasi eksplisit pengguna sebelum melanjutkan ke formulir transaksi.",
        },
        structuredPayload: draft,
      };
    }

    default:
      return {
        toolName,
        ok: false,
        data: { error: `Tool ${toolName} tidak dikenali oleh sistem.` },
      };
  }
}
