import dotenv from "dotenv";
dotenv.config();

import { Worker, type Job } from "bullmq";
import { connectDB } from "./db.js";
import { getRedisConnection } from "./queue/connection.js";
import { INDEX_QUEUE_NAME, type IndexJobData } from "./queue/indexQueue.js";
import { runIndexJob } from "./services/indexer.js";

async function start(): Promise<void> {
  await connectDB();

  const worker = new Worker<IndexJobData>(
    INDEX_QUEUE_NAME,
    async (job: Job<IndexJobData>) => {
      console.log(`Processing reindex job ${job.id} for repo ${job.data.repoId}`);
      const result = await runIndexJob(job.data.repoId);
      console.log(`Reindex job ${job.id} done: ${result.chunksIndexed} chunks in ${result.tookMs}ms`);
      return result;
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`Reindex job ${job?.id} failed:`, err);
  });

  console.log("CodeAtlas indexing worker started, waiting for jobs...");
}

start().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});