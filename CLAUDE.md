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
