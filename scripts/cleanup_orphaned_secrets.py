#!/usr/bin/env python3
"""
Remove unreferenced local file secrets from the secret store.

This scans Account.secret_ref for file-based references and deletes any
secret IDs that are not referenced by any account.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from backend.models import Account
from backend.models.base import SessionLocal
from backend.utils.secret_manager import delete_secret


def _resolve_store_path() -> Path:
    return Path(
        os.getenv("LOCAL_SECRET_STORE_PATH", "./data/local_secret_store.json")
    )


def _load_store(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _collect_refs(session) -> set[str]:
    refs = set()
    accounts = session.query(Account.secret_ref).filter(
        Account.secret_ref.is_not(None)
    )
    for (ref,) in accounts:
        if ref and ref.startswith("file:"):
            refs.add(ref[len("file:") :])
    return refs


def main() -> int:
    parser = argparse.ArgumentParser(description="Cleanup orphaned local secrets.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Delete orphaned secrets from the local store.",
    )
    args = parser.parse_args()

    os.environ.setdefault("APP_ENV", "local")
    os.environ.setdefault("SECRET_PROVIDER", "file")
    os.environ.setdefault("LOCAL_SECRET_STORE_PATH", "./data/local_secret_store.json")

    session = SessionLocal()
    try:
        store_path = _resolve_store_path()
        store = _load_store(store_path)
        referenced = _collect_refs(session)
        orphaned = sorted(set(store.keys()) - referenced)

        if not orphaned:
            print("No orphaned secrets found.")
            return 0

        for secret_id in orphaned:
            print(f"orphan -> {secret_id}")

        if args.apply:
            for secret_id in orphaned:
                delete_secret(f"file:{secret_id}")
            print(f"Deleted {len(orphaned)} orphaned secrets.")
        else:
            print(f"Dry run: {len(orphaned)} orphaned secrets would be deleted.")
    finally:
        session.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
