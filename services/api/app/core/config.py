"""Core application configuration and settings."""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application runtime configuration settings."""

    # Project metadata
    PROJECT_NAME: str = "RepoMentor AI API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Environment & Server
    API_ENV: str = "development"
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    API_DEBUG: bool = True

    # CORS configuration
    API_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # GitHub API integration (optional for higher rate limits)
    GITHUB_TOKEN: Optional[str] = None

    # Ingestion constraints
    MAX_REPO_FILES: int = 5000
    MAX_FILE_BYTES: int = 1_048_576  # 1 MB

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
