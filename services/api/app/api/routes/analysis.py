"""Code intelligence, AST symbol inspection, and dependency graph routes."""

import asyncio
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.analysis.dependencies.graph import DependencyGraphBuilder
from app.analysis.parsers.factory import get_parser_for_file
from app.api.schemas.analysis import (
    DependencyGraph,
    FileAnalysisResult,
    FileParseRequest,
)
from app.repositories.github import (
    github_client,
    InvalidRepositoryUrlError,
    RepositoryNotFoundError,
    RateLimitExceededError,
    GitHubError,
)

router = APIRouter(prefix="/analysis", tags=["Code Intelligence"])

# In-memory graph cache: f"{owner}/{repo}:{commit_sha}" -> DependencyGraph
_GRAPH_CACHE: Dict[str, DependencyGraph] = {}


@router.post(
    "/file",
    response_model=FileAnalysisResult,
    summary="Parse Single File AST",
    description="Extracts symbols, functions, classes, imports, and syntax spans from provided source text.",
)
async def parse_file_content(request: FileParseRequest) -> FileAnalysisResult:
    """Parses arbitrary source code into structured AST symbols and dependencies."""
    parser = get_parser_for_file(request.file_path)
    if not parser:
        lines = request.content.splitlines()
        return FileAnalysisResult(
            file_path=request.file_path,
            language="unsupported",
            symbols=[],
            imports=[],
            syntax_errors=[],
            line_count=len(lines) if lines else 1,
            is_supported=False,
        )

    try:
        return parser.parse(request.content, request.file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AST parsing failed: {str(e)}",
        )


@router.get(
    "/repositories/{owner}/{repo}/files/{file_path:path}",
    response_model=FileAnalysisResult,
    summary="Get File Symbols and AST",
    description="Fetches a repository source file and returns extracted AST symbols and imports.",
)
async def analyze_repo_file(
    owner: str,
    repo: str,
    file_path: str,
    commit_sha: str = Query(..., description="Pinned commit SHA"),
) -> FileAnalysisResult:
    """Fetches a specific file and extracts its AST symbols."""
    try:
        file_data = await github_client.fetch_file_content(owner, repo, file_path, commit_sha)
        parser = get_parser_for_file(file_path)
        if not parser or file_data.is_binary:
            return FileAnalysisResult(
                file_path=file_path,
                language=file_data.language or "plain",
                symbols=[],
                imports=[],
                syntax_errors=[],
                line_count=len(file_data.content.splitlines()),
                is_supported=False,
            )

        return parser.parse(file_data.content, file_path)
    except RepositoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RateLimitExceededError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except GitHubError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.get(
    "/repositories/{owner}/{repo}/graph",
    response_model=DependencyGraph,
    summary="Generate Architecture and Dependency Graph",
    description="Constructs an interactive module and symbol dependency graph for an ingested repository.",
)
async def get_repository_graph(
    owner: str,
    repo: str,
    commit_sha: str = Query(..., description="Pinned commit SHA"),
    max_files: int = Query(35, description="Max number of files to parse for graph building"),
) -> DependencyGraph:
    """Builds a cross-file dependency graph."""
    cache_key = f"{owner.lower()}/{repo.lower()}:{commit_sha}"
    if cache_key in _GRAPH_CACHE:
        return _GRAPH_CACHE[cache_key]

    try:
        # Retrieve git tree
        raw_tree = await github_client.fetch_git_tree(owner, repo, commit_sha)
        supported_files: List[str] = []

        for item in raw_tree:
            if item.get("type") == "blob":
                path = item.get("path", "")
                parser = get_parser_for_file(path)
                if parser and not item.get("size", 0) > 200_000:
                    supported_files.append(path)
                if len(supported_files) >= max_files:
                    break

        # Concurrently fetch and parse files
        async def parse_path(path: str) -> Optional[FileAnalysisResult]:
            try:
                f_data = await github_client.fetch_file_content(owner, repo, path, commit_sha)
                p = get_parser_for_file(path)
                if p and not f_data.is_binary:
                    return p.parse(f_data.content, path)
            except Exception:
                return None
            return None

        tasks = [parse_path(p) for p in supported_files]
        results = await asyncio.gather(*tasks)
        valid_results = [r for r in results if r is not None]

        builder = DependencyGraphBuilder(valid_results)
        graph = builder.build_graph()

        _GRAPH_CACHE[cache_key] = graph
        return graph

    except RepositoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RateLimitExceededError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except GitHubError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate dependency graph: {str(e)}",
        )
