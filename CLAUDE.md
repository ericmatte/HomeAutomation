# Validation checklists

This repo tracks a two-level validation checklist per automation/blueprint in
`www/atrium/validation-checklists.json`, surfaced as checkable items in the
Atrium dashboard's Routines tab (see
`docs/superpowers/specs/2026-07-01-automation-validation-checklists-design.md`
for the full design):

- `change` — items to validate for the specific change just made. Removed
  from the to-do list once checked; also remove them from this file once
  you've confirmed they were validated (they served their purpose).
- `ongoing` — recurring real-world scenarios to re-validate over time (e.g.
  every summer). Leave these in place indefinitely.

**Whenever you change an automation or blueprint in this repo** (new
behavior, changed thresholds/setpoints, removed logic, etc.), add or update
the relevant `change` and `ongoing` entries for that automation in
`www/atrium/validation-checklists.json` before considering the change done.
Use the automation/blueprint's snake_case key (matching its filename) as the
top-level key in the JSON.

Per automation entry:

- `label` — prefix it with the same emoji as the blueprint's own `name:` (or
  a fitting one if there's no blueprint), matching the house convention
  already used for blueprint/input names — it makes the checklist scannable
  at a glance.
- `entity` (optional) — the automation's `entity_id` (e.g.
  `automation.smart_climate_controller`, found via its `alias:` in
  `automations.yaml`). When set, `change` items link to that entity's
  more-info dialog in the UI. Only add it when you're sure of the actual
  entity_id — leave it out rather than guessing.
