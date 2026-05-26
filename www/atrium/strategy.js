// Atrium — fully dynamic dashboard strategy.
//
// Reads `hass.floors` and `hass.areas` at load time and emits one Lovelace
// view per floor (plus an "All" overview, plus an "Other" view for areas
// that don't belong to any floor). HA's native view tab bar is the tab
// navigation. Each view stacks a sticky V2 header card (date, welcome,
// quick-stats scoped to the floor, presence badges) on top of the per-floor
// `atrium-floor-label` (section header + inline dimmer) + `atrium-area-card`.
//
// Custom elements registered here:
//   - ll-strategy-dashboard-atrium → Lovelace dashboard strategy (HA looks
//     up dashboard strategies under the `ll-strategy-dashboard-*` prefix;
//     view/section strategies use `ll-strategy-view-*` / `ll-strategy-section-*`)
//   - atrium-header         → sticky header card (date · welcome · quick
//                              stats scoped to a floor · presence badges)
//   - atrium-floor-label    → section header strip with the floor name,
//                              on/total count, inline dimmer slider and
//                              toggle bulb — also serves as the "All"
//                              view's per-floor divider

// Propagate this module's URL query string (HA's cache key, or a manual ?v=N
// you appended to bust the cache) down to sibling imports. Without this, the
// browser happily serves stale `area-card.js` / `popover.js` even after the
// strategy resource URL is bumped — the static `import "./x.js"` lines resolve
// to the un-versioned sibling paths, which stay in cache.
const _v = new URL(import.meta.url).search;
const [, popoverMod] = await Promise.all([
  import(`./area-card.js${_v}`),
  import(`./popover.js${_v}`),
]);
const { openPopover, closePopoverFor, buildPopoverHeader, buildPopoverEmpty } = popoverMod;

// --------------------------------------------------------------------------
//  Header card — sticky V2 header at the top of every floor view.
//
//  Renders:
//    - sticky header (date · welcome name)
//    - presence badges (one per person.* entity)
//    - quick stats row (lights on, temp range, batteries) —
//      lights/temp scoped to `config.floor`, batteries stay global
//
//  Native HA view tabs handle the per-floor navigation; this card just
//  displays state for the floor it's instantiated with.
// --------------------------------------------------------------------------
const SHELL_TONE = {
  bg: "#0e0f12",
  text: "#e8e9ec",
  textDim: "#9aa0aa",
  textMute: "#666b75",
  line: "rgba(255,255,255,0.06)",
  light: "#f5c451",
  curtain: "#9b7fd1",
  cool: "#5cc6ff",
  warn: "#f0b13a",
  danger: "#ff5252",
  good: "#7dc97a",
};

const SHELL_STYLE = `
.v2s-root { display: block; max-width: 1800px; }
/* z-index stays low (2) so HA's native toolbar — which sits on its own
   higher-z layer — always wins when they overlap. The toolbar would
   otherwise disappear behind our sticky shell as the user scrolls. */
.v2s-header {
  position: sticky; top: var(--header-height, 0px); z-index: 2;
  background: transparent;
  margin: 0 0 12px 0; padding: 0;
}
.v2s-header-top {
  padding: 14px 18px 4px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.v2s-header-greeting { min-width: 0; }
.v2s-header-people { display: flex; gap: 6px; flex-shrink: 0; }
.v2s-date { font-size: 12px; color: ${SHELL_TONE.textMute}; letter-spacing: .5px; text-transform: uppercase; }
.v2s-welcome { font-size: 24px; font-weight: 600; letter-spacing: -.4px; color: ${SHELL_TONE.text}; }

.v2s-pills { display: flex; gap: 6px; padding: 4px 12px; overflow-x: auto; scrollbar-width: none; }
.v2s-pills::-webkit-scrollbar { display: none; }
.v2s-pills-stats { padding-bottom: 10px; }
.v2s-stat {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 999px;
  background: rgba(255,255,255,0.04); color: ${SHELL_TONE.textDim};
  font-size: 13px; white-space: nowrap; line-height: 1;
  border: none; font-family: inherit;
}
.v2s-stat.is-button { cursor: pointer; }
.v2s-stat.is-button:hover { background: rgba(255,255,255,0.08); }
.v2s-stat .v2s-stat-icon { display: inline-flex; }
.v2s-stat .v2s-stat-icon ha-icon { --mdc-icon-size: 13px; }

/* Battery + problem popover content uses the shared openPopover() chrome
   (see atrium-popover.js). The body-attached row styles for items live in
   POPOVER_ITEM_STYLE and are injected at document.head. */

.v2s-person {
  flex-shrink: 0; display: inline-flex; align-items: center;
  padding: 0; border-radius: 50%; border: none; cursor: pointer;
  background: transparent; color: ${SHELL_TONE.text};
  font-family: inherit; line-height: 1;
}
.v2s-person .v2s-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.10); color: ${SHELL_TONE.text};
  font-size: 14px; font-weight: 700;
  background-size: cover; background-position: center;
  position: relative; flex-shrink: 0;
}
.v2s-person .v2s-avatar-dot {
  position: absolute; right: -2px; bottom: -2px;
  width: 11px; height: 11px; border-radius: 50%;
  border: 2px solid ${SHELL_TONE.bg};
  background: ${SHELL_TONE.textMute};
  box-sizing: content-box;
}
.v2s-person.is-home .v2s-avatar-dot { background: ${SHELL_TONE.good}; }
.v2s-person.is-away .v2s-avatar-dot { background: ${SHELL_TONE.textMute}; }
.v2s-person.is-zone .v2s-avatar-dot { background: ${SHELL_TONE.cool}; }

.v2s-floor-label {
  display: flex; align-items: center; gap: 10px; padding: 0 4px 8px;
  font-size: 12px; line-height: 14px; color: ${SHELL_TONE.textDim};
  letter-spacing: .6px; text-transform: uppercase; font-weight: 600;
}
.v2s-floor-label .v2s-fl-name { white-space: nowrap; flex-shrink: 0; line-height: 14px; }
.v2s-floor-label .v2s-fl-line { flex: 1; height: 1px; background: ${SHELL_TONE.line}; }
.v2s-floor-label .v2s-fl-controls {
  display: flex; align-items: center; gap: 10px;
  margin-left: auto; flex-shrink: 0;
}
.v2s-floor-label .v2s-fl-count {
  font-size: 11px; line-height: 14px; color: ${SHELL_TONE.textMute};
  font-variant-numeric: tabular-nums; font-weight: 500;
  letter-spacing: .3px;
}
.v2s-floor-label .v2s-fl-dimmer {
  position: relative; flex-shrink: 0; width: 96px; height: 22px;
  cursor: pointer; touch-action: pan-y;
  display: flex; align-items: center;
}
.v2s-floor-label .v2s-fl-dimmer-track {
  position: absolute; left: 0; right: 0; top: 50%; height: 6px;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.10); border-radius: 999px;
}
.v2s-floor-label .v2s-fl-dimmer-fill {
  position: absolute; left: 0; top: 50%; height: 6px;
  transform: translateY(-50%);
  border-radius: 999px;
}
.v2s-floor-label .v2s-fl-dimmer-thumb {
  position: absolute; top: 50%; width: 14px; height: 14px;
  border-radius: 999px; transform: translateY(-50%);
  box-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.v2s-floor-label .v2s-fl-bulb {
  width: 30px; height: 24px; border-radius: 7px; padding: 0;
  border: none; cursor: pointer; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: inherit;
  transition: background .25s ease, color .25s ease;
}
.v2s-floor-label .v2s-fl-bulb ha-icon { --mdc-icon-size: 14px; }
`;

// Popover item-row styles live at document.head — the popover container itself
// is appended to document.body (so it can escape the stats row's overflow
// clipping), which is outside the shadow root that hosts our card.
const POPOVER_ITEM_STYLE = `
.v2s-pop-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; margin: 2px;
  border-radius: 8px; cursor: pointer;
  background: none; border: none; width: calc(100% - 4px);
  color: inherit; font-family: inherit; text-align: left;
}
.v2s-pop-item:hover { background: rgba(255,255,255,0.04); }
.v2s-pop-item-swatch {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.v2s-pop-item-swatch ha-icon { --mdc-icon-size: 14px; }
.v2s-pop-item-body { flex: 1; min-width: 0; }
.v2s-pop-item-name {
  font-size: 12.5px; color: ${SHELL_TONE.text};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.v2s-pop-item-room {
  font-size: 10.5px; color: ${SHELL_TONE.textMute};
  display: flex; align-items: center; gap: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.v2s-pop-item-room ha-icon { --mdc-icon-size: 10px; }
.v2s-pop-item-bar {
  width: 56px; height: 5px; border-radius: 999px;
  background: rgba(255,255,255,0.06); overflow: hidden; flex-shrink: 0;
  display: block;
}
.v2s-pop-item-bar-fill { display: block; height: 100%; transition: width .2s; }
.v2s-pop-item-pct {
  font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums;
  min-width: 34px; text-align: right;
}
`;

function homeV2EnsurePopoverItemStyle() {
  if (document.getElementById("atrium-popover-item-style")) return;
  const style = document.createElement("style");
  style.id = "atrium-popover-item-style";
  style.textContent = POPOVER_ITEM_STYLE;
  document.head.appendChild(style);
}

// Battery names tend to repeat the word "Battery" (and sometimes "Level"),
// e.g. "Office Motion Battery" → "Office motion". Strip those tokens and
// normalize to sentence case so the popover stays scannable.
function shellCleanBatteryName(name) {
  if (!name) return "";
  let clean = name.replace(/\b(battery|level)\b/gi, " ");
  clean = clean.replace(/_+/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();
  if (!clean) return name;
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

// Pick an icon for a battery row. Prefers an explicit icon on the entity or
// its sibling primary entity; otherwise infers from entity_id keywords.
function shellBatteryIcon(entityId, hass) {
  const st = hass?.states?.[entityId];
  if (st?.attributes?.icon) return st.attributes.icon;
  const id = entityId.toLowerCase();
  if (id.includes("motion")) return "mdi:motion-sensor";
  if (id.includes("door") || id.includes("contact")) return "mdi:door";
  if (id.includes("window")) return "mdi:window-closed-variant";
  if (id.includes("leak") || id.includes("water")) return "mdi:water-alert";
  if (id.includes("curtain") || id.includes("shade") || id.includes("blind")) return "mdi:blinds-horizontal";
  if (id.includes("soil") || id.includes("moisture")) return "mdi:water-percent";
  if (id.includes("vibration")) return "mdi:vibrate";
  if (id.includes("dimmer") || id.includes("button") || id.includes("remote") || id.includes("switch")) return "mdi:remote";
  if (id.includes("temperature") || id.includes("humidity") || id.includes("climate")) return "mdi:thermometer";
  if (id.includes("propane") || id.includes("tank") || id.includes("fuel")) return "mdi:propane-tank";
  return "mdi:battery";
}

function shellBatteryTier(pct) {
  if (pct <= 20) return "critical";
  if (pct <= 40) return "low";
  return "ok";
}
function shellBatteryColor(pct) {
  const tier = shellBatteryTier(pct);
  if (tier === "critical") return "#ff7a7a";
  if (tier === "low") return "#f0b13a";
  return "#7dc97a";
}

// Domains where "unavailable" actually signals a problem (device offline,
// integration down). Excludes domains like script/scene/zone/automation where
// "unavailable" is either expected or meaningless.
const PROBLEM_UNAVAILABLE_DOMAINS = new Set([
  "light",
  "switch",
  "sensor",
  "binary_sensor",
  "cover",
  "climate",
  "media_player",
  "fan",
  "lock",
  "vacuum",
  "humidifier",
  "water_heater",
  "valve",
  "camera",
]);

// Pick an icon for a problem row. Prefers the entity's own icon, then matches
// known device_classes (smoke/gas/leak/…), finally falls back per domain.
function shellProblemIcon(st) {
  if (st?.attributes?.icon) return st.attributes.icon;
  const id = st?.entity_id || "";
  const domain = id.split(".")[0];
  const dc = st?.attributes?.device_class;
  if (dc === "moisture" || id.toLowerCase().includes("leak")) return "mdi:water-alert";
  if (dc === "smoke") return "mdi:smoke-detector-alert";
  if (dc === "gas") return "mdi:gas-cylinder";
  if (dc === "carbon_monoxide" || dc === "co") return "mdi:molecule-co";
  if (dc === "tamper" || dc === "safety") return "mdi:shield-alert";
  if (dc === "problem") return "mdi:alert-circle";
  const domainIcons = {
    light: "mdi:lightbulb",
    switch: "mdi:toggle-switch",
    cover: "mdi:window-shutter",
    sensor: "mdi:gauge",
    binary_sensor: "mdi:radiobox-marked",
    climate: "mdi:thermostat",
    media_player: "mdi:speaker",
    lock: "mdi:lock",
    vacuum: "mdi:robot-vacuum",
    camera: "mdi:cctv",
    fan: "mdi:fan",
    humidifier: "mdi:air-humidifier",
    water_heater: "mdi:water-boiler",
    valve: "mdi:valve",
  };
  return domainIcons[domain] || "mdi:help-circle-outline";
}

const ALL_FLOOR_KEY = "__all__";

function shellInitialFromName(name) {
  const trim = (name || "").trim();
  if (!trim) return "?";
  return trim[0].toUpperCase();
}

// Status label for a `person.*` state — "home", "not_home", or a zone name.
function shellPersonStatus(state) {
  const raw = state?.state || "unknown";
  if (raw === "home") return { tone: "is-home", label: "Home" };
  if (raw === "not_home" || raw === "away") return { tone: "is-away", label: "Away" };
  if (raw === "unknown" || raw === "unavailable") return { tone: "is-away", label: "?" };
  // Custom zone — show its name.
  return { tone: "is-zone", label: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

function shellFormatTemp(value) {
  if (value == null || Number.isNaN(value)) return null;
  return (Math.round(value * 10) / 10).toFixed(1);
}

class AtriumHeader extends HTMLElement {
  constructor() {
    super();
    this._welcomeName = "home";
    this._floorId = ALL_FLOOR_KEY;
    this._built = false;
    this._timeInterval = null;
  }

  setConfig(config) {
    if (config.floor === undefined) throw new Error("floor is required");
    // `floor: null` → orphan areas, any string/number → specific floor,
    // ALL_FLOOR_KEY → the "All" view (stats roll up across every floor).
    this._floorId = config.floor === ALL_FLOOR_KEY ? ALL_FLOOR_KEY : config.floor;
    this._welcomeName = config.welcome_name || "home";
  }

  connectedCallback() {
    if (!this._timeInterval) {
      this._timeInterval = setInterval(() => this._updateDate(), 30 * 1000);
    }
  }

  disconnectedCallback() {
    if (this._timeInterval) {
      clearInterval(this._timeInterval);
      this._timeInterval = null;
    }
    if (this._headerResizeObserver) {
      this._headerResizeObserver.disconnect();
      this._headerResizeObserver = null;
    }
    if (this._batteryAnchor) closePopoverFor(this._batteryAnchor);
    if (this._problemAnchor) closePopoverFor(this._problemAnchor);
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this._update();
  }

  // ------------------------- DOM build ----------------------------------

  _build() {
    this.innerHTML = "";

    const style = document.createElement("style");
    style.textContent = SHELL_STYLE;
    this.appendChild(style);

    const root = document.createElement("div");
    root.className = "v2s-root";
    this._root = root;
    this.appendChild(root);

    const header = document.createElement("div");
    header.className = "v2s-header";

    const top = document.createElement("div");
    top.className = "v2s-header-top";
    top.innerHTML = `
      <div class="v2s-header-greeting">
        <div class="v2s-date"></div>
        <div class="v2s-welcome">Welcome ${this._welcomeName}</div>
      </div>
      <div class="v2s-header-people"></div>
    `;
    this._peopleEl = top.querySelector(".v2s-header-people");
    header.appendChild(top);

    const stats = document.createElement("div");
    stats.className = "v2s-pills v2s-pills-stats";
    this._statsEl = stats;
    header.appendChild(stats);

    // Delegated click — pills get replaceChildren'd every hass tick, so a
    // listener on the pill itself can lose the click between mousedown and
    // mouseup. The parent stats row stays stable.
    stats.addEventListener("click", (e) => {
      const btn = e.target.closest("button.v2s-stat[data-action]");
      if (!btn || !stats.contains(btn)) return;
      if (btn.dataset.action === "batteries") this._openBatteryPopover(btn);
      else if (btn.dataset.action === "problems") this._openProblemPopover(btn);
    });

    root.appendChild(header);

    // Publish the live header height as a CSS variable on :root so siblings
    // (notably `atrium-floor-label`) can park themselves just below us when
    // they go sticky. The header's height shifts with the people/stats pills,
    // so a ResizeObserver is more reliable than a one-shot measurement.
    this._headerEl = header;
    this._headerResizeObserver = new ResizeObserver(() => {
      // offsetHeight covers content + padding + border, so the published
      // value accounts for the bottom border that floor labels need to clear.
      document.documentElement.style.setProperty(
        "--v2s-header-height",
        `${header.offsetHeight}px`
      );
    });
    this._headerResizeObserver.observe(header);

    this._updateDate();
  }

  _update() {
    this._updateDate();
    this._updateStats();
  }

  _updateDate() {
    if (!this._root) return;
    const dateEl = this._root.querySelector(".v2s-date");
    if (!dateEl) return;
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    dateEl.textContent = `${weekday} · ${time}`;
  }

  // ------------------------- Quick stats --------------------------------

  // Returns the set of entity_ids inside the configured floor — or null when
  // the header is configured for the "All" view (every entity counts).
  _scopeEntityIds() {
    const hass = this._hass;
    if (!hass) return null;
    if (this._floorId === ALL_FLOOR_KEY) return null;
    const targetFloor = this._floorId ?? null;
    const set = new Set();
    for (const ent of Object.values(hass.entities)) {
      if (ent.hidden) continue;
      const areaId = ent.area_id || hass.devices?.[ent.device_id]?.area_id;
      if (!areaId) continue;
      const area = hass.areas?.[areaId];
      if (!area) continue;
      if ((area.floor_id ?? null) !== targetFloor) continue;
      set.add(ent.entity_id);
    }
    return set;
  }

  // True when the entity is anchored to an area that itself sits on a floor.
  // Used to keep the home-wide temperature range from absorbing readings
  // coming from the "Other" bucket (areas with no floor) on the All view.
  _entityInFloor(entityId) {
    const hass = this._hass;
    const ent = hass?.entities?.[entityId];
    if (!ent) return false;
    const areaId = ent.area_id || hass.devices?.[ent.device_id]?.area_id;
    if (!areaId) return false;
    const area = hass.areas?.[areaId];
    return !!area && area.floor_id != null;
  }

  _updateStats() {
    if (!this._statsEl || !this._peopleEl || !this._hass) return;
    const scope = this._scopeEntityIds();
    const inScope = (id) => scope == null || scope.has(id);
    // On the "All" view scope is open, so we also drop entities living in
    // areas without a floor — that bucket has its own "Other" tab.
    const inTempScope =
      this._floorId === ALL_FLOOR_KEY
        ? (id) => this._entityInFloor(id)
        : inScope;

    let lightsOn = 0;
    const temps = [];
    const batteries = [];
    const problems = [];
    const entReg = this._hass.entities || {};

    for (const st of Object.values(this._hass.states)) {
      const id = st.entity_id;
      const domain = id.split(".")[0];
      const dc = st.attributes?.device_class;
      if (domain === "light" && st.state === "on" && inScope(id)) {
        lightsOn += 1;
      } else if (domain === "climate" && inTempScope(id)) {
        const t = Number(st.attributes?.current_temperature);
        if (Number.isFinite(t)) temps.push(t);
      } else if (domain === "sensor" && dc === "temperature" && inTempScope(id)) {
        const t = Number(st.state);
        if (Number.isFinite(t) && t > -40 && t < 60) temps.push(t);
      } else if (domain === "sensor" && dc === "battery" && inScope(id)) {
        // Scoped to the active floor (or all on the "All" view) so the badge
        // mirrors what's actually shown on this tab.
        const v = Number(st.state);
        if (Number.isFinite(v) && v >= 0 && v <= 100) {
          batteries.push({ id, value: v, state: st });
        }
      }

      // Problem badge: active problem-class binary sensors, plus any visible
      // physical entity reporting "unavailable". The registry check skips
      // hidden/disabled entries — they aren't shown anywhere on the dashboard,
      // so reporting them as broken would just be noise.
      if (inScope(id)) {
        const ent = entReg[id];
        const visible = !ent || (!ent.hidden && !ent.disabled_by);
        if (visible) {
          if (domain === "binary_sensor" && dc === "problem" && st.state === "on") {
            problems.push({ id, kind: "problem", state: st });
          } else if (
            st.state === "unavailable" &&
            PROBLEM_UNAVAILABLE_DOMAINS.has(domain)
          ) {
            problems.push({ id, kind: "unavailable", state: st });
          }
        }
      }
    }

    // Sort low → high so popover and badge agree on what's most urgent.
    batteries.sort((a, b) => a.value - b.value);
    this._batteries = batteries;

    // Active problems first (more urgent than offline devices), then by name
    // within each tier so the order is stable across hass ticks.
    problems.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "problem" ? -1 : 1;
      const an = a.state?.attributes?.friendly_name || a.id;
      const bn = b.state?.attributes?.friendly_name || b.id;
      return an.localeCompare(bn);
    });
    this._problems = problems;

    const persons = Object.values(this._hass.states)
      .filter((s) => s.entity_id.startsWith("person."))
      .sort((a, b) => {
        const an = a.attributes?.friendly_name || a.entity_id;
        const bn = b.attributes?.friendly_name || b.entity_id;
        return an.localeCompare(bn);
      });

    // Row 1: presence (people). Row 2: everything else.
    const peoplePills = persons.map((p) => this._personPill(p));

    const statPills = [];
    statPills.push(this._statPill("mdi:lightbulb", SHELL_TONE.light, `${lightsOn} lights on`));

    if (temps.length) {
      const min = shellFormatTemp(Math.min(...temps));
      const max = shellFormatTemp(Math.max(...temps));
      const label = min === max ? `${min}°` : `${min} – ${max}°`;
      statPills.push(this._statPill("mdi:thermometer", SHELL_TONE.cool, label));
    }

    if (batteries.length) {
      const min = batteries[0].value;
      const color =
        min <= 15 ? SHELL_TONE.danger : min <= 30 ? SHELL_TONE.warn : SHELL_TONE.good;
      const label = `${batteries.length} · ${Math.round(min)}%`;
      statPills.push(this._statPill("mdi:battery", color, label, "batteries"));
    }

    if (problems.length) {
      // Red when at least one true "problem" is active; orange when the list
      // is only offline devices — those are still worth surfacing but less
      // urgent than an active leak/smoke/etc.
      const hasActive = problems.some((p) => p.kind === "problem");
      const color = hasActive ? SHELL_TONE.danger : SHELL_TONE.warn;
      statPills.push(
        this._statPill("mdi:alert-circle", color, `${problems.length}`, "problems")
      );
    }

    this._peopleEl.replaceChildren(...peoplePills);
    this._statsEl.replaceChildren(...statPills);
  }

  // `action` is a string key picked up by the delegated click handler on the
  // parent stats row — pills get replaceChildren'd every hass tick, so a
  // listener on the pill itself can lose the click between mousedown/mouseup.
  _statPill(icon, color, label, action) {
    const tag = action ? "button" : "div";
    const el = document.createElement(tag);
    el.className = action ? "v2s-stat is-button" : "v2s-stat";
    if (action) {
      el.type = "button";
      el.dataset.action = action;
    }
    el.innerHTML = `
      <span class="v2s-stat-icon" style="color:${color}">
        <ha-icon icon="${icon}"></ha-icon>
      </span>
      <span class="v2s-stat-label"></span>
    `;
    el.querySelector(".v2s-stat-label").textContent = label;
    return el;
  }

  _personPill(state) {
    const status = shellPersonStatus(state);
    const fullName = state.attributes?.friendly_name || state.entity_id.split(".")[1] || "";
    const picture = state.attributes?.entity_picture;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `v2s-person ${status.tone}`;
    btn.title = `${fullName} · ${status.label}`;

    const avatar = document.createElement("span");
    avatar.className = "v2s-avatar";
    if (picture) {
      avatar.style.backgroundImage = `url("${picture}")`;
    } else {
      avatar.textContent = shellInitialFromName(fullName);
    }
    const dot = document.createElement("span");
    dot.className = "v2s-avatar-dot";
    avatar.appendChild(dot);

    btn.append(avatar);
    btn.addEventListener("click", () => this._openEntityMore(state.entity_id));
    return btn;
  }

  _openEntityMore(entityId) {
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  // ------------------------- Battery popover ----------------------------

  _openBatteryPopover(anchor) {
    homeV2EnsurePopoverItemStyle();

    const root = document.createElement("div");
    const total = (this._batteries || []).length;
    root.appendChild(buildPopoverHeader("Batteries & levels", `${total} total`));

    const listEl = document.createElement("div");
    listEl.className = "v2-pop-list";
    if (total === 0) {
      listEl.appendChild(buildPopoverEmpty("No batteries reported."));
    } else {
      for (const b of this._batteries) {
        listEl.appendChild(this._batteryItem(b, anchor));
      }
    }
    root.appendChild(listEl);

    this._batteryAnchor = anchor;
    openPopover({
      anchor,
      content: root,
      width: 320,
      onClose: () => { if (this._batteryAnchor === anchor) this._batteryAnchor = null; },
    });
  }

  _batteryItem(battery, anchor) {
    const pct = Math.round(battery.value);
    const color = shellBatteryColor(pct);
    const tone = `${color}1a`; // 10% alpha background swatch
    const rawName = battery.state?.attributes?.friendly_name || battery.id;
    const name = shellCleanBatteryName(rawName);
    const icon = shellBatteryIcon(battery.id, this._hass);
    const room = this._areaForEntity(battery.id);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "v2s-pop-item";
    btn.innerHTML = `
      <span class="v2s-pop-item-swatch" style="background:${tone};color:${color}">
        <ha-icon icon="${icon}"></ha-icon>
      </span>
      <span class="v2s-pop-item-body">
        <span class="v2s-pop-item-name"></span>
        <span class="v2s-pop-item-room">${
          room
            ? `<ha-icon icon="${room.icon}"></ha-icon><span class="room-name"></span>`
            : ""
        }</span>
      </span>
      <span class="v2s-pop-item-bar">
        <span class="v2s-pop-item-bar-fill" style="width:${pct}%;background:${color}"></span>
      </span>
      <span class="v2s-pop-item-pct" style="color:${color}">${pct}%</span>
    `;
    btn.querySelector(".v2s-pop-item-name").textContent = name;
    if (room) btn.querySelector(".room-name").textContent = room.name;
    btn.addEventListener("click", () => {
      closePopoverFor(anchor);
      this._openEntityMore(battery.id);
    });
    return btn;
  }

  // ------------------------- Problem popover ----------------------------

  _openProblemPopover(anchor) {
    homeV2EnsurePopoverItemStyle();

    const root = document.createElement("div");
    const total = (this._problems || []).length;
    root.appendChild(buildPopoverHeader("Problems & offline", `${total} total`));

    const listEl = document.createElement("div");
    listEl.className = "v2-pop-list";
    if (total === 0) {
      listEl.appendChild(buildPopoverEmpty("Nothing to report."));
    } else {
      for (const p of this._problems) {
        listEl.appendChild(this._problemItem(p, anchor));
      }
    }
    root.appendChild(listEl);

    this._problemAnchor = anchor;
    openPopover({
      anchor,
      content: root,
      width: 320,
      onClose: () => { if (this._problemAnchor === anchor) this._problemAnchor = null; },
    });
  }

  _problemItem(problem, anchor) {
    const isActive = problem.kind === "problem";
    const color = isActive ? SHELL_TONE.danger : SHELL_TONE.warn;
    const tone = `${color}1a`;
    const name = problem.state?.attributes?.friendly_name || problem.id;
    const icon = shellProblemIcon(problem.state);
    const room = this._areaForEntity(problem.id);
    const status = isActive ? "Problem" : "Offline";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "v2s-pop-item";
    btn.innerHTML = `
      <span class="v2s-pop-item-swatch" style="background:${tone};color:${color}">
        <ha-icon icon="${icon}"></ha-icon>
      </span>
      <span class="v2s-pop-item-body">
        <span class="v2s-pop-item-name"></span>
        <span class="v2s-pop-item-room">${
          room
            ? `<ha-icon icon="${room.icon}"></ha-icon><span class="room-name"></span>`
            : ""
        }</span>
      </span>
      <span class="v2s-pop-item-pct" style="color:${color};min-width:54px">${status}</span>
    `;
    btn.querySelector(".v2s-pop-item-name").textContent = name;
    if (room) btn.querySelector(".room-name").textContent = room.name;
    btn.addEventListener("click", () => {
      closePopoverFor(anchor);
      this._openEntityMore(problem.id);
    });
    return btn;
  }

  _areaForEntity(entityId) {
    const hass = this._hass;
    if (!hass) return null;
    const ent = hass.entities?.[entityId];
    const areaId = ent?.area_id || hass.devices?.[ent?.device_id]?.area_id;
    if (!areaId) return null;
    const area = hass.areas?.[areaId];
    if (!area) return null;
    return { name: area.name, icon: area.icon || "mdi:floor-plan" };
  }

  getCardSize() {
    return 2;
  }
}
customElements.define("atrium-header", AtriumHeader);

// --------------------------------------------------------------------------
//  Floor label — section header strip. Shows the floor name, the
//  on/total light count, an inline dimmer slider and a toggle bulb.
//  Tap the slider or the bulb to toggle every light on the floor;
//  horizontal drag on the slider sets a uniform brightness across them.
//  Used both as the per-floor divider inside the "All" view and as the
//  section header at the top of each per-floor view.
// --------------------------------------------------------------------------
class AtriumFloorLabel extends HTMLElement {
  constructor() {
    super();
    this._dragging = false;
    this._dragPct = null;
  }

  setConfig(config) {
    if (config.floor === undefined) throw new Error("floor is required");
    this._name = config.name || "";
    // `floor: null` targets areas not assigned to any floor.
    this.floorId = config.floor === null ? null : config.floor;
  }

  connectedCallback() {
    // Panel-mode horizontal gutter so the strip lines up with the rest.
    this.style.display = "block";
    this.style.padding = "0 16px";
    // Sticky on the host (not the inner `.v2s-floor-label`, which is too
    // shallow to scroll inside). --v2s-header-height is published by the
    // v2s-header's ResizeObserver, so the offset tracks the live header.
    // z-index stays below the v2s-header (2) so we slide under it cleanly.
    this.style.position = "sticky";
    this.style.top =
      "calc(var(--header-height, 0px) + var(--v2s-header-height, 0px))";
    this.style.zIndex = "1";
  }

  set hass(hass) {
    this._hass = hass;
    // Release the optimistic lock once the live hass average is within 5% of
    // the user-requested value (bulbs have ramped up), or once the timeout
    // window expires. This avoids the slider bouncing while lights ramp.
    if (this._optimisticPct != null) {
      const expired = Date.now() >= (this._optimisticUntil || 0);
      if (expired) {
        this._optimisticPct = null;
        this._optimisticUntil = 0;
      } else {
        const ids = this.floorLights();
        const onStates = ids
          .map((id) => hass.states?.[id])
          .filter((s) => s && s.state === "on");
        if (onStates.length > 0) {
          const avg = Math.round(
            onStates.reduce((a, s) => a + (s.attributes?.brightness || 0), 0) /
              onStates.length /
              2.55
          );
          if (Math.abs(avg - this._optimisticPct) <= 5) {
            this._optimisticPct = null;
            this._optimisticUntil = 0;
          }
        }
      }
    }
    this._render();
  }

  floorLights() {
    if (!this._hass) return [];
    const out = [];
    for (const ent of Object.values(this._hass.entities)) {
      if (!ent.entity_id?.startsWith("light.")) continue;
      if (ent.hidden) continue;
      const areaId = ent.area_id || this._hass.devices?.[ent.device_id]?.area_id;
      if (!areaId) continue;
      const area = this._hass.areas?.[areaId];
      if (!area || (area.floor_id ?? null) !== this.floorId) continue;
      out.push(ent.entity_id);
    }
    return out;
  }

  _render() {
    if (!this._mounted) {
      this.innerHTML = `
        <style>${SHELL_STYLE}</style>
        <div class="v2s-floor-label">
          <span class="v2s-fl-name"></span>
          <div class="v2s-fl-line"></div>
          <div class="v2s-fl-controls">
            <span class="v2s-fl-count"></span>
            <div class="v2s-fl-dimmer" role="slider"
                 aria-label="Floor brightness" aria-valuemin="0" aria-valuemax="100">
              <div class="v2s-fl-dimmer-track"></div>
              <div class="v2s-fl-dimmer-fill"></div>
              <div class="v2s-fl-dimmer-thumb"></div>
            </div>
            <button class="v2s-fl-bulb" type="button" aria-label="Toggle all floor lights">
              <ha-icon icon="mdi:lightbulb"></ha-icon>
            </button>
          </div>
        </div>
      `;
      this._nameEl = this.querySelector(".v2s-fl-name");
      this._lineEl = this.querySelector(".v2s-fl-line");
      this._controlsEl = this.querySelector(".v2s-fl-controls");
      this._countEl = this.querySelector(".v2s-fl-count");
      this._dimmerEl = this.querySelector(".v2s-fl-dimmer");
      this._fillEl = this.querySelector(".v2s-fl-dimmer-fill");
      this._thumbEl = this.querySelector(".v2s-fl-dimmer-thumb");
      this._btnEl = this.querySelector(".v2s-fl-bulb");
      this._bindPointer();
      this._btnEl.addEventListener("click", () => this._toggleAll());
      this._mounted = true;
    }

    this._nameEl.textContent = this._name;

    const lightIds = this.floorLights();
    const hasLights = lightIds.length > 0;

    // No-lights fallback: keep the section header, hide the dimmer affordances
    // and show the original divider line so it still reads as a section break.
    this._lineEl.style.display = hasLights ? "none" : "";
    this._controlsEl.style.display = hasLights ? "" : "none";
    if (!hasLights) return;

    const states = lightIds.map((id) => this._hass.states[id]).filter(Boolean);
    const onStates = states.filter((s) => s.state === "on");
    const onCount = onStates.length;
    const totalCount = states.length;
    const avgBright =
      onCount > 0
        ? Math.round(
            onStates.reduce(
              (acc, s) => acc + (s.attributes?.brightness || 0),
              0
            ) /
              onCount /
              2.55
          )
        : 50;
    const optimistic = this._optimisticPct;
    const optimisticActive =
      optimistic != null && Date.now() < (this._optimisticUntil || 0);
    const isOn = onCount > 0 || this._dragging || optimisticActive;
    const pct =
      this._dragPct ??
      (optimisticActive ? optimistic : isOn ? avgBright : 0);

    this._countEl.textContent = `${onCount}/${totalCount}`;

    const accent = SHELL_TONE.light;
    this._fillEl.style.width = isOn ? `${pct}%` : "0%";
    this._fillEl.style.background = isOn ? accent : "transparent";
    this._fillEl.style.transition = this._dragging
      ? "none"
      : "width .2s ease, background .2s ease";
    this._thumbEl.style.left = `calc(${pct}% - 7px)`;
    this._thumbEl.style.background = isOn ? accent : "#3a3d44";
    this._thumbEl.style.transition = this._dragging
      ? "none"
      : "left .2s ease, background .2s ease";

    this._btnEl.style.background = isOn
      ? "rgba(245,196,81,0.16)"
      : "rgba(255,255,255,0.05)";
    this._btnEl.style.color = isOn ? accent : SHELL_TONE.textMute;
  }

  _bindPointer() {
    const target = this._dimmerEl;
    let startX = 0;
    let pointerDown = false;
    let dragStarted = false;
    let activePointerId = null;

    const pctFromEvent = (e) => {
      const r = target.getBoundingClientRect();
      return Math.max(
        0,
        Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100))
      );
    };

    const endDrag = (e, commit) => {
      if (!pointerDown) return;
      pointerDown = false;
      if (activePointerId !== null) {
        try { target.releasePointerCapture(activePointerId); } catch (_) {}
      }
      activePointerId = null;
      const finalPct = dragStarted ? pctFromEvent(e) : null;
      const wasDrag = dragStarted;
      dragStarted = false;
      this._dragging = false;
      this._dragPct = null;
      if (commit) {
        if (wasDrag) {
          // Lock the visual at the committed value for ~1.5s so the bar
          // doesn't snap to the (lagging) hass average while bulbs ramp up.
          this._optimisticPct = finalPct;
          this._optimisticUntil = Date.now() + 1500;
          this._applyBrightness(finalPct);
        } else {
          this._toggleAll();
        }
      }
      this._render();
    };

    target.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      pointerDown = true;
      dragStarted = false;
      activePointerId = e.pointerId;
      try { target.setPointerCapture(e.pointerId); } catch (_) {}
    });
    target.addEventListener("pointermove", (e) => {
      if (!pointerDown || e.pointerId !== activePointerId) return;
      if (Math.abs(e.clientX - startX) < 6 && !dragStarted) return;
      dragStarted = true;
      this._dragging = true;
      this._dragPct = pctFromEvent(e);
      this._render();
    });
    target.addEventListener("pointerup", (e) => {
      if (e.pointerId !== activePointerId) return;
      endDrag(e, true);
    });
    target.addEventListener("pointercancel", (e) => {
      if (e.pointerId !== activePointerId) return;
      endDrag(e, false);
    });
    // Safety: if the browser drops capture (context menu, scroll takeover),
    // treat it as a cancel so the slider doesn't get stuck in dragging mode.
    target.addEventListener("lostpointercapture", (e) => {
      if (e.pointerId !== activePointerId) return;
      endDrag(e, false);
    });
  }

  _toggleAll() {
    if (!this._hass) return;
    const ids = this.floorLights();
    if (ids.length === 0) return;
    const anyOn = ids.some((id) => this._hass.states[id]?.state === "on");
    this._hass.callService("light", anyOn ? "turn_off" : "turn_on", {
      entity_id: ids,
    });
  }

  _applyBrightness(pct) {
    if (!this._hass) return;
    const ids = this.floorLights();
    if (ids.length === 0) return;
    if (pct <= 0) {
      this._hass.callService("light", "turn_off", { entity_id: ids });
    } else {
      this._hass.callService("light", "turn_on", {
        entity_id: ids,
        brightness_pct: pct,
      });
    }
  }

  getCardSize() {
    return 1;
  }
}
customElements.define("atrium-floor-label", AtriumFloorLabel);

// --------------------------------------------------------------------------
//  Lovelace dashboard strategy. Emits one view per floor (plus an "All"
//  overview and an "Other" view for orphan areas), so HA's native tab bar
//  drives the navigation. Each view stacks a V2 header card scoped to that
//  floor on top of the per-floor master tile + area card.
// --------------------------------------------------------------------------
class AtriumStrategy {
  static async generate(_config, hass) {
    // Tabs read top-down: upper floors first ascending (1, 2, 3, …), then
    // the basement (level 0 and below) so it sits after the inhabited floors
    // rather than in front of them. "Other" is appended further down.
    const floorSortKey = (f) => {
      const lvl = f.level;
      if (lvl == null) return Number.MAX_SAFE_INTEGER;
      return lvl > 0 ? lvl : 1_000_000 - lvl;
    };
    const floors = Object.values(hass.floors || {}).sort(
      (a, b) => floorSortKey(a) - floorSortKey(b)
    );

    // Synthesise a virtual floor for areas that aren't assigned to any real
    // floor — so e.g. Outside isn't hidden when it lives off-grid.
    const orphanAreas = Object.values(hass.areas || {}).filter(
      (a) => !a.floor_id
    );
    const otherFloor = orphanAreas.length
      ? {
          floor_id: null,
          name: "Other",
          icon: "mdi:map-marker-outline",
          level: 999,
        }
      : null;
    const allFloors = otherFloor ? [...floors, otherFloor] : floors;

    const welcomeName = hass.user?.name?.split(" ")?.[0] || "home";

    const headerCard = (floorScope) => ({
      type: "custom:atrium-header",
      welcome_name: welcomeName,
      // floorScope is either ALL_FLOOR_KEY (string), a floor_id, or null.
      floor: floorScope,
    });

    const areaCard = (floor, { defaultExpanded = false } = {}) => ({
      type: "custom:atrium-area-card",
      floor: floor.floor_id ?? null,
      ...(defaultExpanded ? { default_expanded: true } : {}),
    });

    // The floor-label strip absorbs the old floor-master tile: it shows the
    // section header AND hosts the inline dimmer + bulb that toggle/dim every
    // light on the floor.
    const floorLabelCard = (floor) => ({
      type: "custom:atrium-floor-label",
      name: floor.name,
      floor: floor.floor_id ?? null,
    });

    // Each view is a `panel: true` Lovelace view holding a single
    // vertical-stack card. Panel mode hands the whole viewport width to its
    // single card (no sections-view 500px grid clamp), while vertical-stack
    // lets us still ship multiple cards (header / floor master / area card)
    // inside it. The area card's internal CSS grid does the 1/2/3-column
    // room layout once it has the room to spread out.
    const stack = (cards) => ({
      type: "vertical-stack",
      cards: cards.filter(Boolean),
    });

    const baseView = (extra) => ({
      panel: true,
      ...extra,
    });

    const allView = baseView({
      title: "All",
      path: "all",
      icon: "mdi:home",
      cards: [
        stack([
          headerCard(ALL_FLOOR_KEY),
          ...allFloors.flatMap((f) => [floorLabelCard(f), areaCard(f)]),
        ]),
      ],
    });

    const floorViews = allFloors.map((floor) =>
      baseView({
        title: floor.name,
        path: AtriumStrategy.slug(floor.floor_id) || "other",
        icon: floor.icon || AtriumStrategy.iconForFloor(floor),
        cards: [
          stack([
            headerCard(floor.floor_id ?? null),
            floorLabelCard(floor),
            areaCard(floor),
          ]),
        ],
      })
    );

    return {
      title: "Atrium",
      views: [allView, ...floorViews],
    };
  }

  static iconForFloor(floor) {
    const lvl = floor.level;
    if (lvl == null) return "mdi:home";
    if (lvl < 0) return "mdi:home-floor-b";
    if (lvl === 0) return "mdi:home-floor-0";
    return `mdi:home-floor-${Math.min(lvl, 3)}`;
  }

  static slug(s) {
    return (s || "").toString().toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
  }
}

customElements.define("ll-strategy-dashboard-atrium", AtriumStrategy);
