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

export interface SourceForPrompt {
  index: number;
  filePath: string;
  lines: string;
  symbolName?: string;
  content: string;
}

export interface HistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export async function* generateGroundedAnswerStream(
  question: string,
  sources: SourceForPrompt[],
  history: HistoryTurn[] = []
): AsyncGenerator<string> {
  const ai = getClient();
  const sourcesBlock = sources
    .map((s) => `[${s.index}] ${s.filePath} (lines ${s.lines})${s.symbolName ? ` — ${s.symbolName}` : ""}\n\`\`\`\n${s.content}\n\`\`\``)
    .join("\n\n");
  const currentTurnText = `Sources:\n\n${sourcesBlock}\n\nQuestion: ${question}`;

  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: currentTurnText }] },
  ];

  let hasYielded = false;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContentStream({
        model: CHAT_MODEL,
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.2 },
      });

      for await (const chunk of response) {
        if (chunk.text) {
          hasYielded = true;
          yield chunk.text;
        }
      }
      return;
    } catch (err) {
      const status = getErrorStatus(err);
      const canRetry = (status === 429 || status === 503) && !hasYielded && attempt < MAX_RETRIES;

      if (!canRetry) {
        // If we already sent some real content, end gracefully rather than
        // corrupt the stream with a duplicate retry. Only throw (triggering
        // a clean error response) if literally nothing was sent yet.
        if (hasYielded) return;
        throw err;
      }

      const backoffMs = 1500 * attempt;
      console.warn(`Gemini stream failed before any output (status ${status}), retrying in ${backoffMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(backoffMs);
    }
  }
}