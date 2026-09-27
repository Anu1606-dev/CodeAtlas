import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../src/db.js";
import { Chunk } from "../src/models/Chunk.js";
import { Repo } from "../src/models/Repo.js";
import { embedTexts } from "../src/services/embeddings.js";
import { evalCases } from "./cases.js";

const TOP_K = 8;

async function main() {
  const repoIdArg = process.argv[2];
  if (!repoIdArg) {
    console.error("Usage: pnpm eval <repoId>");
    console.error("Find a repo's _id in Compass (repos collection) or via GET /api/repos.");
    process.exit(1);
  }

  await connectDB();

  const repo = await Repo.findById(repoIdArg);
  if (!repo) {
    console.error(`No repo found with id ${repoIdArg}`);
    process.exit(1);
  }

  console.log(`Running ${evalCases.length} eval cases against ${repo.fullName}\n`);

  let hits = 0;
  let reciprocalRankSum = 0;

  for (const testCase of evalCases) {
    const [queryEmbedding] = await embedTexts([testCase.query], "RETRIEVAL_QUERY");

    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 150,
          limit: TOP_K,
          filter: { repoId: repo._id },
        },
      },
      { $project: { filePath: 1 } },
    ]);

    const rank = results.findIndex((r) =>
      (r.filePath as string).toLowerCase().includes(testCase.expectedFilePathIncludes.toLowerCase())
    );
    const hit = rank !== -1;
    if (hit) {
      hits++;
      reciprocalRankSum += 1 / (rank + 1);
    }

    console.log(`[${hit ? `HIT  (rank ${rank + 1})` : "MISS"}] "${testCase.query}"`);
    if (!hit) {
      console.log(
        `         expected a file containing "${testCase.expectedFilePathIncludes}", got: ${
          results.map((r) => r.filePath).join(", ") || "(no results)"
        }`
      );
    }
  }

  console.log(`\nHit rate: ${hits}/${evalCases.length} (${((hits / evalCases.length) * 100).toFixed(1)}%)`);
  console.log(`Mean Reciprocal Rank: ${(reciprocalRankSum / evalCases.length).toFixed(3)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Eval run failed:", err);
  process.exit(1);
});