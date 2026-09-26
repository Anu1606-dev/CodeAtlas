import { Router } from "express";
import { Repo } from "../models/Repo.js";
import { Chunk } from "../models/Chunk.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { embedTexts } from "../services/embeddings.js";
import { generateGroundedAnswerStream } from "../services/llm.js";
import type { ChatCitation } from "@codeatlas/shared";

const router = Router();

const CITATIONS_MARKER = "\n<<<CITATIONS>>>\n";

router.post("/:repoId", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) {
    res.status(400).json({ error: "Missing question" });
    return;
  }

  try {
    const [queryEmbedding] = await embedTexts([question], "RETRIEVAL_QUERY");

    const matches = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 150,
          limit: 8,
          filter: { repoId: repo._id },
        },
      },
      { $project: { _id: 0, filePath: 1, startLine: 1, endLine: 1, symbolName: 1, content: 1 } },
    ]);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");

    if (matches.length === 0) {
      res.write("This repo doesn't seem to be indexed yet — try running indexing first.");
      res.write(`${CITATIONS_MARKER}${JSON.stringify([])}`);
      res.end();
      return;
    }

    const sources = matches.map((m, i) => ({
      index: i + 1,
      filePath: m.filePath as string,
      lines: `${m.startLine}-${m.endLine}`,
      symbolName: m.symbolName as string | undefined,
      content: m.content as string,
    }));

    let fullText = "";
    for await (const piece of generateGroundedAnswerStream(question, sources)) {
      fullText += piece;
      res.write(piece);
    }

    const citedIndices = new Set(Array.from(fullText.matchAll(/\[(\d+)\]/g), (m) => Number(m[1])));
    const citations: ChatCitation[] = sources
      .filter((s) => citedIndices.has(s.index))
      .map((s) => ({ index: s.index, filePath: s.filePath, lines: s.lines, symbolName: s.symbolName }));

    res.write(`${CITATIONS_MARKER}${JSON.stringify(citations)}`);
    res.end();
  } catch (err) {
    console.error("Chat failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate an answer" });
    } else {
      res.end();
    }
  }
});

export default router;