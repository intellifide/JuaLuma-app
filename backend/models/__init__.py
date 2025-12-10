"""
SQLAlchemy base configuration for Finity backend.

Sets up the declarative Base, engine, and session factory for the rest of the
models. Uses DATABASE_URL from the environment.
"""

# Updated 2025-12-09 by AI

import os
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the environment.")

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()





from .account import Account  # noqa: E402
from .developer import Developer
from .transaction import Transaction
from .payment import Payment
from .ai_settings import AISettings
from .notification import NotificationPreference
from .audit import AuditLog, FeaturePreview, LLMLog, SupportPortalAction
from .support import SupportAgent, SupportTicketRating, SupportTicket, SupportTicketMessage
from .payout import DeveloperPayout
from .manual_asset import ManualAsset
from .ledger import LedgerHotEssential, LedgerHotFree
from .subscription import Subscription
from .user import User
from .widget import Widget
from .widget_rating import WidgetRating

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_session",
    "User",
    "Developer",
    "Subscription",
    "Account",
    "Transaction",
    "Payment",
    "AISettings",
    "NotificationPreference",
    "AuditLog",
    "FeaturePreview",
    "LLMLog",
    "SupportPortalAction",
    "SupportAgent",
    "SupportTicketRating",
    "SupportTicket",
    "SupportTicketMessage",
    "DeveloperPayout",
    "ManualAsset",
    "LedgerHotFree",
    "LedgerHotEssential",
    "Widget",
    "WidgetRating",
]
