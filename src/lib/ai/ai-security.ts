import { Role } from "@prisma/client";
import { prisma } from "../db";
import { BranchData, DataService } from "../data-service";
import { AIUserContext } from "./ai-types";

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_REQUESTS_PER_DAY = 300;
const MAX_INPUT_LENGTH = 2000;

const memoryRateMap = new Map<string, number[]>();

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|system)\s+instructions?/i,
  /abaikan\s+(semua\s+)?instruksi\s+(sebelumnya|sistem)/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s+key|secret|password)/i,
  /tampilkan\s+(system\s+prompt|password|kata\s+sandi|token|secret|api\s*key)/i,
  /passwordhash|auth_secret|ai_api_key|database_url|brilink_session/i,
  /\b(drop|delete|truncate|alter|update)\s+(table|users|branches|transactions|balance_mutations)\b/i,
  /\bselect\s+\*\s+from\s+users\b/i,
];

const SENSITIVE_KEY_PATTERN = /(password|secret|token|apikey|api_key|hash|credential)/i;

/**
 * Strip control characters and clamp input length.
 */
export function sanitizePromptInput(raw: string): string {
  const cleaned = raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  return cleaned.slice(0, MAX_INPUT_LENGTH);
}

/**
 * Detect common prompt injection, credential exfiltration, or destructive SQL attempts.
 */
export function detectPromptInjection(input: string): { blocked: boolean; reason?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        reason:
          "Permintaan ditolak oleh kebijakan keamanan sistem: dilarang mengakses informasi sensitif atau menjalankan perintah sistem langsung.",
      };
    }
  }
  return { blocked: false };
}

/**
 * Recursively remove passwordHash, secrets, or tokens before passing context to any AI model.
 */
export function redactSensitiveData<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item)) as unknown as T;
  }
  const copy: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    copy[key] = redactSensitiveData(val);
  }
  return copy as T;
}

/**
 * Resolve natural branch references and enforce strict branch-level RBAC in the backend.
 */
export function enforceBranchScope(
  ctx: AIUserContext,
  requestedBranchQuery: string | undefined,
  branches: BranchData[]
): {
  allowed: boolean;
  branchId: string; // specific branch ID or "ALL"
  branchName: string;
  deniedReason?: string;
} {
  const query = (requestedBranchQuery || "").toLowerCase().trim();

  let requestedBranch: BranchData | undefined;
  if (query && query !== "all" && query !== "semua" && query !== "semua cabang") {
    requestedBranch = branches.find(
      (b) =>
        b.id.toLowerCase() === query ||
        b.code.toLowerCase() === query ||
        b.name.toLowerCase().includes(query) ||
        (query.includes("1") && b.code === "CABANG-01") ||
        (query.includes("satu") && b.code === "CABANG-01") ||
        (query.includes("hani") && b.code === "CABANG-01") ||
        (query.includes("pusat") && b.code === "CABANG-01") ||
        (query.includes("2") && b.code === "CABANG-02") ||
        (query.includes("dua") && b.code === "CABANG-02") ||
        (query.includes("rahmat") && b.code === "CABANG-02") ||
        (query.includes("berkah") && b.code === "CABANG-02") ||
        (query.includes("pasar") && b.code === "CABANG-02")
    );
  }

  // Enforce strict branch isolation for Cashier
  if (ctx.role === Role.CASHIER) {
    const ownBranch = branches.find(
      (b) => b.id === ctx.branchId || (ctx.branchCode && b.code === ctx.branchCode)
    );
    if (!ownBranch) {
      return {
        allowed: false,
        branchId: "",
        branchName: "",
        deniedReason: "Cabang tugas Anda tidak ditemukan. Silakan login ulang.",
      };
    }

    // If cashier explicitly asked about another branch (e.g. comparing or inspecting Cabang 2 while assigned to Cabang 1)
    if (requestedBranch && requestedBranch.id !== ownBranch.id) {
      return {
        allowed: false,
        branchId: ownBranch.id,
        branchName: ownBranch.name,
        deniedReason: `Akses dibatasi: sebagai Kasir ${ownBranch.name}, Anda tidak memiliki izin melihat data ${requestedBranch.name}.`,
      };
    }

    if (query === "all" || query === "semua" || query === "semua cabang" || query.includes("kedua cabang")) {
      return {
        allowed: false,
        branchId: ownBranch.id,
        branchName: ownBranch.name,
        deniedReason: `Akses dibatasi: akun Kasir hanya dapat mengakses laporan cabang ${ownBranch.name}.`,
      };
    }

    return {
      allowed: true,
      branchId: ownBranch.id,
      branchName: ownBranch.name,
    };
  }

  // OWNER can inspect any branch or ALL
  if (requestedBranch) {
    return {
      allowed: true,
      branchId: requestedBranch.id,
      branchName: requestedBranch.name,
    };
  }

  return {
    allowed: true,
    branchId: "ALL",
    branchName: branches.map((b) => b.name).join(" & ") || "Semua Cabang",
  };
}

/**
 * Per-user sliding-window and daily rate limiter backed by PostgreSQL AIUsageLog.
 */
export async function checkRateLimit(ctx: AIUserContext): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const now = Date.now();
  const windowStart = new Date(now - RATE_WINDOW_MS);
  const dayStart = new Date(now - 24 * 60 * 60 * 1000);

  if (await DataService.isDatabaseConnected()) {
    try {
      const [recentCount, dailyCount] = await Promise.all([
        prisma.aIUsageLog.count({
          where: {
            userId: ctx.userId,
            createdAt: { gte: windowStart },
            status: { not: "RATE_LIMITED" },
          },
        }),
        prisma.aIUsageLog.count({
          where: {
            userId: ctx.userId,
            createdAt: { gte: dayStart },
            status: { not: "RATE_LIMITED" },
          },
        }),
      ]);

      if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
        await logAIUsage(ctx, {
          provider: process.env.AI_PROVIDER || "gemini",
          model: process.env.AI_MODEL || "gemini-4-hydrogen",
          status: "RATE_LIMITED",
          errorMessage: `Exceeded ${MAX_REQUESTS_PER_WINDOW} requests per 10 minutes`,
        });
        return {
          allowed: false,
          reason: `Batas penggunaan sementara tercapai (maksimal ${MAX_REQUESTS_PER_WINDOW} permintaan per 10 menit). Silakan tunggu beberapa menit sebelum bertanya lagi.`,
        };
      }

      if (dailyCount >= MAX_REQUESTS_PER_DAY) {
        await logAIUsage(ctx, {
          provider: process.env.AI_PROVIDER || "gemini",
          model: process.env.AI_MODEL || "gemini-4-hydrogen",
          status: "RATE_LIMITED",
          errorMessage: `Exceeded ${MAX_REQUESTS_PER_DAY} daily requests`,
        });
        return {
          allowed: false,
          reason: `Batas harian penggunaan AI (${MAX_REQUESTS_PER_DAY} permintaan/hari) sudah tercapai.`,
        };
      }

      return { allowed: true };
    } catch (err) {
      console.warn("Rate limit DB query note:", err);
    }
  }

  // Fallback in-memory limiter
  const entries = (memoryRateMap.get(ctx.userId) || []).filter((ts) => ts > now - RATE_WINDOW_MS);
  if (entries.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      reason: `Batas penggunaan sementara tercapai (maksimal ${MAX_REQUESTS_PER_WINDOW} permintaan per 10 menit).`,
    };
  }
  entries.push(now);
  memoryRateMap.set(ctx.userId, entries);
  return { allowed: true };
}

export async function logAIUsage(
  ctx: AIUserContext,
  usage: {
    provider: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    status: "SUCCESS" | "FALLBACK" | "RATE_LIMITED" | "ERROR";
    errorMessage?: string;
  }
): Promise<void> {
  if (!(await DataService.isDatabaseConnected())) return;

  try {
    await prisma.aIUsageLog.create({
      data: {
        userId: ctx.userId,
        branchId: ctx.branchId || undefined,
        provider: usage.provider,
        model: usage.model,
        promptTokens: usage.promptTokens || 0,
        completionTokens: usage.completionTokens || 0,
        totalTokens: usage.totalTokens || 0,
        latencyMs: usage.latencyMs || 0,
        status: usage.status,
        errorMessage: usage.errorMessage,
      },
    });
  } catch (err) {
    console.warn("Failed to log AI usage:", err);
  }
}
