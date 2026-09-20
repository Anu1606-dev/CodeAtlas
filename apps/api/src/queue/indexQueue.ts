import { Queue } from "bullmq";
import { getRedisConnection } from "./connection.js";

export interface IndexJobData {
  repoId: string;
}

export const INDEX_QUEUE_NAME = "repo-indexing";

let queue: Queue<IndexJobData> | null = null;

export function getIndexQueue(): Queue<IndexJobData> {
  if (!queue) {
    queue = new Queue<IndexJobData>(INDEX_QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }
  return queue;
}