"""Unit tests for AST parsing, symbol extraction, and dependency graph construction."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.analysis.parsers.python_parser import PythonParser
from app.analysis.parsers.ts_js_parser import TypeScriptJavaScriptParser
from app.analysis.parsers.factory import get_parser_for_file
from app.analysis.dependencies.graph import DependencyGraphBuilder
from app.api.schemas.analysis import FileAnalysisResult, Symbol, SourceSpan, ImportStatement

client = TestClient(app)


def test_python_parser_symbol_and_import_extraction():
    """Verify Python parser extracts classes, methods, functions, params, and imports."""
    code = """import os
from typing import List, Optional
from app.core import config

class ApplicationService:
    \"\"\"Core application orchestration service.\"\"\"

    def __init__(self, name: str = "default"):
        self.name = name

    def execute_task(self, task_id: int, tags: List[str]) -> bool:
        return True

def standalone_helper(x: int) -> int:
    return x * 2
"""
    parser = PythonParser()
    result = parser.parse(code, "services/app_service.py")

    assert result.file_path == "services/app_service.py"
    assert result.language == "python"
    assert len(result.syntax_errors) == 0
    assert result.line_count > 10

    # Symbols check
    symbols_by_name = {s.name: s for s in result.symbols}
    assert "ApplicationService" in symbols_by_name
    cls_sym = symbols_by_name["ApplicationService"]
    assert cls_sym.kind == "class"
    assert cls_sym.docstring == "Core application orchestration service."
    assert cls_sym.span.start_line == 5

    assert "__init__" in symbols_by_name
    init_sym = symbols_by_name["__init__"]
    assert init_sym.kind == "method"
    assert init_sym.parent == "ApplicationService"
    assert "self" in init_sym.parameters
    assert "name" in init_sym.parameters

    assert "execute_task" in symbols_by_name
    exec_sym = symbols_by_name["execute_task"]
    assert exec_sym.kind == "method"
    assert exec_sym.return_type == "bool"

    assert "standalone_helper" in symbols_by_name
    helper_sym = symbols_by_name["standalone_helper"]
    assert helper_sym.kind == "function"
    assert helper_sym.parent is None
    assert helper_sym.return_type == "int"

    # Imports check
    imported_modules = {i.module for i in result.imports}
    assert "os" in imported_modules
    assert "typing" in imported_modules
    assert "app.core" in imported_modules


def test_python_parser_syntax_error_reporting():
    """Verify parser honestly reports syntax errors without crashing."""
    broken_code = "def incomplete_function(x\n    return x"
    parser = PythonParser()
    result = parser.parse(broken_code, "broken.py")

    assert len(result.syntax_errors) > 0
    assert "Syntax error" in result.syntax_errors[0]


def test_typescript_parser_symbol_and_import_extraction():
    """Verify TypeScript parser extracts interfaces, classes, arrow functions, and imports."""
    code = """import React, { useState } from 'react';
import { validateUrl } from './validation';

export interface UserConfig {
    id: string;
    isActive: boolean;
}

export class UserManager {
    private users: UserConfig[] = [];

    addUser(user: UserConfig): void {
        this.users.push(user);
    }
}

export const createDefaultUser = (id: string) => {
    return { id, isActive: true };
};
"""
    parser = TypeScriptJavaScriptParser(is_typescript=True, is_tsx=False)
    result = parser.parse(code, "src/users.ts")

    assert result.file_path == "src/users.ts"
    assert result.language == "typescript"
    assert len(result.syntax_errors) == 0

    symbols_by_name = {s.name: s for s in result.symbols}
    assert "UserConfig" in symbols_by_name
    assert symbols_by_name["UserConfig"].kind == "interface"

    assert "UserManager" in symbols_by_name
    assert symbols_by_name["UserManager"].kind == "class"

    assert "addUser" in symbols_by_name
    assert symbols_by_name["addUser"].kind == "method"
    assert symbols_by_name["addUser"].parent == "UserManager"

    assert "createDefaultUser" in symbols_by_name
    assert symbols_by_name["createDefaultUser"].kind == "function"

    # Imports check
    imports = {i.module: i for i in result.imports}
    assert "react" in imports
    assert "useState" in imports["react"].names
    assert "./validation" in imports
    assert imports["./validation"].is_relative is True


def test_parser_factory():
    """Verify factory selects the right parser for supported file extensions."""
    assert get_parser_for_file("app.py") is not None
    assert get_parser_for_file("index.ts") is not None
    assert get_parser_for_file("component.tsx") is not None
    assert get_parser_for_file("script.js") is not None
    assert get_parser_for_file("README.md") is None
    assert get_parser_for_file("config.json") is None


def test_dependency_graph_builder():
    """Verify cross-file import resolution and architecture graph construction."""
    file_a = FileAnalysisResult(
        file_path="app/main.py",
        language="python",
        symbols=[Symbol(name="app", kind="variable", span=SourceSpan(start_line=5, end_line=5))],
        imports=[
            ImportStatement(
                module="app.services.auth",
                names=["AuthService"],
                span=SourceSpan(start_line=2, end_line=2),
                is_relative=False,
            )
        ],
        syntax_errors=[],
        line_count=20,
    )

    file_b = FileAnalysisResult(
        file_path="app/services/auth.py",
        language="python",
        symbols=[
            Symbol(
                name="AuthService",
                kind="class",
                span=SourceSpan(start_line=4, end_line=15),
            )
        ],
        imports=[],
        syntax_errors=[],
        line_count=15,
    )

    builder = DependencyGraphBuilder([file_a, file_b])
    graph = builder.build_graph()

    assert graph.total_files_analyzed == 2
    assert graph.total_symbols_extracted >= 2

    # Check edges
    import_edges = [e for e in graph.edges if e.kind == "imports"]
    assert len(import_edges) == 1
    assert import_edges[0].source == "app/main.py"
    assert import_edges[0].target == "app/services/auth.py"

    # Inferred entry point
    assert "app/main.py" in graph.entry_points


def test_post_analysis_file_endpoint():
    """Verify POST /api/v1/analysis/file endpoint."""
    response = client.post(
        "/api/v1/analysis/file",
        json={
            "file_path": "calculator.py",
            "content": "def add(a: int, b: int) -> int:\n    return a + b\n",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "python"
    assert len(data["symbols"]) == 1
    assert data["symbols"][0]["name"] == "add"
    assert data["symbols"][0]["return_type"] == "int"
