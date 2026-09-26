import { MessageSquare, FileSearch, Search, Network } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MessageSquare, label: "Chat with your code" },
  { icon: FileSearch, label: "Find relevant files" },
  { icon: Search, label: "Debug faster" },
  { icon: Network, label: "Visualize your codebase" },
];

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.19 1.83 1.19 3.09 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export default function LandingPage() {
  const { login } = useAuth();

  return (
    <main className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <header className="relative flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
          <span className="font-bold text-lg">CodeAtlas</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="relative flex-1 grid place-items-center px-4 sm:px-6 py-8">
        <div className="max-w-lg text-center flex flex-col items-center gap-6">
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight">
            Understand <br className="hidden sm:block" />
            <span className="text-primary">Your Codebase.</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            CodeAtlas lets you explore, search, and ask questions about your codebase — powered by AI,
            grounded in your actual code.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-2.5 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                  <Icon size={15} />
                </span>
                {label}
              </div>
            ))}
          </div>

          <Button size="lg" className="w-full gap-2" onClick={login}>
            <GithubIcon />
            Continue with GitHub
          </Button>
        </div>
      </div>
    </main>
  );
}