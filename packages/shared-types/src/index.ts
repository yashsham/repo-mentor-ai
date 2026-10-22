/**
 * Shared data models and contract interfaces for RepoMentor AI.
 */

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

export interface RepositoryMetadata {
  owner: string;
  name: string;
  full_name: string;
  description?: string | null;
  default_branch: string;
  commit_sha: string;
  html_url: string;
  language?: string | null;
  stars_count: number;
}

export interface FileItem {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size?: number | null;
  sha?: string | null;
  is_binary: boolean;
  language?: string | null;
}

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size?: number | null;
  sha?: string | null;
  is_binary?: boolean;
  language?: string | null;
  children?: FileNode[] | null;
}

export interface RepositoryAnalyzeResponse {
  metadata: RepositoryMetadata;
  tree: FileNode[];
  total_files: number;
  status: string;
}

export interface FileContentResponse {
  path: string;
  commit_sha: string;
  content: string;
  size: number;
  is_binary: boolean;
  language?: string | null;
}

export type AnalysisStatus = 'idle' | 'validating' | 'analyzing' | 'ready' | 'error';
