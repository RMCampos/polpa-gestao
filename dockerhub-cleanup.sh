#!/usr/bin/env bash
#
# dockerhub-cleanup.sh
#
# Keeps only the N most recently updated tags in a Docker Hub repository
# and deletes the rest, using the Docker Hub v2 API.
#
# Usage:
#   ./dockerhub-cleanup.sh -u <dockerhub_username> -r <namespace/repo> [-k 5] [-e "latest,stable"] [--yes]
#
# Examples:
#   Dry run (default, nothing is deleted):
#     ./dockerhub-cleanup.sh -u johndoe -r johndoe/myapp -k 5
#
#   Actually delete:
#     ./dockerhub-cleanup.sh -u johndoe -r johndoe/myapp -k 5 --yes
#
#   Keep 5 newest, never delete "latest" or "stable" even if old:
#     ./dockerhub-cleanup.sh -u johndoe -r johndoe/myapp -k 5 -e "latest,stable" --yes
#
# You will be prompted for your Docker Hub password (or a Personal Access
# Token, recommended) — it is never passed as a CLI argument or logged.

set -euo pipefail

KEEP=5
EXCLUDE=""
EXECUTE=false
USERNAME=""
REPO=""

usage() {
  echo "Usage: $0 -u <username> -r <namespace/repo> [-k keep_count] [-e tag1,tag2] [--yes]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -u) USERNAME="$2"; shift 2 ;;
    -r) REPO="$2"; shift 2 ;;
    -k) KEEP="$2"; shift 2 ;;
    -e) EXCLUDE="$2"; shift 2 ;;
    --yes) EXECUTE=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

[[ -z "$USERNAME" || -z "$REPO" ]] && usage

if ! command -v jq >/dev/null 2>&1; then
  echo "This script requires 'jq'. Install it first (e.g. apt install jq / brew install jq)." >&2
  exit 1
fi

read -rsp "Docker Hub password or access token for $USERNAME: " PASSWORD
echo

echo "Authenticating..."
TOKEN=$(curl -s -H "Content-Type: application/json" \
  -X POST -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}" \
  https://hub.docker.com/v2/users/login/ | jq -r .token)

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Authentication failed. Check your username/password (or use a Personal Access Token)." >&2
  exit 1
fi

echo "Fetching tags for $REPO..."
ALL_TAGS_JSON="[]"
URL="https://hub.docker.com/v2/repositories/${REPO}/tags/?page_size=100&ordering=last_updated"

while [[ -n "$URL" && "$URL" != "null" ]]; do
  PAGE=$(curl -s -H "Authorization: JWT ${TOKEN}" "$URL")
  ALL_TAGS_JSON=$(jq -s '.[0] + .[1].results' <(echo "$ALL_TAGS_JSON") <(echo "$PAGE"))
  URL=$(echo "$PAGE" | jq -r '.next')
done

# ordering=last_updated from the API is ascending oldest->newest in some
# accounts, so re-sort locally to be safe: newest first.
SORTED=$(echo "$ALL_TAGS_JSON" | jq 'sort_by(.last_updated) | reverse')
TOTAL=$(echo "$SORTED" | jq 'length')

echo "Found $TOTAL tags. Keeping the $KEEP most recent."
[[ -n "$EXCLUDE" ]] && echo "Always keeping (excluded from deletion): $EXCLUDE"

IFS=',' read -ra EXCLUDE_ARR <<< "$EXCLUDE"

KEPT=0
DELETED=0

echo "$SORTED" | jq -c '.[]' | while read -r ENTRY; do
  TAG=$(echo "$ENTRY" | jq -r '.name')
  UPDATED=$(echo "$ENTRY" | jq -r '.last_updated')

  IS_EXCLUDED=false
  for EX in "${EXCLUDE_ARR[@]:-}"; do
    [[ -n "$EX" && "$TAG" == "$EX" ]] && IS_EXCLUDED=true
  done

  if $IS_EXCLUDED; then
    echo "KEEP   (excluded) $TAG  (last updated: $UPDATED)"
    continue
  fi

  # index within the (non-excluded) loop isn't tracked across subshell
  # iterations reliably in a pipe, so we recompute rank using a counter file.
  COUNTER_FILE="/tmp/.dockerhub_cleanup_counter"
  if [[ ! -f "$COUNTER_FILE" ]]; then echo 0 > "$COUNTER_FILE"; fi
  RANK=$(cat "$COUNTER_FILE")

  if [[ "$RANK" -lt "$KEEP" ]]; then
    echo "KEEP   $TAG  (last updated: $UPDATED)"
    echo $((RANK + 1)) > "$COUNTER_FILE"
  else
    if $EXECUTE; then
      echo "DELETE $TAG  (last updated: $UPDATED)"
      curl -s -o /dev/null -w "  -> HTTP %{http_code}\n" \
        -X DELETE -H "Authorization: JWT ${TOKEN}" \
        "https://hub.docker.com/v2/repositories/${REPO}/tags/${TAG}/"
    else
      echo "WOULD DELETE (dry run) $TAG  (last updated: $UPDATED)"
    fi
    echo $((RANK + 1)) > "$COUNTER_FILE"
  fi
done

rm -f /tmp/.dockerhub_cleanup_counter

if ! $EXECUTE; then
  echo
  echo "Dry run complete. No tags were deleted. Re-run with --yes to actually delete."
fi

