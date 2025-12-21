from fastapi.testclient import TestClient
from starlette.requests import Request

from backend.middleware.security import ACTIVE_RATE_LIMITER


def test_request_id_and_security_headers(test_client: TestClient):
    if ACTIVE_RATE_LIMITER:
        ACTIVE_RATE_LIMITER.reset()
    response = test_client.get("/")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Strict-Transport-Security"].startswith("max-age=")


def test_structured_not_found_response(test_client: TestClient):
    if ACTIVE_RATE_LIMITER:
        ACTIVE_RATE_LIMITER.reset()
    response = test_client.get("/does-not-exist")
    assert response.status_code == 404
    payload = response.json()
    assert payload["error"] == "not_found"
    assert "message" in payload
    assert payload["request_id"]


def test_rate_limit_exceeded_returns_structured_error(test_client: TestClient):
    if ACTIVE_RATE_LIMITER:
        dummy_scope = {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [],
            "client": ("127.0.0.1", 12345),
        }
        request = Request(dummy_scope)
        response = ACTIVE_RATE_LIMITER._too_many(request)
        assert response.status_code == 429
        payload = response.json()
        assert payload["error"] == "too_many_requests"
        assert "message" in payload
        assert payload["request_id"] is None
