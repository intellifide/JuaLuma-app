# CORE PURPOSE: Validate manual assets CRUD endpoints.
# LAST MODIFIED: 2026-01-27

from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient

from backend.models.manual_asset import ManualAsset


def test_create_and_list_manual_assets(test_client: TestClient, test_db, mock_auth):
    payload = {
        "asset_type": "house",
        "balance_type": "asset",
        "name": "Primary Home",
        "value": 250000.50,
        "purchase_date": "2022-06-01",
        "notes": "Purchased in cash",
    }

    create_resp = test_client.post("/api/manual-assets", json=payload)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["asset_type"] == "house"
    assert data["name"] == "Primary Home"
    assert data["purchase_date"] == "2022-06-01"

    list_resp = test_client.get("/api/manual-assets")
    assert list_resp.status_code == 200
    assets = list_resp.json()
    assert len(assets) == 1
    assert assets[0]["id"] == data["id"]


def test_update_manual_asset(test_client: TestClient, test_db, mock_auth):
    asset = ManualAsset(
        uid=mock_auth.uid,
        asset_type="car",
        balance_type="asset",
        name="Sedan",
        value=Decimal("12500.00"),
        purchase_date=date(2021, 5, 10),
    )
    test_db.add(asset)
    test_db.commit()

    payload = {"name": "Sedan (Updated)", "value": 15000}
    response = test_client.patch(f"/api/manual-assets/{asset.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Sedan (Updated)"
    assert float(data["value"]) == 15000.0


def test_delete_manual_asset(test_client: TestClient, test_db, mock_auth):
    asset = ManualAsset(
        uid=mock_auth.uid,
        asset_type="collectible",
        balance_type="asset",
        name="Vintage Watch",
        value=Decimal("5000.00"),
    )
    test_db.add(asset)
    test_db.commit()

    response = test_client.delete(f"/api/manual-assets/{asset.id}")
    assert response.status_code == 204

    db_asset = test_db.query(ManualAsset).filter(ManualAsset.id == asset.id).first()
    assert db_asset is None


def test_manual_asset_validation_error(test_client: TestClient, mock_auth):
    payload = {
        "asset_type": "invalid-type",
        "balance_type": "asset",
        "name": "Bad Asset",
        "value": 100,
    }
    response = test_client.post("/api/manual-assets", json=payload)
    assert response.status_code == 400


def test_manual_asset_not_found_for_other_user(test_client: TestClient, test_db, mock_auth):
    asset = ManualAsset(
        uid="other-user",
        asset_type="house",
        balance_type="asset",
        name="Other Home",
        value=Decimal("99999.00"),
    )
    test_db.add(asset)
    test_db.commit()

    response = test_client.patch(f"/api/manual-assets/{asset.id}", json={"name": "Nope"})
    assert response.status_code == 404
