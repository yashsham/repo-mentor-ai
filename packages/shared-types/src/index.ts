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
  is_binary?: boolean;
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

export interface SourceSpan {
  start_line: number;
  end_line: number;
  start_col: number;
  end_col: number;
}

export interface Symbol {
  name: string;
  kind: string; // 'class' | 'function' | 'method' | 'interface' | 'variable'
  span: SourceSpan;
  parent?: string | null;
  docstring?: string | null;
  parameters: string[];
  return_type?: string | null;
  is_exported: boolean;
}

export interface ImportStatement {
  module: string;
  names: string[];
  alias?: string | null;
  span: SourceSpan;
  is_relative: boolean;
}

export interface FileAnalysisResult {
  file_path: string;
  language: string;
  symbols: Symbol[];
  imports: ImportStatement[];
  syntax_errors: string[];
  line_count: number;
  is_supported: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'symbol';
  language?: string | null;
  symbol_kind?: string | null;
  file_path: string;
  line?: number | null;
  metrics: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'imports' | 'defines' | 'calls' | 'inherits';
  label?: string | null;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_files_analyzed: number;
  total_symbols_extracted: number;
  entry_points: string[];
}

export type AnalysisStatus = 'idle' | 'validating' | 'analyzing' | 'ready' | 'error';
