import { useState } from "react";
import { Loader2, FileText, Boxes, Database, CheckCircle2, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRepos } from "../context/RepoContext";
import { apiPost } from "../lib/api";
import type { ConnectedRepo, IndexRunResponse } from "@codeatlas/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatRelativeTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

interface ActivityItem {
  label: string;
  time?: string;
}

function buildActivity(repo: ConnectedRepo): ActivityItem[] {
  const items: ActivityItem[] = [];
  if (repo.lastIndexedAt) {
    items.push({ label: "Repository indexed successfully", time: repo.lastIndexedAt });
    if (repo.chunkCount !== undefined) items.push({ label: `${repo.chunkCount} chunks generated`, time: repo.lastIndexedAt });
    if (repo.fileCount !== undefined) items.push({ label: `${repo.fileCount} files processed`, time: repo.lastIndexedAt });
  }
  if (repo.webhookActive) items.push({ label: "Auto-reindex on push enabled" });
  items.push({ label: "Repository connected", time: repo.connectedAt });
  return items;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { selectedRepo, updateRepo, loading } = useRepos();
  const [indexing, setIndexing] = useState(false);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!selectedRepo) return <div className="p-8 text-center text-muted-foreground">No repo connected yet — use "Add repo" in the sidebar.</div>;

  const repo = selectedRepo;

  async function handleRunIndex() {
    setIndexing(true);
    try {
      const result = await apiPost<IndexRunResponse>(`/api/index/${repo.id}/run`);
      updateRepo({ ...repo, chunkCount: result.chunksIndexed, lastIndexedAt: new Date().toISOString() });
    } catch {
      // errors are already surfaced in the Chat page's debug tools
    } finally {
      setIndexing(false);
    }
  }

  const stats = [
    { label: "Files", value: repo.fileCount ?? "—", icon: FileText },
    { label: "Chunks", value: repo.chunkCount ?? "—", icon: Boxes },
    { label: "Vectors", value: repo.chunkCount ?? "—", icon: Database },
  ];
  const activity = buildActivity(repo);

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{getGreeting()}, {user?.username} 👋</h1>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-semibold">{repo.fullName}</p>
            <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
              {repo.htmlUrl} <ExternalLink size={10} />
            </a>
          </div>
          <Button onClick={handleRunIndex} disabled={indexing}>
            {indexing ? <Loader2 className="animate-spin" size={16} /> : "Run Indexing"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex flex-col gap-1 py-4">
              <Icon size={16} className="text-primary" />
              <span className="text-xl font-bold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="flex flex-col gap-1 py-4">
            <CheckCircle2 size={16} className={repo.lastIndexedAt ? "text-green-500" : "text-muted-foreground"} />
            <span className="text-sm font-semibold">{repo.lastIndexedAt ? "Indexed" : "Not indexed"}</span>
            {repo.lastIndexedAt && <span className="text-xs text-muted-foreground">{formatRelativeTime(repo.lastIndexedAt)}</span>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="font-semibold mb-3">Recent Activity</p>
          <ul className="flex flex-col gap-2">
            {activity.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.time && <span className="text-xs text-muted-foreground">{formatRelativeTime(item.time)}</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}