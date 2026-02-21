import pytest

from backend.models import Account, Subscription, User


@pytest.fixture
def gated_user(test_db):
    uid = "gated_user_123"
    email = "gated@testmail.app"
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

    # Add 1 web3 account (limit is 1 on Free)
    acc = Account(
        uid=user.uid,
        account_type="web3",
        provider="wallet",
        account_name="Wallet 1",
    )
    test_db.add(acc)
    test_db.commit()

    # Simulate the exchange token endpoint/limit check
    from fastapi import HTTPException

    from backend.core.dependencies import enforce_account_limit

    with pytest.raises(HTTPException) as exc:
        enforce_account_limit(user, test_db, "web3")

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

    # Add 1 web3 account (Pro limit is 2)
    acc = Account(
        uid=user.uid,
        account_type="web3",
        provider="wallet",
        account_name="Wallet 1",
    )
    test_db.add(acc)
    test_db.commit()

    # This should NOT raise (at 1, limit is 2)
    from backend.core.dependencies import enforce_account_limit

    enforce_account_limit(user, test_db, "web3")

    # Add 1 more (Total 2)
    acc2 = Account(
        uid=user.uid,
        account_type="web3",
        provider="wallet",
        account_name="Wallet 2",
    )
    test_db.add(acc2)
    test_db.commit()

    # This SHOULD raise (at 2, limit is 2 and check is >=)
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        enforce_account_limit(user, test_db, "web3")
    assert exc.value.status_code == 403
