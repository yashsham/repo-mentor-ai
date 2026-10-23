'use client';

import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  GitCommit,
  FileCode,
  Box,
  Compass,
  Cpu,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DependencyGraph, GraphNode, GraphEdge } from '@/lib/api';

interface ArchitectureGraphProps {
  graph: DependencyGraph | null;
  isLoading: boolean;
  error: string | null;
  onSelectNode: (filePath: string, line?: number) => void;
  onRefresh?: () => void;
}

export const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({
  graph,
  isLoading,
  error,
  onSelectNode,
  onRefresh,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<'all' | 'file' | 'symbol'>('all');

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
        <h3 className="text-sm font-semibold text-white">Analyzing Repository Architecture</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Parsing Tree-sitter ASTs across modules and resolving cross-file import dependencies...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-rose-400">
        <Layers className="h-10 w-10 text-rose-500 mb-3" />
        <h3 className="text-sm font-semibold text-white">Architecture Graph Unavailable</h3>
        <p className="text-xs text-rose-300 max-w-md mt-1">{error}</p>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded font-mono flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry Graph Extraction</span>
          </button>
        )}
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <Layers className="h-10 w-10 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No Architecture Graph</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Select or analyze a repository containing supported Python, TypeScript, or JavaScript code.
        </p>
      </div>
    );
  }

  const filteredNodes = graph.nodes.filter((node) => {
    if (nodeTypeFilter !== 'all' && node.type !== nodeTypeFilter) return false;
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return node.label.toLowerCase().includes(q) || node.file_path.toLowerCase().includes(q);
  });

  const fileNodes = graph.nodes.filter((n) => n.type === 'file');
  const symbolNodes = graph.nodes.filter((n) => n.type === 'symbol');
  const importEdges = graph.edges.filter((e) => e.kind === 'imports');

  return (
    <div className="h-full flex flex-col bg-slate-950 font-mono text-xs overflow-hidden">
      {/* Graph Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span className="text-white font-medium">Dependency & Architecture Graph</span>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {graph.total_files_analyzed} modules • {importEdges.length} import edges • {graph.total_symbols_extracted} symbols
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Node Type Selector */}
          <div className="flex rounded bg-slate-950 border border-slate-800 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setNodeTypeFilter('all')}
              className={`px-2 py-0.5 rounded ${nodeTypeFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setNodeTypeFilter('file')}
              className={`px-2 py-0.5 rounded ${nodeTypeFilter === 'file' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Files ({fileNodes.length})
            </button>
            <button
              type="button"
              onClick={() => setNodeTypeFilter('symbol')}
              className={`px-2 py-0.5 rounded ${nodeTypeFilter === 'symbol' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Symbols ({symbolNodes.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2 top-2 text-slate-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter nodes..."
              className="pl-7 pr-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Entry Points Section */}
        {graph.entry_points.length > 0 && (
          <div className="bg-slate-900/60 border border-emerald-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold mb-2">
              <Compass className="h-3.5 w-3.5" />
              <span>Inferred Application Entry Points</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {graph.entry_points.map((ep) => (
                <button
                  key={ep}
                  type="button"
                  onClick={() => onSelectNode(ep)}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40 text-[11px] transition-colors cursor-pointer"
                >
                  <Cpu className="h-3 w-3" />
                  <span>{ep}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nodes Grid */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Modules & AST Definitions ({filteredNodes.length})</span>
            <span className="text-[10px] text-slate-500">Click node to inspect source</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredNodes.map((node) => {
              const isFile = node.type === 'file';
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node.file_path, node.line || undefined)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer group ${
                    isFile
                      ? 'bg-slate-900/80 border-slate-800 hover:border-sky-500/50 hover:bg-slate-850'
                      : 'bg-slate-900/40 border-slate-800/60 hover:border-indigo-500/50 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5 truncate">
                      {isFile ? (
                        <FileCode className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                      ) : (
                        <Box className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      )}
                      <span className="font-semibold text-white truncate text-xs group-hover:text-sky-300">
                        {node.label}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                        isFile
                          ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      }`}
                    >
                      {node.symbol_kind || node.language || node.type}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 truncate mb-1">
                    {node.file_path} {node.line ? `(L${node.line})` : ''}
                  </div>

                  {isFile && node.metrics && (
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>In: {node.metrics.in_degree || 0}</span>
                      <span>Out: {node.metrics.out_degree || 0}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resolved Dependencies Flow */}
        {importEdges.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Cross-Module Import Edges ({importEdges.length})
            </h4>

            <div className="bg-slate-900/40 border border-slate-800 rounded-lg divide-y divide-slate-800/60 overflow-hidden">
              {importEdges.slice(0, 20).map((edge, idx) => (
                <div
                  key={`${edge.source}->${edge.target}-${idx}`}
                  className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-900/80 transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-sky-300 truncate">{edge.source}</span>
                    <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                    <span className="text-emerald-300 truncate">{edge.target}</span>
                  </div>

                  {edge.label && (
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs ml-2">
                      imports: {edge.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
