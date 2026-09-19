import { Router } from "express";
import { Repo } from "../models/Repo.js";
import { User } from "../models/User.js";
import { Chunk } from "../models/Chunk.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { fetchRepoSnapshot } from "../services/githubFetch.js";
import { chunkRepo, type CodeChunkResult } from "../services/chunker.js";
import { embedTexts } from "../services/embeddings.js";
import type { IndexPreviewResponse, IndexRunResponse } from "@codeatlas/shared";

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

  const user = await User.findById(req.userId).select("+githubAccessToken");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const startedAt = Date.now();
  let snapshot: Awaited<ReturnType<typeof fetchRepoSnapshot>> | null = null;

  try {
    snapshot = await fetchRepoSnapshot(repo.owner, repo.name, repo.defaultBranch, user.githubAccessToken);
    const chunks: CodeChunkResult[] = await chunkRepo(snapshot.rootDir);

    if (chunks.length === 0) {
      res.status(400).json({ error: "No indexable code found in this repo" });
      return;
    }

    const embeddings = await embedTexts(
      chunks.map((c) => c.content),
      "RETRIEVAL_DOCUMENT"
    );

    if (embeddings.length !== chunks.length) {
      throw new Error(`Embedding count mismatch: got ${embeddings.length} for ${chunks.length} chunks`);
    }

    await Chunk.deleteMany({ repoId: repo._id });

    await Chunk.insertMany(
      chunks.map((c, i) => ({
        repoId: repo._id,
        userId: req.userId,
        filePath: c.filePath,
        language: c.language,
        startLine: c.startLine,
        endLine: c.endLine,
        symbolName: c.symbolName,
        content: c.content,
        embedding: embeddings[i],
      }))
    );

    repo.lastIndexedAt = new Date();
    repo.chunkCount = chunks.length;
    await repo.save();

    const body: IndexRunResponse = {
      chunksIndexed: chunks.length,
      tookMs: Date.now() - startedAt,
    };

    res.json(body);
  } catch (err) {
    console.error("Indexing run failed:", err);
    res.status(500).json({ error: "Failed to index repository" });
  } finally {
    await snapshot?.cleanup();
  }
});

export default router;