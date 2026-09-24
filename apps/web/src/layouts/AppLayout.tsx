import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, MessageSquare, FileText, Search, Boxes, Database, Network, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import RepoSwitcher from "../components/RepoSwitcher";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Logo from "../components/Logo";

const navItems = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/files", label: "Files", icon: FileText },
  { to: "/search", label: "Search", icon: Search },
  { to: "/graph", label: "Graph", icon: Network },
];

const devToolsItems = [
  { to: "/tools/chunks", label: "Chunks", icon: Boxes },
  { to: "/tools/vectors", label: "Vectors", icon: Database },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col p-4 gap-6">
        <div className="flex items-center gap-2 px-1">
          <Logo className="h-7 w-auto" />
          <span className="font-bold text-lg">CodeAtlas</span>
        </div>

        <RepoSwitcher />

        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div>
          <p className="text-xs uppercase opacity-50 px-3 mb-1">Developer Tools</p>
          <nav className="flex flex-col gap-1">
            {devToolsItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto flex items-center gap-2 px-1">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatarUrl} alt={user?.username} />
            <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate flex-1">{user?.username}</span>
          <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
            <LogOut size={16} />
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-end px-4">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}