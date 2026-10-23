"""Dependency and architecture graph builder for codebase intelligence."""

import os
from typing import Dict, List, Optional, Set
from app.api.schemas.analysis import (
    DependencyGraph,
    FileAnalysisResult,
    GraphEdge,
    GraphNode,
)

# Canonical entry point filenames
CANONICAL_ENTRY_POINTS = {
    "main.py", "app.py", "wsgi.py", "asgi.py", "cli.py", "server.py",
    "index.ts", "index.js", "app.ts", "app.js", "server.ts", "server.js",
    "page.tsx", "layout.tsx", "main.ts", "main.js",
}


class DependencyGraphBuilder:
    """Constructs file and symbol dependency graphs from AST analysis results."""

    def __init__(self, analyzed_files: List[FileAnalysisResult]):
        self.analyzed_files = analyzed_files
        self.file_map: Dict[str, FileAnalysisResult] = {f.file_path: f for f in analyzed_files}
        self.known_paths: Set[str] = set(self.file_map.keys())

    def build_graph(self) -> DependencyGraph:
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []
        in_degrees: Dict[str, int] = {p: 0 for p in self.known_paths}
        out_degrees: Dict[str, int] = {p: 0 for p in self.known_paths}
        total_symbols = 0

        # 1. Create file and symbol nodes
        for file_res in self.analyzed_files:
            file_id = file_res.file_path
            nodes.append(
                GraphNode(
                    id=file_id,
                    label=os.path.basename(file_id),
                    type="file",
                    language=file_res.language,
                    file_path=file_id,
                )
            )

            # Add symbol nodes and 'defines' edges
            for sym in file_res.symbols:
                total_symbols += 1
                sym_id = f"{file_id}::{sym.name}"
                nodes.append(
                    GraphNode(
                        id=sym_id,
                        label=sym.name,
                        type="symbol",
                        symbol_kind=sym.kind,
                        language=file_res.language,
                        file_path=file_id,
                        line=sym.span.start_line,
                    )
                )
                edges.append(
                    GraphEdge(
                        source=file_id,
                        target=sym_id,
                        kind="defines",
                        label=sym.kind,
                    )
                )

        # 2. Resolve import dependencies across files
        for file_res in self.analyzed_files:
            src_path = file_res.file_path
            for imp in file_res.imports:
                target_path = self._resolve_import(src_path, imp.module, file_res.language)
                if target_path and target_path != src_path:
                    edge_label = ", ".join(imp.names) if imp.names else None
                    edges.append(
                        GraphEdge(
                            source=src_path,
                            target=target_path,
                            kind="imports",
                            label=edge_label,
                        )
                    )
                    out_degrees[src_path] = out_degrees.get(src_path, 0) + 1
                    in_degrees[target_path] = in_degrees.get(target_path, 0) + 1

        # 3. Attach metrics to nodes
        for node in nodes:
            if node.type == "file":
                node.metrics = {
                    "in_degree": in_degrees.get(node.id, 0),
                    "out_degree": out_degrees.get(node.id, 0),
                }

        # 4. Infer entry points (files matching canonical names or root with 0 in-degree)
        entry_points: List[str] = []
        for p in self.known_paths:
            base = os.path.basename(p).lower()
            if base in CANONICAL_ENTRY_POINTS:
                entry_points.append(p)
            elif in_degrees.get(p, 0) == 0 and out_degrees.get(p, 0) > 0:
                if p not in entry_points:
                    entry_points.append(p)

        return DependencyGraph(
            nodes=nodes,
            edges=edges,
            total_files_analyzed=len(self.analyzed_files),
            total_symbols_extracted=total_symbols,
            entry_points=sorted(entry_points),
        )

    def _resolve_import(self, current_file: str, module_specifier: str, language: str) -> Optional[str]:
        """Resolves an import specifier to an indexed file path."""
        if not module_specifier:
            return None

        # Clean specifier
        mod = module_specifier.strip("'\"`")
        curr_dir = os.path.dirname(current_file)

        if language == "python":
            # Convert dotted python import (e.g. app.core.config) to path
            as_path = mod.replace(".", "/")
            candidates = [
                f"{as_path}.py",
                f"{as_path}/__init__.py",
            ]
            # If relative import
            if mod.startswith("."):
                dots = len(mod) - len(mod.lstrip("."))
                rem = mod[dots:].replace(".", "/")
                base_dir = curr_dir
                for _ in range(dots - 1):
                    base_dir = os.path.dirname(base_dir)
                rel_base = f"{base_dir}/{rem}".strip("/")
                candidates.extend([f"{rel_base}.py", f"{rel_base}/__init__.py"])

            # Check inside repository
            for cand in candidates:
                cand_clean = os.path.normpath(cand).replace("\\", "/")
                if cand_clean in self.known_paths:
                    return cand_clean
                # Also check suffix match
                for kp in self.known_paths:
                    if kp.endswith(cand_clean):
                        return kp

        elif language in ("typescript", "typescriptreact", "javascript", "javascriptreact"):
            # Handle alias @/ -> src/
            mod_resolved = mod
            if mod.startswith("@/"):
                mod_resolved = "src/" + mod[2:]
            elif mod.startswith("./") or mod.startswith("../"):
                mod_resolved = os.path.normpath(os.path.join(curr_dir, mod)).replace("\\", "/")

            candidates = [
                mod_resolved,
                f"{mod_resolved}.ts",
                f"{mod_resolved}.tsx",
                f"{mod_resolved}.js",
                f"{mod_resolved}.jsx",
                f"{mod_resolved}/index.ts",
                f"{mod_resolved}/index.tsx",
                f"{mod_resolved}/index.js",
            ]

            for cand in candidates:
                cand_clean = cand.replace("\\", "/")
                if cand_clean in self.known_paths:
                    return cand_clean
                for kp in self.known_paths:
                    if kp.endswith(cand_clean) or kp.replace("\\", "/") == cand_clean:
                        return kp

        return None
