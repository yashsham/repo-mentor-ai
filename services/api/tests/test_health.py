"""Unit tests for the health check endpoint."""

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_api_v1_health():
    """Verify that GET /api/v1/health returns 200 and matches HealthResponse schema."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == settings.PROJECT_NAME
    assert data["version"] == settings.VERSION
    assert "timestamp" in data


def test_root_health_alias():
    """Verify that GET /health alias endpoint responds successfully."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_root_endpoint():
    """Verify that GET / returns metadata and links to docs and health."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["version"] == settings.VERSION
    assert "/health" in data["health"]
