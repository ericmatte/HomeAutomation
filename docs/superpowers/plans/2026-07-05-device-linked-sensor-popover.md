# Device-linked sensor popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give lights/switches that share a physical device with sensor entities a caret button that opens a popover of those sensors, instead of the sensors rendering inline in the area card's generic "Sensors" section.

**Architecture:** A new pure helper (`groupDeviceSensors`) partitions already-classified `extras`/`other` sensor pools by shared `device_id` with the area's lights/switches. `_classify` wires it in and threads the result (`data.deviceSensors: Map<entityId, sensorEntity[]>`) down to `_buildToggleTile`, which — when a light/switch has linked sensors — appends a caret button that opens a popover built from the existing `_buildSensorTile` renderer (so live updates keep working for free via the existing `ar.sensors` ref map).

**Tech Stack:** Vanilla ES modules (no bundler, no framework), custom elements, `mdi:*` icons via `<ha-icon>`, the repo's existing `lib/popover.js` popover primitive.

## Global Constraints

- Per this repo's `CLAUDE.md`: no HA access in this environment — visual/live verification must be done by the user in the running dashboard, not claimed as done here.
- Per user request for this task: skip automated tests. Verification steps below use `node --check` (syntax-only) plus manual code tracing — no test files are created.
- Association rule (from the design spec): same `device_id` between a `sensor.*`/`binary_sensor.*` entity and a light/switch entity in the same area.
- Priority rule: area-level chips/pills (motion pill, temp/humid winner chip, leak/door/soil/propane chips) always keep their sensor — device-association only ever pulls from the `extras` (sensor domain catch-all) and new `other` (binary_sensor domain catch-all) pools, never from those winner buckets.
- Dedup rule: a sensor claimed into a popover is removed from `extras`/`other` so it doesn't also render in the generic "Sensors" section.

---

### Task 1: `groupDeviceSensors` pure helper

**Files:**
- Create: `www/atrium/lib/device-sensors.js`

**Interfaces:**
- Produces: `groupDeviceSensors({ lights, switches, extras, other })` → `{ deviceSensors: Map<string, object[]>, extras: object[], other: object[] }`. Inputs/outputs are entity-registry-entry-shaped objects (each has at least `entity_id` and optionally `device_id`) — no `hass`, no DOM, no `this`.

- [ ] **Step 1: Write the helper**

Create `www/atrium/lib/device-sensors.js`:

```js
// Pure data transform: no hass, no DOM. Splits the "leftover" sensor pools
// (extras / other) into sensors that share a device_id with a light or
// switch in the same area, versus sensors that stay in the generic pools.
// Callers are responsible for keeping motion/leak/door/temp/humid winners
// out of `extras`/`other` in the first place — this function never sees
// them, so it can never steal a sensor already feeding an area-level chip.
export function groupDeviceSensors({ lights, switches, extras, other }) {
  const deviceTargets = new Map(); // device_id -> entity_id[]
  const addTargets = (entities) => {
    for (const e of entities) {
      if (!e.device_id) continue;
      if (!deviceTargets.has(e.device_id)) deviceTargets.set(e.device_id, []);
      deviceTargets.get(e.device_id).push(e.entity_id);
    }
  };
  addTargets(lights);
  addTargets(switches);

  const deviceSensors = new Map();
  const attach = (targetId, entity) => {
    if (!deviceSensors.has(targetId)) deviceSensors.set(targetId, []);
    deviceSensors.get(targetId).push(entity);
  };

  const split = (pool) => {
    const kept = [];
    for (const entity of pool) {
      const targets = entity.device_id ? deviceTargets.get(entity.device_id) : null;
      if (targets && targets.length) {
        for (const targetId of targets) attach(targetId, entity);
      } else {
        kept.push(entity);
      }
    }
    return kept;
  };

  return {
    deviceSensors,
    extras: split(extras),
    other: split(other),
  };
}
```

- [ ] **Step 2: Manual sanity check**

Run:

```bash
node -e '
import("./www/atrium/lib/device-sensors.js").then(({ groupDeviceSensors }) => {
  const light = { entity_id: "light.kitchen", device_id: "dev1" };
  const sw = { entity_id: "switch.plug", device_id: "dev2" };
  const power = { entity_id: "sensor.plug_power", device_id: "dev2" };
  const unrelated = { entity_id: "sensor.outside_temp" };
  const contact = { entity_id: "binary_sensor.plug_problem", device_id: "dev2" };
  const result = groupDeviceSensors({
    lights: [light],
    switches: [sw],
    extras: [power, unrelated],
    other: [contact],
  });
  console.log("extras:", result.extras.map((e) => e.entity_id));
  console.log("other:", result.other.map((e) => e.entity_id));
  console.log("deviceSensors switch.plug:", result.deviceSensors.get("switch.plug").map((e) => e.entity_id));
  console.log("deviceSensors light.kitchen:", result.deviceSensors.get("light.kitchen"));
});
'
```

Expected output:
```
extras: [ 'sensor.outside_temp' ]
other: []
deviceSensors switch.plug: [ 'sensor.plug_power', 'binary_sensor.plug_problem' ]
deviceSensors light.kitchen: undefined
```

- [ ] **Step 3: Commit**

```bash
git add www/atrium/lib/device-sensors.js
git commit -m "$(cat <<'EOF'
feat(atrium): Add groupDeviceSensors helper

Pure helper that splits leftover sensor pools by shared device_id with
area lights/switches, so a later task can wire it into area-card
classification.
EOF
)"
```

---

### Task 2: Wire association into `_classify` (area-card.js)

**Files:**
- Modify: `www/atrium/components/area-card.js:5-17` (module imports)
- Modify: `www/atrium/components/area-card.js:158-173` (`_emptyData`)
- Modify: `www/atrium/components/area-card.js:178-209` (`_filterData`)
- Modify: `www/atrium/components/area-card.js:228-285` (`_classify`)

**Interfaces:**
- Consumes: `groupDeviceSensors({ lights, switches, extras, other })` from Task 1 (`www/atrium/lib/device-sensors.js`).
- Produces: every area `data` object built by `_classify`/`_filterData` now carries `data.sensors.other: object[]` and `data.deviceSensors: Map<entityId, sensorEntity[]>`, consumed by Task 3.

- [ ] **Step 1: Import the helper**

In `www/atrium/components/area-card.js`, replace:

```js
const _v = new URL(import.meta.url).search;
const [popoverMod, hassUtilsMod, sharedMod, buildersMod, updatersMod, accordionMod] = await Promise.all([
  import(`../lib/popover.js${_v}`),
  import(`../lib/hass-utils.js${_v}`),
  import(`./area-card-shared.js${_v}`),
  import(`./area-card-builders.js${_v}`),
  import(`./area-card-updaters.js${_v}`),
  import(`../lib/floor-accordion.js${_v}`),
]);
const { closePopoverFor } = popoverMod;
const { sameRegistries } = hassUtilsMod;
const { TONE, STYLE, matchesAny, fmtCoverPct } = sharedMod;
const { floorAccordion } = accordionMod;
```

with:

```js
const _v = new URL(import.meta.url).search;
const [popoverMod, hassUtilsMod, sharedMod, buildersMod, updatersMod, accordionMod, deviceSensorsMod] = await Promise.all([
  import(`../lib/popover.js${_v}`),
  import(`../lib/hass-utils.js${_v}`),
  import(`./area-card-shared.js${_v}`),
  import(`./area-card-builders.js${_v}`),
  import(`./area-card-updaters.js${_v}`),
  import(`../lib/floor-accordion.js${_v}`),
  import(`../lib/device-sensors.js${_v}`),
]);
const { closePopoverFor } = popoverMod;
const { sameRegistries } = hassUtilsMod;
const { TONE, STYLE, matchesAny, fmtCoverPct } = sharedMod;
const { floorAccordion } = accordionMod;
const { groupDeviceSensors } = deviceSensorsMod;
```

- [ ] **Step 2: Add the `other` bucket and `deviceSensors` map to `_emptyData`**

Replace:

```js
  _emptyData() {
    return {
      lights: [],
      switches: [],
      covers: [],
      doors: [],
      climates: [],
      vacuums: [],
      scenes: [],
      inputSelects: [],
      mediaPlayers: [],
      sensors: { motion: [], leak: [], soil: [], propane: [], temp: null, humid: null, extras: [] },
      automations: [],
      scripts: [],
    };
  }
```

with:

```js
  _emptyData() {
    return {
      lights: [],
      switches: [],
      covers: [],
      doors: [],
      climates: [],
      vacuums: [],
      scenes: [],
      inputSelects: [],
      mediaPlayers: [],
      sensors: { motion: [], leak: [], soil: [], propane: [], temp: null, humid: null, extras: [], other: [] },
      automations: [],
      scripts: [],
      deviceSensors: new Map(),
    };
  }
```

- [ ] **Step 3: Carry `deviceSensors` through `_filterData`**

Replace:

```js
    if (want.has("lights")) {
      out.lights = data.lights;
      out.switches = data.switches;
    }
```

with:

```js
    if (want.has("lights")) {
      out.lights = data.lights;
      out.switches = data.switches;
      out.deviceSensors = data.deviceSensors;
    }
```

(No change needed in `_excludeData` — `{ ...data, sensors: { ...data.sensors } }` already copies the `deviceSensors` Map reference through by spreading `data`.)

- [ ] **Step 4: Route uncategorized binary_sensors into `other`**

In `_classify`, replace:

```js
      } else if (domain === "binary_sensor") {
        if (dc === "motion" || dc === "occupancy" || dc === "presence") out.sensors.motion.push(e);
        else if (dc === "moisture") out.sensors.leak.push(e);
        else if (dc === "door" || dc === "garage_door" || dc === "window" || dc === "opening") out.doors.push(e);
      } else if (domain === "sensor") {
```

with:

```js
      } else if (domain === "binary_sensor") {
        if (dc === "motion" || dc === "occupancy" || dc === "presence") out.sensors.motion.push(e);
        else if (dc === "moisture") out.sensors.leak.push(e);
        else if (dc === "door" || dc === "garage_door" || dc === "window" || dc === "opening") out.doors.push(e);
        else out.sensors.other.push(e);
      } else if (domain === "sensor") {
```

- [ ] **Step 5: Run `groupDeviceSensors` after the classification loop**

Replace the tail of `_classify`:

```js
          if (isPlottable) out.sensors.extras.push(e);
        }
      }
    }

    return out;
  }
```

with:

```js
          if (isPlottable) out.sensors.extras.push(e);
        }
      }
    }

    const grouped = groupDeviceSensors({
      lights: out.lights,
      switches: out.switches,
      extras: out.sensors.extras,
      other: out.sensors.other,
    });
    out.sensors.extras = grouped.extras;
    out.sensors.other = grouped.other;
    out.deviceSensors = grouped.deviceSensors;

    return out;
  }
```

- [ ] **Step 6: Syntax-check**

Run: `node --check www/atrium/components/area-card.js`
Expected: no output, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add www/atrium/components/area-card.js
git commit -m "$(cat <<'EOF'
feat(atrium): Classify device-linked sensors per area

_classify now captures otherwise-dropped binary_sensor entities into a
new sensors.other bucket, then uses groupDeviceSensors to split
device-linked sensors out of extras/other into data.deviceSensors,
keyed by the light/switch entity_id they share a device with. Area
header chips (motion/temp/humid/leak/door/soil/propane) are untouched
since they never pass through extras/other.
EOF
)"
```

---

### Task 3: Caret button + popover on light/switch tiles

**Files:**
- Modify: `www/atrium/components/area-card-builders.js:139-243` (`_buildRoomBody`, `_buildLightsSection`, `_buildLightTile`, `_buildSwitchesSection`, `_buildSwitchTile`, `_buildToggleTile`)

**Interfaces:**
- Consumes: `data.deviceSensors: Map<entityId, sensorEntity[]>` produced by Task 2; `this._buildSensorTile(area, sensor)`, `openPopover`, `buildPopoverHeader`, `ensurePopoverItemStyle`, `closePopoverFor` — all already imported/defined in this file; `this._entityName(entity)` and `this._openAnchors` (both already defined on `AtriumAreaCard`).
- Produces: `_buildDeviceSensorCaret(area, entity, sensors)` (new), used only within this file.

- [ ] **Step 1: Thread `deviceSensors` from `_buildRoomBody` down to the tile builders**

Replace:

```js
  const sections = [];
  if (data.lights.length) sections.push(this._buildLightsSection(area, data.lights));
  if (data.switches.length) sections.push(this._buildSwitchesSection(area, data.switches));
```

with:

```js
  const sections = [];
  if (data.lights.length) sections.push(this._buildLightsSection(area, data.lights, data.deviceSensors));
  if (data.switches.length) sections.push(this._buildSwitchesSection(area, data.switches, data.deviceSensors));
```

- [ ] **Step 2: Update the lights/switches section + tile builders' signatures**

Replace:

```js
export function _buildLightsSection(area, lights) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid " + (lights.length === 1 ? "cols-1" : "cols-2");
  for (const light of lights) grid.appendChild(this._buildLightTile(area, light));
  return this._section("Lights", grid);
}

export function _buildLightTile(area, light) {
  return this._buildToggleTile(area, light, { kind: "light", icon: ICONS.bulb, refKey: "lights" });
}

export function _buildSwitchesSection(area, switches) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid " + (switches.length === 1 ? "cols-1" : "cols-2");
  for (const s of switches) grid.appendChild(this._buildSwitchTile(area, s));
  return this._section("Switches", grid);
}

// A switch is a light tile minus dimming: same DOM/classes, but tap toggles
// and a swipe never dims (see `_bindSwipeTile`'s "switch" kind).
export function _buildSwitchTile(area, entity) {
  return this._buildToggleTile(area, entity, { kind: "switch", icon: ICONS.toggle, refKey: "switches" });
}
```

with:

```js
export function _buildLightsSection(area, lights, deviceSensors) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid " + (lights.length === 1 ? "cols-1" : "cols-2");
  for (const light of lights) grid.appendChild(this._buildLightTile(area, light, deviceSensors));
  return this._section("Lights", grid);
}

export function _buildLightTile(area, light, deviceSensors) {
  return this._buildToggleTile(area, light, { kind: "light", icon: ICONS.bulb, refKey: "lights" }, deviceSensors);
}

export function _buildSwitchesSection(area, switches, deviceSensors) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid " + (switches.length === 1 ? "cols-1" : "cols-2");
  for (const s of switches) grid.appendChild(this._buildSwitchTile(area, s, deviceSensors));
  return this._section("Switches", grid);
}

// A switch is a light tile minus dimming: same DOM/classes, but tap toggles
// and a swipe never dims (see `_bindSwipeTile`'s "switch" kind).
export function _buildSwitchTile(area, entity, deviceSensors) {
  return this._buildToggleTile(area, entity, { kind: "switch", icon: ICONS.toggle, refKey: "switches" }, deviceSensors);
}
```

- [ ] **Step 3: Append the caret in `_buildToggleTile`, and add `_buildDeviceSensorCaret`**

Replace:

```js
// Shared on/off tile for lights and switches. `kind` drives the swipe/tap
// behavior in `_bindSwipeTile`; `icon` is the swatch fallback; `refKey`
// selects which per-area ref map the matching updater reads.
export function _buildToggleTile(area, entity, { kind, icon, refKey }) {
  const tile = document.createElement("div");
  tile.className = "atrium-tile";
  tile.dataset.entity = entity.entity_id;

  const fill = document.createElement("div");
  fill.className = "atrium-tile-fill light";
  tile.appendChild(fill);
  const thumb = document.createElement("div");
  thumb.className = "atrium-tile-thumb light";
  thumb.style.display = "none";
  tile.appendChild(thumb);

  const body = document.createElement("div");
  body.className = "atrium-tile-body";
  const swatch = document.createElement("div");
  swatch.className = "atrium-swatch";
  swatch.innerHTML =
    `<ha-icon icon="${icon}" style="--mdc-icon-size:20px"></ha-icon>` +
    `<span class="atrium-unavail-dot">!</span>`;
  const iconEl = swatch.querySelector("ha-icon");
  const text = document.createElement("div");
  text.className = "atrium-tile-text";
  const name = document.createElement("div");
  name.className = "atrium-tile-name";
  name.textContent = nameWithoutAreaPrefix(this._entityName(entity), area);
  const state = document.createElement("div");
  state.className = "atrium-tile-state";
  text.append(name, state);
  body.append(swatch, text);
  tile.appendChild(body);

  this._bindSwipeTile(tile, fill, thumb, swatch, state, entity.entity_id, kind);

  const ref = { tile, fill, thumb, swatch, iconEl, state, name };
  this._refs.areas.get(area.area_id)[refKey].set(entity.entity_id, ref);
  return tile;
}
```

with:

```js
// Shared on/off tile for lights and switches. `kind` drives the swipe/tap
// behavior in `_bindSwipeTile`; `icon` is the swatch fallback; `refKey`
// selects which per-area ref map the matching updater reads. `deviceSensors`
// (optional) is the area's Map<entityId, sensorEntity[]> — when this entity
// has an entry, a caret button is appended that opens those sensors in a
// popover instead of them rendering in the generic Sensors section.
export function _buildToggleTile(area, entity, { kind, icon, refKey }, deviceSensors) {
  const tile = document.createElement("div");
  tile.className = "atrium-tile";
  tile.dataset.entity = entity.entity_id;

  const fill = document.createElement("div");
  fill.className = "atrium-tile-fill light";
  tile.appendChild(fill);
  const thumb = document.createElement("div");
  thumb.className = "atrium-tile-thumb light";
  thumb.style.display = "none";
  tile.appendChild(thumb);

  const body = document.createElement("div");
  body.className = "atrium-tile-body";
  const swatch = document.createElement("div");
  swatch.className = "atrium-swatch";
  swatch.innerHTML =
    `<ha-icon icon="${icon}" style="--mdc-icon-size:20px"></ha-icon>` +
    `<span class="atrium-unavail-dot">!</span>`;
  const iconEl = swatch.querySelector("ha-icon");
  const text = document.createElement("div");
  text.className = "atrium-tile-text";
  const name = document.createElement("div");
  name.className = "atrium-tile-name";
  name.textContent = nameWithoutAreaPrefix(this._entityName(entity), area);
  const state = document.createElement("div");
  state.className = "atrium-tile-state";
  text.append(name, state);
  body.append(swatch, text);

  const linkedSensors = deviceSensors?.get(entity.entity_id);
  if (linkedSensors?.length) {
    body.appendChild(this._buildDeviceSensorCaret(area, entity, linkedSensors));
  }

  tile.appendChild(body);

  this._bindSwipeTile(tile, fill, thumb, swatch, state, entity.entity_id, kind);

  const ref = { tile, fill, thumb, swatch, iconEl, state, name };
  this._refs.areas.get(area.area_id)[refKey].set(entity.entity_id, ref);
  return tile;
}

// Caret button for a light/switch tile whose device also exposes sensor
// entities (see groupDeviceSensors in lib/device-sensors.js). The sensor
// tiles are built once, here, eagerly — not lazily on first click — so they
// register into `ar.sensors` (via _buildSensorTile) and keep receiving
// _updateSensorRef refreshes whether or not the popover has ever been
// opened.
export function _buildDeviceSensorCaret(area, entity, sensors) {
  const caret = document.createElement("button");
  caret.type = "button";
  caret.className = "atrium-tile-caret";
  caret.innerHTML = `<ha-icon icon="mdi:menu-down"></ha-icon>`;
  // The tile itself is a swipe/tap surface (see _bindSwipeTile) bound with a
  // pointerdown listener; without stopping propagation here, pressing the
  // caret would also start that tile's press/drag/long-press sequence.
  caret.addEventListener("pointerdown", (e) => e.stopPropagation());

  const rows = sensors.map((s) => this._buildSensorTile(area, s));

  caret.addEventListener("click", (e) => {
    e.stopPropagation();
    ensurePopoverItemStyle();
    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px";
    for (const row of rows) list.appendChild(row);
    const wrap = document.createElement("div");
    wrap.appendChild(buildPopoverHeader(this._entityName(entity), String(sensors.length)));
    wrap.appendChild(list);
    this._openAnchors.add(caret);
    openPopover({
      anchor: caret,
      content: wrap,
      width: 280,
      onClose: () => this._openAnchors.delete(caret),
    });
  });

  return caret;
}
```

- [ ] **Step 4: Syntax-check**

Run: `node --check www/atrium/components/area-card-builders.js`
Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add www/atrium/components/area-card-builders.js
git commit -m "$(cat <<'EOF'
feat(atrium): Add caret + popover for device-linked sensors

Light/switch tiles whose device also exposes sensor entities now show
a caret button that opens those sensors in a popover, reusing the
existing sensor-tile renderer so live updates keep working unchanged.
EOF
)"
```

---

### Task 4: Caret styling

**Files:**
- Modify: `www/atrium/components/area-card.css:95` (insert after `.atrium-tile-state.on-heat`)

**Interfaces:**
- Consumes: nothing new — styles the `.atrium-tile-caret` button class introduced in Task 3.

- [ ] **Step 1: Add the caret style**

Replace:

```css
.atrium-tile-state.on-heat { color: var(--state-climate-heat-color, #ff8a5b); }
```

with:

```css
.atrium-tile-state.on-heat { color: var(--state-climate-heat-color, #ff8a5b); }
.atrium-tile-caret { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: none; border: none; padding: 4px; margin: -4px -6px -4px 0; cursor: pointer; color: var(--secondary-text-color, #9aa0aa); --mdc-icon-size: 18px; }
```

- [ ] **Step 2: Commit**

```bash
git add www/atrium/components/area-card.css
git commit -m "$(cat <<'EOF'
style(atrium): Add .atrium-tile-caret rule

Matches the existing .atrium-select-caret / climate swatch-caret
visual language: secondary-text color, small icon, no button chrome.
EOF
)"
```

---

## Manual verification (user, in the live dashboard)

This environment has no Home Assistant access (see `CLAUDE.md`), so the following must be checked live by the user once deployed:

- A light or switch whose device also exposes sensor entities shows a caret to the right of its tile; one that doesn't, shows no caret.
- Tapping the caret opens a popover listing those sensors (icon, name, live value), and tapping a sensor row opens its more-info dialog.
- Tapping the caret does **not** toggle the light/switch or start a dim-swipe.
- Those sensors no longer appear in the area's generic "Sensors" section.
- A motion sensor built into a light switch still drives the room's motion pill as before (priority rule unaffected).
