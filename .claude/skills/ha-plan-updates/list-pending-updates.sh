#!/usr/bin/env bash
# list-pending-updates.sh
# Run on a Home Assistant OS / Supervised host via the SSH & Web Terminal add-on.
# Paste the output back into Claude when invoking the ha-plan-updates skill.
#
# Single source of truth: HA Core's `update.*` entities — covers Core, OS,
# Supervisor, add-ons, HACS, ESPHome and any integration that exposes an
# update entity. Reaches HA via http://supervisor/core/api with the
# $SUPERVISOR_TOKEN that the SSH & Web Terminal add-on injects automatically.
#
# Run with `bash list-pending-updates.sh` (or `./list-pending-updates.sh`) —
# launching it through plain `sh` may drop the bash shebang and the env var.

set -euo pipefail

command -v jq >/dev/null 2>&1 || { echo "ERROR: 'jq' not installed (it ships with the SSH add-on)." >&2; exit 1; }

echo "# HA update inventory ($(date -Iseconds))"
echo

if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
  curl -fsSL -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
       "http://supervisor/core/api/states" \
    | jq -r '.[]
             | select(.entity_id | startswith("update."))
             | select(.state == "on")
             | "- \(.attributes.friendly_name // .entity_id): \(.attributes.installed_version // "?") → \(.attributes.latest_version // "?")  [\(.entity_id)]"'
  exit 0
fi

# Fallback: $SUPERVISOR_TOKEN not exposed to this shell. Covers Core, OS,
# Supervisor and add-ons via the `ha` CLI only — HACS / ESPHome / integration
# updates will NOT appear in this branch.

echo "# WARNING: \$SUPERVISOR_TOKEN not set — falling back to the 'ha' CLI."
echo "# HACS, ESPHome and integration update.* entities will be missing."
echo "# Re-run with: bash list-pending-updates.sh   (or ./list-pending-updates.sh)"
echo

command -v ha >/dev/null 2>&1 || { echo "ERROR: 'ha' CLI not found." >&2; exit 1; }

emit() {
  local label="$1" current="$2" latest="$3"
  if [ -n "$latest" ] && [ "$latest" != "null" ] && [ "$current" != "$latest" ]; then
    echo "- ${label}: ${current} → ${latest}"
  fi
}

for slug in core os supervisor; do
  json=$(ha "$slug" info --raw-json)
  current=$(echo "$json" | jq -r '.data.version // empty')
  latest=$(echo "$json"  | jq -r '.data.version_latest // empty')
  emit "ha-${slug}" "$current" "$latest"
done

ha addons --raw-json \
  | jq -r '.data.addons[]
           | select(.version_latest != null and .version != .version_latest)
           | "- addon:\(.slug): \(.version) → \(.version_latest)"'
