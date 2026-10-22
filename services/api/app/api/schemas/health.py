"""Health check schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check payload."""

    status: str = Field(..., description="System operational status, e.g. 'ok'")
    service: str = Field(..., description="Name of the backend service")
    version: str = Field(..., description="Current semantic version")
    timestamp: datetime = Field(..., description="Current UTC timestamp of response")
