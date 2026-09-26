import { GoogleGenAI } from "@google/genai";

const CHAT_MODEL = "gemini-3.6-flash";
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

function getErrorStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "status" in err) {
    return (err as { status?: number }).status;
  }
  return undefined;
}

const SYSTEM_INSTRUCTION = `You are CodeAtlas, an assistant that answers questions about a specific codebase using only the numbered source excerpts provided in each request.

Rules:
- Only use information found in the provided sources. Never invent function names, file paths, or behavior that isn't shown.
- When you state something the sources support, reference it inline using its number in square brackets, e.g. [1] or [2][3].
- When showing an actual code snippet from the sources, wrap it in a fenced code block with a language tag, e.g. \`\`\`javascript ... \`\`\`, so it renders with proper syntax highlighting.
- If the sources don't contain enough information to answer confidently, say so plainly rather than guessing.
- Be concise and technical. Assume the reader is a developer already familiar with this codebase.`;

interface SourceForPrompt {
  index: number;
  filePath: string;
  lines: string;
  symbolName?: string;
  content: string;
}

async function generateWithRetry(ai: GoogleGenAI, prompt: string, attempt = 1): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.2 },
    });
    return response.text ?? "";
  } catch (err) {
    const status = getErrorStatus(err);
    const isRetryable = status === 429 || status === 503;
    if (isRetryable && attempt < MAX_RETRIES) {
      const backoffMs = 2000 * 2 ** (attempt - 1); // 2s, 4s, 8s
      console.warn(`Gemini request failed (status ${status}), retrying in ${backoffMs / 1000}s`);
      await sleep(backoffMs);
      return generateWithRetry(ai, prompt, attempt + 1);
    }
    throw err;
  }
}

export async function generateGroundedAnswer(question: string, sources: SourceForPrompt[]): Promise<string> {
  const ai = getClient();
  const sourcesBlock = sources
    .map((s) => `[${s.index}] ${s.filePath} (lines ${s.lines})${s.symbolName ? ` — ${s.symbolName}` : ""}\n\`\`\`\n${s.content}\n\`\`\``)
    .join("\n\n");
  const prompt = `Sources:\n\n${sourcesBlock}\n\nQuestion: ${question}`;
  return generateWithRetry(ai, prompt);
}