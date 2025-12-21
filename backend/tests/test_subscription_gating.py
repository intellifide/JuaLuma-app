
import pytest
from fastapi.testclient import TestClient
from backend.models import User, Subscription, Account

@pytest.fixture
def gated_user(test_db):
    uid = "gated_user_123"
    email = "gated@example.com"
    user = User(uid=uid, email=email, role="user")
    test_db.add(user)
    test_db.commit()
    return user

def test_free_tier_limit(test_client, test_db, mock_auth):
    # Use existing mock_auth user
    user = test_db.query(User).filter(User.uid == mock_auth.uid).first()
    
    # 1. User has FREE tier (default)
    sub = Subscription(uid=user.uid, plan="free", status="active")
    test_db.add(sub)
    
    # Add 3 traditional accounts
    for i in range(3):
        acc = Account(uid=user.uid, account_type="traditional", provider="TestBank", account_name=f"Acct {i}")
        test_db.add(acc)
    test_db.commit()
    
    # Simulate the exchange token endpoint/limit check
    from backend.core.dependencies import enforce_account_limit
    from fastapi import HTTPException
    
    with pytest.raises(HTTPException) as exc:
        enforce_account_limit(user, test_db, "traditional")
    
    assert exc.value.status_code == 403
    assert "upgrade" in exc.value.detail.lower()

def test_pro_tier_middle_limit(test_client, test_db, mock_auth):
    user = test_db.query(User).filter(User.uid == mock_auth.uid).first()
    
    # Clear previous sub and accounts
    test_db.query(Subscription).filter(Subscription.uid == user.uid).delete()
    test_db.query(Account).filter(Account.uid == user.uid).delete()
    
    # 1. User has PRO tier
    sub = Subscription(uid=user.uid, plan="pro_monthly", status="active")
    test_db.add(sub)
    
    # Add 4 traditional accounts (Limit is 5)
    for i in range(4):
        acc = Account(uid=user.uid, account_type="traditional", provider="TestBank", account_name=f"Acct {i}")
        test_db.add(acc)
    test_db.commit()
    
    # This should NOT raise (at 4, limit is 5)
    from backend.core.dependencies import enforce_account_limit
    enforce_account_limit(user, test_db, "traditional")

    # Add 1 more (Total 5)
    acc5 = Account(uid=user.uid, account_type="traditional", provider="TestBank", account_name="Acct 5")
    test_db.add(acc5)
    test_db.commit()

    # This SHOULD raise (at 5, limit is 5 and check is >=)
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        enforce_account_limit(user, test_db, "traditional")
    assert exc.value.status_code == 403
