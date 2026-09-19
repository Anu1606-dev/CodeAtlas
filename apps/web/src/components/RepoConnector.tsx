import { useEffect, useState } from "react";
import type { GithubRepoSummary, ConnectedRepo, IndexPreviewResponse } from "@codeatlas/shared";
import { apiGet, apiPost } from "../lib/api";

export default function RepoConnector() {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[] | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepoSummary[] | null>(null);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<IndexPreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ConnectedRepo[]>("/api/repos")
      .then(setConnectedRepos)
      .catch(() => setError("Could not load your connected repos"));
  }, []);

  useEffect(() => {
    if (connectedRepos !== null && connectedRepos.length === 0) {
      apiGet<GithubRepoSummary[]>("/api/repos/github")
        .then(setGithubRepos)
        .catch(() => setError("Could not load your GitHub repositories"));
    }
  }, [connectedRepos]);

  async function handleConnect(repo: GithubRepoSummary) {
    setConnectingId(repo.githubRepoId);
    setError(null);
    try {
      const connected = await apiPost<ConnectedRepo>("/api/repos/connect", repo);
      setConnectedRepos((prev) => [connected, ...(prev ?? [])]);
    } catch {
      setError(`Could not connect ${repo.fullName}`);
    } finally {
      setConnectingId(null);
    }
  }

  async function handlePreview(repoId: string) {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    try {
      const result = await apiPost<IndexPreviewResponse>(`/api/index/${repoId}/preview`);
      setPreview(result);
    } catch {
      setError("Chunking preview failed — check the API terminal for details");
    } finally {
      setPreviewing(false);
    }
  }

  if (connectedRepos === null) return <span className="loading loading-spinner" />;
  if (error) return <p className="text-error text-sm">{error}</p>;

  if (connectedRepos.length > 0) {
    const repo = connectedRepos[0];
    return (
      <div className="w-full text-left flex flex-col gap-3">
        <div className="alert alert-success flex-col items-start gap-1 w-full">
          <span className="font-semibold">Connected: {repo.fullName}</span>
          <span className="text-xs opacity-70">Default branch: {repo.defaultBranch}</span>
        </div>

        <button
          className="btn btn-sm btn-secondary"
          onClick={() => handlePreview(repo.id)}
          disabled={previewing}
        >
          {previewing ? <span className="loading loading-spinner loading-xs" /> : "Preview chunking"}
        </button>

        {preview && (
          <div className="bg-base-200 rounded-box p-3 text-xs max-h-64 overflow-y-auto">
            <p className="font-semibold mb-2">{preview.totalChunks} chunks total</p>
            {preview.sample.map((c, idx) => (
              <div key={idx} className="mb-2 pb-2 border-b border-base-300 last:border-0">
                <p className="font-mono">{c.filePath} ({c.lines})</p>
                {c.symbolName && <p className="opacity-70">symbol: {c.symbolName}</p>}
                <pre className="whitespace-pre-wrap opacity-80">{c.preview}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full text-left">
      <p className="text-sm opacity-70 mb-2">Choose a repository to index:</p>
      {githubRepos === null && <span className="loading loading-spinner" />}
      <ul className="menu bg-base-200 rounded-box max-h-64 overflow-y-auto flex-nowrap w-full">
        {githubRepos?.map((repo) => (
          <li key={repo.githubRepoId}>
            <button
              onClick={() => handleConnect(repo)}
              disabled={connectingId === repo.githubRepoId}
              className="flex justify-between"
            >
              <span>{repo.fullName}</span>
              {connectingId === repo.githubRepoId ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <span className="badge badge-outline">Connect</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}