#!/usr/bin/env python3
"""
03_verify.py — Verify alias and sendAs configuration on hello@jualuma.com.

Checks:
  1. support@jualuma.com exists as an alias on hello@jualuma.com
  2. Gmail sendAs identity exists for support@jualuma.com
  3. support@jualuma.com is the default From identity
  4. Prints a verification report.

Exits 0 if all checks pass, 1 if any fail.
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
    print("[FAIL] No service account key. Run 00_prereq_check.py first.")
    sys.exit(1)


def build_service(api, version, sa_file, scopes, impersonate):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(
        sa_file, scopes=scopes, subject=impersonate,
    )
    return build(api, version, credentials=creds, cache_discovery=False)


def verify_aliases(admin_svc, user_key: str, expected: list) -> list:
    from googleapiclient.errors import HttpError
    try:
        result = admin_svc.users().aliases().list(userKey=user_key).execute()
        existing = {a["alias"].lower() for a in result.get("aliases", [])}
    except HttpError as e:
        print(f"  [WARN] Admin SDK aliases.list returned {e.resp.status}: {e}")
        return [(a, False, "UNABLE TO CHECK") for a in expected]
    checks = []
    for alias in expected:
        ok = alias.lower() in existing
        checks.append((alias, ok, "present" if ok else "MISSING"))
    return checks


def verify_sendas(gmail_svc, expected_entries: list) -> list:
    result = gmail_svc.users().settings().sendAs().list(userId="me").execute()
    sendas_map = {s["sendAsEmail"].lower(): s for s in result.get("sendAs", [])}
    checks = []
    for entry in expected_entries:
        alias = entry["alias"].lower()
        if alias not in sendas_map:
            checks.append((entry["alias"], False, "MISSING", None))
            continue
        s = sendas_map[alias]
        is_default = s.get("isDefault", False)
        checks.append((entry["alias"], True, "present", is_default))
    return checks


def main():
    print("=== 03_verify.py ===\n")
    cfg = load_config()
    sa_file = resolve_sa_file(cfg)
    ops_user = cfg["google_workspace"]["ops_user"]
    jualuma_user = cfg["google_workspace"]["jualuma_user"]
    expected_aliases = cfg["google_workspace"]["aliases"]
    sendas_entries = cfg["sendas"]
    expected_default = next((e["alias"] for e in sendas_entries if e.get("is_default")), None)

    admin_scopes = ["https://www.googleapis.com/auth/admin.directory.user.alias"]
    gmail_scopes = [
        "https://www.googleapis.com/auth/gmail.settings.basic",
        "https://www.googleapis.com/auth/gmail.settings.sharing",
    ]

    # Admin SDK: impersonate ops_user (admin) to read aliases on jualuma_user
    admin_svc = build_service("admin", "directory_v1", sa_file, admin_scopes, ops_user)
    # Gmail API: impersonate jualuma_user directly
    gmail_svc = build_service("gmail", "v1", sa_file, gmail_scopes, jualuma_user)

    # --- Alias checks ---
    print(f"Checking aliases on {jualuma_user}:")
    alias_checks = verify_aliases(admin_svc, jualuma_user, expected_aliases)
    alias_ok = True
    for alias, ok, status in alias_checks:
        marker = "✓" if ok else "✗"
        print(f"  {marker} alias {alias}: {status}")
        if not ok:
            alias_ok = False

    # --- sendAs checks ---
    print(f"\nChecking Gmail sendAs identities on {jualuma_user}:")
    sendas_checks = verify_sendas(gmail_svc, sendas_entries)
    sendas_ok = True
    default_ok = True
    for alias, present, status, is_default in sendas_checks:
        if is_default is None:
            marker = "✗"
            default_info = ""
        else:
            marker = "✓" if present else "✗"
            default_info = " [DEFAULT]" if is_default else ""
        print(f"  {marker} sendAs {alias}: {status}{default_info}")
        if not present:
            sendas_ok = False
        if alias.lower() == (expected_default or "").lower() and not is_default:
            default_ok = False

    # --- Default check ---
    print("\nChecking default From identity:")
    if expected_default:
        result = gmail_svc.users().settings().sendAs().list(userId="me").execute()
        defaults = [s["sendAsEmail"] for s in result.get("sendAs", []) if s.get("isDefault")]
        if expected_default.lower() in [d.lower() for d in defaults]:
            print(f"  ✓ Default From: {expected_default}")
            default_ok = True
        else:
            print(f"  ✗ Default From is NOT {expected_default} (actual: {defaults})")
            default_ok = False
    else:
        print("  [SKIP] No is_default entry in config.yaml")
        default_ok = True

    # --- Report ---
    all_ok = alias_ok and sendas_ok and default_ok
    print("\n" + "=" * 50)
    print("VERIFICATION REPORT")
    print("=" * 50)
    print(f"  Aliases present       : {'PASS' if alias_ok else 'FAIL'}")
    print(f"  sendAs present        : {'PASS' if sendas_ok else 'FAIL'}")
    print(f"  Default From identity : {'PASS' if default_ok else 'FAIL'}")
    print("=" * 50)
    print(f"Overall: {'ALL CHECKS PASSED' if all_ok else 'SOME CHECKS FAILED'}")

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
