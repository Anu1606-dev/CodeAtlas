import { Router } from "express";
import { User } from "../models/User.js";
import { Repo } from "../models/Repo.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import type { GithubRepoSummary, ConnectedRepo } from "@codeatlas/shared";

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

  res.status(201).json(toConnectedRepo(repo));
});

export default router;