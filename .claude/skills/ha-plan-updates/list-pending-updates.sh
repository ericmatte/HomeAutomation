#!/usr/bin/env bash
# list-pending-updates.sh
# Run on a Home Assistant OS / Supervised host via the SSH & Web Terminal add-on.
# Paste the output back into Claude when invoking the ha-plan-updates skill.
#
# Covers:
#   - Core, OS, Supervisor               (via the `ha` CLI)
#   - Installed add-ons                  (via the `ha` CLI)
#   - HACS / integrations (update.*)     (via the REST API, requires a token)
#
# Optional env vars:
#   HA_TOKEN   long-lived access token (or set SUPERVISOR_TOKEN when running in an add-on)
#   HA_URL     base URL of the HA REST API (default: http://supervisor/core)

set -euo pipefail

command -v ha >/dev/null 2>&1 || { echo "ERROR: 'ha' CLI not found — run on a HA OS/Supervised host." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: 'jq' not installed (it ships with the SSH add-on)." >&2; exit 1; }

emit() {
  local label="$1" current="$2" latest="$3"
  if [ -n "$latest" ] && [ "$latest" != "null" ] && [ "$current" != "$latest" ]; then
    echo "- ${label}: ${current} → ${latest}"
  fi
}

echo "# HA update inventory ($(date -Iseconds))"
echo
echo "## Core / OS / Supervisor"

for slug in core os supervisor; do
  json=$(ha "$slug" info --raw-json)
  current=$(echo "$json" | jq -r '.data.version // empty')
  latest=$(echo "$json"  | jq -r '.data.version_latest // empty')
  emit "ha-${slug}" "$current" "$latest"
done

echo
echo "## Add-ons"
ha addons --raw-json \
  | jq -r '.data.addons[]
           | select(.version_latest != null and .version != .version_latest)
           | "- addon:\(.slug): \(.version) → \(.version_latest)"'

TOKEN="${HA_TOKEN:-${SUPERVISOR_TOKEN:-}}"
URL="${HA_URL:-http://supervisor/core}"

if [ -n "$TOKEN" ]; then
  echo
  echo "## HACS / update.* entities"
  if ! curl -fsSL -H "Authorization: Bearer ${TOKEN}" "${URL}/api/states" \
       | jq -r '.[]
                | select(.entity_id | startswith("update."))
                | select(.state == "on")
                | "- \(.entity_id): \(.attributes.installed_version) → \(.attributes.latest_version)"'; then
    echo "(could not query update.* entities — check HA_TOKEN / HA_URL)" >&2
  fi
else
  echo
  echo "## HACS / update.* entities"
  echo "(skipped — set HA_TOKEN to a long-lived access token to include HACS + integration updates)"
fi
