/**
 * OWNERSHIP: Backend
 * Gateway model AI (Groq) + retry. Output AI selalu dikuatkan oleh
 * validateAIResponse di negotiation-state sebelum sampai ke user.
 * Lihat ARCHITECTURE.md section C.
 */
import Groq from "groq-sdk";
import type { NegotiationBranch, TokenUsageLog } from "@/types/groq";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// const GROQ_PRIMARY_MODEL = "llama-3.3-70b-versatile";
// const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";
const GROQ_PRIMARY_MODEL = "qwen/qwen3.6-27b";
const GROQ_FALLBACK_MODEL = "qwen/qwen3.8-27b";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
  return (error as { status?: number })?.status;
}

/**
 * Estimator fallback token (Task B): dipakai hanya jika respons API tidak
 * menyertakan objek `usage`. Metode: ~4 karakter per token, pendekatan umum
 * untuk teks Indonesia/Inggris pada tokenizer BPE (rata-rata kata 4-5 huruf).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Membersihkan output model reasoning (mis. Qwen 3) yang membungkus proses
 * berpikirnya di dalam tag <think>...</think>. Hanya teks balasan final yang
 * boleh sampai ke customer — analisa/reasoning tidak boleh ikut terkirim.
 * Blok tak tertutup (max_tokens habis saat reasoning) ikut dibuang.
 */
function stripThinkBlock(text: string): string {
  const withoutThink = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .trim();
  return withoutThink;
}

interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

function logTokenUsage(params: {
  model: string;
  branch: NegotiationBranch;
  usage: GroqUsage | null | undefined;
  promptText: string;
  completionText: string;
  latencyMs: number;
}): void {
  const { model, branch, usage, promptText, completionText, latencyMs } =
    params;

  let log: TokenUsageLog;
  if (
    usage &&
    typeof usage.prompt_tokens === "number" &&
    typeof usage.completion_tokens === "number" &&
    typeof usage.total_tokens === "number"
  ) {
    log = {
      timestamp: new Date().toISOString(),
      model,
      branch,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      source: "api_usage",
      latencyMs,
    };
  } else {
    const promptTokens = estimateTokens(promptText);
    const completionTokens = estimateTokens(completionText);
    log = {
      timestamp: new Date().toISOString(),
      model,
      branch,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      source: "estimated",
      latencyMs,
    };
  }

  console.log(`[AshirahBot] TOKEN_USAGE ${JSON.stringify(log)}`);
}

async function callGroq(
  modelName: string,
  systemPrompt: string,
  userMessage: string,
  branch: NegotiationBranch = "unknown",
): Promise<string> {
  // Model Qwen 3 di Groq adalah reasoning model (default effort "medium")
  // yang memakai token output untuk proses berpikir sebelum menjawab.
  // Soft switch teks "/no_think" TIDAK dihormati serving Groq — kontrol yang
  // benar adalah parameter API `reasoning_effort: "none"` (server-side),
  // yang mematikan reasoning generation sepenuhnya: hemat token & latensi.
  // Hanya untuk model Qwen agar parameter Llama tidak terpengaruh.
  const isReasoningModel = modelName.toLowerCase().includes("qwen");

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startedAt = Date.now();
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        model: modelName,
        temperature: 0.7,
        // Reasoning model (Qwen 3) memakai token untuk proses berpikir di
        // dalam output — 300 terlalu kecil, jawaban final bisa terpotong.
        max_tokens: 768,
        ...(isReasoningModel ? { reasoning_effort: "none" as const } : {}),
      });
      const latencyMs = Date.now() - startedAt;
      const rawText = completion.choices[0]?.message?.content || "";
      const text = stripThinkBlock(rawText);
      if (!text) {
        console.warn(
          `[AshirahBot] EMPTY RESPONSE after think-strip | model: ${modelName} | attempt: ${attempt} | rawLength: ${rawText.length} | startsWithThink: ${rawText.trimStart().startsWith("<think")} | hasClosingTag: ${rawText.toLowerCase().includes("</think>")}`,
        );
        throw new Error("Empty AI response after stripping reasoning block");
      }
      logTokenUsage({
        model: modelName,
        branch,
        usage: completion.usage,
        promptText: `${systemPrompt}\n${userMessage}`,
        completionText: text,
        latencyMs,
      });
      console.log(
        "[AshirahBot] Groq OK | model:",
        modelName,
        "| attempt:",
        attempt,
        "| length:",
        text.length,
      );
      return text;
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);

      if (status === 404) {
        console.error(
          `[AshirahBot] MODEL UNAVAILABLE (404) | model: ${modelName} — skipping retries, will try fallback`,
        );
        throw error;
      }

      if (status === 429) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[AshirahBot] RATE LIMITED (429) | model: ${modelName} | attempt ${attempt}/${MAX_RETRIES} | retry in ${delay}ms`,
        );
        if (attempt < MAX_RETRIES) await sleep(delay);
      } else {
        console.warn(
          `[AshirahBot] GROQ ERROR (${status ?? "unknown"}) | model: ${modelName} | attempt ${attempt}/${MAX_RETRIES}`,
        );
        if (attempt < MAX_RETRIES)
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError;
}

export async function generateNegotiationResponse(
  systemPrompt: string,
  userMessage: string,
  branch: NegotiationBranch = "unknown",
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  console.log(
    "[AshirahBot] Groq call | primary:",
    GROQ_PRIMARY_MODEL,
    "| fallback:",
    GROQ_FALLBACK_MODEL,
    "| key present:",
    !!apiKey,
  );

  try {
    return await callGroq(
      GROQ_PRIMARY_MODEL,
      systemPrompt,
      userMessage,
      branch,
    );
  } catch (primaryError) {
    const status = getErrorStatus(primaryError);
    if (status === 404) {
      console.warn(
        `[AshirahBot] Primary model ${GROQ_PRIMARY_MODEL} unavailable (404), trying fallback: ${GROQ_FALLBACK_MODEL}`,
      );
      try {
        return await callGroq(
          GROQ_FALLBACK_MODEL,
          systemPrompt,
          userMessage,
          branch,
        );
      } catch (fallbackError) {
        console.error(
          `[AshirahBot] Fallback model ${GROQ_FALLBACK_MODEL} also failed:`,
          fallbackError,
        );
        throw fallbackError;
      }
    }
    throw primaryError;
  }
}
