import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./db.js";
import { startIndexWorker } from "./queue/startWorker.js";

async function start(): Promise<void> {
  await connectDB();
  startIndexWorker();
  console.log("CodeAtlas indexing worker started, waiting for jobs...");
}

start().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});