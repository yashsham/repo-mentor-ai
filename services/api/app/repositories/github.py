"""GitHub REST API Client for repository ingestion and commit pinning.

Follows strict security controls:
- Validates repository host and blocks SSRF / private targets.
- Pins analysis to an immutable commit SHA.
- Filters out non-source, binary, and oversized files.
- Never executes repository code.
"""

import base64
import os
import re
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse
import httpx

from app.api.schemas.repository import (
    FileItem,
    FileNode,
    RepositoryMetadata,
    RepositoryAnalyzeResponse,
    FileContentResponse,
)
from app.core.config import settings

# Common binary file extensions to skip from text viewing
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svgz", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".mp3", ".wav", ".ogg", ".mp4", ".mov", ".avi", ".webm",
    ".wasm", ".pyc", ".pyo", ".pyd", ".exe", ".dll", ".so",
    ".dylib", ".class", ".jar", ".war", ".bin", ".lock",
    ".db", ".sqlite", ".sqlite3",
}

# Directory names to exclude from source tree
EXCLUDED_DIRS = {
    ".git", ".github", "node_modules", "__pycache__", ".venv", "venv",
    "env", ".next", "out", "dist", "build", ".turbo", ".idea",
    ".vscode", ".pytest_cache", ".ruff_cache", ".mypy_cache",
}

# Extension to language map
EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".js": "javascript",
    ".jsx": "javascriptreact",
    ".json": "json",
    ".md": "markdown",
    ".markdown": "markdown",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".sass": "sass",
    ".less": "less",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".php": "php",
    ".rb": "ruby",
    ".swift": "swift",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".sql": "sql",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".xml": "xml",
    ".dockerfile": "dockerfile",
}


class GitHubError(Exception):
    """Base exception for GitHub API errors."""
    pass


class InvalidRepositoryUrlError(GitHubError):
    """Raised when repository URL is malformed or invalid."""
    pass


class RepositoryNotFoundError(GitHubError):
    """Raised when repository does not exist or is private/inaccessible."""
    pass


class RateLimitExceededError(GitHubError):
    """Raised when GitHub REST API rate limit is reached."""
    pass


class FileTooLargeError(GitHubError):
    """Raised when requesting a file larger than MAX_FILE_BYTES."""
    pass


def parse_and_validate_github_url(raw_url: str) -> Tuple[str, str]:
    """Parses and validates a GitHub repository URL, returning (owner, repo)."""
    trimmed = raw_url.strip()
    if not trimmed:
        raise InvalidRepositoryUrlError("Repository URL must not be empty.")

    # SSRF guard: check for localhost, private IP ranges, credentials
    ssrf_pattern = re.compile(
        r"^https?://(localhost|127\.|0\.0\.0\.0|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)",
        re.IGNORECASE,
    )
    if ssrf_pattern.search(trimmed) or "@" in urlparse(trimmed).netloc:
        raise InvalidRepositoryUrlError("Access to restricted or private destination is blocked.")

    parsed = urlparse(trimmed)
    if parsed.scheme not in ("http", "https"):
        raise InvalidRepositoryUrlError("Unsupported protocol. Must be HTTP or HTTPS.")

    if parsed.netloc.lower() not in ("github.com", "www.github.com"):
        raise InvalidRepositoryUrlError(f"Unsupported host '{parsed.netloc}'. Only public GitHub repositories are supported.")

    path_parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(path_parts) < 2:
        raise InvalidRepositoryUrlError("Repository URL must specify both owner and repository name.")

    owner = path_parts[0]
    repo = path_parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]

    valid_id_pattern = re.compile(r"^[a-zA-Z0-9_.-]+$")
    if not valid_id_pattern.match(owner) or not valid_id_pattern.match(repo):
        raise InvalidRepositoryUrlError("Owner or repository name contains invalid characters.")

    return owner, repo


def infer_language(filename: str) -> Optional[str]:
    """Infers syntax language from filename or extension."""
    lower = filename.lower()
    if lower == "dockerfile":
        return "dockerfile"
    if lower in ("makefile", "gnumakefile"):
        return "makefile"
    ext = os.path.splitext(lower)[1]
    return EXTENSION_LANGUAGE_MAP.get(ext)


def is_binary_file(filename: str) -> bool:
    """Checks whether a file has a recognized binary extension."""
    ext = os.path.splitext(filename.lower())[1]
    return ext in BINARY_EXTENSIONS


def build_file_tree(flat_files: List[FileItem]) -> List[FileNode]:
    """Converts a flat list of file items into a nested folder tree structure."""
    root_nodes: Dict[str, FileNode] = {}

    def get_or_create_dir(path: str) -> FileNode:
        if path in root_nodes:
            return root_nodes[path]
        parts = path.split("/")
        name = parts[-1]
        node = FileNode(
            path=path,
            name=name,
            type="dir",
            children=[],
        )
        root_nodes[path] = node
        if len(parts) > 1:
            parent_path = "/".join(parts[:-1])
            parent = get_or_create_dir(parent_path)
            if parent.children is not None and not any(c.path == path for c in parent.children):
                parent.children.append(node)
        return node

    # Add directories and files
    top_level_nodes: List[FileNode] = []

    for item in flat_files:
        parts = item.path.split("/")
        file_node = FileNode(
            path=item.path,
            name=item.name,
            type=item.type,
            size=item.size,
            sha=item.sha,
            is_binary=item.is_binary,
            language=item.language,
        )

        if len(parts) == 1:
            top_level_nodes.append(file_node)
        else:
            parent_path = "/".join(parts[:-1])
            parent_dir = get_or_create_dir(parent_path)
            if parent_dir.children is not None:
                parent_dir.children.append(file_node)

    # Collect top level directories (those without a parent)
    for path, node in root_nodes.items():
        if "/" not in path and node not in top_level_nodes:
            top_level_nodes.append(node)

    # Recursive sort: directories first, then alphabetically
    def sort_nodes(nodes: List[FileNode]) -> List[FileNode]:
        for n in nodes:
            if n.children:
                n.children = sort_nodes(n.children)
        return sorted(nodes, key=lambda x: (0 if x.type == "dir" else 1, x.name.lower()))

    return sort_nodes(top_level_nodes)


class GitHubClient:
    """Async client for GitHub REST API interaction with caching."""

    def __init__(self, token: Optional[str] = None):
        self.base_url = "https://api.github.com"
        self.token = token or settings.GITHUB_TOKEN
        # In-memory analysis cache keyed by f"{owner}/{repo}:{commit_sha}"
        self._analysis_cache: Dict[str, RepositoryAnalyzeResponse] = {}

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "RepoMentor-AI/0.1.0",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def fetch_repository_metadata(self, owner: str, repo: str) -> Dict:
        """Fetches repository metadata from GitHub API."""
        url = f"{self.base_url}/repos/{owner}/{repo}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url, headers=self._get_headers())
            if res.status_code == 404:
                raise RepositoryNotFoundError(f"Repository '{owner}/{repo}' not found or is private.")
            if res.status_code == 403:
                raise RateLimitExceededError("GitHub API rate limit exceeded. Please configure GITHUB_TOKEN or wait.")
            if res.status_code != 200:
                raise GitHubError(f"GitHub API returned error {res.status_code}: {res.text}")
            return res.json()

    async def fetch_default_branch_commit_sha(self, owner: str, repo: str, default_branch: str) -> str:
        """Pins the analysis to the exact commit SHA of the default branch HEAD."""
        url = f"{self.base_url}/repos/{owner}/{repo}/commits/{default_branch}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url, headers=self._get_headers())
            if res.status_code == 404:
                raise RepositoryNotFoundError(f"Branch '{default_branch}' not found for '{owner}/{repo}'.")
            if res.status_code != 200:
                raise GitHubError(f"Failed to resolve branch commit SHA: {res.text}")
            data = res.json()
            return data["sha"]

    async def fetch_git_tree(self, owner: str, repo: str, commit_sha: str) -> List[Dict]:
        """Fetches the recursive git tree for a specific commit SHA."""
        url = f"{self.base_url}/repos/{owner}/{repo}/git/trees/{commit_sha}?recursive=1"
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(url, headers=self._get_headers())
            if res.status_code != 200:
                raise GitHubError(f"Failed to fetch git tree for commit {commit_sha}: {res.text}")
            data = res.json()
            return data.get("tree", [])

    async def analyze_repository(self, raw_url: str) -> RepositoryAnalyzeResponse:
        """Performs full Phase 2 repository ingestion and structure discovery."""
        owner, repo = parse_and_validate_github_url(raw_url)

        # 1. Fetch metadata
        meta = await self.fetch_repository_metadata(owner, repo)
        default_branch = meta.get("default_branch", "main")

        # 2. Pin commit SHA
        commit_sha = await self.fetch_default_branch_commit_sha(owner, repo, default_branch)

        cache_key = f"{owner.lower()}/{repo.lower()}:{commit_sha}"
        if cache_key in self._analysis_cache:
            return self._analysis_cache[cache_key]

        # 3. Fetch git tree
        raw_tree = await self.fetch_git_tree(owner, repo, commit_sha)

        # 4. Filter and process files
        flat_files: List[FileItem] = []
        for item in raw_tree:
            # We only record blobs (files) directly in flat list; directories are inferred in build_file_tree
            if item.get("type") != "blob":
                continue

            path = item.get("path", "")
            if not path:
                continue

            # Check if inside an excluded directory
            parts = path.split("/")
            if any(p in EXCLUDED_DIRS for p in parts[:-1]):
                continue

            filename = parts[-1]
            binary = is_binary_file(filename)
            lang = infer_language(filename)
            size = item.get("size")

            flat_files.append(
                FileItem(
                    path=path,
                    name=filename,
                    type="file",
                    size=size,
                    sha=item.get("sha"),
                    is_binary=binary,
                    language=lang,
                )
            )

            # Cap maximum indexed files to protect memory
            if len(flat_files) >= settings.MAX_REPO_FILES:
                break

        # 5. Build hierarchical tree
        nested_tree = build_file_tree(flat_files)

        repo_metadata = RepositoryMetadata(
            owner=owner,
            name=repo,
            full_name=f"{owner}/{repo}",
            description=meta.get("description"),
            default_branch=default_branch,
            commit_sha=commit_sha,
            html_url=meta.get("html_url", f"https://github.com/{owner}/{repo}"),
            language=meta.get("language"),
            stars_count=meta.get("stargazers_count", 0),
        )

        response = RepositoryAnalyzeResponse(
            metadata=repo_metadata,
            tree=nested_tree,
            total_files=len(flat_files),
            status="analyzed",
        )

        # Cache result
        self._analysis_cache[cache_key] = response
        return response

    async def fetch_file_content(self, owner: str, repo: str, file_path: str, commit_sha: str) -> FileContentResponse:
        """Fetches and decodes the content of a single source file pinned to a commit SHA."""
        owner, repo = parse_and_validate_github_url(f"https://github.com/{owner}/{repo}")
        filename = os.path.basename(file_path)

        if is_binary_file(filename):
            return FileContentResponse(
                path=file_path,
                commit_sha=commit_sha,
                content="",
                size=0,
                is_binary=True,
                language=None,
            )

        url = f"{self.base_url}/repos/{owner}/{repo}/contents/{file_path}?ref={commit_sha}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url, headers=self._get_headers())
            if res.status_code == 404:
                raise RepositoryNotFoundError(f"File '{file_path}' not found in {owner}/{repo}@{commit_sha[:7]}.")
            if res.status_code != 200:
                raise GitHubError(f"Failed to fetch file '{file_path}': {res.text}")

            data = res.json()
            size = data.get("size", 0)
            if size > settings.MAX_FILE_BYTES:
                raise FileTooLargeError(f"File '{file_path}' ({size} bytes) exceeds the maximum allowed size (1 MB).")

            raw_content = ""
            if data.get("encoding") == "base64" and data.get("content"):
                try:
                    decoded_bytes = base64.b64decode(data["content"])
                    raw_content = decoded_bytes.decode("utf-8", errors="replace")
                except Exception as e:
                    raise GitHubError(f"Failed to decode file content: {str(e)}")
            else:
                raw_content = data.get("content", "")

            return FileContentResponse(
                path=file_path,
                commit_sha=commit_sha,
                content=raw_content,
                size=size,
                is_binary=False,
                language=infer_language(filename),
            )


# Singleton client instance
github_client = GitHubClient()
