import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { RepoProvider } from "./context/RepoContext";
import LandingPage from "./pages/LandingPage";
import AppLayout from "./layouts/AppLayout";
import ChatPage from "./pages/ChatPage";
import OverviewPage from "./pages/OverviewPage";
import FilesPage from "./pages/FilesPage";
import ChunkExplorerPage from "./pages/ChunkExplorerPage";
import VectorSearchPage from "./pages/VectorSearchPage";
import GraphPage from "./pages/GraphPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm mt-1">Coming in the next build step.</p>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }
  if (!user) return <LandingPage />;

  return (
    <RepoProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/search" element={<VectorSearchPage />} />
          <Route path="/tools/chunks" element={<ChunkExplorerPage />} />
          <Route path="/tools/vectors" element={<VectorSearchPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Route>
      </Routes>
    </RepoProvider>
  );
}