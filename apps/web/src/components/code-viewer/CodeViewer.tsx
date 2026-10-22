'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  AlertTriangle,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { FileContentResponse } from '@/lib/api';

interface CodeViewerProps {
  selectedPath: string | null;
  fileData: FileContentResponse | null;
  isLoading: boolean;
  error: string | null;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  selectedPath,
  fileData,
  isLoading,
  error,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (fileData?.content) {
      navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!selectedPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
        <FileCode className="h-12 w-12 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No File Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Choose a file from the repository tree on the left to inspect its source code, AST symbols, and architecture.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
        <Loader2 className="h-8 w-8 text-sky-400 animate-spin mb-3" />
        <span className="text-xs font-mono">Loading {selectedPath}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-rose-400">
        <AlertTriangle className="h-10 w-10 text-rose-500 mb-3" />
        <h3 className="text-sm font-semibold text-white">Failed to Load File</h3>
        <p className="text-xs text-rose-300 max-w-md mt-1">{error}</p>
      </div>
    );
  }

  if (!fileData) {
    return null;
  }

  if (fileData.is_binary) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
        <FileQuestion className="h-10 w-10 text-amber-400 mb-3" />
        <h3 className="text-sm font-semibold text-white">Binary File Detected</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          <code className="text-amber-300">{selectedPath}</code> is a binary file format and cannot be displayed as plain text.
        </p>
      </div>
    );
  }

  const lines = fileData.content.split('\n');

  return (
    <div className="h-full flex flex-col bg-slate-950 font-mono text-xs overflow-hidden">
      {/* File Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2 truncate">
          <FileCode className="h-4 w-4 text-sky-400 shrink-0" />
          <span className="text-white font-medium truncate">{fileData.path}</span>
          {fileData.language && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 border border-slate-700">
              {fileData.language}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <span className="text-[11px] text-slate-500">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'} •{' '}
            {(fileData.size / 1024).toFixed(1)} KB
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-slate-400" />
                <span className="text-[10px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Text View with Line Numbers */}
      <div className="flex-1 overflow-auto p-4 select-text">
        {lines.length === 0 || (lines.length === 1 && lines[0] === '') ? (
          <div className="text-slate-500 italic py-4">File is empty.</div>
        ) : (
          <div className="min-w-fit">
            {lines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-slate-900/60 leading-5">
                <span className="w-10 text-slate-600 select-none text-right pr-4 shrink-0 font-mono text-[11px]">
                  {idx + 1}
                </span>
                <span className="text-slate-200 whitespace-pre font-mono text-xs">
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
