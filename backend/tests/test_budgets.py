def test_list_budgets_empty(test_client, mock_auth):
    """Test listing budgets when none exist."""
    response = test_client.get("/api/budgets/")
    assert response.status_code == 200
    assert response.json() == []


def test_create_budget(test_client, mock_auth):
    """Test creating a new budget."""
    budget_data = {"category": "Food", "amount": 500.0, "period": "monthly"}
    response = test_client.post("/api/budgets/", json=budget_data)
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Food"
    assert data["amount"] == 500.0
    assert data["period"] == "monthly"
    assert "id" in data

    # Verify listing shows it
    list_response = test_client.get("/api/budgets/")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["category"] == "Food"


def test_update_budget(test_client, mock_auth):
    """Test updating an existing budget."""
    # Create first
    test_client.post("/api/budgets/", json={"category": "Food", "amount": 500.0})

    # Update
    response = test_client.post(
        "/api/budgets/", json={"category": "Food", "amount": 750.0}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Food"
    assert data["amount"] == 750.0

    # Verify listing shows updated amount
    list_response = test_client.get("/api/budgets/")
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["amount"] == 750.0


def test_delete_budget(test_client, mock_auth):
    """Test deleting a budget."""
    # Create first
    test_client.post("/api/budgets/", json={"category": "Food", "amount": 500.0})

    # Delete
    response = test_client.delete("/api/budgets/Food")
    assert response.status_code == 200
    assert response.json() == {"status": "deleted"}

    # Verify empty
    list_response = test_client.get("/api/budgets/")
    assert len(list_response.json()) == 0


def test_delete_nonexistent_budget(test_client, mock_auth):
    """Test deleting a budget that does not exist."""
    response = test_client.delete("/api/budgets/NonExistent")
    assert response.status_code == 404
