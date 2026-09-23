import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { RepoProvider } from "./context/RepoContext";
import LandingPage from "./pages/LandingPage";
import AppLayout from "./layouts/AppLayout";
import ChatPage from "./pages/ChatPage";

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
          <Route path="/overview" element={<PlaceholderPage title="Overview" />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/files" element={<PlaceholderPage title="Files" />} />
          <Route path="/search" element={<PlaceholderPage title="Search" />} />
          <Route path="/tools/chunks" element={<PlaceholderPage title="Chunk Explorer" />} />
          <Route path="/tools/vectors" element={<PlaceholderPage title="Vector Search" />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Route>
      </Routes>
    </RepoProvider>
  );
}