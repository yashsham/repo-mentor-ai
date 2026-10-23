'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  GitBranch,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Terminal,
  Star,
  Check,
  Compass,
} from 'lucide-react';
import { validateRepositoryUrl, ValidationResult } from '@/lib/validation';
import {
  checkBackendHealth,
  analyzeRepository,
  fetchFileContent,
  analyzeFileAST,
  fetchRepositoryGraph,
  HealthStatus,
  RepositoryAnalyzeResponse,
  FileNode,
  FileContentResponse,
  FileAnalysisResult,
  DependencyGraph,
} from '@/lib/api';
import { FileTree } from '@/components/repository/FileTree';
import { CodeViewer } from '@/components/code-viewer/CodeViewer';
import { ArchitectureGraph } from '@/components/architecture/ArchitectureGraph';

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingestionError, setIngestionError] = useState<string | null>(null);

  // Ingested Repository State
  const [analysis, setAnalysis] = useState<RepositoryAnalyzeResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysisResult | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jumpToLine, setJumpToLine] = useState<number | undefined>(undefined);

  // Architecture Graph State
  const [repoGraph, setRepoGraph] = useState<DependencyGraph | null>(null);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  // Center tabs
  const [activeCenterTab, setActiveCenterTab] = useState<'code' | 'architecture' | 'flow'>('code');

  // Audio / Avatar controls preview
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [backendHealth, setBackendHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    checkBackendHealth().then(setBackendHealth);
  }, []);

  const findInitialFile = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.type === 'file' && node.name.toLowerCase().startsWith('readme')) {
        return node;
      }
    }
    for (const node of nodes) {
      if (node.type === 'file' && !node.is_binary) {
        return node;
      }
      if (node.children) {
        const found = findInitialFile(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngestionError(null);
    setRepoGraph(null);
    const result = validateRepositoryUrl(repoUrl);
    setValidation(result);

    if (!result.isValid) return;

    setIsSubmitting(true);
    try {
      const response = await analyzeRepository(result.normalizedUrl || repoUrl);
      setAnalysis(response);

      // Auto-load repository architecture graph in background
      loadGraph(response.metadata.owner, response.metadata.name, response.metadata.commit_sha);

      // Auto-select initial file
      const initial = findInitialFile(response.tree);
      if (initial) {
        handleSelectFile(initial, response.metadata.owner, response.metadata.name, response.metadata.commit_sha);
      } else {
        setSelectedFile(null);
        setFileContent(null);
        setFileAnalysis(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Repository analysis failed';
      setIngestionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadGraph = async (owner: string, repo: string, commitSha: string) => {
    setIsGraphLoading(true);
    setGraphError(null);
    try {
      const graph = await fetchRepositoryGraph(owner, repo, commitSha);
      setRepoGraph(graph);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate dependency graph';
      setGraphError(msg);
    } finally {
      setIsGraphLoading(false);
    }
  };

  const handleSelectFile = async (
    node: FileNode,
    owner = analysis?.metadata.owner,
    repo = analysis?.metadata.name,
    commitSha = analysis?.metadata.commit_sha,
    targetLine?: number
  ) => {
    if (!owner || !repo || !commitSha) return;

    setSelectedFile(node);
    setActiveCenterTab('code');
    setJumpToLine(targetLine);

    if (node.is_binary) {
      setFileContent({
        path: node.path,
        commit_sha: commitSha,
        content: '',
        size: node.size || 0,
        is_binary: true,
        language: null,
      });
      setFileAnalysis(null);
      return;
    }

    setIsFileLoading(true);
    setFileError(null);
    try {
      const contentRes = await fetchFileContent(owner, repo, node.path, commitSha);
      setFileContent(contentRes);

      // Trigger AST parsing on content
      try {
        const astRes = await analyzeFileAST(node.path, contentRes.content);
        setFileAnalysis(astRes);
      } catch {
        setFileAnalysis(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load file';
      setFileError(msg);
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleSelectGraphNode = (filePath: string, line?: number) => {
    const node: FileNode = {
      path: filePath,
      name: filePath.split('/').pop() || filePath,
      type: 'file',
    };
    handleSelectFile(node, analysis?.metadata.owner, analysis?.metadata.name, analysis?.metadata.commit_sha, line);
  };

  const handleSelectSample = (sampleUrl: string) => {
    setRepoUrl(sampleUrl);
    setValidation(validateRepositoryUrl(sampleUrl));
    setIngestionError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-mono font-bold">
            RM
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white">RepoMentor AI</span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded border border-slate-700">
                Phase 3 Code Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Tree-sitter AST Parsing • Symbol Extraction • Dependency Graphs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <span
              className={`h-2 w-2 rounded-full ${
                backendHealth?.status === 'ok'
                  ? 'bg-emerald-400 animate-pulse'
                  : backendHealth?.status === 'degraded'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-400">API:</span>
            <span
              className={
                backendHealth?.status === 'ok'
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }
            >
              {backendHealth ? backendHealth.status.toUpperCase() : 'CHECKING...'}
            </span>
          </div>

          <a
            href="https://github.com/yashsham/repo-mentor-ai"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      {/* Hero & Ingestion Section */}
      <main className="flex-1 flex flex-col">
        <section className="px-4 lg:px-8 pt-8 pb-6 max-w-5xl mx-auto w-full text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-mono mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Tree-sitter AST • Symbol Graphs • Exact Source References</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            Deeply understand complex codebases through{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
              grounded AI mentoring
            </span>
          </h1>

          <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed mb-6">
            RepoMentor AI parses software repositories into deterministic AST symbol graphs,
            visualizes module architectures, and teaches engineering concepts with an animated tutor
            citing exact source files and line ranges.
          </p>

          {/* Repository Ingestion Form */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xl max-w-3xl mx-auto text-left">
            <form onSubmit={handleAnalyze} className="space-y-3">
              <label
                htmlFor="repo-url-input"
                className="block text-xs font-medium text-slate-300 flex items-center justify-between"
              >
                <span>GitHub Repository URL</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Format: https://github.com/owner/repository
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <GitBranch className="h-4 w-4" />
                  </div>
                  <input
                    id="repo-url-input"
                    type="text"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      if (validation) setValidation(null);
                      if (ingestionError) setIngestionError(null);
                    }}
                    placeholder="https://github.com/fastapi/fastapi"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono transition-all"
                  />
                </div>
                <button
                  id="analyze-repo-button"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors cursor-pointer shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Extracting AST...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze Repository</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Validation & Ingestion Feedback */}
              {validation && !validation.isValid && (
                <div
                  id="validation-error"
                  role="alert"
                  className="flex items-center space-x-2 text-rose-400 text-xs bg-rose-950/40 border border-rose-900/60 rounded p-2.5 mt-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{validation.error}</span>
                </div>
              )}

              {ingestionError && (
                <div
                  id="ingestion-error"
                  role="alert"
                  className="flex items-center space-x-2 text-rose-400 text-xs bg-rose-950/40 border border-rose-900/60 rounded p-2.5 mt-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{ingestionError}</span>
                </div>
              )}

              {analysis && !ingestionError && (
                <div
                  id="validation-success"
                  className="flex items-start space-x-2 text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-900/60 rounded p-2.5 mt-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">
                      Successfully Ingested: {analysis.metadata.full_name} ({analysis.total_files} files indexed)
                    </div>
                    <div className="text-slate-300 mt-0.5 font-mono text-[11px]">
                      Pinned Commit: <code className="text-sky-300">{analysis.metadata.commit_sha.slice(0, 7)}</code> on branch <code className="text-sky-300">{analysis.metadata.default_branch}</code>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Quick Sample Selector */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center space-x-2 text-xs text-slate-400 flex-wrap gap-y-1">
              <span className="text-slate-500">Try sample repos:</span>
              <button
                type="button"
                onClick={() => handleSelectSample('https://github.com/fastapi/fastapi')}
                className="text-slate-300 hover:text-sky-300 underline font-mono text-[11px]"
              >
                fastapi/fastapi
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleSelectSample('https://github.com/pallets/flask')}
                className="text-slate-300 hover:text-sky-300 underline font-mono text-[11px]"
              >
                pallets/flask
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleSelectSample('https://github.com/expressjs/express')}
                className="text-slate-300 hover:text-sky-300 underline font-mono text-[11px]"
              >
                expressjs/express
              </button>
            </div>
          </div>
        </section>

        {/* THREE-PANEL LEARNING WORKSPACE */}
        <section
          id="workspace-preview"
          aria-label="Three Panel Workspace Preview"
          className="flex-1 px-4 lg:px-8 max-w-7xl mx-auto w-full pb-12"
        >
          <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden shadow-2xl flex flex-col h-[750px]">
            {/* Workspace Top Toolbar */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="text-slate-400 border-l border-slate-800 pl-3">
                  Workspace:{' '}
                  <strong className="text-white">
                    {analysis ? analysis.metadata.full_name : 'FastAPI / Sample Workspace'}
                  </strong>
                </span>
                {analysis && (
                  <span className="text-slate-400 hidden sm:inline flex items-center space-x-2">
                    <span>
                      commit: <code className="text-sky-300">{analysis.metadata.commit_sha.slice(0, 7)}</code>
                    </span>
                    {analysis.metadata.stars_count > 0 && (
                      <span className="flex items-center space-x-1 text-amber-400">
                        <Star className="h-3 w-3 fill-amber-400" />
                        <span>{analysis.metadata.stars_count.toLocaleString()}</span>
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {analysis ? (
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center space-x-1">
                    <Check className="h-3 w-3" />
                    <span>AST INTELLIGENCE ACTIVE</span>
                  </span>
                ) : (
                  <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    SAMPLE PREVIEW
                  </div>
                )}
              </div>
            </div>

            {/* 3 Panels Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden">
              {/* 1. LEFT SIDEBAR: Repository Explorer */}
              <div className="lg:col-span-3 flex flex-col bg-slate-900/40 overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <FolderTree className="h-3.5 w-3.5 text-sky-400" />
                    <span>File Explorer</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {analysis ? `${analysis.total_files} files` : 'Tree-sitter AST'}
                  </span>
                </div>

                <div className="flex-1 overflow-hidden">
                  {analysis ? (
                    <FileTree
                      tree={analysis.tree}
                      selectedPath={selectedFile ? selectedFile.path : null}
                      onSelectFile={(node) => handleSelectFile(node)}
                    />
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                      <FolderTree className="h-8 w-8 text-slate-600 mx-auto" />
                      <p>Enter a repository URL above to load the live file tree.</p>
                      <div className="text-[11px] text-slate-600 font-mono">
                        Tree-sitter extracts symbols from Python, TypeScript, and JavaScript.
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-slate-800 bg-slate-900/60">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Curriculum Progress</span>
                    <span className="font-mono text-sky-400">Phase 3 Active</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-sky-400 h-1.5 rounded-full w-3/5" />
                  </div>
                </div>
              </div>

              {/* 2. CENTER WORKSPACE: Selected Source Code & Architecture */}
              <div className="lg:col-span-6 flex flex-col bg-slate-950 overflow-hidden">
                {/* Center Tabs */}
                <div className="bg-slate-900/80 border-b border-slate-800 px-2 flex items-center space-x-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCenterTab('code')}
                    className={`px-3 py-2 border-b-2 font-mono flex items-center space-x-1.5 transition-colors ${
                      activeCenterTab === 'code'
                        ? 'border-sky-400 text-white font-medium bg-slate-800/40'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Terminal className="h-3.5 w-3.5 text-sky-400" />
                    <span>{selectedFile ? selectedFile.name : 'Source Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCenterTab('architecture')}
                    className={`px-3 py-2 border-b-2 font-mono flex items-center space-x-1.5 transition-colors ${
                      activeCenterTab === 'architecture'
                        ? 'border-sky-400 text-white font-medium bg-slate-800/40'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Architecture Graph</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCenterTab('flow')}
                    className={`px-3 py-2 border-b-2 font-mono flex items-center space-x-1.5 transition-colors ${
                      activeCenterTab === 'flow'
                        ? 'border-sky-400 text-white font-medium bg-slate-800/40'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Execution Flow</span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                  {activeCenterTab === 'code' && (
                    <CodeViewer
                      selectedPath={selectedFile ? selectedFile.path : 'fastapi/applications.py'}
                      fileData={
                        fileContent || {
                          path: 'fastapi/applications.py',
                          commit_sha: '8f3d9a1',
                          content:
                            'from typing import Any, Callable, Dict, List, Optional\nfrom starlette.applications import Starlette\nfrom fastapi.datastructures import Default\n\nclass FastAPI(Starlette):\n    """Core FastAPI application instance providing route registration\n    and OpenAPI schema generation."""\n    def __init__(self, title: str = "FastAPI", version: str = "0.1.0"):\n        self.title = title\n        self.version = version\n        self.router = APIRouter()\n',
                          size: 320,
                          is_binary: false,
                          language: 'python',
                        }
                      }
                      analysis={fileAnalysis}
                      isLoading={isFileLoading}
                      error={fileError}
                      targetLine={jumpToLine}
                    />
                  )}

                  {activeCenterTab === 'architecture' && (
                    <ArchitectureGraph
                      graph={repoGraph}
                      isLoading={isGraphLoading}
                      error={graphError}
                      onSelectNode={handleSelectGraphNode}
                      onRefresh={() => {
                        if (analysis) {
                          loadGraph(analysis.metadata.owner, analysis.metadata.name, analysis.metadata.commit_sha);
                        }
                      }}
                    />
                  )}

                  {activeCenterTab === 'flow' && (
                    <div className="h-full flex flex-col p-6 space-y-4 overflow-y-auto">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center space-x-2 text-sm font-semibold text-emerald-400 mb-2">
                          <Compass className="h-4 w-4" />
                          <span>Inferred Execution Flow Chain</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                          Statically inferred entry points and primary module dependency chains.
                        </p>

                        <div className="space-y-3 font-mono text-xs">
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center space-x-3">
                            <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px]">
                              1
                            </span>
                            <div>
                              <div className="text-white font-semibold">Entry Point Initialization</div>
                              <div className="text-[11px] text-slate-500">
                                {repoGraph?.entry_points[0] || 'app/main.py'}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center space-x-3">
                            <span className="h-6 w-6 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold text-[11px]">
                              2
                            </span>
                            <div>
                              <div className="text-white font-semibold">Configuration & Routing Mounts</div>
                              <div className="text-[11px] text-slate-500">
                                Imports core configurations, routers, and schemas.
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center space-x-3">
                            <span className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[11px]">
                              3
                            </span>
                            <div>
                              <div className="text-white font-semibold">Services & Request Handlers</div>
                              <div className="text-[11px] text-slate-500">
                                Dispatches incoming calls to domain logic.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Center Bottom: Reference Indicator */}
                <div className="bg-slate-900/60 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                    <span className="truncate">
                      Active: <code className="text-sky-300">{selectedFile ? selectedFile.path : 'fastapi/applications.py'}</code>
                    </span>
                    {fileAnalysis && (
                      <span className="text-slate-500 hidden md:inline">
                        ({fileAnalysis.symbols.length} symbols, {fileAnalysis.imports.length} imports)
                      </span>
                    )}
                  </div>
                  {analysis && (
                    <span className="shrink-0 text-slate-500 hidden sm:inline">
                      Commit: <code className="text-slate-300">{analysis.metadata.commit_sha.slice(0, 7)}</code>
                    </span>
                  )}
                </div>
              </div>

              {/* 3. RIGHT PANEL: AI Tutor Avatar & Explanations */}
              <div className="lg:col-span-3 flex flex-col bg-slate-900/50 overflow-hidden">
                {/* Tutor Header */}
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>AI Tutor Avatar</span>
                  </span>
                  <span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/20">
                    AST Grounded
                  </span>
                </div>

                {/* Animated Avatar Box */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center">
                  <div className="relative mb-2">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border-2 border-sky-400/50 flex items-center justify-center shadow-lg shadow-sky-500/10">
                      <svg
                        className="h-12 w-12 text-sky-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                        <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                      </svg>
                    </div>
                    <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-400 border-2 border-slate-950" />
                  </div>

                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">Mentor Ava (Senior Architect)</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {isPlayingAudio ? 'Speaking explanation...' : 'Ready for questions'}
                    </div>
                  </div>

                  {/* Voice Controls Bar */}
                  <div className="flex items-center space-x-2 mt-3 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                      className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={isPlayingAudio ? 'Pause Voice' : 'Play Voice'}
                    >
                      {isPlayingAudio ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <div className="h-3 w-[1px] bg-slate-800" />
                    <span className="text-[10px] font-mono text-slate-400">TTS: Piper / Mock</span>
                  </div>
                </div>

                {/* Grounded Explanation Conversation */}
                <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="font-semibold text-white flex items-center space-x-1.5">
                      <Terminal className="h-3 w-3 text-sky-400" />
                      <span>AST Insight: {selectedFile ? selectedFile.name : 'applications.py'}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {fileAnalysis && fileAnalysis.symbols.length > 0 ? (
                        <>
                          Found <strong>{fileAnalysis.symbols.length} AST symbols</strong> (
                          {fileAnalysis.symbols.map((s) => s.name).slice(0, 3).join(', ')}
                          {fileAnalysis.symbols.length > 3 ? '...' : ''}) and{' '}
                          <strong>{fileAnalysis.imports.length} imports</strong>.
                        </>
                      ) : (
                        'Select any Python, TypeScript, or JavaScript file to inspect its AST classes, functions, and cross-file dependencies.'
                      )}
                    </p>
                    <div className="text-[10px] text-sky-300 font-mono bg-sky-950/60 p-1.5 rounded border border-sky-900/60">
                      Citations:{' '}
                      <span className="underline">
                        {selectedFile ? selectedFile.path : 'fastapi/applications.py:L1-L24'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-2.5">
                    <div className="text-[11px] font-medium text-slate-400 mb-1">
                      Suggested Follow-Up:
                    </div>
                    <button
                      type="button"
                      className="w-full text-left text-xs text-sky-300 hover:underline py-1"
                    >
                      &quot;Trace where this module is imported in the architecture graph&quot;
                    </button>
                  </div>
                </div>

                {/* Follow-up question input */}
                <div className="p-3 border-t border-slate-800 bg-slate-900/60">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      placeholder="Ask Ava about this file... (Phase 4)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-500 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 lg:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span>RepoMentor AI — Open Source Code Intelligence</span>
        </div>
        <div className="flex items-center space-x-4">
          <a href="/docs/architecture.md" className="hover:text-slate-400 transition-colors">
            Architecture
          </a>
          <span>•</span>
          <a href="/docs/development.md" className="hover:text-slate-400 transition-colors">
            Setup Guide
          </a>
          <span>•</span>
          <a href="/docs/roadmap.md" className="hover:text-slate-400 transition-colors">
            Roadmap
          </a>
        </div>
      </footer>
    </div>
  );
}
