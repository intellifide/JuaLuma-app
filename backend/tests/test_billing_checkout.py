# Updated 2026-01-31 00:00 CST
from types import SimpleNamespace

import pytest

from backend.core import settings
from backend.models import Subscription, TrialRedemption, User
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
        ("essential", "essential_monthly", True),
    ],
)
def test_create_checkout_session_applies_trial_by_plan(
    test_db, monkeypatch, plan_input, expected_plan, expect_trial
):
    settings.stripe_secret_key = "sk_test"

    user = User(uid="user_123", email="user@testmail.app", first_name="Test", last_name="User")
    test_db.add(user)
    test_db.commit()

    capture = _CheckoutCapture()

    monkeypatch.setattr(billing, "create_stripe_customer", lambda *_, **__: "cus_test")
    monkeypatch.setattr(billing.stripe.checkout.Session, "create", capture)

    url = billing.create_checkout_session(
        test_db, user.uid, plan_input, "https://app.local/checkout/success"
    )

    assert url == "https://checkout.stripe.test/session"
    assert capture.kwargs is not None
    assert capture.kwargs["line_items"][0]["price"] == billing.STRIPE_PLANS[expected_plan]
    assert capture.kwargs["automatic_tax"] == {"enabled": True}
    assert capture.kwargs["billing_address_collection"] == "required"
    assert capture.kwargs["customer_update"] == {"address": "auto", "name": "auto"}

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
        ("essential", "essential_monthly", True),
    ],
)
def test_create_checkout_session_for_pending_applies_trial_by_plan(
    test_db, monkeypatch, plan_input, expected_plan, expect_trial
):
    settings.stripe_secret_key = "sk_test"

    capture = _CheckoutCapture()
    monkeypatch.setattr(billing.stripe.checkout.Session, "create", capture)

    url = billing.create_checkout_session_for_pending(
        test_db,
        "pending_123",
        "pending@testmail.app",
        plan_input,
        "https://app.local/checkout/success",
        customer_id="cus_test",
    )

    assert url == "https://checkout.stripe.test/session"
    assert capture.kwargs is not None
    assert capture.kwargs["line_items"][0]["price"] == billing.STRIPE_PLANS[expected_plan]
    assert capture.kwargs["automatic_tax"] == {"enabled": True}
    assert capture.kwargs["billing_address_collection"] == "required"
    assert capture.kwargs["customer_update"] == {"address": "auto", "name": "auto"}

    subscription_data = capture.kwargs["subscription_data"]
    if expect_trial:
        assert subscription_data["trial_period_days"] == 14
        assert subscription_data["trial_settings"]["end_behavior"]["missing_payment_method"] == "cancel"
    else:
        assert "trial_period_days" not in subscription_data
        assert "trial_settings" not in subscription_data


def test_create_checkout_session_skips_trial_if_email_used_before(test_db, monkeypatch):
    settings.stripe_secret_key = "sk_test"

    user = User(uid="user_123", email="user@testmail.app", first_name="Test", last_name="User")
    test_db.add(user)
    test_db.add(Subscription(uid="user_123", plan="free", status="active"))
    test_db.add(
        TrialRedemption(
            uid="prior_uid",
            email_normalized="user@testmail.app",
            plan_code="pro_monthly",
            stripe_subscription_id="sub_prior_123",
        )
    )
    test_db.commit()

    capture = _CheckoutCapture()
    monkeypatch.setattr(billing, "create_stripe_customer", lambda *_, **__: "cus_test")
    monkeypatch.setattr(billing.stripe.checkout.Session, "create", capture)

    url = billing.create_checkout_session(
        test_db, user.uid, "pro", "https://app.local/checkout/success"
    )

    assert url == "https://checkout.stripe.test/session"
    subscription_data = capture.kwargs["subscription_data"]
    assert "trial_period_days" not in subscription_data
    assert "trial_settings" not in subscription_data


def test_create_checkout_session_applies_trial_for_upgrade_when_no_prior_redemption(test_db, monkeypatch):
    settings.stripe_secret_key = "sk_test"

    user = User(uid="user_456", email="paid@testmail.app", first_name="Paid", last_name="User")
    test_db.add(user)
    test_db.add(Subscription(uid="user_456", plan="pro_monthly", status="active"))
    test_db.commit()

    capture = _CheckoutCapture()
    monkeypatch.setattr(billing, "create_stripe_customer", lambda *_, **__: "cus_test")
    monkeypatch.setattr(billing.stripe.checkout.Session, "create", capture)

    url = billing.create_checkout_session(
        test_db, user.uid, "ultimate", "https://app.local/checkout/success"
    )

    assert url == "https://checkout.stripe.test/session"
    subscription_data = capture.kwargs["subscription_data"]
    assert subscription_data["trial_period_days"] == 14
    assert subscription_data["trial_settings"]["end_behavior"]["missing_payment_method"] == "cancel"


def test_record_trial_redemption_skips_official_stripe_test_card_last4(test_db):
    billing._record_trial_redemption(
        test_db,
        uid="user_test",
        email="tester@example.com",
        plan_code="pro_monthly",
        stripe_customer_id="cus_test_card",
        stripe_subscription_id="sub_test_card",
        card_last4="4242",
        card_fingerprint="fp_test_123",
        livemode=True,
    )

    records = test_db.query(TrialRedemption).all()
    assert records == []
