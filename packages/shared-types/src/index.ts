/**
 * Shared data models and contract interfaces for RepoMentor AI.
 */

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

export interface RepositoryIdentifier {
  rawUrl: string;
  owner: string;
  name: string;
  branch?: string;
  commitSha?: string;
}

export type AnalysisStatus = 'idle' | 'validating' | 'queued' | 'analyzing' | 'ready' | 'error';

export interface MilestoneStatus {
  phase: number;
  name: string;
  isOperational: boolean;
  notes: string;
}
