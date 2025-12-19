# Updated 2025-12-19 13:00 CST
import time
import json
import hmac
import hashlib
from backend.core import settings
from backend.models import Subscription, User, Payment
from sqlalchemy.orm import Session

# Sample Payloads
CHECKOUT_SESSION_COMPLETED = {
  "id": "evt_test_checkout",
  "object": "event",
  "type": "checkout.session.completed",
  "api_version": "2020-08-27",
  "created": 123456789,
  "data": {
    "object": {
      "id": "cs_test_123",
      "object": "checkout.session",
      "client_reference_id": "test_user_123",
      "customer": "cus_test_123",
      "subscription": "sub_test_123",
      "metadata": {"uid": "test_user_123", "plan": "pro_monthly"}
    }
  }
}

SUBSCRIPTION_UPDATED_CANCELED = {
    "id": "evt_test_sub_update",
    "object": "event",
    "type": "customer.subscription.updated",
    "api_version": "2020-08-27",
    "created": 123456789,
    "data": {
        "object": {
            "id": "sub_test_123",
            "object": "subscription",
            "customer": "cus_test_123",
            "status": "canceled",
            "metadata": {"uid": "test_user_123"}
        }
    }
}

def sign_payload(payload_str: str, secret: str) -> str:
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload_str}"
    signature = hmac.new(
        key=secret.encode("utf-8"),
        msg=signed_payload.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()
    return f"t={timestamp},v1={signature}"

def test_webhook_checkout_completed(test_client, test_db: Session):
    # Setup
    settings.stripe_webhook_secret = "whsec_test"
    user = User(uid="test_user_123", email="test@example.com")
    test_db.add(user)
    test_db.commit()

    payload_str = json.dumps(CHECKOUT_SESSION_COMPLETED)
    sig_header = sign_payload(payload_str, "whsec_test")

    response = test_client.post(
        "/webhook",
        content=payload_str,
        headers={"Stripe-Signature": sig_header, "Content-Type": "application/json"}
    )
    
    assert response.status_code == 200
    
    # Check DB
    sub = test_db.query(Subscription).filter(Subscription.uid == "test_user_123").first()
    assert sub is not None
    assert sub.plan == "pro"

def test_webhook_subscription_canceled(test_client, test_db: Session):
    settings.stripe_webhook_secret = "whsec_test"
    # Create user with pro sub
    user = User(uid="test_user_123", email="test@example.com")
    sub = Subscription(uid="test_user_123", plan="pro")
    # Payment record required for webhook handler to find user by customer_id
    payment = Payment(uid="test_user_123", stripe_customer_id="cus_test_123")
    
    test_db.add(user)
    test_db.add(sub)
    test_db.add(payment)
    test_db.commit()

    payload_str = json.dumps(SUBSCRIPTION_UPDATED_CANCELED)
    sig_header = sign_payload(payload_str, "whsec_test")

    response = test_client.post(
        "/webhook",
        content=payload_str,
        headers={"Stripe-Signature": sig_header, "Content-Type": "application/json"}
    )
    
    assert response.status_code == 200
    test_db.refresh(sub)
    assert sub.plan == "free"

def test_webhook_invalid_signature(test_client, test_db):
    settings.stripe_webhook_secret = "whsec_test"
    payload_str = json.dumps(CHECKOUT_SESSION_COMPLETED)
    sig_header = sign_payload(payload_str, "wrong_secret")

    response = test_client.post(
        "/webhook",
        content=payload_str,
        headers={"Stripe-Signature": sig_header, "Content-Type": "application/json"}
    )
    
    assert response.status_code == 400
