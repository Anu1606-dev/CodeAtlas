import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRepos } from "../context/RepoContext";
import { apiPost } from "../lib/api";
import type { SearchTestResponse } from "@codeatlas/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CodeBlock from "../components/CodeBlock";

export default function VectorSearchPage() {
  const { selectedRepo } = useRepos();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!selectedRepo || !query.trim()) return;
    setSearching(true);
    setError(null);
    setResults(null);
    try {
      setResults(await apiPost<SearchTestResponse>(`/api/index/${selectedRepo.id}/search-test`, { query }));
    } catch {
      setError("Search failed — check that the vector index shows Active in Atlas");
    } finally {
      setSearching(false);
    }
  }

  if (!selectedRepo) return <div className="p-8 text-center text-muted-foreground">No repo connected.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-bold">Vector Search</h1>
      <p className="text-sm text-muted-foreground">Raw semantic search against indexed chunks — no LLM involved.</p>
      <div className="flex gap-2">
        <Input placeholder="Search through your codebase..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        <Button onClick={handleSearch} disabled={searching || !query.trim()}>{searching ? <Loader2 className="animate-spin" size={16} /> : "Search"}</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-3">
        {results?.results.map((r, idx) => (
          <Card key={idx}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-mono text-sm">{r.filePath} ({r.lines})</p>
                <span className="text-xs text-muted-foreground">score {r.score.toFixed(3)}</span>
              </div>
              {r.symbolName && <p className="text-xs text-muted-foreground mb-1">symbol: {r.symbolName}</p>}
              <CodeBlock code={r.content} lang={r.language} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}