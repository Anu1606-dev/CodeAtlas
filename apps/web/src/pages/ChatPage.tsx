import { Loader2 } from "lucide-react";
import { useRepos } from "../context/RepoContext";
import RepoDetail from "../components/RepoDetail";

export default function ChatPage() {
  const { selectedRepo, updateRepo, loading } = useRepos();

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!selectedRepo) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No repo connected yet — use "Add repo" in the sidebar to get started.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <RepoDetail repo={selectedRepo} onRepoUpdated={updateRepo} />
    </div>
  );
}