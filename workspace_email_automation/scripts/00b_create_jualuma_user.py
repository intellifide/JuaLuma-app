#!/usr/bin/env python3
"""
00b_create_jualuma_user.py — Create hello@jualuma.com as a Workspace user.

Idempotent: if the user already exists, prints info and exits 0.

Uses Admin SDK Directory API with admin.directory.user scope:
  users.insert / users.get

The new user is created with a random initial password (never used —
DWD service account impersonation is used for all API access).
"""

import os
import secrets
import string
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


def random_password(length: int = 24) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main():
    print("=== 00b_create_jualuma_user.py ===\n")
    cfg = load_config()
    sa_file = resolve_sa_file(cfg)
    ops_user = cfg["google_workspace"]["ops_user"]
    jualuma_user = cfg["google_workspace"]["jualuma_user"]

    # Need admin.directory.user for create/get
    scopes = ["https://www.googleapis.com/auth/admin.directory.user"]
    service = build_admin_service(sa_file, scopes, ops_user)

    from googleapiclient.errors import HttpError

    # Check if user already exists
    print(f"[CHECK] Looking up {jualuma_user} ...")
    try:
        result = service.users().get(userKey=jualuma_user).execute()
        print(f"[OK]   User already exists: {result.get('primaryEmail')}")
        print(f"       Name : {result.get('name', {}).get('fullName')}")
        print(f"       ID   : {result.get('id')}")
        print("\nUser exists. Proceed to 01_add_aliases.py")
        sys.exit(0)
    except HttpError as e:
        if e.resp.status == 404:
            print(f"[INFO] User not found. Creating {jualuma_user} ...")
        else:
            print(f"[FAIL] Admin SDK error ({e.resp.status}): {e}")
            sys.exit(1)

    # Create the user
    body = {
        "primaryEmail": jualuma_user,
        "name": {
            "givenName": "JuaLuma",
            "familyName": "Support",
        },
        "password": random_password(),
        "changePasswordAtNextLogin": False,
    }

    try:
        result = service.users().insert(body=body).execute()
        print(f"[OK]   Created user: {result.get('primaryEmail')}")
        print(f"       ID: {result.get('id')}")
        print("\nDone. Proceed to 01_add_aliases.py")
    except HttpError as e:
        print(f"[FAIL] Failed to create user: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
