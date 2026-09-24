import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ConnectedRepo, IndexPreviewResponse, IndexRunResponse, SearchTestResponse } from "@codeatlas/shared";
import { apiPost } from "../lib/api";
import ChatPanel from "./ChatPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface RepoDetailProps {
  repo: ConnectedRepo;
  onRepoUpdated: (updated: ConnectedRepo) => void;
}

export default function RepoDetail({ repo, onRepoUpdated }: RepoDetailProps) {
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
  const [enablingWebhook, setEnablingWebhook] = useState(false);

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    try {
      const result = await apiPost<IndexPreviewResponse>(`/api/index/${repo.id}/preview`, { filter: filterText });
      setPreview(result);
    } catch {
      setError("Chunking preview failed — check the API terminal for details");
    } finally {
      setPreviewing(false);
    }
  }

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

  async function handleSearchTest() {
    setSearching(true);
    setSearchError(null);
    setSearchResults(null);
    try {
      const result = await apiPost<SearchTestResponse>(`/api/index/${repo.id}/search-test`, { query: searchQuery });
      setSearchResults(result);
    } catch {
      setSearchError("Search failed — check that the vector index shows Active in Atlas");
    } finally {
      setSearching(false);
    }
  }

  async function handleEnableWebhook() {
    setEnablingWebhook(true);
    setError(null);
    try {
      const updated = await apiPost<ConnectedRepo>(`/api/repos/${repo.id}/enable-webhook`);
      onRepoUpdated(updated);
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
              Indexed: {repo.chunkCount} chunks
              {repo.lastIndexedAt && ` · ${new Date(repo.lastIndexedAt).toLocaleString()}`}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Auto-reindex on push: {repo.webhookActive ? "✓ Active" : "Not enabled"}
          </span>
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
        <p className="text-xs text-muted-foreground">
          Indexed {indexResult.chunksIndexed} chunks in {(indexResult.tookMs / 1000).toFixed(1)}s
        </p>
      )}

      <ChatPanel key={repo.id} repoId={repo.id} />

      <Separator />
      <p className="text-xs text-muted-foreground uppercase">Chunking debug</p>
      <div className="flex gap-2">
        <Input placeholder="Filter by filename (e.g. slice)" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        <Button variant="secondary" onClick={handlePreview} disabled={previewing}>
          {previewing ? <Loader2 className="animate-spin" size={16} /> : "Preview"}
        </Button>
      </div>
      {preview && (
        <div className="bg-muted rounded-lg p-3 text-xs max-h-64 overflow-y-auto">
          <p className="font-semibold mb-2">{preview.matchedChunks} of {preview.totalChunks} chunks match</p>
          {preview.sample.map((c, idx) => (
            <div key={idx} className="mb-2 pb-2 border-b border-border last:border-0">
              <p className="font-mono">{c.filePath} ({c.lines})</p>
              {c.symbolName && <p className="text-muted-foreground">symbol: {c.symbolName}</p>}
              <pre className="whitespace-pre-wrap text-muted-foreground">{c.preview}</pre>
            </div>
          ))}
        </div>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground uppercase">Vector search debug</p>
      <div className="flex gap-2">
        <Input placeholder="Raw vector search (no LLM)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <Button variant="secondary" onClick={handleSearchTest} disabled={searching || !searchQuery.trim()}>
          {searching ? <Loader2 className="animate-spin" size={16} /> : "Search"}
        </Button>
      </div>
      {searchError && <p className="text-xs text-destructive">{searchError}</p>}
      {searchResults && (
        <div className="bg-muted rounded-lg p-3 text-xs max-h-64 overflow-y-auto">
          <p className="font-semibold mb-2">Results for: "{searchResults.query}"</p>
          {searchResults.results.map((r, idx) => (
            <div key={idx} className="mb-2 pb-2 border-b border-border last:border-0">
              <p className="font-mono">{r.filePath} ({r.lines}) — score {r.score.toFixed(3)}</p>
              {r.symbolName && <p className="text-muted-foreground">symbol: {r.symbolName}</p>}
              <pre className="whitespace-pre-wrap text-muted-foreground">{r.content}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}