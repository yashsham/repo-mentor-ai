"""Python AST Parser using Tree-sitter with native ast fallback."""

import ast
from typing import List, Optional
import tree_sitter
import tree_sitter_python

from app.analysis.parsers.base import BaseParser
from app.api.schemas.analysis import (
    FileAnalysisResult,
    ImportStatement,
    SourceSpan,
    Symbol,
)


class PythonParser(BaseParser):
    """Parses Python source code into symbols, imports, and source spans."""

    def __init__(self):
        self._language = tree_sitter.Language(tree_sitter_python.language())
        self._parser = tree_sitter.Parser(self._language)

    @property
    def language_name(self) -> str:
        return "python"

    def parse(self, content: str, file_path: str) -> FileAnalysisResult:
        symbols: List[Symbol] = []
        imports: List[ImportStatement] = []
        syntax_errors: List[str] = []
        lines = content.splitlines()
        line_count = len(lines) if lines else 1

        content_bytes = content.encode("utf-8")
        tree = self._parser.parse(content_bytes)
        root = tree.root_node

        # Check for syntax errors reported by tree-sitter
        if root.has_error:
            self._collect_syntax_errors(root, syntax_errors)

        # Traverse tree nodes
        self._traverse_node(root, content_bytes, symbols, imports, parent_class=None)

        # Enhance with native AST docstrings and parameter types if valid python
        try:
            native_tree = ast.parse(content)
            self._enhance_with_native_ast(native_tree, symbols)
        except Exception:
            pass  # Tree-sitter already extracted symbols even if native ast failed

        return FileAnalysisResult(
            file_path=file_path,
            language=self.language_name,
            symbols=symbols,
            imports=imports,
            syntax_errors=syntax_errors,
            line_count=line_count,
            is_supported=True,
        )

    def _collect_syntax_errors(self, node: tree_sitter.Node, errors: List[str]):
        if node.type == "ERROR" or node.is_missing:
            errors.append(
                f"Syntax error near line {node.start_point[0] + 1}, col {node.start_point[1]}"
            )
        for child in node.children:
            self._collect_syntax_errors(child, errors)

    def _traverse_node(
        self,
        node: tree_sitter.Node,
        source: bytes,
        symbols: List[Symbol],
        imports: List[ImportStatement],
        parent_class: Optional[str] = None,
    ):
        for child in node.children:
            if child.type == "function_definition":
                self._handle_function(child, source, symbols, parent_class)
            elif child.type == "class_definition":
                self._handle_class(child, source, symbols, imports)
            elif child.type in ("import_statement", "import_from_statement"):
                self._handle_import(child, source, imports)
            elif child.type in ("decorated_definition", "expression_statement"):
                # Handle decorated functions/classes
                self._traverse_node(child, source, symbols, imports, parent_class)

    def _handle_function(
        self,
        node: tree_sitter.Node,
        source: bytes,
        symbols: List[Symbol],
        parent_class: Optional[str] = None,
    ):
        name_node = node.child_by_field_name("name")
        if not name_node:
            return

        name = source[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="replace")
        params_node = node.child_by_field_name("parameters")
        params: List[str] = []
        if params_node:
            for p in params_node.children:
                if p.type in (
                    "identifier",
                    "typed_parameter",
                    "default_parameter",
                    "typed_default_parameter",
                    "list_splat_pattern",
                    "dictionary_splat_pattern",
                ):
                    p_name = source[p.start_byte:p.end_byte].decode("utf-8", errors="replace")
                    # Clean identifier name
                    clean_name = p_name.split(":")[0].split("=")[0].strip().lstrip("*")
                    if clean_name:
                        params.append(clean_name)

        return_type_node = node.child_by_field_name("return_type")
        return_type = None
        if return_type_node:
            return_type = source[return_type_node.start_byte:return_type_node.end_byte].decode("utf-8", errors="replace").strip()

        kind = "method" if parent_class else "function"
        span = self.create_span(node.start_point, node.end_point)

        symbols.append(
            Symbol(
                name=name,
                kind=kind,
                span=span,
                parent=parent_class,
                parameters=params,
                return_type=return_type,
                is_exported=not name.startswith("_"),
            )
        )

    def _handle_class(
        self,
        node: tree_sitter.Node,
        source: bytes,
        symbols: List[Symbol],
        imports: List[ImportStatement],
    ):
        name_node = node.child_by_field_name("name")
        if not name_node:
            return

        class_name = source[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="replace")
        span = self.create_span(node.start_point, node.end_point)

        symbols.append(
            Symbol(
                name=class_name,
                kind="class",
                span=span,
                parent=None,
                is_exported=not class_name.startswith("_"),
            )
        )

        # Traverse class body for methods
        body_node = node.child_by_field_name("body")
        if body_node:
            self._traverse_node(body_node, source, symbols, imports, parent_class=class_name)

    def _handle_import(self, node: tree_sitter.Node, source: bytes, imports: List[ImportStatement]):
        text = source[node.start_byte:node.end_byte].decode("utf-8", errors="replace").strip()
        span = self.create_span(node.start_point, node.end_point)

        if node.type == "import_statement":
            # e.g., import os, sys as s
            for child in node.children:
                if child.type == "dotted_name":
                    mod_name = source[child.start_byte:child.end_byte].decode("utf-8", errors="replace")
                    imports.append(
                        ImportStatement(
                            module=mod_name,
                            names=[],
                            span=span,
                            is_relative=False,
                        )
                    )
                elif child.type == "aliased_import":
                    name_child = child.child_by_field_name("name")
                    alias_child = child.child_by_field_name("alias")
                    mod = source[name_child.start_byte:name_child.end_byte].decode("utf-8") if name_child else ""
                    alias = source[alias_child.start_byte:alias_child.end_byte].decode("utf-8") if alias_child else None
                    if mod:
                        imports.append(
                            ImportStatement(
                                module=mod,
                                names=[],
                                alias=alias,
                                span=span,
                                is_relative=False,
                            )
                        )
        elif node.type == "import_from_statement":
            # e.g., from app.core import config, settings
            module_name_node = node.child_by_field_name("module_name")
            mod = ""
            is_relative = False
            if module_name_node:
                mod = source[module_name_node.start_byte:module_name_node.end_byte].decode("utf-8", errors="replace")
            else:
                # Check for relative dots
                is_relative = True

            names: List[str] = []
            for child in node.children:
                if child.type == "dotted_name" and child != module_name_node:
                    names.append(source[child.start_byte:child.end_byte].decode("utf-8", errors="replace"))

            imports.append(
                ImportStatement(
                    module=mod,
                    names=names,
                    span=span,
                    is_relative=is_relative or text.startswith("from ."),
                )
            )

    def _enhance_with_native_ast(self, tree: ast.AST, symbols: List[Symbol]):
        """Enhances symbols with high-level docstrings from Python's standard ast."""
        doc_map = {}
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                doc = ast.get_docstring(node)
                if doc:
                    doc_map[node.name] = doc

        for sym in symbols:
            if sym.name in doc_map and not sym.docstring:
                sym.docstring = doc_map[sym.name]
