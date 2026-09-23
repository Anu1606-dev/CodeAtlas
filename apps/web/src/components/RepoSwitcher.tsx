import { useState, useEffect } from "react";
import { ChevronDown, Plus, Loader2 } from "lucide-react";
import type { GithubRepoSummary } from "@codeatlas/shared";
import { apiGet } from "../lib/api";
import { useRepos } from "../context/RepoContext";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RepoSwitcher() {
    const { repos, selectedRepo, selectRepo, connectRepo } = useRepos();
    const [open, setOpen] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [githubRepos, setGithubRepos] = useState<GithubRepoSummary[] | null>(null);
    const [connectingId, setConnectingId] = useState<number | null>(null);

    useEffect(() => {
        if (showPicker && githubRepos === null) {
            apiGet<GithubRepoSummary[]>("/api/repos/github").then(setGithubRepos);
        }
    }, [showPicker, githubRepos]);

    if (!repos) return <div className="h-9 w-full rounded-md bg-muted animate-pulse" />;

    const connectedIds = new Set(repos.map((r) => r.githubRepoId));
    const selectable = githubRepos?.filter((r) => !connectedIds.has(r.githubRepoId)) ?? [];

    async function handleConnect(repo: GithubRepoSummary) {
        setConnectingId(repo.githubRepoId);
        try {
            await connectRepo(repo);
            setShowPicker(false);
            setOpen(false);
        } finally {
            setConnectingId(null);
        }
    }

    return (
        <DropdownMenu
            onOpenChange={(v) => {
                if (!v) setShowPicker(false);
            }}
        >
            <DropdownMenuTrigger render={<Button variant="outline" className="w-full justify-between" />}>
                <span className="truncate">{selectedRepo?.name ?? "Select a repo"}</span>
                <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
                {repos.map((r) => (
                    <DropdownMenuItem
                        key={r.id}
                        onClick={() => {
                            selectRepo(r.id);
                            setOpen(false);
                        }}
                    >
                        {r.name}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {!showPicker && (
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            setShowPicker(true);
                        }}
                    >
                        <Plus size={14} className="mr-2" /> Add repo
                    </DropdownMenuItem>
                )}
                {showPicker && (
                    <>
                        {githubRepos === null && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="animate-spin" size={14} />
                            </div>
                        )}
                        {githubRepos !== null && selectable.length === 0 && (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">All repos connected</p>
                        )}
                        {selectable.map((repo) => (
                            <DropdownMenuItem
                                key={repo.githubRepoId}
                                onSelect={(e) => {
                                    e.preventDefault();
                                    handleConnect(repo);
                                }}
                                disabled={connectingId === repo.githubRepoId}
                            >
                                <span className="truncate flex-1">{repo.fullName}</span>
                                {connectingId === repo.githubRepoId && <Loader2 className="animate-spin" size={14} />}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}