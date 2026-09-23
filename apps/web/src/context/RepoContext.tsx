import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ConnectedRepo, GithubRepoSummary } from "@codeatlas/shared";
import { apiGet, apiPost } from "../lib/api";

interface RepoContextValue {
  repos: ConnectedRepo[] | null;
  selectedRepo: ConnectedRepo | null;
  selectRepo: (id: string) => void;
  updateRepo: (updated: ConnectedRepo) => void;
  connectRepo: (repo: GithubRepoSummary) => Promise<ConnectedRepo>;
  loading: boolean;
}

const RepoContext = createContext<RepoContextValue | undefined>(undefined);

export function RepoProvider({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<ConnectedRepo[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ConnectedRepo[]>("/api/repos")
      .then((data) => {
        setRepos(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  function selectRepo(id: string) {
    setSelectedId(id);
  }

  function updateRepo(updated: ConnectedRepo) {
    setRepos((prev) => (prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev));
  }

  async function connectRepo(repo: GithubRepoSummary): Promise<ConnectedRepo> {
    const connected = await apiPost<ConnectedRepo>("/api/repos/connect", repo);
    setRepos((prev) => (prev ? [connected, ...prev] : [connected]));
    setSelectedId(connected.id);
    return connected;
  }

  const selectedRepo = repos?.find((r) => r.id === selectedId) ?? null;

  return (
    <RepoContext.Provider value={{ repos, selectedRepo, selectRepo, updateRepo, connectRepo, loading }}>
      {children}
    </RepoContext.Provider>
  );
}

export function useRepos(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepos must be used within a RepoProvider");
  return ctx;
}