import { GoogleGenAI } from "@google/genai";

const CHAT_MODEL = "gemini-2.5-flash";

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

const SYSTEM_INSTRUCTION = `You are CodeAtlas, an assistant that answers questions about a specific codebase using only the numbered source excerpts provided in each request.

Rules:
- Only use information found in the provided sources. Never invent function names, file paths, or behavior that isn't shown.
- When you state something the sources support, reference it inline using its number in square brackets, e.g. [1] or [2][3].
- If the sources don't contain enough information to answer confidently, say so plainly rather than guessing.
- Be concise and technical. Assume the reader is a developer already familiar with this codebase.`;

interface SourceForPrompt {
  index: number;
  filePath: string;
  lines: string;
  symbolName?: string;
  content: string;
}

export async function generateGroundedAnswer(
  question: string,
  sources: SourceForPrompt[]
): Promise<string> {
  const ai = getClient();

  const sourcesBlock = sources
    .map(
      (s) =>
        `[${s.index}] ${s.filePath} (lines ${s.lines})${s.symbolName ? ` — ${s.symbolName}` : ""}\n\`\`\`\n${s.content}\n\`\`\``
    )
    .join("\n\n");

  const prompt = `Sources:\n\n${sourcesBlock}\n\nQuestion: ${question}`;

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });

  return response.text ?? "";
}