"""Repository ingestion and source file inspection endpoints."""

from fastapi import APIRouter, HTTPException, Query, status
from app.api.schemas.repository import (
    RepositoryAnalyzeRequest,
    RepositoryAnalyzeResponse,
    FileContentResponse,
)
from app.repositories.github import (
    github_client,
    InvalidRepositoryUrlError,
    RepositoryNotFoundError,
    RateLimitExceededError,
    FileTooLargeError,
    GitHubError,
)

router = APIRouter(prefix="/repositories", tags=["Repositories"])


@router.post(
    "/analyze",
    response_model=RepositoryAnalyzeResponse,
    summary="Analyze GitHub Repository",
    description="Validates a public GitHub URL, resolves the default branch HEAD commit SHA, and indexes the file tree.",
)
async def analyze_repository(request: RepositoryAnalyzeRequest) -> RepositoryAnalyzeResponse:
    """Ingests a GitHub repository and generates a structured file hierarchy."""
    try:
        return await github_client.analyze_repository(request.url)
    except InvalidRepositoryUrlError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RepositoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RateLimitExceededError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except GitHubError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during ingestion: {str(e)}",
        )


@router.get(
    "/{owner}/{repo}/files/{file_path:path}",
    response_model=FileContentResponse,
    summary="Get File Content",
    description="Fetches raw source code for a specific file pinned to an immutable commit SHA.",
)
async def get_file_content(
    owner: str,
    repo: str,
    file_path: str,
    commit_sha: str = Query(..., description="Pinned commit SHA for immutable reference"),
) -> FileContentResponse:
    """Retrieves file contents for exploration in the center workspace."""
    try:
        return await github_client.fetch_file_content(owner, repo, file_path, commit_sha)
    except InvalidRepositoryUrlError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileTooLargeError as e:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=str(e))
    except RepositoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RateLimitExceededError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except GitHubError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve file content: {str(e)}",
        )
