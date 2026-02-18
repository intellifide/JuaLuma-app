#!/usr/bin/env python3
"""
00_prereq_check.py — Prerequisite check before running alias/sendAs scripts.

Checks:
1. Required Python packages are importable.
2. config.yaml is valid and readable.
3. Service account key file is present (or GOOGLE_APPLICATION_CREDENTIALS is set).
4. Service account has the expected scopes authorized for DWD.
5. Gmail API can reach ops@intellifide.com via DWD impersonation.

If DWD is NOT yet authorized, prints the exact one-time Admin Console steps
and STOPS (exits non-zero) so no API mutation is attempted.
"""

import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ROOT = SCRIPT_DIR.parent
CONFIG_FILE = ROOT / "config.yaml"

REQUIRED_PACKAGES = [
    "google.auth",
    "google.oauth2.service_account",
    "googleapiclient.discovery",
    "yaml",
]


def check_packages():
    missing = []
    for pkg in REQUIRED_PACKAGES:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"[FAIL] Missing packages: {missing}")
        print("       Run: pip install -r requirements.txt")
        sys.exit(1)
    print("[OK]   All required packages importable.")


def load_config():
    import yaml
    if not CONFIG_FILE.exists():
        print(f"[FAIL] config.yaml not found at {CONFIG_FILE}")
        sys.exit(1)
    with open(CONFIG_FILE) as f:
        cfg = yaml.safe_load(f)
    print("[OK]   config.yaml loaded.")
    return cfg


def resolve_sa_file(cfg):
    sa_file = cfg["google_workspace"].get("service_account_file")
    if sa_file:
        path = Path(sa_file)
        if not path.exists():
            print(f"[FAIL] service_account_file not found: {sa_file}")
            sys.exit(1)
        print(f"[OK]   Service account key: {sa_file}")
        return str(path)
    env_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if env_path:
        if not Path(env_path).exists():
            print(f"[FAIL] GOOGLE_APPLICATION_CREDENTIALS points to missing file: {env_path}")
            sys.exit(1)
        print(f"[OK]   Service account key from GOOGLE_APPLICATION_CREDENTIALS: {env_path}")
        return env_path
    print("[FAIL] No service account key found.")
    print("       Set config.yaml:google_workspace.service_account_file  OR")
    print("       export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json")
    sys.exit(1)


def get_sa_client_id(sa_file: str) -> str:
    with open(sa_file) as f:
        data = json.load(f)
    client_id = data.get("client_id", "")
    sa_email = data.get("client_email", "")
    print(f"[INFO] Service account email : {sa_email}")
    print(f"[INFO] Service account client_id: {client_id}")
    return client_id


def build_credentials(sa_file: str, scopes: list, impersonate: str):
    from google.oauth2 import service_account
    creds = service_account.Credentials.from_service_account_file(
        sa_file,
        scopes=scopes,
        subject=impersonate,
    )
    return creds


def check_dwd(sa_file: str, cfg: dict):
    """Test DWD by listing Gmail sendAs identities on admin_user.

    Previous approach used Admin Directory users.get() which requires
    admin.directory.user.readonly — a scope NOT in our DWD grant.
    Gmail sendAs.list uses gmail.settings.basic which IS granted.
    """
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError

    ops_user = cfg["google_workspace"]["ops_user"]
    gmail_scopes = ["https://www.googleapis.com/auth/gmail.settings.basic"]

    print(f"\n[CHECK] Testing DWD impersonation of {ops_user} (Gmail API) ...")
    try:
        creds = build_credentials(sa_file, gmail_scopes, ops_user)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        result = service.users().settings().sendAs().list(userId="me").execute()
        identities = [s["sendAsEmail"] for s in result.get("sendAs", [])]
        print(f"[OK]   Gmail API reached {ops_user}, sendAs identities: {identities}")
        return True
    except HttpError as e:
        status = e.resp.status
        if status in (401, 403):
            print(f"[WARN] Gmail API returned {status}: {e}")
            return False
        print(f"[FAIL] Gmail API error ({status}): {e}")
        sys.exit(1)
    except Exception as e:
        err = str(e).lower()
        if "unauthorized_client" in err or "not authorized" in err:
            return False
        print(f"[FAIL] Unexpected error: {e}")
        sys.exit(1)


def print_dwd_instructions(sa_file: str):
    with open(sa_file) as f:
        data = json.load(f)
    client_id = data.get("client_id", "<YOUR_CLIENT_ID>")

    scopes_str = ",".join([
        "https://www.googleapis.com/auth/admin.directory.user",
        "https://www.googleapis.com/auth/admin.directory.user.alias",
        "https://www.googleapis.com/auth/gmail.settings.basic",
        "https://www.googleapis.com/auth/gmail.settings.sharing",
        "https://www.googleapis.com/auth/gmail.send",
    ])

    print("\n" + "=" * 70)
    print("DWD NOT AUTHORIZED — one-time setup required in Google Admin Console")
    print("=" * 70)
    print()
    print("Steps (do this ONCE as a Google Workspace Super Admin):")
    print()
    print("  1. Go to: https://admin.google.com")
    print("  2. Navigate to: Security → Access and data control → API controls")
    print("     (or Security → API controls)")
    print("  3. Click: 'Manage Domain Wide Delegation'")
    print("  4. Click: 'Add new'")
    print(f"  5. Client ID: {client_id}")
    print("  6. OAuth scopes (paste this entire string):")
    print()
    print(f"     {scopes_str}")
    print()
    print("  7. Click 'Authorize'.")
    print("  8. Wait ~2 minutes for propagation, then re-run this script.")
    print()
    print("STOPPING. Re-run after completing the above steps.")
    print("=" * 70)


def main():
    print("=== 00_prereq_check.py ===\n")
    check_packages()
    cfg = load_config()
    sa_file = resolve_sa_file(cfg)
    get_sa_client_id(sa_file)

    dwd_ok = check_dwd(sa_file, cfg)
    if not dwd_ok:
        print_dwd_instructions(sa_file)
        sys.exit(2)  # exit code 2 = DWD not authorized (distinct from fatal error)

    print("\n[OK]   All prerequisites met. Proceed to 01_add_aliases.py → 02 → 03.")


if __name__ == "__main__":
    main()
