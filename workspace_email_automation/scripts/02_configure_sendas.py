#!/usr/bin/env python3
"""
02_configure_sendas.py — Create/patch Gmail "Send mail as" identities on hello@jualuma.com.

Idempotent:
  - If sendAs does not exist → create it.
  - If sendAs exists → patch to enforce displayName/replyTo/signature/treatAsAlias.
  - After all entries are ensured, sets support@jualuma.com as the default From identity.

Uses Gmail Settings API (impersonating hello@jualuma.com via DWD):
  users.settings.sendAs.create / patch

No smtpMsa required: support@jualuma.com is a native alias on hello@jualuma.com
within the same Workspace domain — Gmail verifies it automatically.
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


def build_gmail_service(sa_file: str, scopes: list, impersonate: str):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(
        sa_file, scopes=scopes, subject=impersonate,
    )
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def build_sendas_body(entry: dict) -> dict:
    return {
        "sendAsEmail": entry["alias"],
        "displayName": entry["display_name"],
        "replyToAddress": entry["reply_to"],
        "treatAsAlias": entry["treat_as_alias"],
        "signature": entry.get("signature", ""),
    }


def get_existing_sendas(gmail, user_id: str) -> dict:
    """Returns dict keyed by sendAsEmail (lowercased)."""
    result = gmail.users().settings().sendAs().list(userId=user_id).execute()
    sendas_list = result.get("sendAs", [])
    return {s["sendAsEmail"].lower(): s for s in sendas_list}


def ensure_sendas(gmail, user_id: str, entry: dict, existing: dict) -> str:
    """Create or patch a sendAs identity. Returns 'created' or 'patched'."""
    from googleapiclient.errors import HttpError
    alias = entry["alias"].lower()
    body = build_sendas_body(entry)

    if alias not in existing:
        try:
            result = gmail.users().settings().sendAs().create(userId=user_id, body=body).execute()
            status = result.get("verificationStatus", "unknown")
            print(f"       verificationStatus: {status}")
            return "created"
        except HttpError as e:
            if e.resp.status == 400 and "already exists" in str(e).lower():
                pass  # fall through to patch
            else:
                print(f"[FAIL] sendAs.create error: {e}")
                raise

    gmail.users().settings().sendAs().patch(
        userId=user_id,
        sendAsEmail=entry["alias"],
        body=body,
    ).execute()
    return "patched"


def set_default_sendas(gmail, user_id: str, alias: str):
    gmail.users().settings().sendAs().patch(
        userId=user_id,
        sendAsEmail=alias,
        body={"isDefault": True},
    ).execute()


def main():
    print("=== 02_configure_sendas.py ===\n")
    cfg = load_config()
    sa_file = resolve_sa_file(cfg)
    jualuma_user = cfg["google_workspace"]["jualuma_user"]
    sendas_entries = cfg["sendas"]
    scopes = [
        "https://www.googleapis.com/auth/gmail.settings.basic",
        "https://www.googleapis.com/auth/gmail.settings.sharing",
    ]

    gmail = build_gmail_service(sa_file, scopes, jualuma_user)
    existing = get_existing_sendas(gmail, "me")
    print(f"[INFO] Existing sendAs identities: {list(existing.keys()) or '(none)'}\n")

    default_alias = None
    for entry in sendas_entries:
        alias = entry["alias"]
        action = ensure_sendas(gmail, "me", entry, existing)
        print(f"[OK]   {alias}: {action}")
        if entry.get("is_default"):
            default_alias = alias

    if default_alias:
        print(f"\n[INFO] Setting default From identity → {default_alias}")
        set_default_sendas(gmail, "me", default_alias)
        print(f"[OK]   Default set to {default_alias}")
    else:
        print("\n[WARN] No sendas entry marked is_default=true in config.yaml")

    print("\nDone. Proceed to 03_verify.py")


if __name__ == "__main__":
    main()
