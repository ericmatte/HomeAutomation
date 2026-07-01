# Visual / live testing

I have no access to the running Home Assistant instance — I cannot open the
Atrium dashboard, view entities, or check anything visually. Whenever a change
needs to be verified in the UI or against live state, say so and let the user
do it; the user runs all visual/live testing.

# Validation checklists

This repo tracks a two-level validation checklist per automation/blueprint in
`www/atrium/validation-checklists.json`, surfaced as checkable items in the
Atrium dashboard's Routines tab (see `www/atrium/components/validation-card.js`
for the implementation):

- `change` — items to validate for the specific change just made. Checking
  one off just marks it done (struck through) — it stays visible. Remove it
  from this file once you've confirmed it was validated; that's what
  actually clears it from the list (they served their purpose).
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
  `automations.yaml`). When set, the automation's title links to that
  entity's more-info dialog in the UI (the only link — items themselves
  never link out). Only add it when you're sure of the actual entity_id —
  leave it out rather than guessing.

Every item's `text`, at **both** levels (`change` and `ongoing`), also starts
with a fitting emoji — same reason as the label: scannable at a glance. Reuse
an emoji already used in that blueprint's own `description:` bullets when one
fits (e.g. ✋ for a manual-override item, 🔁 for an anti-spam/hysteresis item);
otherwise pick a fitting one. Avoid repeating the exact same emoji across
multiple items within the same automation.
