import { useEffect, useState } from "react";
import type { GithubRepoSummary, ConnectedRepo } from "@codeatlas/shared";
import { apiGet, apiPost } from "../lib/api";
import RepoDetail from "./RepoDetail";

export default function RepoConnector() {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[] | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepoSummary[] | null>(null);
  const [connectingId, setConnectingId] = useState<number | null>(null);

  useEffect(() => {
    apiGet<ConnectedRepo[]>("/api/repos")
      .then((repos) => {
        setConnectedRepos(repos);
        if (repos.length > 0) {
          setSelectedRepoId(repos[0].id);
        } else {
          setShowPicker(true);
        }
      })
      .catch(() => setError("Could not load your connected repos"));
  }, []);

  useEffect(() => {
    if (showPicker && githubRepos === null) {
      apiGet<GithubRepoSummary[]>("/api/repos/github")
        .then(setGithubRepos)
        .catch(() => setError("Could not load your GitHub repositories"));
    }
  }, [showPicker, githubRepos]);

  async function handleConnect(repo: GithubRepoSummary) {
    setConnectingId(repo.githubRepoId);
    setError(null);
    try {
      const connected = await apiPost<ConnectedRepo>("/api/repos/connect", repo);
      setConnectedRepos((prev) => (prev ? [connected, ...prev] : [connected]));
      setSelectedRepoId(connected.id);
      setShowPicker(false);
    } catch {
      setError(`Could not connect ${repo.fullName}`);
    } finally {
      setConnectingId(null);
    }
  }

  function handleRepoUpdated(updated: ConnectedRepo) {
    setConnectedRepos((prev) => (prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev));
  }

  if (connectedRepos === null) return <span className="loading loading-spinner" />;
  if (error) return <p className="text-error text-sm">{error}</p>;

  const connectedIds = new Set(connectedRepos.map((r) => r.githubRepoId));
  const selectableGithubRepos = githubRepos?.filter((r) => !connectedIds.has(r.githubRepoId)) ?? [];
  const selectedRepo = connectedRepos.find((r) => r.id === selectedRepoId) ?? null;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1 w-full">
        {connectedRepos.map((r) => (
          <button
            key={r.id}
            className={`btn btn-sm shrink-0 ${r.id === selectedRepoId ? "btn-primary" : "btn-outline"}`}
            title={r.fullName}
            onClick={() => setSelectedRepoId(r.id)}
          >
            {r.name}
          </button>
        ))}
        <button className="btn btn-sm btn-ghost shrink-0" onClick={() => setShowPicker((prev) => !prev)}>
          {showPicker ? "Cancel" : "+ Add repo"}
        </button>
      </div>

      {showPicker && (
        <div className="w-full text-left bg-base-200 rounded-box p-3">
          <p className="text-sm opacity-70 mb-2">Choose a repository to index:</p>
          {githubRepos === null && <span className="loading loading-spinner" />}
          {githubRepos !== null && selectableGithubRepos.length === 0 && (
            <p className="text-sm opacity-60">All your repos are already connected.</p>
          )}
          <ul className="menu bg-base-100 rounded-box max-h-64 overflow-y-auto flex-nowrap w-full">
            {selectableGithubRepos.map((repo) => (
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
      )}

      {connectedRepos.length === 0 && !showPicker && (
        <p className="text-sm opacity-60 text-center mt-4">
          No repos connected yet — click "+ Add repo" to get started.
        </p>
      )}

      {selectedRepo && <RepoDetail repo={selectedRepo} onRepoUpdated={handleRepoUpdated} />}
    </div>
  );
}