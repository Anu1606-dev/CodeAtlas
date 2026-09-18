export interface HealthCheckResponse {
  status: "ok";
  timestamp: string;
}

export interface AuthUser {
  id: string;
  githubId: number;
  username: string;
  avatarUrl: string;
}