import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 10;
const MAX_CHARS_PER_CHUNK = 8000;

// Free tier caps total tokens processed per minute (~30k) across ALL
// requests combined, not per request. We track usage in a rolling window
// and pause before a batch would exceed it, rather than just shrinking
// individual request sizes (which doesn't prevent cumulative overage).
const TPM_BUDGET = 25000; // margin below the documented 30k cap
const MAX_RETRIES = 3;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rough heuristic, not exact tokenization. Code tokenizes less efficiently
// than plain English, so this deliberately overestimates a bit rather than
// underestimating and getting caught out again.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

let bucketStartMs = Date.now();
let tokensUsedInBucket = 0;

async function waitForTokenBudget(tokensNeeded: number): Promise<void> {
  const now = Date.now();
  if (now - bucketStartMs > 60_000) {
    bucketStartMs = now;
    tokensUsedInBucket = 0;
  }

  if (tokensUsedInBucket + tokensNeeded > TPM_BUDGET) {
    const waitMs = 60_000 - (now - bucketStartMs) + 500;
    console.log(`Approaching Gemini's per-minute token budget, pausing ${(waitMs / 1000).toFixed(1)}s...`);
    await sleep(Math.max(waitMs, 0));
    bucketStartMs = Date.now();
    tokensUsedInBucket = 0;
  }

  tokensUsedInBucket += tokensNeeded;
}

function getErrorStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "status" in err) {
    return (err as { status?: number }).status;
  }
  return undefined;
}

export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

async function embedBatchWithRetry(
  ai: GoogleGenAI,
  batch: string[],
  taskType: EmbeddingTaskType,
  attempt = 1
): Promise<number[][]> {
  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
    });
    return (response.embeddings ?? []).map((e) => e.values ?? []);
  } catch (err) {
    if (getErrorStatus(err) === 429 && attempt < MAX_RETRIES) {
      const backoffMs = 20_000 * attempt;
      console.warn(`Rate limited by Gemini, retrying in ${backoffMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      return embedBatchWithRetry(ai, batch, taskType, attempt + 1);
    }
    throw err;
  }
}

export async function embedTexts(
  texts: string[],
  taskType: EmbeddingTaskType
): Promise<number[][]> {
  const ai = getClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, MAX_CHARS_PER_CHUNK));
    const batchTokens = batch.reduce((sum, t) => sum + estimateTokens(t), 0);

    await waitForTokenBudget(batchTokens);

    const embeddings = await embedBatchWithRetry(ai, batch, taskType);
    results.push(...embeddings);

    console.log(`Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks`);
  }

  return results;
}