"""Repository ingestion schemas and data transfer objects."""

from typing import List, Optional
from pydantic import BaseModel, Field


class RepositoryAnalyzeRequest(BaseModel):
    """Payload to trigger repository analysis."""

    url: str = Field(..., description="Public GitHub repository URL (e.g., https://github.com/owner/repo)")


class RepositoryMetadata(BaseModel):
    """Grounded repository metadata pinned to a commit SHA."""

    owner: str = Field(..., description="Repository owner / organization")
    name: str = Field(..., description="Repository name")
    full_name: str = Field(..., description="Full repository name: owner/name")
    description: Optional[str] = Field(None, description="Repository description")
    default_branch: str = Field(..., description="Default branch name, e.g. main or master")
    commit_sha: str = Field(..., description="Immutable commit SHA of HEAD")
    html_url: str = Field(..., description="Canonical GitHub URL")
    language: Optional[str] = Field(None, description="Primary detected programming language")
    stars_count: int = Field(0, description="GitHub stargazers count")


class FileItem(BaseModel):
    """Flat representation of an ingested repository file."""

    path: str = Field(..., description="Relative file path from repository root")
    name: str = Field(..., description="Base filename")
    type: str = Field("file", description="'file' or 'dir'")
    size: Optional[int] = Field(None, description="Size in bytes")
    sha: Optional[str] = Field(None, description="Git object SHA")
    is_binary: bool = Field(False, description="True if file is detected as binary")
    language: Optional[str] = Field(None, description="Inferred language from extension")


class FileNode(BaseModel):
    """Hierarchical folder tree node for repository exploration."""

    path: str
    name: str
    type: str  # 'file' or 'dir'
    size: Optional[int] = None
    sha: Optional[str] = None
    is_binary: bool = False
    language: Optional[str] = None
    children: Optional[List["FileNode"]] = None


class RepositoryAnalyzeResponse(BaseModel):
    """Result of repository ingestion."""

    metadata: RepositoryMetadata
    tree: List[FileNode]
    total_files: int
    status: str = Field("analyzed", description="Ingestion status")


class FileContentResponse(BaseModel):
    """File content representation."""

    path: str
    commit_sha: str
    content: str
    size: int
    is_binary: bool = False
    language: Optional[str] = None
