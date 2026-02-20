#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <project-id> <allowlist-file> [--dry-run|--apply]" >&2
  exit 1
fi

PROJECT_ID="$1"
ALLOWLIST_FILE="$2"
MODE="${3:---dry-run}"

if [[ ! -f "$ALLOWLIST_FILE" ]]; then
  echo "Allowlist file not found: $ALLOWLIST_FILE" >&2
  exit 1
fi

if [[ "$MODE" != "--dry-run" && "$MODE" != "--apply" ]]; then
  echo "Mode must be --dry-run or --apply" >&2
  exit 1
fi

mapfile -t ALLOWED_MEMBERS < <(sed -e 's/#.*$//' -e '/^\s*$/d' "$ALLOWLIST_FILE" | tr -d '\r')

if [[ ${#ALLOWED_MEMBERS[@]} -eq 0 ]]; then
  echo "Allowlist is empty: $ALLOWLIST_FILE" >&2
  exit 1
fi

ALLOWED_JSON="$(printf '%s\n' "${ALLOWED_MEMBERS[@]}" | jq -R . | jq -s .)"

echo "Project: $PROJECT_ID"
echo "Allowlist file: $ALLOWLIST_FILE"
echo "Mode: $MODE"
echo "Allowed human/public principals:"
printf '  - %s\n' "${ALLOWED_MEMBERS[@]}"

POLICY_JSON="$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json)"

mapfile -t OFFENDERS < <(
  jq -r --argjson allowed "$ALLOWED_JSON" '
    .bindings[] as $binding
    | ($binding.members // [])[] as $member
    | select(
        (
          $member == "allUsers"
          or $member == "allAuthenticatedUsers"
          or ($member | startswith("user:"))
          or ($member | startswith("group:"))
          or ($member | startswith("domain:"))
          or ($member | startswith("deleted:user:"))
          or ($member | startswith("deleted:group:"))
        )
        and (($allowed | index($member)) == null)
      )
    | [$binding.role, $member]
    | @tsv
  ' <<< "$POLICY_JSON"
)

if [[ ${#OFFENDERS[@]} -eq 0 ]]; then
  echo "No unauthorized human/public IAM principals found."
  exit 0
fi

echo "Unauthorized principals detected:"
printf '  - %s\n' "${OFFENDERS[@]}"

if [[ "$MODE" == "--dry-run" ]]; then
  echo "Dry run complete. No bindings removed."
  exit 0
fi

for row in "${OFFENDERS[@]}"; do
  role="${row%%$'\t'*}"
  member="${row#*$'\t'}"
  echo "Removing $member from $role"
  gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
    --member="$member" \
    --role="$role" \
    --quiet >/dev/null

done

echo "Allowlist enforcement completed."
