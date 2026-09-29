import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "./connection.js";
import { INDEX_QUEUE_NAME, type IndexJobData } from "./indexQueue.js";
import { runIndexJob } from "../services/indexer.js";

export function startIndexWorker(): Worker<IndexJobData> {
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

  return worker;
}