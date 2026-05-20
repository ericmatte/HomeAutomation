#!/usr/bin/env bash
# list-pending-updates.sh
# Run on a Home Assistant OS / Supervised host via the SSH & Web Terminal add-on.
# Paste the output back into Claude when invoking the ha-plan-updates skill.
#
# Covers (all via the `ha` CLI — already authenticated inside HA, no token needed):
#   - Core, OS, Supervisor
#   - Installed add-ons
#
# HACS / integration `update.*` entities are NOT covered — list those manually
# from Settings → System → Updates in the UI.

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
