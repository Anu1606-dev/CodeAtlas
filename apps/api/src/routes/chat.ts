import { Router } from "express";
import { Repo } from "../models/Repo.js";
import { Chunk } from "../models/Chunk.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { embedTexts } from "../services/embeddings.js";
import { generateGroundedAnswer } from "../services/llm.js";
import type { ChatResponse, ChatCitation } from "@codeatlas/shared";

const router = Router();

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
      {
        $project: {
          _id: 0,
          filePath: 1,
          startLine: 1,
          endLine: 1,
          symbolName: 1,
          content: 1,
        },
      },
    ]);

    if (matches.length === 0) {
      const body: ChatResponse = {
        answer: "This repo doesn't seem to be indexed yet — try running indexing first.",
        citations: [],
      };
      res.json(body);
      return;
    }

    const sources = matches.map((m, i) => ({
      index: i + 1,
      filePath: m.filePath as string,
      lines: `${m.startLine}-${m.endLine}`,
      symbolName: m.symbolName as string | undefined,
      content: m.content as string,
    }));

    const answer = await generateGroundedAnswer(question, sources);

    const citations: ChatCitation[] = sources.map((s) => ({
      index: s.index,
      filePath: s.filePath,
      lines: s.lines,
      symbolName: s.symbolName,
    }));

    const body: ChatResponse = { answer, citations };
    res.json(body);
  } catch (err) {
    console.error("Chat failed:", err);
    res.status(500).json({ error: "Failed to generate an answer" });
  }
});

export default router;