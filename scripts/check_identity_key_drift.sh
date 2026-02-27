#!/usr/bin/env bash
set -euo pipefail

POLICY_FILE="ops/identity-keys/browser-auth-policy.public.json"
ENVIRONMENT="all"
FAIL_ON_DEPRECATED="false"

usage() {
  cat <<USAGE
Usage: $0 [--env dev|stage|prod|all] [--policy <path>] [--fail-on-deprecated]

Checks API key restriction drift for Identity Toolkit browser keys against a
public-safe policy baseline.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --policy)
      POLICY_FILE="$2"
      shift 2
      ;;
    --fail-on-deprecated)
      FAIL_ON_DEPRECATED="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud is required" >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 2
fi

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "ERROR: policy file not found: $POLICY_FILE" >&2
  exit 2
fi

check_env() {
  local env_name="$1"

  local project_id
  project_id="$(jq -r --arg e "$env_name" '.environments[$e].project_id // empty' "$POLICY_FILE")"
  if [[ -z "$project_id" ]]; then
    echo "FAIL [$env_name] missing project_id in policy" >&2
    return 1
  fi

  local key_name_regex
  key_name_regex="$(jq -r --arg e "$env_name" '.environments[$e].key_display_name_regex // empty' "$POLICY_FILE")"
  if [[ -z "$key_name_regex" ]]; then
    echo "FAIL [$env_name] missing key_display_name_regex in policy" >&2
    return 1
  fi

  local key_list_json
  if ! key_list_json="$(gcloud services api-keys list --project="$project_id" --format=json)"; then
    echo "FAIL [$env_name] unable to list API keys for project: $project_id" >&2
    return 1
  fi

  local key_resource
  key_resource="$(jq -r --arg re "$key_name_regex" '[.[] | select((.displayName // "") | test($re; "i"))] | sort_by(.updateTime) | last | .name // empty' <<<"$key_list_json")"
  if [[ -z "$key_resource" ]]; then
    echo "FAIL [$env_name] browser key not found by displayName regex: $key_name_regex" >&2
    return 1
  fi

  local key_json
  key_json="$(gcloud services api-keys describe "$key_resource" --project="$project_id" --format=json)"

  local expected_services_json
  expected_services_json="$(jq -c '.required_api_targets // []' "$POLICY_FILE")"

  local actual_services_json
  actual_services_json="$(jq -c '[.restrictions.apiTargets[]?.service] | map(select(. != null)) | unique' <<<"$key_json")"

  local missing_services_json
  missing_services_json="$(jq -n \
    --argjson expected "$expected_services_json" \
    --argjson actual "$actual_services_json" \
    '[ $expected[] | select(($actual | index(.)) == null) ]')"

  local unexpected_services_json
  unexpected_services_json="$(jq -n \
    --argjson expected "$expected_services_json" \
    --argjson actual "$actual_services_json" \
    '[ $actual[] | select(($expected | index(.)) == null) ]')"

  local required_referrers_json
  required_referrers_json="$(jq -c --arg e "$env_name" '.environments[$e].required_referrers // []' "$POLICY_FILE")"

  local allowed_regex_json
  allowed_regex_json="$(jq -c --arg e "$env_name" '.environments[$e].allowed_referrer_regex // []' "$POLICY_FILE")"

  local deprecated_regex_json
  deprecated_regex_json="$(jq -c --arg e "$env_name" '.environments[$e].deprecated_referrer_regex // []' "$POLICY_FILE")"

  local actual_referrers_json
  actual_referrers_json="$(jq -c '[.restrictions.browserKeyRestrictions.allowedReferrers[]?] | map(select(. != null)) | unique' <<<"$key_json")"

  local missing_referrers_json
  missing_referrers_json="$(jq -n \
    --argjson required "$required_referrers_json" \
    --argjson actual "$actual_referrers_json" \
    '[ $required[] | select(($actual | index(.)) == null) ]')"

  local unexpected_referrers_json
  unexpected_referrers_json="$(jq -n \
    --argjson required "$required_referrers_json" \
    --argjson allowed_regex "$allowed_regex_json" \
    --argjson deprecated_regex "$deprecated_regex_json" \
    --argjson actual "$actual_referrers_json" \
    '[
      $actual[] as $ref
      | select(($required | index($ref)) == null)
      | select(([$allowed_regex[]? as $rx | ($ref | test($rx))] | any) | not)
      | select(([$deprecated_regex[]? as $rx | ($ref | test($rx))] | any) | not)
      | $ref
    ]')"

  local deprecated_referrers_json
  deprecated_referrers_json="$(jq -n \
    --argjson deprecated_regex "$deprecated_regex_json" \
    --argjson actual "$actual_referrers_json" \
    '[
      $actual[] as $ref
      | select(([$deprecated_regex[]? as $rx | ($ref | test($rx))] | any))
      | $ref
    ]')"

  local failed=0
  if [[ "$(jq 'length' <<<"$missing_services_json")" -gt 0 ]]; then
    echo "FAIL [$env_name] missing API targets:" >&2
    jq -r '.[] | "  - " + .' <<<"$missing_services_json" >&2
    failed=1
  fi

  if [[ "$(jq 'length' <<<"$unexpected_services_json")" -gt 0 ]]; then
    echo "FAIL [$env_name] unexpected API targets:" >&2
    jq -r '.[] | "  - " + .' <<<"$unexpected_services_json" >&2
    failed=1
  fi

  if [[ "$(jq 'length' <<<"$missing_referrers_json")" -gt 0 ]]; then
    echo "FAIL [$env_name] missing required referrers:" >&2
    jq -r '.[] | "  - " + .' <<<"$missing_referrers_json" >&2
    failed=1
  fi

  if [[ "$(jq 'length' <<<"$unexpected_referrers_json")" -gt 0 ]]; then
    echo "FAIL [$env_name] unexpected referrers:" >&2
    jq -r '.[] | "  - " + .' <<<"$unexpected_referrers_json" >&2
    failed=1
  fi

  if [[ "$(jq 'length' <<<"$deprecated_referrers_json")" -gt 0 ]]; then
    if [[ "$FAIL_ON_DEPRECATED" == "true" ]]; then
      echo "FAIL [$env_name] deprecated referrers still present:" >&2
      jq -r '.[] | "  - " + .' <<<"$deprecated_referrers_json" >&2
      failed=1
    else
      echo "WARN [$env_name] deprecated referrers still present:" >&2
      jq -r '.[] | "  - " + .' <<<"$deprecated_referrers_json" >&2
    fi
  fi

  if [[ "$failed" -eq 0 ]]; then
    echo "PASS [$env_name] key=$key_resource api_targets=$(jq 'length' <<<"$actual_services_json") referrers=$(jq 'length' <<<"$actual_referrers_json")"
    return 0
  fi

  return 1
}

exit_code=0

declare -a envs
if [[ "$ENVIRONMENT" == "all" ]]; then
  envs=(dev stage prod)
else
  envs=("$ENVIRONMENT")
fi

for env_name in "${envs[@]}"; do
  case "$env_name" in
    dev|stage|prod) ;;
    *)
      echo "ERROR: invalid --env value: $env_name" >&2
      exit 2
      ;;
  esac

  if ! check_env "$env_name"; then
    exit_code=1
  fi
done

exit "$exit_code"
