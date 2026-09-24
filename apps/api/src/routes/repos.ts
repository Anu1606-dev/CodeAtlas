import { Router } from "express";
import { User } from "../models/User.js";
import { Repo } from "../models/Repo.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { createGithubWebhook } from "../services/githubWebhook.js";
import type { GithubRepoSummary, ConnectedRepo } from "@codeatlas/shared";
import { Chunk } from "../models/Chunk.js";
import { GraphEdge } from "../models/GraphEdge.js";

const router = Router();

router.get("/github", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).select("+githubAccessToken");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const ghRes = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner",
    {
      headers: {
        Authorization: `Bearer ${user.githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!ghRes.ok) {
    console.error("GitHub repos fetch failed:", ghRes.status, await ghRes.text());
    res.status(502).json({ error: "Could not fetch repositories from GitHub" });
    return;
  }

  const repos = (await ghRes.json()) as Array<{
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    default_branch: string;
    private: boolean;
    html_url: string;
    updated_at: string;
  }>;

  const body: GithubRepoSummary[] = repos.map((r) => ({
    githubRepoId: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    defaultBranch: r.default_branch,
    private: r.private,
    htmlUrl: r.html_url,
    updatedAt: r.updated_at,
  }));

  res.json(body);
});

function toConnectedRepo(r: InstanceType<typeof Repo>): ConnectedRepo {
  return {
    id: r._id.toString(),
    githubRepoId: r.githubRepoId,
    name: r.name,
    fullName: r.fullName,
    owner: r.owner,
    defaultBranch: r.defaultBranch,
    private: r.private,
    htmlUrl: r.htmlUrl,
    connectedAt: r.connectedAt.toISOString(),
    lastIndexedAt: r.lastIndexedAt?.toISOString(),
    chunkCount: r.chunkCount,
    webhookActive: Boolean(r.githubWebhookId),
    fileCount: r.fileCount,
  };
}

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const repos = await Repo.find({ userId: req.userId }).sort({ connectedAt: -1 });
  const body: ConnectedRepo[] = repos.map(toConnectedRepo);
  res.json(body);
});

router.post("/connect", requireAuth, async (req: AuthedRequest, res) => {
  const { githubRepoId, name, fullName, owner, defaultBranch, private: isPrivate, htmlUrl } =
    req.body as Partial<GithubRepoSummary>;

  if (!githubRepoId || !name || !fullName || !owner || !defaultBranch || !htmlUrl) {
    res.status(400).json({ error: "Missing required repo fields" });
    return;
  }

  const user = await User.findById(req.userId).select("+githubAccessToken");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const repo = await Repo.findOneAndUpdate(
    { userId: req.userId, githubRepoId },
    {
      userId: req.userId,
      githubRepoId,
      name,
      fullName,
      owner,
      defaultBranch,
      private: isPrivate ?? false,
      htmlUrl,
      connectedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  if (!repo.githubWebhookId) {
    const webhookId = await createGithubWebhook(owner, name, user.githubAccessToken);
    if (webhookId) {
      repo.githubWebhookId = webhookId;
      await repo.save();
    }
  }

  res.status(201).json(toConnectedRepo(repo));
});

router.post("/:id/enable-webhook", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.id, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const user = await User.findById(req.userId).select("+githubAccessToken");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const webhookId = await createGithubWebhook(repo.owner, repo.name, user.githubAccessToken);
  if (!webhookId) {
    res.status(502).json({ error: "Could not create webhook — check the API terminal for details" });
    return;
  }

  repo.githubWebhookId = webhookId;
  await repo.save();

  res.json(toConnectedRepo(repo));
});

router.get("/:id/files", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.id, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const files = await Chunk.aggregate([
    { $match: { repoId: repo._id } },
    { $group: { _id: "$filePath", language: { $first: "$language" }, chunkCount: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json(files.map((f) => ({ filePath: f._id, language: f.language, chunkCount: f.chunkCount })));
});

router.get("/:id/graph", requireAuth, async (req: AuthedRequest, res) => {
  const repo = await Repo.findOne({ _id: req.params.id, userId: req.userId });
  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  const [edges, files] = await Promise.all([
    GraphEdge.find({ repoId: repo._id }),
    Chunk.aggregate([{ $match: { repoId: repo._id } }, { $group: { _id: "$filePath" } }]),
  ]);

  const nodes = files.map((f) => {
    const fp = f._id as string;
    const parts = fp.split("/");
    return { id: fp, label: parts[parts.length - 1], group: parts.length > 1 ? parts[0] : "root" };
  });

  res.json({ nodes, edges: edges.map((e) => ({ source: e.from, target: e.to })) });
});

export default router;