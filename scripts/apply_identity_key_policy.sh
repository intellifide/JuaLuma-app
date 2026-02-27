#!/usr/bin/env bash
set -euo pipefail

POLICY_FILE="ops/identity-keys/browser-auth-policy.public.json"
ENVIRONMENT="all"
APPLY="false"

usage() {
  cat <<USAGE
Usage: $0 [--env dev|stage|prod|all] [--policy <path>] [--apply]

Applies Identity browser API key restrictions from public policy.
Default mode is dry-run; use --apply to execute updates.
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
    --apply)
      APPLY="true"
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

apply_env() {
  local env_name="$1"

  local project_id
  project_id="$(jq -r --arg e "$env_name" '.environments[$e].project_id // empty' "$POLICY_FILE")"
  if [[ -z "$project_id" ]]; then
    echo "ERROR [$env_name] missing project_id in policy" >&2
    return 1
  fi

  local key_name_regex
  key_name_regex="$(jq -r --arg e "$env_name" '.environments[$e].key_display_name_regex // empty' "$POLICY_FILE")"
  if [[ -z "$key_name_regex" ]]; then
    echo "ERROR [$env_name] missing key_display_name_regex in policy" >&2
    return 1
  fi

  local key_resource
  key_resource="$(
    gcloud services api-keys list --project="$project_id" --format=json \
      | jq -r --arg re "$key_name_regex" '[.[] | select((.displayName // "") | test($re; "i"))] | sort_by(.updateTime) | last | .name // empty'
  )"
  if [[ -z "$key_resource" ]]; then
    echo "ERROR [$env_name] browser key not found by displayName regex: $key_name_regex" >&2
    return 1
  fi

  local key_json
  key_json="$(gcloud services api-keys describe "$key_resource" --project="$project_id" --format=json)"

  local required_referrers_json
  required_referrers_json="$(jq -c --arg e "$env_name" '.environments[$e].required_referrers // []' "$POLICY_FILE")"

  local allowed_regex_json
  allowed_regex_json="$(jq -c --arg e "$env_name" '.environments[$e].allowed_referrer_regex // []' "$POLICY_FILE")"

  local actual_referrers_json
  actual_referrers_json="$(jq -c '[.restrictions.browserKeyRestrictions.allowedReferrers[]?] | map(select(. != null))' <<<"$key_json")"

  local desired_referrers_json
  desired_referrers_json="$(
    jq -n \
      --argjson required "$required_referrers_json" \
      --argjson allowed_regex "$allowed_regex_json" \
      --argjson actual "$actual_referrers_json" \
      '
      reduce (
        $required + [
          $actual[] as $ref
          | select(([$allowed_regex[]? as $rx | ($ref | test($rx))] | any))
          | $ref
        ]
      )[] as $ref
      ([]; if index($ref) == null then . + [$ref] else . end)
      '
  )"

  local api_targets_json
  api_targets_json="$(jq -c '.required_api_targets // []' "$POLICY_FILE")"

  local desired_sorted actual_sorted
  desired_sorted="$(jq -c 'sort' <<<"$desired_referrers_json")"
  actual_sorted="$(jq -c 'sort' <<<"$actual_referrers_json")"

  echo "ENV=$env_name key=$key_resource project=$project_id"
  echo "  desired_referrers=$(jq 'length' <<<"$desired_referrers_json") actual_referrers=$(jq 'length' <<<"$actual_referrers_json")"

  if [[ "$desired_sorted" == "$actual_sorted" ]]; then
    echo "  status=no-change"
    return 0
  fi

  echo "  status=drift"
  echo "  drop:"
  jq -r -n --argjson desired "$desired_referrers_json" --argjson actual "$actual_referrers_json" \
    '$actual[] as $ref | select(($desired | index($ref)) == null) | "    - " + $ref'
  echo "  add:"
  jq -r -n --argjson desired "$desired_referrers_json" --argjson actual "$actual_referrers_json" \
    '$desired[] as $ref | select(($actual | index($ref)) == null) | "    + " + $ref'

  if [[ "$APPLY" != "true" ]]; then
    echo "  mode=dry-run"
    return 0
  fi

  local allowed_csv
  allowed_csv="$(jq -r 'join(",")' <<<"$desired_referrers_json")"

  local -a cmd
  cmd=(
    gcloud services api-keys update "$key_resource"
    --project="$project_id"
    --allowed-referrers="$allowed_csv"
    --quiet
  )

  while IFS= read -r service; do
    [[ -n "$service" ]] || continue
    cmd+=(--api-target="service=$service")
  done < <(jq -r '.[]' <<<"$api_targets_json")

  "${cmd[@]}" >/dev/null
  echo "  mode=applied"
}

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

  apply_env "$env_name"
done
