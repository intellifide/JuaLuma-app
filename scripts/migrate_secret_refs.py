#!/usr/bin/env python3
"""
Migrate account secret_ref values into the local secret store.

This keeps the database free of raw secrets by moving Plaid access tokens and
exchange API keys into the configured secret provider and storing only refs.
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Iterable

from backend.models import Account
from backend.models.base import SessionLocal
from backend.utils.encryption import decrypt_secret
from backend.utils.secret_manager import store_secret


def _iter_accounts(session) -> Iterable[Account]:
    return session.query(Account).filter(Account.secret_ref.is_not(None)).all()


def _should_skip(ref: str | None) -> bool:
    if not ref:
        return True
    return ref.startswith(("file:", "local:", "projects/"))


def _migrate_plaid(
    account: Account,
    cache: dict[tuple[str, str], str],
    apply_changes: bool,
) -> str | None:
    if _should_skip(account.secret_ref):
        return None
    cache_key = (account.uid, account.secret_ref or "")
    if cache_key in cache:
        return cache[cache_key]
    new_ref = store_secret(
        account.secret_ref or "",
        uid=account.uid,
        purpose="plaid-access",
    )
    cache[cache_key] = new_ref
    if apply_changes:
        account.secret_ref = new_ref
    return new_ref


def _migrate_cex(
    account: Account,
    cache: dict[tuple[str, str], str],
    apply_changes: bool,
) -> tuple[str | None, str | None]:
    if _should_skip(account.secret_ref):
        return None, None
    raw_ref = account.secret_ref or ""
    try:
        secret_json = decrypt_secret(raw_ref, account.uid)
    except Exception:
        secret_json = raw_ref
    cache_key = (account.uid, secret_json)
    if cache_key in cache:
        return cache[cache_key]
    try:
        payload = json.loads(secret_json)
    except json.JSONDecodeError:
        return None, f"Invalid CEX secret payload for account {account.id}"
    if not isinstance(payload, dict) or "apiKey" not in payload or "secret" not in payload:
        return None, f"Unexpected CEX secret shape for account {account.id}"
    new_ref = store_secret(
        json.dumps(payload),
        uid=account.uid,
        purpose=f"cex-{account.provider or 'exchange'}",
    )
    cache[cache_key] = new_ref
    if apply_changes:
        account.secret_ref = new_ref
    return new_ref, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate account secrets to secret store.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist migrated secret refs to the database.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of accounts processed (for testing).",
    )
    args = parser.parse_args()

    os.environ.setdefault("APP_ENV", "local")
    os.environ.setdefault("SECRET_PROVIDER", "file")
    os.environ.setdefault("LOCAL_SECRET_STORE_PATH", "./data/local_secret_store.json")

    session = SessionLocal()
    try:
        accounts = _iter_accounts(session)
        if args.limit:
            accounts = list(accounts)[: args.limit]
        plaid_cache: dict[tuple[str, str], str] = {}
        cex_cache: dict[tuple[str, str], str] = {}
        migrated = 0
        skipped = 0
        for account in accounts:
            if account.account_type == "traditional":
                new_ref = _migrate_plaid(account, plaid_cache, args.apply)
            elif account.account_type == "cex":
                new_ref, error = _migrate_cex(account, cex_cache, args.apply)
                if error:
                    skipped += 1
                    print(f"SKIP: {error}")
            else:
                new_ref = None
            if new_ref:
                migrated += 1
                print(f"{account.id} -> {new_ref}")

        if args.apply:
            session.commit()
            print(f"Applied updates to {migrated} accounts. Skipped {skipped}.")
        else:
            session.rollback()
            print(
                f"Dry run complete. {migrated} accounts would be updated. Skipped {skipped}."
            )
    finally:
        session.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
