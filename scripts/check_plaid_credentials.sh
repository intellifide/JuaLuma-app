#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PLAID_CLIENT_ID:-}" ]]; then
  echo "ERROR: PLAID_CLIENT_ID is required." >&2
  exit 1
fi
if [[ -z "${PLAID_SECRET:-}" ]]; then
  echo "ERROR: PLAID_SECRET is required." >&2
  exit 1
fi
if [[ -z "${PLAID_ENV:-}" ]]; then
  echo "ERROR: PLAID_ENV is required." >&2
  exit 1
fi

normalized_plaid_env="$(printf '%s' "${PLAID_ENV}" | tr '[:upper:]' '[:lower:]')"

case "${normalized_plaid_env}" in
  production|prod)
    plaid_host="https://production.plaid.com"
    ;;
  sandbox|development|dev)
    plaid_host="https://sandbox.plaid.com"
    ;;
  *)
    echo "ERROR: Unsupported PLAID_ENV='${PLAID_ENV}'." >&2
    exit 1
    ;;
esac

payload="$(
  python3 - <<'PY'
import json
import os

payload = {
    "client_id": os.environ["PLAID_CLIENT_ID"],
    "secret": os.environ["PLAID_SECRET"],
    "client_name": "jualuma-ci-validation",
    "language": "en",
    "country_codes": ["US"],
    "user": {"client_user_id": "ci-validation-user"},
    "products": ["transactions", "investments"],
    "transactions": {"days_requested": 30},
}

redirect_uri = (os.getenv("PLAID_REDIRECT_URI") or "").strip()
if redirect_uri:
    payload["redirect_uri"] = redirect_uri

print(json.dumps(payload))
PY
)"

response="$(curl -sS "${plaid_host}/link/token/create" \
  -H "Content-Type: application/json" \
  -d "${payload}")"

python3 - "${response}" <<'PY'
import json
import sys

raw = sys.argv[1]
try:
    body = json.loads(raw)
except json.JSONDecodeError:
    print("ERROR: Plaid returned non-JSON response.")
    sys.exit(1)

if body.get("link_token"):
    request_id = body.get("request_id", "unknown")
    print(f"Plaid credential check passed (request_id={request_id}).")
    sys.exit(0)

error_code = body.get("error_code", "UNKNOWN")
error_type = body.get("error_type", "UNKNOWN")
error_message = body.get("error_message") or body.get("display_message") or "Unknown Plaid error."
request_id = body.get("request_id", "unknown")

if (
    error_code == "INVALID_FIELD"
    and "oauth redirect uri" in str(error_message).lower()
    and "developer dashboard" in str(error_message).lower()
):
    print(
        "ERROR: Plaid rejected redirect_uri for this environment. "
        "Add PLAID_REDIRECT_URI to Team OAuth redirect URIs in Plaid Dashboard "
        f"(request_id={request_id})."
    )
    sys.exit(1)

print(
    "ERROR: Plaid credential check failed "
    f"(error_code={error_code}, error_type={error_type}, request_id={request_id}): {error_message}"
)
sys.exit(1)
PY
