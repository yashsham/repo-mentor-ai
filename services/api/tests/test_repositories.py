"""Unit tests for repository ingestion and file viewing."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.github import (
    parse_and_validate_github_url,
    build_file_tree,
    InvalidRepositoryUrlError,
    RepositoryNotFoundError,
    RateLimitExceededError,
    FileTooLargeError,
)
from app.api.schemas.repository import FileItem, FileContentResponse, RepositoryAnalyzeResponse, RepositoryMetadata

client = TestClient(app)


def test_parse_and_validate_github_url_success():
    """Valid URLs should parse successfully."""
    owner, repo = parse_and_validate_github_url("https://github.com/fastapi/fastapi")
    assert owner == "fastapi"
    assert repo == "fastapi"

    owner, repo = parse_and_validate_github_url("https://github.com/pallets/flask.git")
    assert owner == "pallets"
    assert repo == "flask"


def test_parse_and_validate_github_url_ssrf_and_invalid():
    """SSRF payloads and non-GitHub hosts must raise InvalidRepositoryUrlError."""
    with pytest.raises(InvalidRepositoryUrlError):
        parse_and_validate_github_url("http://localhost:8000/repo")

    with pytest.raises(InvalidRepositoryUrlError):
        parse_and_validate_github_url("http://127.0.0.1/test")

    with pytest.raises(InvalidRepositoryUrlError):
        parse_and_validate_github_url("https://gitlab.com/owner/repo")

    with pytest.raises(InvalidRepositoryUrlError):
        parse_and_validate_github_url("https://github.com/only-one-part")


def test_build_file_tree():
    """Verify flat files are properly organized into a nested folder tree."""
    flat_files = [
        FileItem(path="README.md", name="README.md", type="file", size=100, language="markdown"),
        FileItem(path="src/main.py", name="main.py", type="file", size=250, language="python"),
        FileItem(path="src/utils/helpers.py", name="helpers.py", type="file", size=150, language="python"),
    ]
    tree = build_file_tree(flat_files)

    # Directories should be sorted before files at the top level
    assert len(tree) == 2
    assert tree[0].name == "src"
    assert tree[0].type == "dir"
    assert tree[1].name == "README.md"
    assert tree[1].type == "file"

    # Verify children in 'src'
    src_children = tree[0].children
    assert src_children is not None
    assert len(src_children) == 2
    assert src_children[0].name == "utils"
    assert src_children[0].type == "dir"
    assert src_children[1].name == "main.py"
    assert src_children[1].type == "file"


def test_analyze_repository_invalid_url():
    """Verify POST /api/v1/repositories/analyze returns 400 for bad URL."""
    response = client.post("/api/v1/repositories/analyze", json={"url": "http://127.0.0.1/evil"})
    assert response.status_code == 400
    assert "restricted" in response.json()["detail"].lower()


@patch("app.api.routes.repositories.github_client.analyze_repository")
def test_analyze_repository_success(mock_analyze):
    """Verify POST /api/v1/repositories/analyze returns 200 with structured tree."""
    mock_analyze.return_value = RepositoryAnalyzeResponse(
        metadata=RepositoryMetadata(
            owner="fastapi",
            name="fastapi",
            full_name="fastapi/fastapi",
            description="FastAPI framework, high performance, easy to learn.",
            default_branch="master",
            commit_sha="a1b2c3d4e5f678901234567890abcdef12345678",
            html_url="https://github.com/fastapi/fastapi",
            language="Python",
            stars_count=75000,
        ),
        tree=[],
        total_files=42,
        status="analyzed",
    )

    response = client.post("/api/v1/repositories/analyze", json={"url": "https://github.com/fastapi/fastapi"})
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["owner"] == "fastapi"
    assert data["metadata"]["commit_sha"] == "a1b2c3d4e5f678901234567890abcdef12345678"
    assert data["total_files"] == 42


@patch("app.api.routes.repositories.github_client.analyze_repository")
def test_analyze_repository_not_found(mock_analyze):
    """Verify POST /api/v1/repositories/analyze returns 404 for missing repo."""
    mock_analyze.side_effect = RepositoryNotFoundError("Repository 'foo/bar' not found or is private.")
    response = client.post("/api/v1/repositories/analyze", json={"url": "https://github.com/foo/bar"})
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@patch("app.api.routes.repositories.github_client.analyze_repository")
def test_analyze_repository_rate_limited(mock_analyze):
    """Verify POST /api/v1/repositories/analyze returns 429 when rate limit hit."""
    mock_analyze.side_effect = RateLimitExceededError("Rate limit exceeded.")
    response = client.post("/api/v1/repositories/analyze", json={"url": "https://github.com/fastapi/fastapi"})
    assert response.status_code == 429


@patch("app.api.routes.repositories.github_client.fetch_file_content")
def test_get_file_content_success(mock_fetch):
    """Verify GET /api/v1/repositories/{owner}/{repo}/files/{path} returns content."""
    mock_fetch.return_value = FileContentResponse(
        path="main.py",
        commit_sha="a1b2c3d",
        content="print('Hello World')",
        size=20,
        is_binary=False,
        language="python",
    )

    response = client.get("/api/v1/repositories/fastapi/fastapi/files/main.py?commit_sha=a1b2c3d")
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "print('Hello World')"
    assert data["language"] == "python"


@patch("app.api.routes.repositories.github_client.fetch_file_content")
def test_get_file_content_too_large(mock_fetch):
    """Verify GET /api/v1/repositories/{owner}/{repo}/files/{path} returns 413 for oversized file."""
    mock_fetch.side_effect = FileTooLargeError("File exceeds 1 MB limit.")
    response = client.get("/api/v1/repositories/fastapi/fastapi/files/big.json?commit_sha=a1b2c3d")
    assert response.status_code == 413
