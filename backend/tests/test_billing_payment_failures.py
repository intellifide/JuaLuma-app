# Updated 2026-01-31 00:00 CST
import time
from types import SimpleNamespace

import pytest

from backend.core import settings
from backend.models import Subscription, User
from backend.services import billing


class _EmailCapture:
    def __init__(self):
        self.failed = []
        self.downgraded = []

    def send_subscription_payment_failed(self, to_email, plan_name, grace_end_date):
        self.failed.append((to_email, plan_name, grace_end_date))

    def send_subscription_downgraded(self, to_email, reason):
        self.downgraded.append((to_email, reason))

    def send_generic_alert(self, to_email, title):
        pass

    def send_subscription_welcome(self, to_email, plan_name):
        pass

    def send_otp(self, to_email, code):
        pass

    def send_password_reset(self, to_email, link):
        pass

    def send_household_invite(self, to_email, link, inviter_name):
        pass

    def send_household_welcome_member(self, to_email, household_name, owner_name):
        pass

    def send_support_ticket_notification(
        self, to_email, subject, ticket_id, user_email, description, event_type="Ticket Created"
    ):
        pass


@pytest.mark.asyncio
async def test_trial_end_payment_failure_downgrades_immediately(
    test_db, monkeypatch
):
    settings.stripe_secret_key = "sk_test"

    user = User(uid="trial_user", email="trial@example.com")
    sub = Subscription(uid="trial_user", plan="pro_monthly", status="trialing")
    test_db.add_all([user, sub])
    test_db.commit()

    email_capture = _EmailCapture()
    monkeypatch.setattr(billing, "get_email_client", lambda: email_capture)

    past_trial_end = int(time.time()) - 10
    subscription_obj = SimpleNamespace(
        trial_end=past_trial_end,
        status="past_due",
        items={"data": [{"price": {"id": billing.STRIPE_PLANS["pro_monthly"]}}]},
        get=lambda key, default=None: getattr(subscription_obj, key, default),
    )
    monkeypatch.setattr(
        billing.stripe.Subscription,
        "retrieve",
        lambda _sub_id: subscription_obj,
    )

    invoice = {"customer": "cus_test", "subscription": "sub_test"}
    monkeypatch.setattr(billing, "_resolve_uid_for_customer", lambda *_: "trial_user")

    await billing._handle_invoice_payment_failed(invoice, test_db)

    updated = test_db.query(Subscription).filter(Subscription.uid == "trial_user").first()
    assert updated.plan == "free"
    assert email_capture.downgraded


@pytest.mark.asyncio
async def test_paid_plan_payment_failure_starts_grace_period(
    test_db, monkeypatch
):
    settings.stripe_secret_key = "sk_test"

    user = User(uid="paid_user", email="paid@example.com")
    sub = Subscription(uid="paid_user", plan="pro_monthly", status="active")
    test_db.add_all([user, sub])
    test_db.commit()

    email_capture = _EmailCapture()
    monkeypatch.setattr(billing, "get_email_client", lambda: email_capture)

    subscription_obj = SimpleNamespace(
        trial_end=None,
        status="past_due",
        items={"data": [{"price": {"id": billing.STRIPE_PLANS["pro_monthly"]}}]},
        get=lambda key, default=None: getattr(subscription_obj, key, default),
    )
    monkeypatch.setattr(
        billing.stripe.Subscription,
        "retrieve",
        lambda _sub_id: subscription_obj,
    )

    invoice = {"customer": "cus_test", "subscription": "sub_test"}
    monkeypatch.setattr(billing, "_resolve_uid_for_customer", lambda *_: "paid_user")

    await billing._handle_invoice_payment_failed(invoice, test_db)

    updated = test_db.query(Subscription).filter(Subscription.uid == "paid_user").first()
    assert updated.status == "past_due"
    assert updated.plan == "pro_monthly"
    assert email_capture.failed
    assert not email_capture.downgraded
