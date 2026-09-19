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

export interface GithubRepoSummary {
  githubRepoId: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
  updatedAt: string;
}

export interface ConnectedRepo {
  id: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
  connectedAt: string;
}

export interface IndexPreviewChunk {
  filePath: string;
  language: string;
  lines: string;
  symbolName?: string;
  preview: string;
}

export interface IndexPreviewResponse {
  totalChunks: number;
  matchedChunks: number;
  sample: IndexPreviewChunk[];
}
