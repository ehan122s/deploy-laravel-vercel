import { GoogleGenAI, Interactions } from "@google/genai";
import { Role } from "@prisma/client";
import { AIStructuredPayload, AIMessageItem, AIUserContext } from "./ai-types";
import { AIToolDefinition, executeAITool, getToolDefinitions } from "./ai-tools";
import { redactSensitiveData } from "./ai-security";

const AI_TIMEOUT_MS = 25_000;
const MAX_TOOL_TURNS = 4;

export interface AIProviderResult {
  replyText: string;
  toolName: string | null;
  structuredPayload: AIStructuredPayload | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

function buildSystemInstruction(ctx: AIUserContext): string {
  const todayWib = new Date(Date.now() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const roleRules =
    ctx.role === Role.OWNER
      ? `Pengguna saat ini adalah OWNER (${ctx.name}). Owner memiliki akses penuh untuk memantau dan membandingkan kedua cabang: "Hani BRILink" (CABANG-01) dan "Rahmat Berkah" (CABANG-02).`
      : `Pengguna saat ini adalah KASIR (${ctx.name}) yang bertugas HANYA di cabang "${ctx.branchName}". Kasir dilarang keras mengakses saldo, laporan, atau transaksi cabang lain maupun fitur khusus Owner.`;

  return [
    `Anda adalah "BRILink AI Assistant", asisten keuangan dan pembukuan resmi untuk BRILink Management System.`,
    `Tanggal hari ini (WIB): ${todayWib}.`,
    roleRules,
    ``,
    `ATURAN WAJIB:`,
    `1. Jawablah dalam Bahasa Indonesia yang ramah, profesional, jelas, dan mudah dipahami.`,
    `2. JANGAN PERNAH mengarang angka transaksi, saldo, admin, atau laba. Selalu panggil tools backend terlebih dahulu untuk mendapatkan data aktual dari database.`,
    `3. Jika tool mengembalikan error atau pembatasan akses, sampaikan batasannya dengan sopan tanpa mencoba mengakali atau membocorkan informasi.`,
    `4. Format angka mata uang dengan rapi dalam Rupiah Indonesia (contoh: Rp1.000.000).`,
    `5. Jangan pernah mengubah saldo, menghapus transaksi, atau menyimpan transaksi langsung. Untuk bantuan input transaksi, selalu gunakan tool prepare_transaction_draft lalu minta konfirmasi eksplisit pengguna.`,
    `6. Untuk laporan keuangan lengkap, panggil generate_financial_report agar antarmuka menampilkan kartu laporan siap export PDF/Excel/Cetak.`,
    `7. Untuk deteksi selisih saldo atau anomali, gunakan bahasa indikasi yang objektif ("Indikasi untuk diperiksa...") dan jangan pernah menuduh kecurangan.`,
  ].join("\n");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function runGeminiProvider(
  apiKey: string,
  model: string,
  ctx: AIUserContext,
  userMessage: string,
  history: AIMessageItem[],
  tools: AIToolDefinition[]
): Promise<AIProviderResult> {
  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(ctx);

  const sdkTools = tools.map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const steps: Interactions.Step[] = [];
  for (const h of history.slice(-10)) {
    if (h.role === "user") {
      steps.push({
        type: "user_input",
        content: [{ type: "text", text: h.content }],
      });
    } else {
      steps.push({
        type: "model_output",
        content: [{ type: "text", text: h.content }],
      });
    }
  }

  steps.push({
    type: "user_input",
    content: [{ type: "text", text: userMessage }],
  });

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let lastToolName: string | null = null;
  let lastStructuredPayload: AIStructuredPayload | null = null;
  let finalReply = "";

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const response = (await withTimeout(
      ai.interactions.create({
        model,
        input: steps,
        system_instruction: systemInstruction,
        tools: sdkTools,
        store: false,
      }),
      AI_TIMEOUT_MS
    )) as Interactions.Interaction;

    totalPromptTokens += response.usage?.total_input_tokens || 0;
    totalCompletionTokens += response.usage?.total_output_tokens || 0;

    if (response.steps && response.steps.length > 0) {
      steps.push(...response.steps);
    }

    const functionCalls = (response.steps || []).filter(
      (s): s is Interactions.FunctionCallStep => s.type === "function_call"
    );

    if (functionCalls.length === 0) {
      finalReply = response.output_text?.trim() || "";
      if (!finalReply && response.steps) {
        for (const s of response.steps) {
          if (s.type === "model_output" && s.content) {
            const texts = s.content
              .filter((c): c is Interactions.TextContent => c.type === "text" && Boolean(c.text))
              .map((c) => c.text);
            if (texts.length > 0) finalReply += texts.join("\n");
          }
        }
      }
      break;
    }

    for (const fc of functionCalls) {
      const args = (fc.arguments || {}) as Record<string, unknown>;
      const toolResult = await executeAITool(ctx, fc.name, args);
      lastToolName = fc.name;
      if (toolResult.structuredPayload) {
        lastStructuredPayload = toolResult.structuredPayload;
      }

      const sanitizedResult = redactSensitiveData(toolResult.data);
      steps.push({
        type: "function_result",
        name: fc.name,
        call_id: fc.id,
        is_error: !toolResult.ok,
        result: JSON.stringify(sanitizedResult),
      });
    }
  }

  return {
    replyText: finalReply || "Maaf, saya tidak menerima respons teks dari model AI.",
    toolName: lastToolName,
    structuredPayload: lastStructuredPayload,
    provider: "gemini",
    model,
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    totalTokens: totalPromptTokens + totalCompletionTokens,
  };
}

async function runOpenAICompatibleProvider(
  apiKey: string,
  model: string,
  ctx: AIUserContext,
  userMessage: string,
  history: AIMessageItem[],
  tools: AIToolDefinition[]
): Promise<AIProviderResult> {
  const systemInstruction = buildSystemInstruction(ctx);
  const endpoint =
    process.env.AI_BASE_URL?.replace(/\/$/, "") || "https://api.openai.com/v1";

  const openAITools = tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const messages: Record<string, unknown>[] = [
    { role: "system", content: systemInstruction },
    ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];

  let promptTokens = 0;
  let completionTokens = 0;
  let lastToolName: string | null = null;
  let lastStructuredPayload: AIStructuredPayload | null = null;
  let finalReply = "";

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    // OpenRouter requires HTTP-Referer and X-Title headers
    if (endpoint.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = process.env.NEXTAUTH_URL || "https://brilink-eight.vercel.app";
      headers["X-Title"] = "BRILink Management System";
    }

    const res = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        tools: openAITools,
        tool_choice: "auto",
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI-compatible API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const payload = await res.json();
    promptTokens += payload.usage?.prompt_tokens || 0;
    completionTokens += payload.usage?.completion_tokens || 0;

    const choice = payload.choices?.[0]?.message;
    if (!choice) {
      throw new Error("Empty response from AI provider.");
    }

    messages.push(choice);

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      finalReply = (choice.content || "").trim();
      break;
    }

    for (const tc of choice.tool_calls) {
      const fnName = tc.function?.name || "";
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(tc.function?.arguments || "{}");
      } catch {
        parsedArgs = {};
      }

      const toolResult = await executeAITool(ctx, fnName, parsedArgs);
      lastToolName = fnName;
      if (toolResult.structuredPayload) {
        lastStructuredPayload = toolResult.structuredPayload;
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(redactSensitiveData(toolResult.data)),
      });
    }
  }

  return {
    replyText: finalReply || "Maaf, saya tidak menerima respons teks dari model AI.",
    toolName: lastToolName,
    structuredPayload: lastStructuredPayload,
    provider: "openai",
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

export async function invokeExternalAI(
  ctx: AIUserContext,
  userMessage: string,
  history: AIMessageItem[]
): Promise<AIProviderResult | null> {
  const apiKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return null;
  }

  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();
  const tools = getToolDefinitions(ctx.role);

  if (provider === "openai" || provider === "openai-compatible") {
    const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
    return runOpenAICompatibleProvider(apiKey, model, ctx, userMessage, history, tools);
  }

  // Default: Gemini official Interactions API (never use deprecated 1.5/2.0/2.5 models)
  const rawModel = process.env.AI_MODEL?.trim() || "gemini-4-hydrogen";
  const safeModel = /^gemini-(1\.5|2\.0|2\.5)/i.test(rawModel)
    ? "gemini-4-hydrogen"
    : rawModel;

  return runGeminiProvider(apiKey, safeModel, ctx, userMessage, history, tools);
}
