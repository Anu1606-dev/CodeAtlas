import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ConnectedRepo, IndexRunResponse } from "@codeatlas/shared";
import { apiPost } from "../lib/api";
import ChatPanel from "./ChatPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RepoDetailProps {
  repo: ConnectedRepo;
  onRepoUpdated: (updated: ConnectedRepo) => void;
}

export default function RepoDetail({ repo, onRepoUpdated }: RepoDetailProps) {
  const [error, setError] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<IndexRunResponse | null>(null);
  const [enablingWebhook, setEnablingWebhook] = useState(false);

  async function handleRunIndex() {
    setIndexing(true);
    setError(null);
    setIndexResult(null);
    try {
      const result = await apiPost<IndexRunResponse>(`/api/index/${repo.id}/run`);
      setIndexResult(result);
      onRepoUpdated({ ...repo, chunkCount: result.chunksIndexed, lastIndexedAt: new Date().toISOString() });
    } catch {
      setError("Indexing failed — check the API terminal for details");
    } finally {
      setIndexing(false);
    }
  }

  async function handleEnableWebhook() {
    setEnablingWebhook(true);
    setError(null);
    try {
      onRepoUpdated(await apiPost<ConnectedRepo>(`/api/repos/${repo.id}/enable-webhook`));
    } catch {
      setError("Could not enable auto-reindex — check the API terminal");
    } finally {
      setEnablingWebhook(false);
    }
  }

  return (
    <div className="w-full text-left flex flex-col gap-4">
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="flex flex-col gap-1 py-4">
          <span className="font-semibold">Connected: {repo.fullName}</span>
          <span className="text-xs text-muted-foreground">Default branch: {repo.defaultBranch}</span>
          {repo.chunkCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              Indexed: {repo.chunkCount} chunks{repo.lastIndexedAt && ` · ${new Date(repo.lastIndexedAt).toLocaleString()}`}
            </span>
          )}
          <span className="text-xs text-muted-foreground">Auto-reindex on push: {repo.webhookActive ? "✓ Active" : "Not enabled"}</span>
          {!repo.webhookActive && (
            <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={handleEnableWebhook} disabled={enablingWebhook}>
              {enablingWebhook ? <Loader2 className="animate-spin" size={14} /> : "Enable auto-reindex"}
            </Button>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleRunIndex} disabled={indexing}>
        {indexing ? <Loader2 className="animate-spin" size={16} /> : "Run indexing"}
      </Button>

      {indexResult && (
        <p className="text-xs text-muted-foreground">Indexed {indexResult.chunksIndexed} chunks in {(indexResult.tookMs / 1000).toFixed(1)}s</p>
      )}

      <ChatPanel key={repo.id} repoId={repo.id} />
    </div>
  );
}