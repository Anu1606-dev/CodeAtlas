import { useEffect, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRepos } from "../context/RepoContext";
import { apiGet } from "../lib/api";
import type { ChunksPageResponse } from "@codeatlas/shared";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ChunkExplorerPage() {
  const { selectedRepo } = useRepos();
  const [data, setData] = useState<ChunksPageResponse | null>(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedRepo) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filter) params.set("filter", filter);
    apiGet<ChunksPageResponse>(`/api/index/${selectedRepo.id}/chunks?${params}`).then(setData).finally(() => setLoading(false));
  }, [selectedRepo, page, filter]);

  if (!selectedRepo) return <div className="p-8 text-center text-muted-foreground">No repo connected.</div>;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-bold">Chunk Explorer{data ? ` (${data.total})` : ""}</h1>
      <Input placeholder="Filter by filename..." value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} />
      {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
      {!loading && data?.chunks.length === 0 && <p className="text-sm text-muted-foreground">No chunks match — run indexing if you haven't yet.</p>}
      <div className="flex flex-col gap-3">
        {!loading && data?.chunks.map((c, idx) => (
          <Card key={idx}>
            <CardContent className="py-3">
              <p className="font-mono text-sm">{c.filePath} ({c.lines})</p>
              {c.symbolName && <p className="text-xs text-muted-foreground mb-1">symbol: {c.symbolName}</p>}
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap">{c.content}</pre>
            </CardContent>
          </Card>
        ))}
      </div>
      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={16} /></Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight size={16} /></Button>
        </div>
      )}
    </div>
  );
}