'use client';

import React, { useState, useRef } from 'react';
import {
  FileCode,
  Copy,
  Check,
  AlertTriangle,
  FileQuestion,
  Loader2,
  Box,
  Braces,
  Terminal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { FileContentResponse, FileAnalysisResult, Symbol } from '@/lib/api';

interface CodeViewerProps {
  selectedPath: string | null;
  fileData: FileContentResponse | null;
  analysis?: FileAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  targetLine?: number;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  selectedPath,
  fileData,
  analysis,
  isLoading,
  error,
  targetLine,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSymbols, setShowSymbols] = useState(true);
  const [activeLine, setActiveLine] = useState<number | undefined>(targetLine);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (fileData?.content) {
      navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const jumpToLine = (line: number) => {
    setActiveLine(line);
    if (codeContainerRef.current) {
      const lineElement = codeContainerRef.current.querySelector(`[data-line="${line}"]`);
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
  const symbols = analysis?.symbols || [];

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
          {symbols.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSymbols(!showSymbols)}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors cursor-pointer"
            >
              <Braces className="h-3 w-3" />
              <span>{symbols.length} AST Symbols</span>
              {showSymbols ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <span className="text-[11px] text-slate-500">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'} • {(fileData.size / 1024).toFixed(1)} KB
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

      {/* Syntax Error Banner if Present */}
      {analysis && analysis.syntax_errors.length > 0 && (
        <div className="bg-amber-950/40 border-b border-amber-900/60 px-4 py-2 text-xs text-amber-300 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>{analysis.syntax_errors[0]}</span>
        </div>
      )}

      {/* AST Symbols Quick Bar */}
      {showSymbols && symbols.length > 0 && (
        <div className="bg-slate-900/70 border-b border-slate-800 px-3 py-1.5 flex items-center space-x-2 overflow-x-auto text-[11px] shrink-0">
          <span className="text-slate-500 text-[10px] shrink-0 uppercase tracking-wider">Symbols:</span>
          {symbols.map((sym, idx) => (
            <button
              key={`${sym.name}-${idx}`}
              type="button"
              onClick={() => jumpToLine(sym.span.start_line)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-sky-300 transition-colors shrink-0 cursor-pointer"
              title={`Jump to line ${sym.span.start_line}`}
            >
              {sym.kind === 'class' ? (
                <Box className="h-3 w-3 text-amber-400" />
              ) : sym.kind === 'method' ? (
                <Terminal className="h-3 w-3 text-purple-400" />
              ) : (
                <FileCode className="h-3 w-3 text-sky-400" />
              )}
              <span>{sym.name}</span>
              <span className="text-[9px] text-slate-500">L{sym.span.start_line}</span>
            </button>
          ))}
        </div>
      )}

      {/* Code Text View with Line Numbers */}
      <div ref={codeContainerRef} className="flex-1 overflow-auto p-4 select-text">
        {lines.length === 0 || (lines.length === 1 && lines[0] === '') ? (
          <div className="text-slate-500 italic py-4">File is empty.</div>
        ) : (
          <div className="min-w-fit">
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlighted = activeLine === lineNum;
              return (
                <div
                  key={idx}
                  data-line={lineNum}
                  className={`flex leading-5 transition-colors ${
                    isHighlighted ? 'bg-sky-500/20 border-l-2 border-sky-400 -ml-4 pl-4' : 'hover:bg-slate-900/60'
                  }`}
                >
                  <span
                    className={`w-10 select-none text-right pr-4 shrink-0 font-mono text-[11px] ${
                      isHighlighted ? 'text-sky-400 font-bold' : 'text-slate-600'
                    }`}
                  >
                    {lineNum}
                  </span>
                  <span className="text-slate-200 whitespace-pre font-mono text-xs">
                    {line || ' '}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
