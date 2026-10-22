'use client';

import React, { useState, useEffect } from 'react';
import {
  Code2,
  FolderTree,
  GitBranch,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Info,
  Terminal,
} from 'lucide-react';
import { validateRepositoryUrl, ValidationResult } from '@/lib/validation';
import { checkBackendHealth, HealthStatus } from '@/lib/api';

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAnalysisRepo, setActiveAnalysisRepo] = useState<string | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<'code' | 'architecture' | 'flow'>('code');
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [backendHealth, setBackendHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    // Poll backend health on initial render
    checkBackendHealth().then(setBackendHealth);
  }, []);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateRepositoryUrl(repoUrl);
    setValidation(result);

    if (result.isValid) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setActiveAnalysisRepo(`${result.owner}/${result.repo}`);
      }, 400);
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setRepoUrl(sampleUrl);
    const result = validateRepositoryUrl(sampleUrl);
    setValidation(result);
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
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                Phase 1 MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Code Intelligence & Grounded AI Technical Mentor
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          {/* Backend Status Badge */}
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
        <section className="px-4 lg:px-8 pt-10 pb-8 max-w-5xl mx-auto w-full text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-mono mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Open-Source First • AST Static Analysis • Zero Arbitrary Code Execution</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Deeply understand complex codebases through{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
              grounded AI mentoring
            </span>
          </h1>

          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed mb-8">
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
                      <span>Validating...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze Repository</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Validation Feedback */}
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

              {validation && validation.isValid && (
                <div
                  id="validation-success"
                  className="flex items-start space-x-2 text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-900/60 rounded p-2.5 mt-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">
                      Validated Repository: {validation.owner}/{validation.repo}
                    </div>
                    <div className="text-slate-300 mt-0.5">
                      Target repository verified. Phase 1 active: Full AST extraction and background ingestion worker activate in Milestone 2. Previewing interface layout below.
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

        {/* Milestone 1 Notice Banner */}
        <section className="px-4 lg:px-8 max-w-7xl mx-auto w-full mb-4">
          <div className="bg-slate-900 border border-sky-500/30 rounded-lg p-3 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-sky-400 shrink-0" />
              <span>
                <strong className="text-white">Milestone 1 Preview:</strong> The three-panel workspace below illustrates the target architecture interface. Dynamic ingestion and Tree-sitter AST parsing will activate in Phase 2.
              </span>
            </div>
            <div className="flex items-center space-x-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                Active Target: {activeAnalysisRepo || 'fastapi/fastapi (sample)'}
              </span>
            </div>
          </div>
        </section>

        {/* THREE-PANEL LEARNING WORKSPACE (PREVIEW) */}
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
                  Workspace: <strong className="text-white">{activeAnalysisRepo || 'fastapi/fastapi'}</strong>
                </span>
                <span className="text-slate-500 hidden sm:inline">
                  (commit: <code className="text-sky-300">8f3d9a1</code>)
                </span>
              </div>
              <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                LAYOUT PREVIEW ONLY
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
                  <span className="text-[10px] font-mono text-slate-500">Tree-sitter AST</span>
                </div>

                {/* Filter Input */}
                <div className="p-2 border-b border-slate-800/60">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      readOnly
                      placeholder="Filter files or symbols..."
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* File Tree List */}
                <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
                  <div className="text-slate-400 font-semibold px-2 py-1 flex items-center space-x-1 text-[11px] text-slate-500">
                    <span>▾ fastapi/</span>
                  </div>

                  <div className="pl-4 space-y-0.5">
                    <div className="flex items-center justify-between px-2 py-1.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 cursor-pointer">
                      <div className="flex items-center space-x-2 truncate">
                        <Terminal className="h-3.5 w-3.5 text-sky-400" />
                        <span className="truncate">applications.py</span>
                      </div>
                      <span className="text-[10px] text-sky-400/80">Active</span>
                    </div>

                    <div className="flex items-center justify-between px-2 py-1 rounded text-slate-400 hover:bg-slate-800/50 cursor-pointer">
                      <div className="flex items-center space-x-2 truncate">
                        <Terminal className="h-3.5 w-3.5 text-slate-500" />
                        <span className="truncate">routing.py</span>
                      </div>
                      <span className="text-[9px] bg-slate-800 text-slate-500 px-1 rounded">AST</span>
                    </div>

                    <div className="flex items-center justify-between px-2 py-1 rounded text-slate-400 hover:bg-slate-800/50 cursor-pointer">
                      <div className="flex items-center space-x-2 truncate">
                        <Terminal className="h-3.5 w-3.5 text-slate-500" />
                        <span className="truncate">datastructures.py</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2 py-1 rounded text-slate-400 hover:bg-slate-800/50 cursor-pointer">
                      <div className="flex items-center space-x-2 truncate">
                        <Terminal className="h-3.5 w-3.5 text-slate-500" />
                        <span className="truncate">exceptions.py</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-500 font-semibold px-2 py-1 mt-2 text-[11px]">
                    <span>▸ tests/</span>
                  </div>
                  <div className="text-slate-500 font-semibold px-2 py-1 text-[11px]">
                    <span>▸ docs/</span>
                  </div>
                  <div className="px-2 py-1 text-slate-400 flex items-center space-x-2 text-xs">
                    <span>pyproject.toml</span>
                  </div>
                </div>

                {/* Left Bottom: Learning Progress Card */}
                <div className="p-3 border-t border-slate-800 bg-slate-900/60">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Curriculum Progress</span>
                    <span className="font-mono text-sky-400">25% (3/12)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-sky-400 h-1.5 rounded-full w-1/4" />
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
                    <Code2 className="h-3.5 w-3.5 text-sky-400" />
                    <span>fastapi/applications.py</span>
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
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300 bg-slate-950">
                  {activeCenterTab === 'code' && (
                    <div className="space-y-1 select-text">
                      <div className="text-slate-500 text-[11px] mb-3 pb-2 border-b border-slate-800 flex items-center justify-between">
                        <span># Grounded source references: lines 1-22</span>
                        <span className="text-sky-400">Tree-sitter Python AST Parsed</span>
                      </div>

                      <div className="flex">
                        <span className="w-8 text-slate-600 select-none text-right pr-3">1</span>
                        <span className="text-purple-400">from</span>
                        <span className="text-slate-300 ml-1">typing</span>
                        <span className="text-purple-400 ml-1">import</span>
                        <span className="text-slate-300 ml-1">Any, Callable, Dict, List, Optional</span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-slate-600 select-none text-right pr-3">2</span>
                        <span className="text-purple-400">from</span>
                        <span className="text-slate-300 ml-1">starlette.applications</span>
                        <span className="text-purple-400 ml-1">import</span>
                        <span className="text-slate-300 ml-1">Starlette</span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-slate-600 select-none text-right pr-3">3</span>
                        <span className="text-purple-400">from</span>
                        <span className="text-slate-300 ml-1">fastapi.datastructures</span>
                        <span className="text-purple-400 ml-1">import</span>
                        <span className="text-slate-300 ml-1">Default</span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-slate-600 select-none text-right pr-3">4</span>
                        <span></span>
                      </div>
                      <div className="flex bg-sky-500/10 -mx-4 px-4 py-0.5 border-l-2 border-sky-400">
                        <span className="w-8 text-sky-400 font-bold select-none text-right pr-3">5</span>
                        <span className="text-purple-400">class</span>
                        <span className="text-amber-300 ml-1 font-bold">FastAPI</span>
                        <span className="text-slate-400">(</span>
                        <span className="text-teal-300">Starlette</span>
                        <span className="text-slate-400">):</span>
                      </div>
                      <div className="flex bg-sky-500/10 -mx-4 px-4 py-0.5 border-l-2 border-sky-400">
                        <span className="w-8 text-sky-400 font-bold select-none text-right pr-3">6</span>
                        <span className="text-slate-500 ml-4">&quot;&quot;&quot;Core FastAPI application instance providing route registration</span>
                      </div>
                      <div className="flex bg-sky-500/10 -mx-4 px-4 py-0.5 border-l-2 border-sky-400">
                        <span className="w-8 text-sky-400 font-bold select-none text-right pr-3">7</span>
                        <span className="text-slate-500 ml-4">and OpenAPI schema generation.&quot;&quot;&quot;</span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-slate-600 select-none text-right pr-3">8</span>
                        <span className="text-purple-400 ml-4">def</span>
                        <span className="text-sky-300 ml-1">__init__</span>
                        <span className="text-slate-400">(self, title: str = &quot;FastAPI&quot;, version: str = &quot;0.1.0&quot;):</span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-slate-600 select-none text-right pr-3">9</span>
                        <span className="text-slate-300 ml-8">self.title = title</span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-slate-600 select-none text-right pr-3">10</span>
                        <span className="text-slate-300 ml-8">self.version = version</span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-slate-600 select-none text-right pr-3">11</span>
                        <span className="text-slate-300 ml-8">self.router = APIRouter()</span>
                      </div>
                    </div>
                  )}

                  {activeCenterTab === 'architecture' && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 max-w-md w-full">
                        <Layers className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                        <h4 className="font-semibold text-white text-sm">Interactive React Flow Graph</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Phase 3 will render nodes for `FastAPI`, `APIRouter`, and dependencies with interactive edges linking to source definitions.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeCenterTab === 'flow' && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 max-w-md w-full">
                        <Cpu className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                        <h4 className="font-semibold text-white text-sm">Execution Flow Trace</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Inferred call graph: HTTP Request → Starlette Middleware → APIRouter Match → Pydantic Validation → Endpoint Handler.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Center Bottom: AST Grounding Indicator */}
                <div className="bg-slate-900/60 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span>Active symbol: <code className="text-sky-300">class FastAPI</code></span>
                  </div>
                  <span>Reference: <code className="text-slate-300">fastapi/applications.py#L5-L11</code></span>
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
                    Grounded RAG
                  </span>
                </div>

                {/* Animated Avatar Box */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center">
                  <div className="relative mb-2">
                    {/* SVG 2D Animated Mentor Avatar */}
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
                    {/* Radar status ring */}
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
                      className="p-1 text-slate-300 hover:text-white transition-colors"
                      title={isPlayingAudio ? 'Pause Voice' : 'Play Voice'}
                    >
                      {isPlayingAudio ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1 text-slate-300 hover:text-white transition-colors"
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
                      <span>Class Overview: FastAPI</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      `FastAPI` inherits from Starlette&apos;s ASGI base class. It wraps request routing with automatic OpenAPI 3.1 documentation generation and Pydantic validation.
                    </p>
                    <div className="text-[10px] text-sky-300 font-mono bg-sky-950/60 p-1.5 rounded border border-sky-900/60">
                      Grounded citation: <span className="underline">fastapi/applications.py:L5-L11</span>
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
                      &quot;How does APIRouter mount nested sub-applications?&quot;
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
