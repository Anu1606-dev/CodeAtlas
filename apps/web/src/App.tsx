import { useEffect, useState } from "react";
import type { HealthCheckResponse } from "@codeatlas/shared";

export default function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthCheckResponse) => setHealth(data))
      .catch(() => setError("Could not reach the API"));
  }, []);

  return (
    <main className="min-h-screen grid place-items-center bg-base-200">
      <div className="card bg-base-100 shadow-lg max-w-md">
        <div className="card-body">
          <h1 className="card-title">CodeAtlas</h1>
          {error && <p className="text-error">{error}</p>}
          {health && (
            <p>
              API status: <span className="badge badge-success">{health.status}</span>
              <br />
              <span className="text-sm opacity-70">{health.timestamp}</span>
            </p>
          )}
          {!health && !error && <span className="loading loading-spinner" />}
        </div>
      </div>
    </main>
  );
}