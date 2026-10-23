"""Pydantic schemas for code intelligence, AST symbol extraction, and dependency graphs."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SourceSpan(BaseModel):
    """Accurate source line and column span."""

    start_line: int = Field(..., description="1-indexed starting line number")
    end_line: int = Field(..., description="1-indexed ending line number (inclusive)")
    start_col: int = Field(0, description="0-indexed start column offset")
    end_col: int = Field(0, description="0-indexed end column offset")


class Symbol(BaseModel):
    """Extracted code symbol (class, function, method, interface)."""

    name: str = Field(..., description="Identifier name of the symbol")
    kind: str = Field(..., description="Symbol category: class, function, method, interface, variable")
    span: SourceSpan = Field(..., description="Source location range")
    parent: Optional[str] = Field(None, description="Enclosing class or namespace if applicable")
    docstring: Optional[str] = Field(None, description="Extracted docstring or JSDoc if present")
    parameters: List[str] = Field(default_factory=list, description="Formal parameter names")
    return_type: Optional[str] = Field(None, description="Explicit return type annotation if declared")
    is_exported: bool = Field(True, description="Whether the symbol is exposed or exported")


class ImportStatement(BaseModel):
    """Extracted module import statement."""

    module: str = Field(..., description="Imported module or source file specifier")
    names: List[str] = Field(default_factory=list, description="Specific imported symbols")
    alias: Optional[str] = Field(None, description="Local namespace alias")
    span: SourceSpan = Field(..., description="Location of import statement")
    is_relative: bool = Field(False, description="Whether the import is a relative path (e.g. ./utils)")


class FileAnalysisResult(BaseModel):
    """Result of static AST parsing for an individual file."""

    file_path: str = Field(..., description="Relative file path within repository")
    language: str = Field(..., description="Detected programming language")
    symbols: List[Symbol] = Field(default_factory=list, description="Extracted classes, functions, methods")
    imports: List[ImportStatement] = Field(default_factory=list, description="Extracted import dependencies")
    syntax_errors: List[str] = Field(default_factory=list, description="Any syntax errors or unsupported constructs encountered")
    line_count: int = Field(..., description="Total line count of the source file")
    is_supported: bool = Field(True, description="Whether parser supports deep AST extraction for this language")


class GraphNode(BaseModel):
    """Node in the codebase dependency and architecture graph."""

    id: str = Field(..., description="Unique identifier (e.g., file path or symbol ID)")
    label: str = Field(..., description="Display label")
    type: str = Field("file", description="'file' or 'symbol'")
    language: Optional[str] = Field(None, description="Programming language")
    symbol_kind: Optional[str] = Field(None, description="class, function, etc. if node is a symbol")
    file_path: str = Field(..., description="Containing file path")
    line: Optional[int] = Field(None, description="Line number if symbol node")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="In-degree, out-degree, or complexity metrics")


class GraphEdge(BaseModel):
    """Directed edge in the dependency graph."""

    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    kind: str = Field("imports", description="'imports', 'defines', 'calls', or 'inherits'")
    label: Optional[str] = Field(None, description="Edge description, e.g. imported symbol names")


class DependencyGraph(BaseModel):
    """Full repository architecture and dependency graph."""

    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    total_files_analyzed: int = Field(0)
    total_symbols_extracted: int = Field(0)
    entry_points: List[str] = Field(default_factory=list, description="Inferred top-level entry point files")


class FileParseRequest(BaseModel):
    """Request payload to parse arbitrary file content."""

    file_path: str
    content: str
