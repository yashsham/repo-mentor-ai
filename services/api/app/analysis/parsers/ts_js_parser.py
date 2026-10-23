"""TypeScript and JavaScript AST Parser using Tree-sitter."""

import os
from typing import List, Optional
import tree_sitter
import tree_sitter_javascript
import tree_sitter_typescript

from app.analysis.parsers.base import BaseParser
from app.api.schemas.analysis import (
    FileAnalysisResult,
    ImportStatement,
    SourceSpan,
    Symbol,
)


class TypeScriptJavaScriptParser(BaseParser):
    """Parses TypeScript and JavaScript source files into symbols and imports."""

    def __init__(self, is_typescript: bool = True, is_tsx: bool = False):
        self.is_typescript = is_typescript
        self.is_tsx = is_tsx

        if is_tsx:
            self._language = tree_sitter.Language(tree_sitter_typescript.language_tsx())
        elif is_typescript:
            self._language = tree_sitter.Language(tree_sitter_typescript.language_typescript())
        else:
            self._language = tree_sitter.Language(tree_sitter_javascript.language())

        self._parser = tree_sitter.Parser(self._language)

    @property
    def language_name(self) -> str:
        if self.is_tsx:
            return "typescriptreact"
        return "typescript" if self.is_typescript else "javascript"

    def parse(self, content: str, file_path: str) -> FileAnalysisResult:
        symbols: List[Symbol] = []
        imports: List[ImportStatement] = []
        syntax_errors: List[str] = []
        lines = content.splitlines()
        line_count = len(lines) if lines else 1

        content_bytes = content.encode("utf-8")
        tree = self._parser.parse(content_bytes)
        root = tree.root_node

        if root.has_error:
            self._collect_syntax_errors(root, syntax_errors)

        self._traverse_node(root, content_bytes, symbols, imports, parent_class=None)

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
            node_type = child.type

            if node_type == "function_declaration":
                self._handle_function_declaration(child, source, symbols, parent_class)
            elif node_type == "class_declaration":
                self._handle_class_declaration(child, source, symbols, imports)
            elif node_type == "interface_declaration":
                self._handle_interface_declaration(child, source, symbols)
            elif node_type == "method_definition":
                self._handle_method_definition(child, source, symbols, parent_class)
            elif node_type == "lexical_declaration":
                self._handle_lexical_declaration(child, source, symbols)
            elif node_type == "import_statement":
                self._handle_import_statement(child, source, imports)
            elif node_type == "export_statement":
                # Traverse exported declarations
                self._traverse_node(child, source, symbols, imports, parent_class)
            elif node_type in ("statement_block", "class_body"):
                self._traverse_node(child, source, symbols, imports, parent_class)

    def _handle_function_declaration(
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
        params = self._extract_params(params_node, source)

        return_type_node = node.child_by_field_name("return_type")
        return_type = None
        if return_type_node:
            return_type = source[return_type_node.start_byte:return_type_node.end_byte].decode("utf-8").strip()

        span = self.create_span(node.start_point, node.end_point)
        symbols.append(
            Symbol(
                name=name,
                kind="function",
                span=span,
                parent=parent_class,
                parameters=params,
                return_type=return_type,
                is_exported=True,
            )
        )

    def _handle_class_declaration(
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
                is_exported=True,
            )
        )

        body_node = node.child_by_field_name("body")
        if body_node:
            self._traverse_node(body_node, source, symbols, imports, parent_class=class_name)

    def _handle_interface_declaration(
        self,
        node: tree_sitter.Node,
        source: bytes,
        symbols: List[Symbol],
    ):
        name_node = node.child_by_field_name("name")
        if not name_node:
            return

        interface_name = source[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="replace")
        span = self.create_span(node.start_point, node.end_point)

        symbols.append(
            Symbol(
                name=interface_name,
                kind="interface",
                span=span,
                parent=None,
                is_exported=True,
            )
        )

    def _handle_method_definition(
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
        params = self._extract_params(params_node, source)

        span = self.create_span(node.start_point, node.end_point)
        symbols.append(
            Symbol(
                name=name,
                kind="method",
                span=span,
                parent=parent_class,
                parameters=params,
                is_exported=True,
            )
        )

    def _handle_lexical_declaration(
        self,
        node: tree_sitter.Node,
        source: bytes,
        symbols: List[Symbol],
    ):
        # Detect exported arrow functions: const myFunc = (x) => ...
        for declarator in node.children:
            if declarator.type == "variable_declarator":
                name_node = declarator.child_by_field_name("name")
                value_node = declarator.child_by_field_name("value")

                if name_node and value_node and value_node.type == "arrow_function":
                    name = source[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="replace")
                    params_node = value_node.child_by_field_name("parameters")
                    params = self._extract_params(params_node, source)
                    span = self.create_span(node.start_point, node.end_point)

                    symbols.append(
                        Symbol(
                            name=name,
                            kind="function",
                            span=span,
                            parent=None,
                            parameters=params,
                            is_exported=True,
                        )
                    )

    def _handle_import_statement(
        self,
        node: tree_sitter.Node,
        source: bytes,
        imports: List[ImportStatement],
    ):
        source_node = node.child_by_field_name("source")
        if not source_node:
            return

        raw_module = source[source_node.start_byte:source_node.end_byte].decode("utf-8", errors="replace")
        module_specifier = raw_module.strip("'\"`")
        is_relative = module_specifier.startswith(".")

        names: List[str] = []
        # Find imported symbols in import_clause
        for child in node.children:
            if child.type == "import_clause":
                for sub in child.children:
                    if sub.type == "named_imports":
                        for spec in sub.children:
                            if spec.type == "import_specifier":
                                name_node = spec.child_by_field_name("name")
                                if name_node:
                                    names.append(
                                        source[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="replace")
                                    )
                    elif sub.type == "identifier":
                        # Default import: import React from 'react'
                        names.append(source[sub.start_byte:sub.end_byte].decode("utf-8", errors="replace"))

        span = self.create_span(node.start_point, node.end_point)
        imports.append(
            ImportStatement(
                module=module_specifier,
                names=names,
                span=span,
                is_relative=is_relative,
            )
        )

    def _extract_params(self, params_node: Optional[tree_sitter.Node], source: bytes) -> List[str]:
        if not params_node:
            return []
        params = []
        for child in params_node.children:
            if child.type in ("identifier", "required_parameter", "optional_parameter"):
                p_text = source[child.start_byte:child.end_byte].decode("utf-8", errors="replace")
                params.append(p_text.split(":")[0].strip())
        return params
