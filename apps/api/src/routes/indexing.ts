import { Router } from "express";
import { Repo } from "../models/Repo.js";
import { User } from "../models/User.js";
import { Chunk } from "../models/Chunk.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { fetchRepoSnapshot } from "../services/githubFetch.js";
import { chunkRepo, type CodeChunkResult } from "../services/chunker.js";
import { embedTexts } from "../services/embeddings.js";
import { runIndexJob } from "../services/indexer.js";
import { getIndexQueue } from "../queue/indexQueue.js";
import type {
  IndexPreviewResponse,
  IndexRunResponse,
  SearchTestResponse,
} from "@codeatlas/shared";

const router = Router();

function sampleEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}

router.post("/:repoId/preview", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const user = await User.findById(req.userId).select("+githubAccessToken");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const filter = typeof req.body?.filter === "string" ? req.body.filter.trim().toLowerCase() : "";

  let snapshot: Awaited<ReturnType<typeof fetchRepoSnapshot>> | null = null;

  try {
    snapshot = await fetchRepoSnapshot(repo.owner, repo.name, repo.defaultBranch, user.githubAccessToken);
    const chunks: CodeChunkResult[] = await chunkRepo(snapshot.rootDir);

    const matched = filter
      ? chunks.filter((c) => c.filePath.toLowerCase().includes(filter))
      : chunks;

    const sampled = sampleEvenly(matched, 8);

    const body: IndexPreviewResponse = {
      totalChunks: chunks.length,
      matchedChunks: matched.length,
      sample: sampled.map((c) => ({
        filePath: c.filePath,
        language: c.language,
        lines: `${c.startLine}-${c.endLine}`,
        symbolName: c.symbolName,
        preview: c.content.slice(0, 300),
      })),
    };

    res.json(body);
  } catch (err) {
    console.error("Indexing preview failed:", err);
    res.status(500).json({ error: "Failed to fetch or chunk repository" });
  } finally {
    await snapshot?.cleanup();
  }
});

router.post("/:repoId/run", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  try {
    const result = await runIndexJob(repo._id.toString());
    const body: IndexRunResponse = result;
    res.json(body);
  } catch (err) {
    console.error("Indexing run failed:", err);
    res.status(500).json({ error: "Failed to index repository" });
  }
});

router.post("/:repoId/enqueue", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const job = await getIndexQueue().add("reindex", { repoId: repo._id.toString() });
  res.status(202).json({ jobId: job.id, message: "Reindex job enqueued" });
});

router.post("/:repoId/search-test", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query) {
    res.status(400).json({ error: "Missing query" });
    return;
  }

  try {
    const [queryEmbedding] = await embedTexts([query], "RETRIEVAL_QUERY");

    const results = await Chunk.aggregate([
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
          language: 1,
          startLine: 1,
          endLine: 1,
          symbolName: 1,
          content: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    const body: SearchTestResponse = {
      query,
      results: results.map((r) => ({
        filePath: r.filePath,
        language: r.language,
        lines: `${r.startLine}-${r.endLine}`,
        symbolName: r.symbolName,
        content: r.content.slice(0, 400),
        score: r.score,
      })),
    };

    res.json(body);
  } catch (err) {
    console.error("Search test failed:", err);
    res.status(500).json({ error: "Search failed — check that the vector index exists and is Active" });
  }
});

router.get("/:repoId/chunks", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.repoId, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const filter = typeof req.query.filter === "string" ? req.query.filter.trim() : "";
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = 20;

  const query: Record<string, unknown> = { repoId: repo._id };
  if (filter) query.filePath = { $regex: filter, $options: "i" };

  const [chunks, total] = await Promise.all([
    Chunk.find(query).sort({ filePath: 1, startLine: 1 }).skip((page - 1) * pageSize).limit(pageSize),
    Chunk.countDocuments(query),
  ]);

  res.json({
    total,
    page,
    pageSize,
    chunks: chunks.map((c) => ({
      filePath: c.filePath,
      language: c.language,
      lines: `${c.startLine}-${c.endLine}`,
      symbolName: c.symbolName,
      content: c.content,
    })),
  });
});

export default router;