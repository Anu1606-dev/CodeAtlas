import { Router } from "express";
import crypto from "node:crypto";
import { Repo } from "../models/Repo.js";
import { getIndexQueue } from "../queue/indexQueue.js";

const router = Router();

function isValidSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

router.post("/github", async (req, res) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET is not set");
    res.status(500).send("Server misconfigured");
    return;
  }

  const signature = req.header("x-hub-signature-256");
  if (!req.rawBody || !isValidSignature(req.rawBody, signature, secret)) {
    console.warn("Rejected webhook with invalid signature");
    res.status(401).send("Invalid signature");
    return;
  }

  const event = req.header("x-github-event");

  if (event === "ping") {
    res.status(200).send("pong");
    return;
  }

  if (event !== "push") {
    res.status(200).send("Event ignored");
    return;
  }

  const payload = req.body as { ref: string; repository: { id: number } };

  const repos = await Repo.find({ githubRepoId: payload.repository.id });
  if (repos.length === 0) {
    res.status(200).send("No matching repo tracked");
    return;
  }

  const queue = getIndexQueue();
  let enqueuedCount = 0;

  for (const repo of repos) {
    const expectedRef = `refs/heads/${repo.defaultBranch}`;
    if (payload.ref !== expectedRef) continue;

    await queue.add("reindex", { repoId: repo._id.toString() });
    enqueuedCount++;
  }

  res.status(202).send(`Enqueued ${enqueuedCount} reindex job(s)`);
});

export default router;