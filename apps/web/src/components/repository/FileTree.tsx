'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react';
import { FileNode } from '@/lib/api';

interface FileTreeProps {
  tree: FileNode[];
  selectedPath: string | null;
  onSelectFile: (node: FileNode) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  selectedPath,
  onSelectFile,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const toggleDir = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const matchesFilter = (node: FileNode, query: string): boolean => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    if (node.name.toLowerCase().includes(lowerQuery)) return true;
    if (node.children) {
      return node.children.some((child) => matchesFilter(child, query));
    }
    return false;
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isDir = node.type === 'dir';
    const isExpanded = expandedPaths.has(node.path) || filterQuery.length > 0;
    const isSelected = selectedPath === node.path;

    if (!matchesFilter(node, filterQuery)) {
      return null;
    }

    const paddingLeft = `${depth * 14 + 8}px`;

    if (isDir) {
      return (
        <div key={node.path} className="select-none">
          <button
            type="button"
            onClick={() => toggleDir(node.path)}
            style={{ paddingLeft }}
            className="w-full text-left py-1 pr-2 flex items-center space-x-1.5 text-xs text-slate-300 hover:bg-slate-800/60 rounded transition-colors group cursor-pointer"
          >
            <span className="text-slate-500 group-hover:text-slate-400">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-sky-400" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-sky-500" />
            )}
            <span className="font-mono truncate">{node.name}</span>
          </button>

          {isExpanded && node.children && (
            <div className="space-y-0.5">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File Node
    return (
      <div key={node.path}>
        <button
          type="button"
          onClick={() => onSelectFile(node)}
          style={{ paddingLeft }}
          className={`w-full text-left py-1 pr-2 flex items-center justify-between text-xs rounded transition-colors group cursor-pointer ${
            isSelected
              ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center space-x-1.5 truncate">
            {node.is_binary ? (
              <File className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            ) : node.language ? (
              <FileCode className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            )}
            <span className="font-mono truncate text-[11px]">{node.name}</span>
          </div>

          <div className="flex items-center space-x-1 shrink-0 ml-2">
            {node.is_binary ? (
              <span className="text-[9px] font-mono text-amber-400/80 bg-amber-500/10 px-1 rounded">
                bin
              </span>
            ) : node.language ? (
              <span className="text-[9px] font-mono text-slate-500 bg-slate-800/80 px-1 rounded">
                {node.language}
              </span>
            ) : null}
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search / Filter Input */}
      <div className="p-2 border-b border-slate-800/80">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter files in repository..."
            className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono transition-all"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {tree.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No source files found in repository.
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
};
