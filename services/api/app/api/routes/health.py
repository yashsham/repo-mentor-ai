"""Health and readiness routes."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.api.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Returns the operational status, version, and server timestamp.",
)
async def get_health() -> HealthResponse:
    """Check service health and operational status."""
    return HealthResponse(
        status="ok",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc),
    )
