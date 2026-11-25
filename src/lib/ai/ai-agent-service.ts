import { Role } from "@prisma/client";
import { DataService } from "../data-service";
import { formatRupiah } from "../utils";
import {
  AIChatResponse,
  AIMessageItem,
  AIStructuredPayload,
  AITransactionDraftPayload,
  AIUserContext,
} from "./ai-types";
import {
  checkRateLimit,
  detectPromptInjection,
  logAIUsage,
  sanitizePromptInput,
} from "./ai-security";
import {
  appendChatMessage,
  createOrGetConversation,
  getConversationMessages,
} from "./ai-storage";
import { executeAITool } from "./ai-tools";
import { invokeExternalAI } from "./ai-provider";

function detectPeriodFromText(text: string): string | null {
  const q = text.toLowerCase();
  if (q.includes("kemarin")) return "yesterday";
  if (q.includes("hari ini") || q.includes("sekarang") || q.includes("harian")) return "today";
  if (q.includes("minggu ini") || q.includes("pekan ini") || q.includes("7 hari")) return "current_week";
  if (q.includes("bulan lalu") || q.includes("bulan kemarin") || q.includes("periode lalu")) return "last_month";
  if (q.includes("bulan ini") || q.includes("bulanan")) return "this_month";
  if (q.includes("tahun ini") || q.includes("tahunan")) return "this_year";
  return null;
}

function detectBranchFromText(text: string): string | undefined {
  const q = text.toLowerCase();
  if (
    q.includes("hani") ||
    q.includes("cabang 1") ||
    q.includes("cabang satu") ||
    q.includes("c1") ||
    q.includes("pusat")
  ) {
    return "Hani BRILink";
  }
  if (
    q.includes("rahmat") ||
    q.includes("berkah") ||
    q.includes("cabang 2") ||
    q.includes("cabang dua") ||
    q.includes("c2") ||
    q.includes("pasar")
  ) {
    return "Rahmat Berkah";
  }
  if (q.includes("semua cabang") || q.includes("kedua cabang") || q.includes("gabungan")) {
    return "ALL";
  }
  return undefined;
}

function parseIndonesianAmountToken(raw: string): number {
  const cleaned = raw.toLowerCase().trim();
  const match = cleaned.match(/(\d+(?:[.,]\d+)?)\s*(miliar|m|juta|jt|ribu|rb|k)?/);
  if (!match) return 0;

  let numStr = match[1];
  const unit = match[2] || "";

  if (unit) {
    // e.g. "1,5 juta" or "2.5 jt"
    numStr = numStr.replace(",", ".");
  } else {
    // e.g. "1.000.000" or "500.000"
    numStr = numStr.replace(/[.,]/g, "");
  }

  const base = parseFloat(numStr);
  if (isNaN(base)) return 0;

  if (unit === "miliar" || unit === "m") return Math.round(base * 1_000_000_000);
  if (unit === "juta" || unit === "jt") return Math.round(base * 1_000_000);
  if (unit === "ribu" || unit === "rb" || unit === "k") return Math.round(base * 1_000);
  return Math.round(base);
}

function parseTransactionInput(text: string): {
  isDraftRequest: boolean;
  categoryQuery: string;
  nominal: number;
  customerAdmin?: number;
  bankFee?: number;
} {
  const q = text.toLowerCase();
  const hasTxVerb =
    /\b(input|catat|buat|masukkan|bantu|tolong|mau|ingin|transaksi)\b/.test(q);
  const hasServiceWord =
    /\b(transfer|tf|tarik tunai|tarik|setor tunai|setor|token|pln|listrik|pulsa|kuota|top\s*up|topup|dana|ovo|gopay|shopee|bpjs|pdam)\b/.test(
      q
    );
  const hasAmountHint = /(\d+(?:[.,]\d+)?\s*(juta|jt|ribu|rb|k)?)/.test(q);

  if (!((hasTxVerb || q.includes("admin") || q.includes("potongan")) && hasServiceWord && hasAmountHint)) {
    return { isDraftRequest: false, categoryQuery: "TF_BRI", nominal: 0 };
  }

  const amountExpr = "(\\d+(?:[.,]\\d+)?\\s*(?:juta|jt|ribu|rb|k)?)";

  const adminMatch = q.match(
    new RegExp(`(?:biaya\\s+)?admin(?:\\s+customer|\\s+nasabah)?\\s*(?:nya|sebesar|:|=|rp)?\\s*${amountExpr}`)
  );
  const bankMatch = q.match(
    new RegExp(`(?:potongan|biaya|admin)\\s+bank\\s*(?:nya|sebesar|:|=|rp)?\\s*${amountExpr}`)
  );

  const customerAdmin = adminMatch ? parseIndonesianAmountToken(adminMatch[1]) : undefined;
  const bankFee = bankMatch ? parseIndonesianAmountToken(bankMatch[1]) : undefined;

  // Strip matched admin & bank clauses so main nominal doesn't get confused with fee values
  let stripped = q;
  if (adminMatch) stripped = stripped.replace(adminMatch[0], " ");
  if (bankMatch) stripped = stripped.replace(bankMatch[0], " ");

  const allMatches = Array.from(stripped.matchAll(new RegExp(amountExpr, "g")));
  let nominal = 0;
  for (const m of allMatches) {
    const val = parseIndonesianAmountToken(m[1]);
    if (val > nominal) nominal = val;
  }

  return {
    isDraftRequest: nominal > 0,
    categoryQuery: text,
    nominal,
    customerAdmin,
    bankFee,
  };
}

function isAffirmativeConfirmation(text: string): boolean {
  const normalized = text.toLowerCase().trim().replace(/[.!?]/g, "");
  return [
    "ya",
    "iya",
    "iya lanjut",
    "ya lanjut",
    "lanjut",
    "lanjutkan",
    "ok",
    "oke",
    "setuju",
    "boleh",
    "gas",
    "siap",
    "benar",
    "betul",
  ].includes(normalized);
}

function classifyFallbackIntent(text: string): string {
  const q = text.toLowerCase();
  if (/\b(laporan|rekap|ekspor|export|cetak|pdf|excel)\b/.test(q)) return "report";
  if (/\b(selisih|anomali|duplikat|ganda|aneh|audit|periksa saldo|cek masalah|alert|peringatan|pending)\b/.test(q)) {
    return "anomaly";
  }
  if (/\b(bandingkan|komparasi|mana yang paling|lebih tinggi|lebih untung|paling banyak|terbanyak|performa cabang)\b/.test(q)) {
    return "compare";
  }
  if (/\b(performa kasir|kinerja kasir|aktivitas kasir|semua kasir|kasir mana)\b/.test(q)) {
    return "cashier_perf";
  }
  if (/\b(riwayat|history|daftar transaksi|transaksi terbaru|tampilkan transaksi|cek transaksi)\b/.test(q)) {
    return "history";
  }
  if (/\b(saldo|kas fisik|uang di laci|rekening|edc|modal)\b/.test(q)) {
    return "balance";
  }
  if (
    /\b(keuntungan|laba|profit|cuan|uang masuk|uang keluar|pemasukan|pengeluaran|admin bank|potongan bank|admin customer|biaya admin|transaksi|omzet|omset|ringkasan)\b/.test(
      q
    )
  ) {
    return "summary";
  }
  if (/^(halo|hai|hi|pagi|siang|sore|malam|assalamualaikum|help|bantuan|menu)/.test(q)) {
    return "greeting";
  }
  return "unknown";
}

async function runDeterministicIndonesianAssistant(
  ctx: AIUserContext,
  userMessage: string,
  history: AIMessageItem[]
): Promise<{
  replyText: string;
  toolName: string | null;
  structuredPayload: AIStructuredPayload | null;
}> {
  // 1. Check if user is confirming a previous transaction_draft from chat memory
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  if (
    lastAssistant?.structuredData?.kind === "transaction_draft" &&
    isAffirmativeConfirmation(userMessage)
  ) {
    const prevDraft = lastAssistant.structuredData as AITransactionDraftPayload;
    return {
      replyText:
        ctx.role === Role.CASHIER
          ? `Baik, silakan klik tombol **"Buka Formulir Transaksi"** di kartu bawah untuk membuka formulir yang sudah terisi otomatis (${prevDraft.categoryName} senilai ${formatRupiah(prevDraft.nominal)}). Periksa kembali lalu klik tombol konfirmasi untuk menyimpan ke database.`
          : `Ringkasan draft (${prevDraft.categoryName} ${formatRupiah(prevDraft.nominal)}) siap. Sebagai catatan, hanya akun **Kasir** cabang terkait yang melakukan input final di formulir transaksi.`,
      toolName: "prepare_transaction_draft",
      structuredPayload: prevDraft,
    };
  }

  // 2. Check if user wants to draft/input a transaction
  const draftParsed = parseTransactionInput(userMessage);
  if (draftParsed.isDraftRequest) {
    const res = await executeAITool(ctx, "prepare_transaction_draft", {
      categoryQuery: draftParsed.categoryQuery,
      nominal: draftParsed.nominal,
      customerAdmin: draftParsed.customerAdmin,
      bankFee: draftParsed.bankFee,
    });

    if (!res.ok) {
      return {
        replyText: String(res.data.error || "Gagal menyiapkan draft transaksi."),
        toolName: "prepare_transaction_draft",
        structuredPayload: null,
      };
    }

    const draft = res.structuredPayload as AITransactionDraftPayload;
    const balanceWarn = !draft.sufficientBalance
      ? `\n\n⚠️ **Perhatian Saldo:** ${draft.insufficiencyReason}`
      : "";

    return {
      replyText: [
        `Berikut ringkasan transaksi yang saya siapkan untuk cabang **${draft.branchName}**:`,
        ``,
        `- **Jenis:** ${draft.categoryName}`,
        `- **Nominal:** ${formatRupiah(draft.nominal)}`,
        `- **Admin customer:** ${formatRupiah(draft.customerAdmin)}`,
        `- **Potongan bank:** ${formatRupiah(draft.bankFee)}`,
        `- **Keuntungan bersih:** **${formatRupiah(draft.netProfit)}**`,
        balanceWarn,
        ``,
        `Apakah Anda ingin melanjutkan ke formulir transaksi? Klik tombol pada kartu di bawah untuk mengisi formulir secara otomatis dan melakukan konfirmasi akhir.`,
      ]
        .filter(Boolean)
        .join("\n"),
      toolName: "prepare_transaction_draft",
      structuredPayload: draft,
    };
  }

  // 3. Classify intent & merge context memory for follow-ups ("Kalau Cabang 2?", "Bulan lalu?")
  let intent = classifyFallbackIntent(userMessage);
  let period = detectPeriodFromText(userMessage);
  let branch = detectBranchFromText(userMessage);

  const isFollowUp =
    intent === "unknown" ||
    /^(kalau|kalo|bagaimana dengan|gimana|terus|lalu|nah)\b/i.test(userMessage.trim());

  if (isFollowUp && (branch !== undefined || period !== null || intent === "unknown")) {
    const prevUsers = history.filter((m) => m.role === "user").reverse();
    for (const prev of prevUsers) {
      const prevIntent = classifyFallbackIntent(prev.content);
      if (prevIntent !== "unknown" && prevIntent !== "greeting") {
        if (intent === "unknown") intent = prevIntent;
        if (!period) period = detectPeriodFromText(prev.content);
        if (!branch && !detectBranchFromText(userMessage)) {
          branch = detectBranchFromText(prev.content);
        }
        break;
      }
    }
  }

  const effectivePeriod = period || (intent === "report" ? "this_month" : "today");

  // 4. Execute backend tool according to intent
  if (intent === "greeting") {
    const roleHint =
      ctx.role === Role.OWNER
        ? `Saya siap membantu memantau saldo **Hani BRILink** & **Rahmat Berkah**, menganalisis laba, mendeteksi selisih saldo, hingga membuat laporan keuangan siap export PDF/Excel.`
        : `Saya siap membantu memantau saldo & ringkasan transaksi cabang **${ctx.branchName}**, mengecek keuntungan Anda, serta menyiapkan draft input transaksi agar lebih cepat.`;
    return {
      replyText: `Halo **${ctx.name}**! Saya **BRILink AI Assistant**.\n\n${roleHint}\n\nSilakan pilih salah satu pertanyaan cepat atau ketik pertanyaan Anda secara langsung.`,
      toolName: null,
      structuredPayload: null,
    };
  }

  if (intent === "report") {
    const res = await executeAITool(ctx, "generate_financial_report", {
      period: effectivePeriod,
      branch,
    });
    if (!res.ok) {
      return {
        replyText: String(res.data.error),
        toolName: "generate_financial_report",
        structuredPayload: null,
      };
    }

    const rpt = res.structuredPayload!;
    if (rpt.kind === "report") {
      const s = rpt.summary;
      const cmp = rpt.comparisonWithPrevious;
      const deltaText =
        cmp.profitDelta >= 0
          ? `lebih tinggi ${formatRupiah(cmp.profitDelta)}`
          : `lebih rendah ${formatRupiah(Math.abs(cmp.profitDelta))}`;

      return {
        replyText: [
          `Berikut **${rpt.title}** untuk periode **${rpt.periodLabel}** berdasarkan data aktual database:`,
          ``,
          `- **Jumlah Transaksi Sukses:** ${s.transactionCount} transaksi (${s.reversedCount} dibatalkan)`,
          `- **Total Nominal Transaksi:** ${formatRupiah(s.totalNominal)}`,
          `- **Total Uang Masuk:** ${formatRupiah(s.totalMoneyIn)}`,
          `- **Total Uang Keluar:** ${formatRupiah(s.totalMoneyOut)}`,
          `- **Total Admin Customer:** ${formatRupiah(s.totalCustomerAdmin)}`,
          `- **Total Potongan Bank:** ${formatRupiah(s.totalBankFee)}`,
          `- **Keuntungan Bersih:** **${formatRupiah(s.totalNetProfit)}**`,
          `- **Saldo Akhir Gabungan:** ${formatRupiah(s.endingTotalBalance)} (Kas: ${formatRupiah(s.endingCashBalance)} | Bank: ${formatRupiah(s.endingBankBalance)})`,
          ``,
          `Dibandingkan **${cmp.previousPeriodLabel}** (${formatRupiah(cmp.previousNetProfit)}), keuntungan bersih periode ini ${deltaText}. Gunakan tombol **Export PDF**, **Export Excel**, atau **Cetak** pada kartu laporan di bawah.`,
        ].join("\n"),
        toolName: "generate_financial_report",
        structuredPayload: rpt,
      };
    }
  }

  if (intent === "anomaly") {
    const res = await executeAITool(ctx, "detect_balance_discrepancy", { branch });
    if (!res.ok) {
      return {
        replyText: String(res.data.error),
        toolName: "detect_balance_discrepancy",
        structuredPayload: null,
      };
    }
    const alerts = res.structuredPayload!;
    if (alerts.kind === "alerts") {
      if (alerts.totalAlerts === 0) {
        return {
          replyText: `Hasil pemeriksaan sistem pada **${String(res.data.branchScope)}**:\n\n✅ Tidak ditemukan selisih saldo kas/rekening, transaksi duplikat, maupun anomali pembukuan yang perlu diperhatikan saat ini.`,
          toolName: "detect_balance_discrepancy",
          structuredPayload: alerts,
        };
      }
      return {
        replyText: `Hasil pemindaian pembukuan pada **${String(res.data.branchScope)}** menemukan **${alerts.totalAlerts} indikasi** yang perlu diperiksa:\n\nSilakan tinjau detail indikasi pada daftar kartu peringatan di bawah.`,
        toolName: "detect_balance_discrepancy",
        structuredPayload: alerts,
      };
    }
  }

  if (intent === "compare") {
    const res = await executeAITool(ctx, "compare_branches", {
      period: period || "this_month",
    });
    if (!res.ok) {
      return {
        replyText: String(res.data.error),
        toolName: "compare_branches",
        structuredPayload: null,
      };
    }

    const list = res.data.branches as Array<{
      branchName: string;
      transactionCount: number;
      totalNetProfit: number;
      totalNominal: number;
      totalBalance: number;
    }>;
    const lines = list.map(
      (b) =>
        `- **${b.branchName}**: ${b.transactionCount} transaksi | Nominal ${formatRupiah(b.totalNominal)} | Laba Bersih **${formatRupiah(b.totalNetProfit)}** | Saldo ${formatRupiah(b.totalBalance)}`
    );
    const diff = Number(res.data.profitDifference || 0);
    const topName = String(res.data.topBranchName || "-");

    const leaderLine =
      diff > 0
        ? `\n\n🏆 **${topName}** menghasilkan keuntungan **${formatRupiah(diff)}** lebih tinggi pada periode **${res.data.periodLabel}**.`
        : `\n\n⚖️ Kedua cabang mencatat keuntungan bersih yang sama pada periode **${res.data.periodLabel}**.`;

    return {
      replyText: `Perbandingan performa cabang untuk periode **${res.data.periodLabel}**:\n\n${lines.join("\n")}${leaderLine}`,
      toolName: "compare_branches",
      structuredPayload: null,
    };
  }

  if (intent === "cashier_perf") {
    const res = await executeAITool(ctx, "get_cashier_performance", {
      period: period || "this_month",
      branch,
    });
    if (!res.ok) {
      return {
        replyText: String(res.data.error),
        toolName: "get_cashier_performance",
        structuredPayload: null,
      };
    }

    const cashiers = res.data.cashiers as Array<{
      name: string;
      username: string;
      branchName: string;
      transactionCount: number;
      totalNetProfit: number;
      totalNominal: number;
    }>;

    const lines = cashiers.map(
      (c) =>
        `- **${c.name}** (@${c.username} • ${c.branchName}): ${c.transactionCount} transaksi | Nominal ${formatRupiah(c.totalNominal)} | Laba Bersih **${formatRupiah(c.totalNetProfit)}**`
    );

    return {
      replyText: `Ringkasan performa kasir periode **${res.data.periodLabel}** (${res.data.branchScope}):\n\n${lines.join("\n") || "Belum ada data kasir."}`,
      toolName: "get_cashier_performance",
      structuredPayload: null,
    };
  }

  if (intent === "history") {
    const res = await executeAITool(ctx, "get_transaction_history", {
      period: period || "today",
      branch,
      limit: 10,
    });
    if (!res.ok) {
      return {
        replyText: String(res.data.error),
        toolName: "get_transaction_history",
        structuredPayload: null,
      };
    }

    const txs = res.data.transactions as Array<{
      transactionNo: string;
      branchName: string;
      categoryName: string;
      nominal: number;
      netProfit: number;
      status: string;
    }>;

    if (txs.length === 0) {
      return {
        replyText: `Belum ada transaksi tercatat pada **${res.data.branchScope}** untuk periode **${res.data.periodLabel}**.`,
        toolName: "get_transaction_history",
        structuredPayload: null,
      };
    }

    const lines = txs.map(
      (t) =>
        `- **${t.transactionNo}** (${t.branchName}) — ${t.categoryName}: ${formatRupiah(t.nominal)} | Laba: ${formatRupiah(t.netProfit)} [${t.status}]`
    );

    return {
      replyText: `Berikut ${txs.length} transaksi terbaru pada **${res.data.branchScope}** (${res.data.periodLabel}):\n\n${lines.join("\n")}`,
      toolName: "get_transaction_history",
      structuredPayload: null,
    };
  }

  if (intent === "balance") {
    const res = await executeAITool(ctx, "get_branch_balance", { branch });
    if (!res.ok) {
      return {
        replyText: String(res.data.error),
        toolName: "get_branch_balance",
        structuredPayload: null,
      };
    }

    const list = res.data.branches as Array<{
      branchName: string;
      branchCode: string;
      cashBalance: number;
      bankBalance: number;
      totalBalance: number;
    }>;

    const lines = list.map(
      (b) =>
        `- **${b.branchName}** (${b.branchCode}):\n  • Kas Fisik (Laci): **${formatRupiah(b.cashBalance)}**\n  • Saldo Rekening/EDC: **${formatRupiah(b.bankBalance)}**\n  • Total Saldo Cabang: **${formatRupiah(b.totalBalance)}**`
    );

    const footer =
      list.length > 1
        ? `\n\nTotal saldo gabungan seluruh cabang: **${formatRupiah(Number(res.data.combinedTotalBalance))}** (Kas: ${formatRupiah(Number(res.data.combinedCashBalance))} | Bank: ${formatRupiah(Number(res.data.combinedBankBalance))}).`
        : "";

    return {
      replyText: `Saldo aktual saat ini untuk **${res.data.scope}**:\n\n${lines.join("\n\n")}${footer}`,
      toolName: "get_branch_balance",
      structuredPayload: null,
    };
  }

  // Default: financial summary / profit / money flow
  if (intent === "summary" || branch !== undefined || period !== null) {
    const res = await executeAITool(ctx, "get_transaction_summary", {
      period: effectivePeriod,
      branch,
    });
    if (!res.ok) {
      return {
        replyText: String(res.data.error),
        toolName: "get_transaction_summary",
        structuredPayload: null,
      };
    }

    const d = res.data;
    const prevProfit = Number(d.previousNetProfit || 0);
    const delta = Number(d.profitDelta || 0);
    const cmpText =
      prevProfit > 0 || delta !== 0
        ? `\n- **Perbandingan (${d.previousPeriodLabel}):** ${delta >= 0 ? "+" : "-"}${formatRupiah(Math.abs(delta))} dibanding ${formatRupiah(prevProfit)}`
        : "";

    return {
      replyText: [
        `Ringkasan keuangan **${d.branchScope}** untuk periode **${d.periodLabel}**:`,
        ``,
        `- **Jumlah Transaksi Sukses:** ${d.transactionCount} transaksi`,
        `- **Total Nominal Transaksi:** ${formatRupiah(Number(d.totalNominal))}`,
        `- **Total Uang Masuk:** ${formatRupiah(Number(d.totalMoneyIn))}`,
        `- **Total Uang Keluar:** ${formatRupiah(Number(d.totalMoneyOut))}`,
        `- **Total Admin Customer:** ${formatRupiah(Number(d.totalCustomerAdmin))}`,
        `- **Total Potongan Bank:** ${formatRupiah(Number(d.totalBankFee))}`,
        `- **Keuntungan Bersih:** **${formatRupiah(Number(d.totalNetProfit))}**${cmpText}`,
      ].join("\n"),
      toolName: "get_transaction_summary",
      structuredPayload: null,
    };
  }

  // Fallback gentle prompt guide
  return {
    replyText: `Maaf, saya belum menangkap pertanyaan spesifik Anda. Anda bisa menanyakan contohnya:\n- *"Berapa saldo Hani BRILink sekarang?"*\n- *"Berapa keuntungan bersih bulan ini?"*\n- *"Buatkan laporan keuangan bulan ini"*\n- *"Saya mau input transfer 1 juta, admin 10 ribu dan potongan bank 5 ribu"*`,
    toolName: null,
    structuredPayload: null,
  };
}

export async function processAIChatMessage(
  ctx: AIUserContext,
  rawMessage: string,
  conversationIdInput?: string
): Promise<AIChatResponse> {
  const startMs = Date.now();
  const sanitized = sanitizePromptInput(rawMessage);
  if (!sanitized) {
    throw new Error("Pesan tidak boleh kosong.");
  }

  // 1. Prompt injection & policy defense
  const injection = detectPromptInjection(sanitized);
  if (injection.blocked) {
    await DataService.logAudit({
      userId: ctx.userId,
      userName: ctx.name,
      branchId: ctx.branchId,
      action: "AI_SECURITY_BLOCK",
      resource: "AIAgent",
      details: `Memblokir permintaan AI berisiko oleh ${ctx.username}: "${sanitized.slice(0, 120)}"`,
    });
    throw new Error(injection.reason || "Permintaan ditolak oleh kebijakan keamanan.");
  }

  // 2. Rate limiting check
  const rate = await checkRateLimit(ctx);
  if (!rate.allowed) {
    throw new Error(rate.reason || "Terlalu banyak permintaan ke AI Assistant.");
  }

  // 3. Conversation memory retrieval
  const conv = await createOrGetConversation(ctx, conversationIdInput, sanitized);
  const history = await getConversationMessages(ctx, conv.id);

  // Save user prompt first
  const userMsg = await appendChatMessage({
    conversationId: conv.id,
    role: "user",
    content: sanitized,
  });

  // 4. Execute External AI Provider (if API Key available) or Deterministic DB Assistant Fallback
  let replyText = "";
  let toolName: string | null = null;
  let structuredPayload: AIStructuredPayload | null = null;
  let providerUsed = "brilink-deterministic";
  let modelUsed = "db-tool-router-v1";
  let fallbackUsed = false;
  let totalTokens = 0;

  try {
    const externalResult = await invokeExternalAI(ctx, sanitized, history);
    if (externalResult) {
      replyText = externalResult.replyText;
      toolName = externalResult.toolName;
      structuredPayload = externalResult.structuredPayload;
      providerUsed = externalResult.provider;
      modelUsed = externalResult.model;
      totalTokens = externalResult.totalTokens;

      await logAIUsage(ctx, {
        provider: externalResult.provider,
        model: externalResult.model,
        promptTokens: externalResult.promptTokens,
        completionTokens: externalResult.completionTokens,
        totalTokens: externalResult.totalTokens,
        latencyMs: Date.now() - startMs,
        status: "SUCCESS",
      });
    } else {
      const fb = await runDeterministicIndonesianAssistant(ctx, sanitized, history);
      replyText = fb.replyText;
      toolName = fb.toolName;
      structuredPayload = fb.structuredPayload;
      fallbackUsed = true;

      await logAIUsage(ctx, {
        provider: providerUsed,
        model: modelUsed,
        latencyMs: Date.now() - startMs,
        status: "FALLBACK",
      });
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "External AI provider error";
    console.warn("External AI failed, falling back to deterministic assistant:", errMsg);

    const fb = await runDeterministicIndonesianAssistant(ctx, sanitized, history);
    replyText = fb.replyText;
    toolName = fb.toolName;
    structuredPayload = fb.structuredPayload;
    fallbackUsed = true;

    await logAIUsage(ctx, {
      provider: process.env.AI_PROVIDER || "gemini",
      model: process.env.AI_MODEL || "gemini-4-hydrogen",
      latencyMs: Date.now() - startMs,
      status: "FALLBACK",
      errorMessage: errMsg.slice(0, 300),
    });
  }

  // 5. Save assistant message with structured payload
  const assistantMsg = await appendChatMessage({
    conversationId: conv.id,
    role: "assistant",
    content: replyText,
    toolName,
    structuredData: structuredPayload,
    tokensUsed: totalTokens,
  });

  return {
    conversationId: conv.id,
    userMessage: userMsg,
    assistantMessage: assistantMsg,
    providerUsed,
    modelUsed,
    fallbackUsed,
  };
}
