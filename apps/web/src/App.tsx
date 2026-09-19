import { useAuth } from "./context/AuthContext";
import RepoConnector from "./components/RepoConnector";

export default function App() {
  const { user, loading, login, logout } = useAuth();

  return (
    <main className="min-h-screen grid place-items-center bg-base-200 p-4">
      <div className={`card bg-base-100 shadow-lg ${user ? "w-full max-w-2xl" : "w-96"}`}>
        <div className="card-body items-center text-center">
          <h1 className="card-title">CodeAtlas</h1>

          {loading && <span className="loading loading-spinner" />}

          {!loading && !user && (
            <>
              <p className="opacity-70 text-sm">
                Ask questions about any GitHub repo, grounded in the actual code.
              </p>
              <button className="btn btn-primary mt-2" onClick={login}>
                Sign in with GitHub
              </button>
            </>
          )}

          {!loading && user && (
            <div className="w-full flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 self-start">
                <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full" />
                <p className="font-semibold text-sm">{user.username}</p>
              </div>

              <RepoConnector />

              <button className="btn btn-outline btn-sm mt-2" onClick={logout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}