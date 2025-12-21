import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app
from backend.models import Subscription, User
from backend.utils import get_db


@pytest.mark.asyncio
async def test_widget_submission_rate_limit(test_db):
    """
    Test rate limiting for widget submission.
    Uses shared `test_db` fixture which handles table creation (including 'developers').
    """

    # Override get_db to use the test database
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # 1. Setup Developer User
    dev_uid = str(uuid.uuid4())
    dev_user = User(uid=dev_uid, email="rate_limit@example.com", role="user")
    test_db.add(dev_user)
    # Require Pro for creation
    test_db.add(Subscription(uid=dev_uid, plan="pro", status="active"))
    test_db.commit()

    # Mock Auth
    from backend.middleware.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: dev_user

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1.5 Register as Developer
            reg_payload = {"payout_method": {}, "payout_frequency": "monthly"}
            # The API call will try to insert into 'developers' table
            response = await client.post("/api/developers/", json=reg_payload)
            if response.status_code != 200:
                print(f"Developer registration failed: {response.text}")
                response.raise_for_status()

            # Refresh to ensure relationship is loaded
            # Note: We must be careful with expire_all in async tests if we reuse objects,
            # but here it should be fine as we are in the same 'test_db' session scope.
            test_db.expire_all()

            # 2. Submit 5 widgets (allowed)
            for i in range(5):
                payload = {
                    "name": f"Widget {i}",
                    "description": "Test",
                    "category": "productivity",
                    "scopes": [],
                    "preview_data": {},
                }
                response = await client.post("/api/widgets/", json=payload)
                assert (
                    response.status_code == 201
                ), f"Failed to create widget {i}: {response.text}"

            # 3. Submit 6th widget (should fail)
            payload = {
                "name": "Widget 6",
                "description": "Should fail",
                "category": "productivity",
                "scopes": [],
                "preview_data": {},
            }
            response = await client.post("/api/widgets/", json=payload)
            assert response.status_code == 429
            assert "limit reached" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
