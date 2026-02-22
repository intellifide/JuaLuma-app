#!/usr/bin/env python3
"""
Mark CEX accounts with invalid secret_ref payloads for re-auth.

If a CEX account's secret_ref cannot be parsed as credentials, this script
clears the secret_ref and sets sync_status to "needs_reauth".
"""

from __future__ import annotations

import argparse
import json
import os

from backend.models import Account
from backend.models.base import SessionLocal
from backend.utils.encryption import decrypt_secret


def _is_valid_ref(ref: str | None) -> bool:
    if not ref:
        return False
    return ref.startswith(("file:", "local:", "projects/"))


def _parse_payload(ref: str, uid: str) -> bool:
    if _is_valid_ref(ref):
        return True
    try:
        payload = decrypt_secret(ref, uid)
    except Exception:
        payload = ref
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return False
    if not isinstance(data, dict):
        return False
    return "apiKey" in data and "secret" in data


def main() -> int:
    parser = argparse.ArgumentParser(description="Fix invalid CEX secrets.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes to the database.",
    )
    args = parser.parse_args()

    os.environ.setdefault("APP_ENV", "local")

    session = SessionLocal()
    try:
        accounts = (
            session.query(Account)
            .filter(Account.account_type == "cex")
            .all()
        )
        fixed = 0
        for account in accounts:
            ref = account.secret_ref or ""
            if not ref:
                continue
            if _parse_payload(ref, account.uid):
                continue
            print(f"invalid -> {account.id}")
            fixed += 1
            if args.apply:
                account.secret_ref = None
                account.sync_status = "needs_reauth"
                session.add(account)

        if args.apply:
            session.commit()
            print(f"Applied updates to {fixed} accounts.")
        else:
            session.rollback()
            print(f"Dry run: {fixed} accounts would be updated.")
    finally:
        session.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
