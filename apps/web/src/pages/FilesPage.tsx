import { useEffect, useState } from "react";
import { Loader2, FileCode } from "lucide-react";
import { useRepos } from "../context/RepoContext";
import { apiGet } from "../lib/api";
import type { RepoFileSummary } from "@codeatlas/shared";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FilesPage() {
  const { selectedRepo } = useRepos();
  const [files, setFiles] = useState<RepoFileSummary[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!selectedRepo) return;
    setFiles(null);
    apiGet<RepoFileSummary[]>(`/api/repos/${selectedRepo.id}/files`).then(setFiles);
  }, [selectedRepo]);

  if (!selectedRepo) return <div className="p-8 text-center text-muted-foreground">No repo connected.</div>;
  if (files === null) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const filtered = files.filter((f) => f.filePath.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-bold">Files ({files.length})</h1>
      <Input placeholder="Search files..." value={query} onChange={(e) => setQuery(e.target.value)} />
      {files.length === 0 && <p className="text-sm text-muted-foreground">No files indexed yet — run indexing first.</p>}
      <div className="flex flex-col gap-2">
        {filtered.map((f) => (
          <Card key={f.filePath}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode size={16} className="text-primary shrink-0" />
                <span className="font-mono text-sm truncate">{f.filePath}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline">{f.language}</Badge>
                <span className="text-xs text-muted-foreground">{f.chunkCount} chunks</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}