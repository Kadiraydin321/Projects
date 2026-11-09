"""Unit tests for Roborock Web Hub FastAPI Server."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from web_hub.main import app, state_manager


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "robot_ip" in data
    assert "server_time" in data


def test_status_endpoint(client: TestClient):
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "state_code" in data
    assert "state_desc" in data
    assert "battery" in data
    assert "clean_area_sqm" in data
    assert "clean_time_seconds" in data


def test_fan_speed_invalid(client: TestClient):
    response = client.post("/api/settings/fan-speed", json={"speed": 999})
    assert response.status_code == 400
    assert "Invalid fan power level" in response.json()["detail"]


def test_water_level_invalid(client: TestClient):
    response = client.post("/api/settings/water-level", json={"level": 999})
    assert response.status_code == 400
    assert "Invalid water level" in response.json()["detail"]


def test_consumable_reset_invalid(client: TestClient):
    response = client.post("/api/consumables/reset", json={"component": "invalid_component"})
    assert response.status_code == 400
    assert "Geçersiz sarf malzeme adı" in response.json()["detail"]


def test_websocket_telemetry(client: TestClient):
    with client.websocket_connect("/ws/telemetry") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "telemetry"
        assert "data" in msg
        assert "battery" in msg["data"]
