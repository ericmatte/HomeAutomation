# Validation checklists for automation/blueprint changes

## Problem

When an automation or blueprint changes, there's no structured way to confirm
the change actually works — both right after deploying it, and over time as
real-world conditions (a hot day, a cold snap, a manual override, etc.)
exercise paths that can't be validated immediately.

## Goals

- Two levels of checklist items per automation:
  1. **Change** — validate the specific change just made. Removed once
     checked off (it served its purpose).
  2. **Ongoing** — recurring real-world scenarios to re-validate over time
     (e.g. every summer). Stays checked/unchecked indefinitely, re-testable.
- Checklist content is versioned in git (source of truth), not hand-managed
  in the HA UI.
- Items are checkable natively from the HA UI/app.
- Adding new items never requires a Home Assistant reload/restart.

## Non-goals

- Automated test execution — these are manual validation checklists, not a
  test framework.
- Per-automation to-do lists — avoided because each Local To-do list
  requires a one-time manual UI creation; doing that per automation doesn't
  scale.

## Architecture

### HA backend (one-time manual setup)

Two **Local To-do** lists, created once via Settings → Devices & Services,
never again:

- `todo.validation_changement`
- `todo.validation_suivi_long_terme`

All content after that is driven by code — no more manual list creation
regardless of how many automations get checklists.

### Content manifest (versioned in git)

`www/atrium/validation-checklists.json`, keyed by automation:

```json
{
  "smart_climate_controller": {
    "label": "Smart Climate Controller",
    "change": [
      { "id": "day-setpoint", "text": "Le setpoint jour suit summer_target_temp" }
    ],
    "ongoing": [
      { "id": "hot-day-ac-start", "text": "Journée chaude : l'AC démarre au bon seuil" }
    ]
  }
}
```

- `id` is stable per item and namespaced by automation key at sync time
  (`smart_climate_controller:day-setpoint`) to correlate a manifest entry
  with its native to-do item.
- Editing this file (adding/removing items) takes effect on next dashboard
  load — no HA reload of any kind.

### Sync (client-side, on card render)

A new Atrium card fetches the manifest once per page load and reconciles it
against the two native to-do lists over the websocket API (`todo/item/list`
to read, `todo.add_item` / `todo.update_item` / `todo.remove_item` to write).
The correlation id is stored in the to-do item's **`description`** field
(supported by the to-do entity platform via `SET_DESCRIPTION_ON_ITEM`), not
in the visible summary — so the item reads cleanly if someone opens the raw
to-do list from the standard HA to-do card or the mobile app.

- Manifest item not yet in the corresponding to-do list → `todo.add_item`
  with `item: <text>` and `description: <automation_key>:<item_id>`.
- To-do item whose correlation id is no longer present in the manifest →
  `todo.remove_item` (manifest is the source of truth for *content*).
- **Change** item checked → `todo.remove_item` right away (auto-cleanup).
  The manifest entry itself is cleaned up manually by whoever makes the next
  change (no automatic file-editing from the frontend).
- **Ongoing** item checked → left as-is; unchecking it later to re-test is a
  normal user action, not something the sync touches.

### Display

A new card, `atrium-validation-card`, added as a standalone card at the top
of the existing **Routines** view in `strategy.js` (before the per-floor
loop) — checklists are per-automation, not per-area, so they don't belong
inside the per-area `atrium-area-card` sections.

Per automation with pending items: label (emoji-prefixed, matching the
blueprint's own `name:` per house convention), then a "🔧 Changement"
sub-list and a "🔁 Suivi long terme" sub-list, each item rendered as a
checkbox reflecting (and toggling) the underlying to-do item's status.

An automation entry may optionally set `entity` (its `entity_id`). When
present, `change` items render as a link that opens that entity's more-info
dialog — the change touched that entity, so jumping to it is the natural
next step. `ongoing` items never link; they're broader scenarios, not tied
to one entity.

### Error handling

- Manifest fetch fails with 404 (file doesn't exist yet) → the whole
  section is hidden, no error shown. This is a normal "nothing to validate
  yet" state.
- Manifest fetch fails with a real error (bad JSON, non-404 HTTP error) →
  section shows a small inline message naming the problem (e.g. "JSON
  invalide dans validation-checklists.json").
- One or both to-do entities (`todo.validation_changement` /
  `todo.validation_suivi_long_terme`) don't exist in `hass.states` → section
  shows an inline message identifying exactly which one is missing and that
  it needs to be created once via Settings → Devices & Services.

### Process: keeping checklists current

A new root-level `CLAUDE.md` documents this mechanism and instructs future
AI agents to propose/add the relevant `change` and `ongoing` entries to
`validation-checklists.json` as part of finishing any automation or
blueprint change — mirroring how this conversation started.

## Testing

No JS test runner exists in this repo for `www/atrium`. Verification is
manual: load the Atrium dashboard, confirm the Routines view shows the new
section for `smart_climate_controller` (seeded as the first real example
from the change that prompted this design), check/uncheck items, reload,
and confirm state persists and stale/obsolete items disappear.
