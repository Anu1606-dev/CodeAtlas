import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import type { HealthCheckResponse } from "@codeatlas/shared";
import { connectDB } from "./db.js";
import authRouter from "./routes/auth.js";
import reposRouter from "./routes/repos.js";
import indexingRouter from "./routes/indexing.js";
import chatRouter from "./routes/chat.js";
import webhooksRouter from "./routes/webhooks.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL, credentials: true }));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  })
);

app.use(cookieParser());

app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (_req, res) => {
  const body: HealthCheckResponse = { status: "ok", timestamp: new Date().toISOString() };
  res.json(body);
});

app.use("/api/auth", authRouter);
app.use("/api/repos", reposRouter);
app.use("/api/index", indexingRouter);
app.use("/api/chat", chatRouter);
app.use("/api/webhooks", webhooksRouter);

async function start(): Promise<void> {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`CodeAtlas API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});