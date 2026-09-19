import { Router } from "express";
import { Repo } from "../models/Repo.js";
import { User } from "../models/User.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { fetchRepoSnapshot } from "../services/githubFetch.js";
import { chunkRepo, type CodeChunkResult } from "../services/chunker.js";
import type { IndexPreviewResponse } from "@codeatlas/shared";

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

  let snapshot: Awaited<ReturnType<typeof fetchRepoSnapshot>> | null = null;

  try {
    snapshot = await fetchRepoSnapshot(repo.owner, repo.name, repo.defaultBranch, user.githubAccessToken);
    const chunks: CodeChunkResult[] = await chunkRepo(snapshot.rootDir);
    const sampled = sampleEvenly(chunks, 8);

    const body: IndexPreviewResponse = {
      totalChunks: chunks.length,
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

export default router;