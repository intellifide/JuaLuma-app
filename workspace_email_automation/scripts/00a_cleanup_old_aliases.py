#!/usr/bin/env python3
"""
00a_cleanup_old_aliases.py — Remove stale JuaLuma aliases from ops@intellifide.com.

In the previous architecture, support@jualuma.com and hello@jualuma.com were added
as aliases on ops@intellifide.com. Since hello@jualuma.com is now a standalone
Workspace user, those aliases must be removed before the new user can be created.

Idempotent: if an alias doesn't exist, skips.
"""

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ROOT = SCRIPT_DIR.parent
CONFIG_FILE = ROOT / "config.yaml"

# Aliases to remove from ops@intellifide.com
STALE_ALIASES = [
    "support@jualuma.com",
    "hello@jualuma.com",
]


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
    print("[FAIL] No service account key found.")
    sys.exit(1)


def build_admin_service(sa_file: str, scopes: list, impersonate: str):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(
        sa_file, scopes=scopes, subject=impersonate,
    )
    return build("admin", "directory_v1", credentials=creds, cache_discovery=False)


def main():
    print("=== 00a_cleanup_old_aliases.py ===\n")
    cfg = load_config()
    sa_file = resolve_sa_file(cfg)
    ops_user = cfg["google_workspace"]["ops_user"]
    scopes = ["https://www.googleapis.com/auth/admin.directory.user.alias"]

    service = build_admin_service(sa_file, scopes, ops_user)

    from googleapiclient.errors import HttpError

    # List current aliases on ops@
    result = service.users().aliases().list(userKey=ops_user).execute()
    existing = {a["alias"].lower() for a in result.get("aliases", [])}
    print(f"[INFO] Current aliases on {ops_user}: {existing or '(none)'}\n")

    for alias in STALE_ALIASES:
        if alias.lower() not in existing:
            print(f"[SKIP] {alias} — not present on {ops_user}")
            continue
        try:
            service.users().aliases().delete(userKey=ops_user, alias=alias).execute()
            print(f"[OK]   Removed {alias} from {ops_user}")
        except HttpError as e:
            if e.resp.status == 404:
                print(f"[SKIP] {alias} — not found (already removed)")
            else:
                print(f"[FAIL] Error removing {alias}: {e}")
                sys.exit(1)

    print("\nDone. Proceed to 00b_create_jualuma_user.py")


if __name__ == "__main__":
    main()
