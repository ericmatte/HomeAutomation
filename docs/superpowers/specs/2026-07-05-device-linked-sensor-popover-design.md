# Device-linked sensor popover for light/switch tiles

## Problem

Some lights and switches share a physical HA device with one or more sensor
entities (e.g. a smart plug exposing `switch.*` plus `sensor.power` /
`sensor.energy`, or a wall switch with a built-in motion or contact sensor).
Today `AtriumAreaCard._classify` has no concept of this relationship: every
`sensor`/`binary_sensor` entity in an area is bucketed purely by
`device_class` (motion, leak, door, soil, propane, temp/humid winner, or the
catch-all `extras`), independent of which device it lives on. Sensors that
land in `extras` render inline in the area card's generic "Sensors" section,
unrelated to any specific light/switch tile.

We want: when a light/switch has sensors on the same device, show a caret
button on the right side of its tile instead of (or in addition to) the
generic section, and put those sensors in a popover anchored to that caret.

## Scope decisions (from brainstorming)

- **Association rule**: same `device_id` between the sensor and the
  light/switch entity. No naming-based heuristics.
- **Domains considered**: `sensor.*` and `binary_sensor.*`.
- **Dedup**: a sensor claimed by a light/switch popover is removed from the
  generic "Sensors" section — no duplication.
- **Priority**: area-level chips/pills keep priority. A sensor that already
  feeds the room header (motion pill, temp/humid chip, leak chip, door chip,
  soil/propane chips) is **never** pulled into a popover, even if it shares a
  device_id with a light/switch. Device-association only reclaims sensors
  that would otherwise be invisible or dumped in the generic `extras` bucket:
  - `sensor.*` entities that land in `extras` (not the temp/humid winner, not
    soil/propane).
  - `binary_sensor.*` entities that aren't motion/occupancy/presence,
    moisture, or door/garage_door/window/opening (today these are silently
    dropped by `_classify` — a new `other` bucket makes that explicit and
    gives the association step something to reclaim from).

## Design

### 1. `www/atrium/lib/device-sensors.js` (new, pure, unit-tested)

```js
export function groupDeviceSensors({ lights, switches, extras, other }) {
  // returns { deviceSensors: Map<entityId, entity[]>, extras: entity[], other: entity[] }
}
```

- Builds `device_id -> { lightIds: string[], switchIds: string[] }` from the
  `lights`/`switches` arrays (entity registry entries, each with
  `entity_id`/`device_id`).
- Walks `extras` then `other`; for each entity whose `device_id` matches an
  entry in the device map, pushes it into `deviceSensors` under every
  matching light/switch `entity_id` (a sensor can be attached to more than
  one target if a device improbably exposes both a light and a switch) and
  excludes it from the returned `extras`/`other` arrays.
- Entities with no `device_id`, or whose `device_id` doesn't match any
  light/switch in the area, pass through unchanged in `extras`/`other`.
- No DOM, no `hass`, no `this` — pure data in, data out. Lives alongside
  `floor-accordion.js` as a plain ES module.

### 2. `_classify` wiring (`www/atrium/components/area-card.js`)

- Add `sensors.other = []` to `_emptyData()`, and route non-matching
  `binary_sensor` entities there instead of dropping them.
- After the existing classification loop, call `groupDeviceSensors` with the
  area's `lights`, `switches`, `sensors.extras`, `sensors.other`; overwrite
  `out.sensors.extras`, `out.sensors.other` with the filtered arrays, and set
  `out.deviceSensors` to the returned map.
- `_emptyData()` gets a `deviceSensors: new Map()` default.
- `_filterData`: only copy `data.deviceSensors` through when the `"lights"`
  section is selected (mirrors how `out.lights`/`out.switches` are gated).
  `_excludeData` passes it through as-is (the `{ ...data }` shallow copy
  already includes it); no extra handling needed since a light/switch whose
  section is excluded never gets a tile built to read it from.

### 3. Tile + popover (`www/atrium/components/area-card-builders.js`)

- `_buildToggleTile(area, entity, { kind, icon, refKey })` reads
  `area's data.deviceSensors?.get(entity.entity_id)`. (`_buildLightTile` /
  `_buildSwitchTile` already delegate here, so both get this for free.)
- If the list is non-empty, build a caret button and append it as the last
  child of `.atrium-tile-body` (after `.atrium-tile-text`):
  ```html
  <button class="atrium-tile-caret" type="button">
    <ha-icon icon="mdi:menu-down"></ha-icon>
  </button>
  ```
- Wiring, mirroring `_buildHiddenRoutinesBtn`:
  - `pointerdown` → `e.stopPropagation()` (prevents `_bindSwipeTile`'s
    tile-level pointerdown from starting a press/drag/long-press sequence).
  - `click` → `e.stopPropagation()`, then build (once, eagerly, at tile
    construction time — not lazily on first click) a wrapper containing
    `buildPopoverHeader(this._entityName(entity), String(sensors.length))`
    followed by each sensor rendered via the existing
    `this._buildSensorTile(area, sensor)`, and call `openPopover({ anchor:
    caretBtn, content: wrapper, width: 280, onClose: ... })` (same
    `_openAnchors` bookkeeping pattern used elsewhere in this file).
  - Building eagerly means these sensor tiles register themselves into
    `ar.sensors` (via `_buildSensorTile`'s existing ref registration) at
    card-build time, so `_update()` → `_updateSensorRef` keeps them fresh
    whether or not the popover has ever been opened — no new update-loop
    code needed.
- No changes needed to `_buildSensorTile` itself — it already renders
  icon + name + value and wires tap-to-more-info.

### 4. Styling (`www/atrium/components/area-card.css`)

- New rule `.atrium-tile-caret`, visually consistent with
  `.atrium-select-caret` (existing input-select caret): secondary-text
  color, `--mdc-icon-size: 16px`, `flex-shrink: 0`, small left margin, no
  background — sits flush right in the tile body's flex row.
- No new popover CSS: reuses `.atrium-pop-header` / the generic popover
  surface already shipped in `popover.css` / `area-card-popover.css`.

### 5. Tests

- `www/atrium/lib/device-sensors.test.js` (plain `node --test`, same style
  as `floor-accordion.test.js`), covering:
  - a `sensor.*` entity sharing `device_id` with a light is moved from
    `extras` into `deviceSensors` under that light's `entity_id`.
  - a `binary_sensor.*` entity sharing `device_id` with a switch is moved
    from `other` into `deviceSensors` under that switch's `entity_id`.
  - a sensor whose `device_id` matches nothing stays in `extras`/`other`
    untouched, and `deviceSensors` has no entry for it.
  - a sensor whose `device_id` matches both a light and a switch (same
    device) ends up attached under both `entity_id`s.
  - entities with no `device_id` are left alone.
- No new tests for `_classify`/`_buildToggleTile` themselves (DOM + `this`
  heavy, no existing harness for `area-card.js` — consistent with today's
  test coverage, which is limited to framework-free `lib/` helpers).
- No visual/live verification is possible in this environment (no HA
  access) — the user validates in the running dashboard once shipped, per
  this repo's existing convention.

## Out of scope

- No changes to how `data.sensors.motion` / `.temp` / `.humid` / `.leak` /
  `.soil` / `.propane` winners are chosen — those keep the exact same
  precedence rules they have today.
- No change to the generic "Sensors" section's rendering or styling beyond
  the fact that it now renders a possibly-smaller `extras` array.
- No validation-checklist entry: this repo's `validation-checklists.json`
  convention (per `CLAUDE.md`) applies to automations/blueprints, not
  frontend dashboard components — not applicable here.
