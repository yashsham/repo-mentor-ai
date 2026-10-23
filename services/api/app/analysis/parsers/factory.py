"""Factory for instantiating the appropriate AST parser based on file extension."""

import os
from typing import Dict, Optional
from app.analysis.parsers.base import BaseParser
from app.analysis.parsers.python_parser import PythonParser
from app.analysis.parsers.ts_js_parser import TypeScriptJavaScriptParser

_PARSER_CACHE: Dict[str, BaseParser] = {}


def get_parser_for_file(file_path: str) -> Optional[BaseParser]:
    """Returns the dedicated AST parser for a given file path, if supported."""
    ext = os.path.splitext(file_path.lower())[1]

    if ext == ".py":
        if "python" not in _PARSER_CACHE:
            _PARSER_CACHE["python"] = PythonParser()
        return _PARSER_CACHE["python"]

    elif ext == ".ts":
        if "ts" not in _PARSER_CACHE:
            _PARSER_CACHE["ts"] = TypeScriptJavaScriptParser(is_typescript=True, is_tsx=False)
        return _PARSER_CACHE["ts"]

    elif ext == ".tsx":
        if "tsx" not in _PARSER_CACHE:
            _PARSER_CACHE["tsx"] = TypeScriptJavaScriptParser(is_typescript=True, is_tsx=True)
        return _PARSER_CACHE["tsx"]

    elif ext == ".js":
        if "js" not in _PARSER_CACHE:
            _PARSER_CACHE["js"] = TypeScriptJavaScriptParser(is_typescript=False, is_tsx=False)
        return _PARSER_CACHE["js"]

    elif ext == ".jsx":
        if "jsx" not in _PARSER_CACHE:
            _PARSER_CACHE["jsx"] = TypeScriptJavaScriptParser(is_typescript=False, is_tsx=True)
        return _PARSER_CACHE["jsx"]

    return None
