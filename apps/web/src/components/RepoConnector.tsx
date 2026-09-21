import { useEffect, useState } from "react";
import type {
  GithubRepoSummary,
  ConnectedRepo,
  IndexPreviewResponse,
  IndexRunResponse,
  SearchTestResponse,
} from "@codeatlas/shared";
import { apiGet, apiPost } from "../lib/api";
import ChatPanel from "./ChatPanel";

export default function RepoConnector() {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[] | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepoSummary[] | null>(null);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<IndexPreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [filterText, setFilterText] = useState("");

  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<IndexRunResponse | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchTestResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

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
      const result = await apiPost<IndexPreviewResponse>(`/api/index/${repoId}/preview`, {
        filter: filterText,
      });
      setPreview(result);
    } catch {
      setError("Chunking preview failed — check the API terminal for details");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleRunIndex(repoId: string) {
    setIndexing(true);
    setError(null);
    setIndexResult(null);
    try {
      const result = await apiPost<IndexRunResponse>(`/api/index/${repoId}/run`);
      setIndexResult(result);
      setConnectedRepos((prev) =>
        prev
          ? prev.map((r) =>
            r.id === repoId
              ? { ...r, chunkCount: result.chunksIndexed, lastIndexedAt: new Date().toISOString() }
              : r
          )
          : prev
      );
    } catch {
      setError("Indexing failed — check the API terminal for details");
    } finally {
      setIndexing(false);
    }
  }

  async function handleSearchTest(repoId: string) {
    setSearching(true);
    setSearchError(null);
    setSearchResults(null);
    try {
      const result = await apiPost<SearchTestResponse>(`/api/index/${repoId}/search-test`, {
        query: searchQuery,
      });
      setSearchResults(result);
    } catch {
      setSearchError("Search failed — check that the vector index shows Active in Atlas");
    } finally {
      setSearching(false);
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
          {repo.chunkCount !== undefined && (
            <span className="text-xs opacity-70">
              Indexed: {repo.chunkCount} chunks
              {repo.lastIndexedAt && ` · ${new Date(repo.lastIndexedAt).toLocaleString()}`}
            </span>
          )}
          <span className="text-xs opacity-70">
            Auto-reindex on push: {repo.webhookActive ? "✓ Active" : "Not enabled"}
          </span>
          {!repo.webhookActive && (
            <button
              className="btn btn-xs btn-outline mt-1"
              onClick={async () => {
                try {
                  const updated = await apiPost<ConnectedRepo>(`/api/repos/${repo.id}/enable-webhook`);
                  setConnectedRepos((prev) =>
                    prev ? prev.map((r) => (r.id === repo.id ? updated : r)) : prev
                  );
                } catch {
                  setError("Could not enable auto-reindex — check the API terminal");
                }
              }}
            >
              Enable auto-reindex
            </button>
          )}
        </div>

        <button
          className="btn btn-sm btn-primary"
          onClick={() => handleRunIndex(repo.id)}
          disabled={indexing}
        >
          {indexing ? <span className="loading loading-spinner loading-xs" /> : "Run indexing"}
        </button>

        {indexResult && (
          <div className="alert alert-info text-xs">
            Indexed {indexResult.chunksIndexed} chunks in {(indexResult.tookMs / 1000).toFixed(1)}s
          </div>
        )}

        <ChatPanel repoId={repo.id} />

        <div className="divider text-xs opacity-50">chunking debug</div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by filename (e.g. slice)"
            className="input input-sm input-bordered flex-1"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handlePreview(repo.id)}
            disabled={previewing}
          >
            {previewing ? <span className="loading loading-spinner loading-xs" /> : "Preview"}
          </button>
        </div>

        {preview && (
          <div className="bg-base-200 rounded-box p-3 text-xs max-h-64 overflow-y-auto">
            <p className="font-semibold mb-2">
              {preview.matchedChunks} of {preview.totalChunks} chunks match
            </p>
            {preview.sample.map((c, idx) => (
              <div key={idx} className="mb-2 pb-2 border-b border-base-300 last:border-0">
                <p className="font-mono">{c.filePath} ({c.lines})</p>
                {c.symbolName && <p className="opacity-70">symbol: {c.symbolName}</p>}
                <pre className="whitespace-pre-wrap opacity-80">{c.preview}</pre>
              </div>
            ))}
          </div>
        )}

        <div className="divider text-xs opacity-50">vector search debug</div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Raw vector search (no LLM)..."
            className="input input-sm input-bordered flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className="btn btn-sm btn-accent"
            onClick={() => handleSearchTest(repo.id)}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? <span className="loading loading-spinner loading-xs" /> : "Search"}
          </button>
        </div>

        {searchError && <p className="text-error text-xs">{searchError}</p>}

        {searchResults && (
          <div className="bg-base-200 rounded-box p-3 text-xs max-h-64 overflow-y-auto">
            <p className="font-semibold mb-2">Results for: "{searchResults.query}"</p>
            {searchResults.results.map((r, idx) => (
              <div key={idx} className="mb-2 pb-2 border-b border-base-300 last:border-0">
                <p className="font-mono">
                  {r.filePath} ({r.lines}) — score {r.score.toFixed(3)}
                </p>
                {r.symbolName && <p className="opacity-70">symbol: {r.symbolName}</p>}
                <pre className="whitespace-pre-wrap opacity-80">{r.content}</pre>
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