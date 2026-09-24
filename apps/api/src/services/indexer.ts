import { Repo } from "../models/Repo.js";
import { User } from "../models/User.js";
import { Chunk } from "../models/Chunk.js";
import { fetchRepoSnapshot } from "./githubFetch.js";
import { chunkRepo, type CodeChunkResult } from "./chunker.js";
import { embedTexts } from "./embeddings.js";

export interface IndexJobResult {
  chunksIndexed: number;
  tookMs: number;
}

export async function runIndexJob(repoId: string): Promise<IndexJobResult> {
  const repo = await Repo.findById(repoId);
  if (!repo) {
    throw new Error(`Repo ${repoId} not found`);
  }

  const user = await User.findById(repo.userId).select("+githubAccessToken");
  if (!user) {
    throw new Error(`User ${repo.userId} not found`);
  }

  const startedAt = Date.now();
  let snapshot: Awaited<ReturnType<typeof fetchRepoSnapshot>> | null = null;

  try {
    snapshot = await fetchRepoSnapshot(
      repo.owner,
      repo.name,
      repo.defaultBranch,
      user.githubAccessToken
    );
    const chunks: CodeChunkResult[] = await chunkRepo(snapshot.rootDir);

    if (chunks.length === 0) {
      throw new Error("No indexable code found in this repo");
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
        userId: repo.userId,
        filePath: c.filePath,
        language: c.language,
        startLine: c.startLine,
        endLine: c.endLine,
        symbolName: c.symbolName,
        content: c.content,
        embedding: embeddings[i],
      }))
    );

    const fileCount = new Set(chunks.map((c) => c.filePath)).size;
    repo.lastIndexedAt = new Date();
    repo.chunkCount = chunks.length;
    repo.fileCount = fileCount;
    await repo.save();

    return { chunksIndexed: chunks.length, tookMs: Date.now() - startedAt };
  } finally {
    await snapshot?.cleanup();
  }
}