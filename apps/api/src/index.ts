import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import type { HealthCheckResponse } from "@codeatlas/shared";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const body: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
  res.json(body);
});

app.listen(PORT, () => {
  console.log(`CodeAtlas API running on http://localhost:${PORT}`);
});