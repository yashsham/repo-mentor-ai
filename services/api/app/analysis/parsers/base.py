"""Base AST Parser interface for language-specific code intelligence."""

from abc import ABC, abstractmethod
from typing import Optional
from app.api.schemas.analysis import FileAnalysisResult, SourceSpan


class BaseParser(ABC):
    """Abstract base class for programming language AST parsers."""

    @property
    @abstractmethod
    def language_name(self) -> str:
        """Name of the supported programming language."""
        pass

    @abstractmethod
    def parse(self, content: str, file_path: str) -> FileAnalysisResult:
        """Parses source text into symbols, imports, and exact spans."""
        pass

    @staticmethod
    def create_span(start_point: tuple, end_point: tuple) -> SourceSpan:
        """Converts zero-indexed (row, col) coordinates to 1-indexed line spans."""
        return SourceSpan(
            start_line=start_point[0] + 1,
            start_col=start_point[1],
            end_line=end_point[0] + 1,
            end_col=end_point[1],
        )
