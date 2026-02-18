#!/usr/bin/env python3
"""
01_add_aliases.py — Add support@jualuma.com as an alias on hello@jualuma.com.

Idempotent: if an alias already exists, skips (no error).

Uses Admin SDK Directory API:
  users.aliases.insert(userKey="hello@jualuma.com", body={"alias": "support@jualuma.com"})
"""

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ROOT = SCRIPT_DIR.parent
CONFIG_FILE = ROOT / "config.yaml"


def load_config():
    import yaml
    with open(CONFIG_FILE) as f:
        return yaml.safe_load(f)


def resolve_sa_file(cfg):
    import os
    sa_file = cfg["google_workspace"].get("service_account_file")
    if sa_file:
        return sa_file
    env_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if env_path:
        return env_path
    print("[FAIL] No service account key found. Run 00_prereq_check.py first.")
    sys.exit(1)


def build_admin_service(sa_file: str, scopes: list, impersonate: str):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(
        sa_file, scopes=scopes, subject=impersonate,
    )
    return build("admin", "directory_v1", credentials=creds, cache_discovery=False)


def get_existing_aliases(service, user_key: str) -> set:
    result = service.users().aliases().list(userKey=user_key).execute()
    aliases = result.get("aliases", [])
    return {a["alias"].lower() for a in aliases}


def add_alias(service, user_key: str, alias: str) -> bool:
    """Returns True if created, False if already existed."""
    from googleapiclient.errors import HttpError
    try:
        service.users().aliases().insert(
            userKey=user_key,
            body={"alias": alias},
        ).execute()
        return True
    except HttpError as e:
        if e.resp.status == 409:
            return False  # already exists
        raise


def main():
    print("=== 01_add_aliases.py ===\n")
    cfg = load_config()
    sa_file = resolve_sa_file(cfg)
    ops_user = cfg["google_workspace"]["ops_user"]
    jualuma_user = cfg["google_workspace"]["jualuma_user"]
    aliases = cfg["google_workspace"]["aliases"]
    scopes = [
        "https://www.googleapis.com/auth/admin.directory.user.alias",
    ]

    # Impersonate ops_user (admin) to manage aliases on jualuma_user
    service = build_admin_service(sa_file, scopes, ops_user)

    existing = get_existing_aliases(service, jualuma_user)
    print(f"[INFO] Existing aliases on {jualuma_user}: {existing or '(none)'}\n")

    results = {}
    for alias in aliases:
        if alias.lower() in existing:
            print(f"[SKIP] {alias} — already exists")
            results[alias] = "existed"
            continue
        created = add_alias(service, jualuma_user, alias)
        if created:
            print(f"[OK]   {alias} — created")
            results[alias] = "created"
        else:
            print(f"[SKIP] {alias} — already exists (race)")
            results[alias] = "existed"

    print()
    print("Summary:")
    for alias, status in results.items():
        marker = "✓" if status in ("created", "existed") else "✗"
        print(f"  {marker} {alias}: {status}")

    print("\nDone. Proceed to 02_configure_sendas.py")


if __name__ == "__main__":
    main()
