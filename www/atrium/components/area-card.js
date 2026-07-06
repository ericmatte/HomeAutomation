// `set hass()` fires on every state change. `_signature()` only triggers a
// `_build()` when the per-floor entity set actually shifts; otherwise the
// per-ref identity-gated updaters in `area-card-updaters.js` handle it.

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

// Body-height collapse/expand transition, in ms. Kept in sync with the
// `.atrium-floor-body` transition duration in area-card.css.
const FLOOR_ANIM_MS = 300;

class AtriumAreaCard extends HTMLElement {
  constructor() {
    super();
    this._expanded = new Set();
    this._dragState = new Map();
    this._lastSig = "";
    this._floorId = null;
    // Track popovers we opened so disconnectedCallback can close any that
    // survived the card being torn down.
    this._openAnchors = new Set();
  }

  setConfig(config) {
    if (config.floor === undefined) throw new Error("floor is required");
    this._floorId = config.floor === null ? null : config.floor;
    this._showLabel = config.show_floor_label === true;
    this._defaultExpanded = config.default_expanded === true;
    // Single-floor dashboards pass collapsible:false → always expanded.
    this._collapsible = config.collapsible !== false;
    // Intent tabs (Climate, Routines, …) pass a section profile so the card
    // renders only the matching categories. Absent → full room view (Home).
    this._sections =
      Array.isArray(config.sections) && config.sections.length
        ? new Set(config.sections)
        : null;
    // Inverse of `sections`: drop specific categories from the otherwise-full
    // view. Home uses it to hide climate + automations/scripts (each has its
    // own dedicated tab).
    this._exclude =
      Array.isArray(config.exclude) && config.exclude.length
        ? new Set(config.exclude)
        : null;
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.padding = "0 16px 32px";
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => this._onResize());
      this._resizeObserver.observe(this);
    }
    if (this._collapsible) {
      this._unsubAccordion = floorAccordion.subscribe(() => this._reflectCollapsed(true));
    }
    if (this._bodyEl) this._reflectCollapsed(false);
  }

  disconnectedCallback() {
    for (const a of this._openAnchors) closePopoverFor(a);
    this._openAnchors.clear();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._resizeRaf) {
      cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = 0;
    }
    this._unsubAccordion?.();
    this._unsubAccordion = null;
    if (this._animTimer) {
      clearTimeout(this._animTimer);
      this._animTimer = 0;
    }
  }

  _areaFloorId(area) {
    return area?.floor_id ?? null;
  }

  set hass(hass) {
    this._hass = hass;
    // Fast path: registries unchanged → states-only tick → incremental
    // update. `_floorId` is threaded through as the extra cache key so a
    // setConfig with a new floor falls through to the rebuild branch.
    if (sameRegistries(this, "_reg", hass, this._floorId) && this._lastSig) {
      this._update();
      return;
    }
    const sig = this._signature();
    if (sig !== this._lastSig) {
      this._lastSig = sig;
      this._build();
    } else {
      this._update();
    }
  }

  // Only invoked when a registry reference shifted, to tell apart "entity
  // set on this floor changed" from "entity we don't care about was added
  // elsewhere".
  _signature() {
    const hass = this._hass;
    if (!hass?.areas || !hass?.entities) return "boot";
    const parts = [this._floorId];
    for (const a of Object.values(hass.areas)) {
      if (this._areaFloorId(a) !== this._floorId) continue;
      parts.push(`A:${a.area_id}:${a.picture || ""}`);
    }
    for (const e of Object.values(hass.entities)) {
      const areaId = e.area_id || hass.devices?.[e.device_id]?.area_id;
      if (!areaId) continue;
      const area = hass.areas[areaId];
      if (!area || this._areaFloorId(area) !== this._floorId) continue;
      parts.push(e.entity_id);
    }
    return parts.join("|");
  }

  _areasOnFloor() {
    return Object.values(this._hass.areas)
      .filter((a) => this._areaFloorId(a) === this._floorId);
  }

  _entitiesForArea(area) {
    const hass = this._hass;
    return Object.values(hass.entities)
      .filter((e) => {
        if (e.hidden) return false;
        const areaId = e.area_id || hass.devices?.[e.device_id]?.area_id;
        return areaId === area.area_id;
      });
  }

  _hiddenRoutinesForArea(area) {
    const hass = this._hass;
    return Object.values(hass.entities)
      .filter((e) => {
        if (!e.hidden) return false;
        const domain = e.entity_id.split(".")[0];
        if (domain !== "automation" && domain !== "script") return false;
        const areaId = e.area_id || hass.devices?.[e.device_id]?.area_id;
        return areaId === area.area_id;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

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

  // Project classified data down to the active section profile. Categories
  // left out are emptied so every downstream consumer (room header chips,
  // quick buttons, body sections, `_areaIsEmpty`) hides them for free.
  _filterData(data) {
    if (this._exclude) return this._excludeData(data);
    if (!this._sections) return data;
    const want = this._sections;
    const out = this._emptyData();
    if (want.has("lights")) {
      out.lights = data.lights;
      out.switches = data.switches;
    }
    if (want.has("covers")) out.covers = data.covers;
    if (want.has("climate")) {
      out.climates = data.climates;
      out.sensors.temp = data.sensors.temp;
      out.sensors.humid = data.sensors.humid;
    }
    if (want.has("vacuum")) out.vacuums = data.vacuums;
    if (want.has("inputs")) out.inputSelects = data.inputSelects;
    if (want.has("sensors")) {
      out.sensors.extras = data.sensors.extras;
      out.sensors.soil = data.sensors.soil;
      out.sensors.propane = data.sensors.propane;
    }
    if (want.has("motion")) out.sensors.motion = data.sensors.motion;
    if (want.has("scenes")) out.scenes = data.scenes;
    if (want.has("routines")) {
      out.automations = data.automations;
      out.scripts = data.scripts;
    }
    if (want.has("doors")) out.doors = data.doors;
    if (want.has("leak")) out.sensors.leak = data.sensors.leak;
    return out;
  }

  // Full view minus a few categories. Keys map 1:1 to top-level data arrays;
  // temp/humidity chips survive even when "climates" is dropped.
  _excludeData(data) {
    const out = { ...data, sensors: { ...data.sensors } };
    for (const key of this._exclude) {
      if (key === "climates") out.climates = [];
      else if (key === "automations") out.automations = [];
      else if (key === "scripts") out.scripts = [];
      else if (key === "scenes") out.scenes = [];
      else if (key === "lights") { out.lights = []; out.switches = []; }
      else if (key === "covers") out.covers = [];
      else if (key === "vacuums") out.vacuums = [];
      else if (key === "inputs") out.inputSelects = [];
    }
    return out;
  }

  _classify(area, entities) {
    const hass = this._hass;
    const out = this._emptyData();

    for (const e of entities) {
      const domain = e.entity_id.split(".")[0];
      const st = hass.states?.[e.entity_id];
      const dc = st?.attributes?.device_class;
      if (domain === "light") out.lights.push(e);
      // Config/diagnostic switches (device knobs like "LED", "crossfade") would
      // clutter the room body — only surface primary controls.
      else if (domain === "switch") { if (!e.entity_category) out.switches.push(e); }
      else if (domain === "cover") out.covers.push(e);
      else if (domain === "climate") out.climates.push(e);
      else if (domain === "vacuum") out.vacuums.push(e);
      else if (domain === "scene") out.scenes.push(e);
      else if (domain === "input_select") out.inputSelects.push(e);
      else if (domain === "media_player") out.mediaPlayers.push(e);
      else if (domain === "automation") out.automations.push(e);
      else if (domain === "script") out.scripts.push(e);
      else if (domain === "binary_sensor") {
        if (dc === "motion" || dc === "occupancy" || dc === "presence") out.sensors.motion.push(e);
        else if (dc === "moisture") out.sensors.leak.push(e);
        else if (dc === "door" || dc === "garage_door" || dc === "window" || dc === "opening") out.doors.push(e);
      } else if (domain === "sensor") {
        const isSoil =
          matchesAny(e.entity_id, ["soil", "plant"]) &&
          dc !== "battery" &&
          !matchesAny(e.entity_id, ["battery"]) &&
          (dc === "moisture" || st?.attributes?.unit_of_measurement === "%");
        const isPropane = matchesAny(e.entity_id, ["propane", "fuel_tank", "gas_tank"]);
        const isTempWinner =
          dc === "temperature" &&
          (e.entity_id === area.temperature_entity_id || !out.sensors.temp);
        const isHumidEligible = dc === "humidity" && !matchesAny(e.entity_id, ["soil"]);
        const isHumidWinner =
          isHumidEligible &&
          (e.entity_id === area.humidity_entity_id || !out.sensors.humid);

        if (isSoil) out.sensors.soil.push(e);
        else if (isPropane) out.sensors.propane.push(e);
        else if (isTempWinner) out.sensors.temp = e;
        else if (isHumidWinner) out.sensors.humid = e;
        else {
          // Any other sensor that isn't already represented in the header
          // chips lands here so the body can graph it. Battery/text/timestamp
          // sensors don't make sense as a line — gate them out.
          const dcExclude = new Set(["battery", "enum", "date", "timestamp", "duration"]);
          const unit = st?.attributes?.unit_of_measurement;
          const numericNow = Number.isFinite(parseFloat(st?.state));
          const isPlottable = !dcExclude.has(dc || "") && (unit != null || numericNow);
          if (isPlottable) out.sensors.extras.push(e);
        }
      }
    }

    return out;
  }

  _call(domain, service, data) {
    if (!this._hass) return;
    return this._hass.callService(domain, service, data);
  }

  _moreInfo(entityId) {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  _build() {
    if (!this._hass) return;
    this.innerHTML = "";
    // Styles live as a child of this element so they sit in the same
    // shadow scope as our descendants — document.head doesn't reach
    // inside hui-card's shadow root.
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLE;
    this.appendChild(styleEl);

    const root = document.createElement("div");
    root.className = "atrium-root";
    this._refs = { areas: new Map() };

    const areas = this._areasOnFloor();
    // Seed default-expanded once so manual collapses survive rebuilds.
    if (this._defaultExpanded && !this._seededDefault) {
      for (const a of areas) this._expanded.add(a.area_id);
      this._seededDefault = true;
    }
    const cards = [];
    for (const area of areas) {
      const entities = this._entitiesForArea(area);
      const data = this._filterData(this._classify(area, entities));
      if (this._sections?.has("routines")) {
        data.hiddenRoutines = this._hiddenRoutinesForArea(area);
      }
      if (this._areaIsEmpty(data)) continue;
      cards.push(this._buildRoomCard(area, data));
    }
    this._roomCards = cards;
    // The floor body clips the masonry so a collapsed floor can show a
    // stacked-deck peek; it also owns the open/close height transition.
    const body = document.createElement("div");
    body.className = "atrium-floor-body";
    body.appendChild(root);
    // The peek is a click target: while collapsed, a tap anywhere in the
    // deck opens the floor rather than actuating the card under the finger.
    body.addEventListener("click", (e) => this._onBodyClick(e), true);
    // Append the (empty) root first so getComputedStyle can resolve the
    // --atrium-cols breakpoint variable before we distribute.
    this.appendChild(body);
    this._bodyEl = body;
    this._root = root;
    this._layoutMasonry();
    this._reflectCollapsed(false);
    this._update();
  }

  // Distribute the room cards into N flex columns (N = --atrium-cols), greedily
  // placing each card into the currently shortest column. This packs
  // variable-height cards without the row-aligned gaps a CSS grid leaves.
  _layoutMasonry() {
    const root = this._root;
    if (!root) return;
    // Measure natural card heights: the collapsed deck clamps rooms to a
    // uniform strip, which would skew the shortest-column packing.
    const wasCollapsed = this._bodyEl?.classList.contains("is-collapsed");
    if (wasCollapsed) this._bodyEl.classList.remove("is-collapsed");
    const colCount = this._colsFromCss(root);
    this._colCount = colCount;
    root.replaceChildren();
    this._cols = Array.from({ length: colCount }, () => {
      const col = document.createElement("div");
      col.className = "atrium-col";
      root.appendChild(col);
      return col;
    });
    for (const card of this._roomCards || []) {
      let shortest = this._cols[0];
      for (const col of this._cols) {
        if (col.offsetHeight < shortest.offsetHeight) shortest = col;
      }
      shortest.appendChild(card);
    }
    // Collapsed stack: pull each card up so only a header strip of the one
    // before it shows. The pull is (strip - prevCardHeight), measured here
    // from natural heights (a fixed margin can't, since heights vary). --i
    // drives the z-order (first at back, last in front) so cards' own
    // positioned children can't break the paint order.
    const strip =
      parseFloat(getComputedStyle(this._bodyEl).getPropertyValue("--floor-peek-strip")) || 48;
    for (const col of this._cols) {
      let prevH = 0;
      col.querySelectorAll(":scope > .atrium-room").forEach((card, i) => {
        card.style.setProperty("--i", i);
        card.style.setProperty("--stack-mt", i === 0 ? "0px" : `${strip - prevH}px`);
        prevH = card.offsetHeight;
      });
    }
    if (wasCollapsed) this._bodyEl.classList.add("is-collapsed");
  }

  _colsFromCss(root) {
    const raw = getComputedStyle(root).getPropertyValue("--atrium-cols");
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  // Re-distribute only when the breakpoint (column count) changes. Resizes
  // caused by expand/collapse keep the same column count and are ignored, so
  // toggling a card never makes other cards jump between columns.
  _onResize() {
    if (this._resizeRaf) return;
    this._resizeRaf = requestAnimationFrame(() => {
      this._resizeRaf = 0;
      if (!this._root) return;
      if (this._colsFromCss(this._root) !== this._colCount) this._layoutMasonry();
    });
  }

  _areaIsEmpty(d) {
    return (
      d.lights.length === 0 &&
      d.switches.length === 0 &&
      d.covers.length === 0 &&
      d.doors.length === 0 &&
      d.climates.length === 0 &&
      d.vacuums.length === 0 &&
      d.scenes.length === 0 &&
      d.inputSelects.length === 0 &&
      d.automations.length === 0 &&
      d.scripts.length === 0 &&
      !d.sensors.temp &&
      !d.sensors.humid &&
      d.sensors.motion.length === 0 &&
      d.sensors.leak.length === 0 &&
      d.sensors.soil.length === 0 &&
      d.sensors.propane.length === 0 &&
      d.sensors.extras.length === 0
    );
  }

  _findTemperatureSensorForDevice(deviceId) {
    if (!deviceId) return null;
    const found = Object.values(this._hass.entities).find(
      (e) =>
        e.device_id === deviceId &&
        e.entity_id.startsWith("sensor.") &&
        this._hass.states?.[e.entity_id]?.attributes?.device_class === "temperature"
    );
    return found?.entity_id || null;
  }

  _tryCreateMiniGraph(sensorId, climateId) {
    try {
      const el = document.createElement("mini-graph-card");
      el.setConfig({
        entities: [
          { entity: sensorId, name: "Temperature", color: TONE.cool, show_line: true, show_points: false, show_fill: true },
          {
            entity: climateId,
            attribute: "temperature",
            name: "Target",
            color: TONE.heat,
            show_line: true,
            show_points: false,
            show_legend: false,
            show_fill: false,
          },
        ],
        hours_to_show: 24,
        points_per_hour: 2,
        line_width: 1.6,
        height: 120,
        show: { name: false, icon: false, state: false, legend: false, extrema: false, labels: false, labels_secondary: false, fill: "fade" },
        animate: false,
      });
      el.hass = this._hass;
      return el;
    } catch (_) {
      return null;
    }
  }

  _adjustClimate(entityId, delta) {
    const st = this._hass.states?.[entityId];
    if (!st) return;
    const cur = st.attributes?.temperature;
    if (cur == null) return;
    this._call("climate", "set_temperature", {
      entity_id: entityId,
      temperature: Math.round((cur + delta) * 2) / 2,
    });
  }

  // A tap on the collapsed deck opens the floor instead of actuating the
  // card under the finger. Capture-phase, so inner controls never see it.
  _onBodyClick(e) {
    if (!this._bodyEl?.classList.contains("is-collapsed")) return;
    e.preventDefault();
    e.stopPropagation();
    floorAccordion.toggle(this._floorId);
  }

  // Reflect the shared accordion state onto this floor's body. `animate`
  // runs a FLIP height transition; otherwise it snaps (initial build).
  _reflectCollapsed(animate) {
    const body = this._bodyEl;
    if (!body) return;
    // Not collapsible → stay expanded regardless of the accordion.
    if (!this._collapsible) {
      body.classList.remove("is-collapsed");
      body.style.height = "";
      body.style.overflow = "";
      return;
    }
    const open = floorAccordion.isOpen(this._floorId);
    const wasOpen = !body.classList.contains("is-collapsed");
    if (this._collapsedInit && open === wasOpen) return;
    this._collapsedInit = true;

    if (!animate) {
      body.classList.toggle("is-collapsed", !open);
      body.style.height = "";
      body.style.overflow = open ? "" : "hidden";
      return;
    }

    if (this._animTimer) {
      clearTimeout(this._animTimer);
      this._animTimer = 0;
    }
    const from = body.offsetHeight;
    body.classList.toggle("is-collapsed", !open);
    // Clear the inline height so the target is whatever CSS wants: the fixed
    // peek height when collapsing, natural content height when opening.
    body.style.height = "";
    const to = body.offsetHeight;
    body.style.height = `${from}px`;
    body.style.overflow = "hidden";
    void body.offsetHeight; // commit the from-height before transitioning
    body.style.height = `${to}px`;
    this._animTimer = setTimeout(() => {
      this._animTimer = 0;
      body.style.height = "";
      // Keep clipping only while collapsed so open floors don't cut off
      // popovers/graphs that overflow their room card.
      body.style.overflow = open ? "" : "hidden";
    }, FLOOR_ANIM_MS);
  }

  _toggleExpanded(areaId) {
    if (!buildersMod.COLLAPSIBLE) return;
    const ar = this._refs.areas.get(areaId);
    if (!ar) return;
    const card = ar.card;
    if (this._expanded.has(areaId)) {
      this._expanded.delete(areaId);
      card.classList.remove("expanded");
    } else {
      this._expanded.add(areaId);
      card.classList.add("expanded");
      for (const [, cref] of ar.climates) this._wakeClimateGraph(cref);
      // Wait out the 250ms body transition, then nudge the page enough to
      // reveal any overflow at the bottom of the now-expanded card.
      setTimeout(() => {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 270);
    }
  }

  _toggleAllLights(lights) {
    if (!lights.length) return;
    const ids = lights.map((l) => l.entity_id);
    const anyOn = ids.some((id) => this._hass.states?.[id]?.state === "on");
    this._call("light", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
  }

  _toggleAllCovers(covers) {
    if (!covers.length) return;
    const ids = covers.map((c) => c.entity_id);
    const anyOpen = ids.some((id) => fmtCoverPct(this._hass.states?.[id] || { attributes: {} }) > 5);
    this._call("cover", anyOpen ? "close_cover" : "open_cover", { entity_id: ids });
  }

  _entityName(entity) {
    if (entity.name) return entity.name;
    const st = this._hass.states?.[entity.entity_id];
    return (
      st?.attributes?.friendly_name ||
      entity.entity_id.split(".").pop().replace(/_/g, " ")
    );
  }

  _update() {
    if (!this._refs) return;
    for (const [areaId, ar] of this._refs.areas) {
      const isExpanded = buildersMod.COLLAPSIBLE ? this._expanded.has(areaId) : true;
      this._updateChips(ar);
      this._updateQuickButtons(ar);

      for (const [entId, ref] of ar.lights) this._updateLightRef(ref, entId);
      if (ar.switches) for (const [entId, ref] of ar.switches) this._updateSwitchRef(ref, entId);
      for (const [entId, ref] of ar.climates) this._updateClimateRef(ref, entId, isExpanded);
      if (ar.inputSelects) for (const [entId, ref] of ar.inputSelects) this._updateInputSelectRef(ref, entId);
      for (const [entId, ref] of ar.automations) this._updateAutomationRef(ref, entId);
      if (ar.sensors) for (const [entId, ref] of ar.sensors) this._updateSensorRef(ref, entId);
    }
  }

  _fmtTimeAgo(ts) {
    const d = new Date(ts);
    const now = Date.now();
    const diff = (now - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
    if (diff < 86400 * 30) return `${Math.round(diff / 86400)} days ago`;
    return d.toLocaleDateString();
  }

  static getConfigElement() { return null; }
  static getStubConfig() { return { floor: "" }; }
  getCardSize() { return 1; }
}

Object.assign(AtriumAreaCard.prototype, buildersMod, updatersMod);

customElements.define("atrium-area-card", AtriumAreaCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "atrium-area-card",
  name: "Atrium Area Card",
  description: "Renders every area on a floor as an accordion (swipe-to-dim tiles, chips, scenes, automations drawer)",
});
