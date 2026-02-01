# Updated 2026-01-31 00:00 CST
from types import SimpleNamespace

import pytest

from backend.core import settings
from backend.models import User
from backend.services import billing


class _CheckoutCapture:
    def __init__(self):
        self.kwargs = None

    def __call__(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(url="https://checkout.stripe.test/session")


@pytest.mark.parametrize(
    ("plan_input", "expected_plan", "expect_trial"),
    [
        ("pro", "pro_monthly", True),
        ("pro_annual", "pro_annual", True),
        ("ultimate", "ultimate_monthly", True),
        ("ultimate_annual", "ultimate_annual", True),
        ("essential", "essential_monthly", False),
    ],
)
def test_create_checkout_session_applies_trial_by_plan(
    test_db, monkeypatch, plan_input, expected_plan, expect_trial
):
    settings.stripe_secret_key = "sk_test"

    user = User(uid="user_123", email="user@example.com")
    test_db.add(user)
    test_db.commit()

    capture = _CheckoutCapture()

    monkeypatch.setattr(billing, "create_stripe_customer", lambda *_: "cus_test")
    monkeypatch.setattr(billing.stripe.checkout.Session, "create", capture)

    url = billing.create_checkout_session(
        test_db, user.uid, plan_input, "https://app.local/checkout/success"
    )

    assert url == "https://checkout.stripe.test/session"
    assert capture.kwargs is not None
    assert capture.kwargs["line_items"][0]["price"] == billing.STRIPE_PLANS[expected_plan]

    subscription_data = capture.kwargs["subscription_data"]
    if expect_trial:
        assert subscription_data["trial_period_days"] == 14
        assert subscription_data["trial_settings"]["end_behavior"]["missing_payment_method"] == "cancel"
    else:
        assert "trial_period_days" not in subscription_data
        assert "trial_settings" not in subscription_data


@pytest.mark.parametrize(
    ("plan_input", "expected_plan", "expect_trial"),
    [
        ("pro", "pro_monthly", True),
        ("ultimate", "ultimate_monthly", True),
        ("essential", "essential_monthly", False),
    ],
)
def test_create_checkout_session_for_pending_applies_trial_by_plan(
    monkeypatch, plan_input, expected_plan, expect_trial
):
    settings.stripe_secret_key = "sk_test"

    capture = _CheckoutCapture()
    monkeypatch.setattr(billing.stripe.checkout.Session, "create", capture)

    url, customer_id = billing.create_checkout_session_for_pending(
        "pending_123",
        "pending@example.com",
        plan_input,
        "https://app.local/checkout/success",
        customer_id="cus_test",
    )

    assert url == "https://checkout.stripe.test/session"
    assert customer_id == "cus_test"
    assert capture.kwargs is not None
    assert capture.kwargs["line_items"][0]["price"] == billing.STRIPE_PLANS[expected_plan]

    subscription_data = capture.kwargs["subscription_data"]
    if expect_trial:
        assert subscription_data["trial_period_days"] == 14
        assert subscription_data["trial_settings"]["end_behavior"]["missing_payment_method"] == "cancel"
    else:
        assert "trial_period_days" not in subscription_data
        assert "trial_settings" not in subscription_data
