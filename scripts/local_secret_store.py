#!/usr/bin/env python3
"""Local secret store utilities (file provider)."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


def _resolve_path() -> Path:
    return Path(os.getenv("LOCAL_SECRET_STORE_PATH", "./data/local_secret_store.json"))


def _read_store(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def cmd_list() -> int:
    path = _resolve_path()
    store = _read_store(path)
    print(f"{path} -> {len(store)} secrets")
    for key in sorted(store.keys()):
        print(key)
    return 0


def cmd_purge(secret_id: str | None) -> int:
    path = _resolve_path()
    if not path.exists():
        print("No local secret store found.")
        return 0
    if secret_id is None:
        path.unlink()
        print("Deleted local secret store file.")
        return 0
    store = _read_store(path)
    if secret_id in store:
        store.pop(secret_id, None)
        path.write_text(json.dumps(store, indent=2, sort_keys=True), encoding="utf-8")
        print(f"Removed {secret_id}.")
    else:
        print(f"{secret_id} not found.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Manage local secret store.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List stored secret IDs.")

    purge = sub.add_parser("purge", help="Purge a single secret ID or the entire store.")
    purge.add_argument("--id", dest="secret_id", default=None, help="Secret ID to remove.")

    args = parser.parse_args()
    if args.command == "list":
        return cmd_list()
    if args.command == "purge":
        return cmd_purge(args.secret_id)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
