const _v = new URL(import.meta.url).search;
const [popoverMod, hassUtilsMod, domUtilsMod, haActionsMod, shellMod, sharedMod] = await Promise.all([
  import(`../lib/popover.js${_v}`),
  import(`../lib/hass-utils.js${_v}`),
  import(`../lib/dom-utils.js${_v}`),
  import(`../lib/ha-actions.js${_v}`),
  import(`../lib/shell.js${_v}`),
  import(`./area-card-shared.js${_v}`),
]);
const { closePopoverFor, openListPopover } = popoverMod;
const { sameRegistries, areaIdForEntity, areaForEntity, friendlyName } = hassUtilsMod;
const { haIcon, injectStyleOnce, fireMoreInfo, tint } = domUtilsMod;
const { callService } = haActionsMod;
const { canDimLight, fmtBrightnessPct, lightRgbTriple } = sharedMod;
const {
  SHELL_TONE,
  SHELL_STYLE,
  shellCleanBatteryName,
  shellBatteryIcon,
  shellBatteryColor,
  shellProblemIcon,
  shellInitialFromName,
  shellPersonStatus,
  formatTempRange,
  PROBLEM_UNAVAILABLE_DOMAINS,
  ALL_FLOOR_KEY,
} = shellMod;

// Popover content is body-attached so the rules need to live at
// document.head, outside the shadow root that hosts this card.
const POPOVER_ITEM_STYLE = await fetch(new URL(`./header.css${_v}`, import.meta.url)).then((r) => r.text());

function ensurePopoverItemStyle() {
  injectStyleOnce("atrium-popover-item-style", POPOVER_ITEM_STYLE);
}

// Reject obviously-bogus sensor readings (disconnected probes report extreme
// values) before they skew the header's temperature range.
const MIN_PLAUSIBLE_TEMP_C = -40;
const MAX_PLAUSIBLE_TEMP_C = 60;

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
    // `floor: null` → orphan areas; ALL_FLOOR_KEY → "All" view rolling up
    // every floor; otherwise a specific floor_id.
    this._floorId = config.floor === ALL_FLOOR_KEY ? ALL_FLOOR_KEY : config.floor;
    this._welcomeName = config.welcome_name || "home";
    // The default (home) tab greets the user; every other tab labels itself.
    this._title = config.title || null;
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
    if (this._lightsAnchor) closePopoverFor(this._lightsAnchor);
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

  _build() {
    this.innerHTML = "";

    const style = document.createElement("style");
    style.textContent = SHELL_STYLE;
    this.appendChild(style);

    const root = document.createElement("div");
    root.className = "atrium-shell-root";
    this._root = root;
    this.appendChild(root);

    const header = document.createElement("div");
    header.className = "atrium-shell-header";

    const top = document.createElement("div");
    top.className = "atrium-shell-header-top";
    top.innerHTML = `
      <div class="atrium-shell-header-greeting">
        <div class="atrium-shell-date"></div>
        <div class="atrium-shell-welcome">${this._title || `Welcome ${this._welcomeName}`}</div>
      </div>
      <div class="atrium-shell-header-people"></div>
    `;
    this._peopleEl = top.querySelector(".atrium-shell-header-people");
    header.appendChild(top);

    const stats = document.createElement("div");
    stats.className = "atrium-shell-pills atrium-shell-pills-stats";
    this._statsEl = stats;
    header.appendChild(stats);

    // Delegated click — pills get replaceChildren'd every hass tick, so a
    // listener on the pill itself can lose the click between mousedown and
    // mouseup.
    stats.addEventListener("click", (e) => {
      const btn = e.target.closest("button.atrium-shell-stat[data-action]");
      if (!btn || !stats.contains(btn)) return;
      if (btn.dataset.action === "lights") this._openLightsPopover(btn);
      else if (btn.dataset.action === "batteries") this._openBatteryPopover(btn);
      else if (btn.dataset.action === "problems") this._openProblemPopover(btn);
    });

    root.appendChild(header);

    // Publish header height as a CSS variable so `atrium-floor-label` can
    // park itself just below us when it goes sticky. Header height shifts
    // with the people/stats pills, so a ResizeObserver is more reliable
    // than a one-shot measurement.
    this._headerEl = header;
    this._headerResizeObserver = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--atrium-shell-header-height",
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
    const dateEl = this._root.querySelector(".atrium-shell-date");
    if (!dateEl) return;
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    dateEl.textContent = `${weekday} · ${time}`;
  }

  // Returns { scopeIds, personIds, floorEntitySet }:
  //   scopeIds       — entities on the configured floor, or null on the
  //                    "All" view (every entity counts).
  //   personIds      — `person.*` entity_ids; presence is dashboard-wide
  //                    and ignores the floor filter.
  //   floorEntitySet — entities anchored to any area on a real floor; lets
  //                    the All view exclude the "Other" bucket from the
  //                    temperature range.
  _scope() {
    const hass = this._hass;
    if (!hass) return null;
    if (sameRegistries(this, "_scopeReg", hass, this._floorId) && this._scopeCache) {
      return this._scopeCache;
    }
    const isAllView = this._floorId === ALL_FLOOR_KEY;
    const targetFloor = this._floorId ?? null;
    const scopeIds = isAllView ? null : new Set();
    const personIds = [];
    const floorEntitySet = isAllView ? new Set() : null;

    for (const ent of Object.values(hass.entities)) {
      const entityId = ent.entity_id;
      if (entityId.startsWith("person.") && !ent.hidden) personIds.push(entityId);
      if (ent.hidden) continue;
      const areaId = areaIdForEntity(hass, ent);
      if (!areaId) continue;
      const area = hass.areas?.[areaId];
      if (!area) continue;
      if (floorEntitySet && area.floor_id != null) floorEntitySet.add(entityId);
      if (scopeIds && (area.floor_id ?? null) === targetFloor) scopeIds.add(entityId);
    }
    this._scopeCache = { scopeIds, personIds, floorEntitySet };
    return this._scopeCache;
  }

  _updateStats() {
    if (!this._statsEl || !this._peopleEl || !this._hass) return;
    const scope = this._scope();
    if (!scope) return;
    const { scopeIds, personIds, floorEntitySet } = scope;
    const isAllView = scopeIds == null;
    const hass = this._hass;
    const states = hass.states;
    const entReg = hass.entities || {};

    let lightsOn = 0;
    const activeLights = [];
    const temps = [];
    const batteries = [];
    const problems = [];

    // On per-floor views, iterating scopeIds is an order of magnitude
    // smaller than the full state map. inTempScope excludes the floorless
    // "Other" bucket from the home-wide temp range on the All view.
    const iterIds = scopeIds ?? Object.keys(states);
    for (const id of iterIds) {
      const st = states[id];
      if (!st) continue;
      const inTempScope = isAllView ? floorEntitySet.has(id) : true;
      const domain = id.split(".")[0];
      const dc = st.attributes?.device_class;
      const ent = entReg[id];
      const visible = !ent || (!ent.hidden && !ent.hidden_by && !ent.disabled_by);
      if (domain === "light" && st.state === "on") {
        if (visible) {
          lightsOn += 1;
          activeLights.push({ id, state: st });
        }
      } else if (domain === "climate" && inTempScope) {
        const t = Number(st.attributes?.current_temperature);
        if (Number.isFinite(t)) temps.push(t);
      } else if (domain === "sensor" && dc === "temperature" && inTempScope) {
        const t = Number(st.state);
        if (Number.isFinite(t) && t > MIN_PLAUSIBLE_TEMP_C && t < MAX_PLAUSIBLE_TEMP_C) temps.push(t);
      } else if (domain === "sensor" && dc === "battery") {
        const v = Number(st.state);
        if (Number.isFinite(v) && v >= 0 && v <= 100) {
          batteries.push({ id, value: v, state: st });
        }
      }
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

    batteries.sort((a, b) => a.value - b.value);
    this._batteries = batteries;

    activeLights.sort((a, b) => {
      const ar = this._areaForEntity(a.id)?.name || "";
      const br = this._areaForEntity(b.id)?.name || "";
      if (ar !== br) return ar.localeCompare(br);
      return friendlyName(a.state, a.id).localeCompare(friendlyName(b.state, b.id));
    });
    this._lightsOn = activeLights;

    // Active problems first (more urgent than offline), then by name within
    // each tier so the order is stable across hass ticks.
    problems.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "problem" ? -1 : 1;
      return friendlyName(a.state, a.id).localeCompare(friendlyName(b.state, b.id));
    });
    this._problems = problems;

    const persons = personIds
      .map((id) => states[id])
      .filter(Boolean)
      .sort((a, b) => friendlyName(a, a.entity_id).localeCompare(friendlyName(b, b.entity_id)));

    // Signature gate so we skip the pill recreation + replaceChildren when
    // nothing displayed actually changed.
    const tempLabel = formatTempRange(temps);
    const battLabel = batteries.length
      ? `${batteries.length}·${Math.round(batteries[0].value)}`
      : "";
    const lightLabel = activeLights.map((l) => l.id).join(",");
    const hasActiveProblem = problems.some((p) => p.kind === "problem");
    const probLabel = problems.length ? `${problems.length}:${hasActiveProblem ? "a" : "i"}` : "";
    const personSig = persons.map((p) => `${p.entity_id}=${p.state}`).join(",");
    const sig = `${lightsOn}:${lightLabel}|${tempLabel}|${battLabel}|${probLabel}|${personSig}`;
    if (sig === this._lastStatsSig) return;
    this._lastStatsSig = sig;

    const peoplePills = persons.map((p) => this._personPill(p));

    const statPills = [];
    statPills.push(this._statPill("mdi:lightbulb", SHELL_TONE.light, `${lightsOn} lights on`, "lights"));

    if (tempLabel) {
      statPills.push(this._statPill("mdi:thermometer", SHELL_TONE.cool, tempLabel));
    }

    if (batteries.length) {
      const min = batteries[0].value;
      const color =
        min <= 15 ? SHELL_TONE.danger : min <= 30 ? SHELL_TONE.warn : SHELL_TONE.good;
      const label = `${batteries.length} · ${Math.round(min)}%`;
      statPills.push(this._statPill("mdi:battery", color, label, "batteries"));
    }

    if (problems.length) {
      // Red for active problems, orange when the list is only offline
      // devices (still worth surfacing but less urgent than leak/smoke).
      const color = hasActiveProblem ? SHELL_TONE.danger : SHELL_TONE.warn;
      statPills.push(
        this._statPill("mdi:alert-circle", color, `${problems.length}`, "problems")
      );
    }

    this._peopleEl.replaceChildren(...peoplePills);
    this._statsEl.replaceChildren(...statPills);
  }

  // `action` is the data-attribute picked up by the delegated click handler
  // on the stats row.
  _statPill(icon, color, label, action) {
    const tag = action ? "button" : "div";
    const el = document.createElement(tag);
    el.className = action ? "atrium-shell-stat is-button" : "atrium-shell-stat";
    if (action) {
      el.type = "button";
      el.dataset.action = action;
    }
    el.innerHTML = `
      <span class="atrium-shell-stat-icon" style="color:${color}">
        ${haIcon(icon)}
      </span>
      <span class="atrium-shell-stat-label"></span>
    `;
    el.querySelector(".atrium-shell-stat-label").textContent = label;
    return el;
  }

  _personPill(state) {
    const status = shellPersonStatus(state);
    const fullName = friendlyName(state, state.entity_id.split(".")[1] || "");
    const picture = state.attributes?.entity_picture;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `atrium-shell-person ${status.tone}`;
    btn.title = `${fullName} · ${status.label}`;

    const avatar = document.createElement("span");
    avatar.className = "atrium-shell-avatar";
    if (picture) {
      avatar.style.backgroundImage = `url("${picture}")`;
    } else {
      avatar.textContent = shellInitialFromName(fullName);
    }
    const dot = document.createElement("span");
    dot.className = "atrium-shell-avatar-dot";
    dot.innerHTML = haIcon("mdi:home");
    avatar.appendChild(dot);

    btn.append(avatar);
    btn.addEventListener("click", () => this._openEntityMore(state.entity_id));
    return btn;
  }

  _openEntityMore(entityId) {
    fireMoreInfo(this, entityId);
  }

  _openBatteryPopover(anchor) {
    ensurePopoverItemStyle();
    const batteries = this._batteries || [];
    this._batteryAnchor = anchor;
    openListPopover({
      anchor,
      title: "Batteries & levels",
      countLabel: `${batteries.length} total`,
      items: batteries,
      buildItem: (b) => this._batteryItem(b, anchor),
      emptyText: "No batteries reported.",
      width: 320,
      onClose: () => { if (this._batteryAnchor === anchor) this._batteryAnchor = null; },
    });
  }

  _openLightsPopover(anchor) {
    ensurePopoverItemStyle();
    const lights = this._lightsOn || [];

    let extraContent;
    if (lights.length) {
      const turnOffAllBtn = document.createElement("button");
      turnOffAllBtn.type = "button";
      turnOffAllBtn.className = "atrium-turn-off-all-btn";
      turnOffAllBtn.innerHTML = `${haIcon("mdi:lightbulb-off")} Turn off all`;
      turnOffAllBtn.addEventListener("click", () => {
        callService(this._hass, "light", "turn_off", { entity_id: lights.map((l) => l.id) });
        closePopoverFor(anchor);
      });
      extraContent = turnOffAllBtn;
    }

    this._lightsAnchor = anchor;
    openListPopover({
      anchor,
      title: "Lights on",
      countLabel: `${lights.length} total`,
      items: lights,
      buildItem: (light) => this._lightItem(light, anchor),
      emptyText: "No lights are on.",
      extraContent,
      width: 320,
      onClose: () => { if (this._lightsAnchor === anchor) this._lightsAnchor = null; },
    });
  }

  _popoverItem({ entityId, icon, color, name, suffixHTML, anchor }) {
    const tone = tint(color, 10);
    const room = this._areaForEntity(entityId);
    const roomHTML = room
      ? `${haIcon(room.icon)}<span class="room-name"></span>`
      : "";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "atrium-shell-pop-item";
    btn.innerHTML = `
      <span class="atrium-shell-pop-item-swatch" style="background:${tone};color:${color}">
        ${haIcon(icon)}
      </span>
      <span class="atrium-shell-pop-item-body">
        <span class="atrium-shell-pop-item-name"></span>
        <span class="atrium-shell-pop-item-room">${roomHTML}</span>
      </span>
      ${suffixHTML}
    `;
    btn.querySelector(".atrium-shell-pop-item-name").textContent = name;
    if (room) btn.querySelector(".room-name").textContent = room.name;
    btn.addEventListener("click", () => {
      closePopoverFor(anchor);
      this._openEntityMore(entityId);
    });
    return btn;
  }

  _batteryItem(battery, anchor) {
    const pct = Math.round(battery.value);
    const color = shellBatteryColor(pct);
    const rawName = friendlyName(battery.state, battery.id);
    const suffixHTML = `
      <span class="atrium-shell-pop-item-bar">
        <span class="atrium-shell-pop-item-bar-fill" style="width:${pct}%;background:${color}"></span>
      </span>
      <span class="atrium-shell-pop-item-pct" style="color:${color}">${pct}%</span>
    `;
    return this._popoverItem({
      entityId: battery.id,
      icon: shellBatteryIcon(battery.id, this._hass),
      color,
      name: shellCleanBatteryName(rawName),
      suffixHTML,
      anchor,
    });
  }

  _lightItem(light, anchor) {
    const st = light.state;
    const pct = fmtBrightnessPct(st);
    const color = this._lightColor(st);
    const dimmable = canDimLight(st);
    const tone = tint(color, 10);
    const room = this._areaForEntity(light.id);
    const roomHTML = room
      ? `${haIcon(room.icon)}<span class="room-name"></span>`
      : "";
    const suffixHTML = dimmable
      ? `
        <span class="atrium-shell-pop-item-bar">
          <span class="atrium-shell-pop-item-bar-fill" style="width:${pct}%;background:${color}"></span>
        </span>
        <span class="atrium-shell-pop-item-pct" style="color:${color}">${pct}%</span>
      `
      : `<span class="atrium-shell-pop-item-pct" style="color:${color}">On</span>`;
    const row = document.createElement("div");
    row.className = "atrium-shell-pop-item atrium-shell-pop-light";
    row.innerHTML = `
      <button class="atrium-shell-pop-item-swatch" type="button" style="background:${tone};color:${color}" title="Open entity">
        ${haIcon(st?.attributes?.icon || "mdi:lightbulb")}
      </button>
      <button class="atrium-shell-pop-item-action" type="button">
        <span class="atrium-shell-pop-item-body">
          <span class="atrium-shell-pop-item-name"></span>
          <span class="atrium-shell-pop-item-room">${roomHTML}</span>
        </span>
        ${suffixHTML}
      </button>
    `;
    row.querySelector(".atrium-shell-pop-item-name").textContent = friendlyName(st, light.id);
    if (room) row.querySelector(".room-name").textContent = room.name;
    row.querySelector(".atrium-shell-pop-item-swatch").addEventListener("click", (e) => {
      e.stopPropagation();
      closePopoverFor(anchor);
      this._openEntityMore(light.id);
    });
    row.querySelector(".atrium-shell-pop-item-action").addEventListener("click", (e) => {
      e.stopPropagation();
      closePopoverFor(anchor);
      callService(this._hass, "light", "turn_off", { entity_id: light.id });
    });
    return row;
  }

  _lightColor(st) {
    const rgb = lightRgbTriple(st);
    return rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : SHELL_TONE.light;
  }

  _openProblemPopover(anchor) {
    ensurePopoverItemStyle();
    const problems = this._problems || [];
    this._problemAnchor = anchor;
    openListPopover({
      anchor,
      title: "Problems & offline",
      countLabel: `${problems.length} total`,
      items: problems,
      buildItem: (p) => this._problemItem(p, anchor),
      emptyText: "Nothing to report.",
      width: 320,
      onClose: () => { if (this._problemAnchor === anchor) this._problemAnchor = null; },
    });
  }

  _problemItem(problem, anchor) {
    const isActive = problem.kind === "problem";
    const color = isActive ? SHELL_TONE.danger : SHELL_TONE.warn;
    const status = isActive ? "Problem" : "Offline";
    const suffixHTML = `<span class="atrium-shell-pop-item-pct" style="color:${color};min-width:54px">${status}</span>`;
    return this._popoverItem({
      entityId: problem.id,
      icon: shellProblemIcon(problem.state),
      color,
      name: friendlyName(problem.state, problem.id),
      suffixHTML,
      anchor,
    });
  }

  _areaForEntity(entityId) {
    const area = this._hass ? areaForEntity(this._hass, entityId) : null;
    return area ? { name: area.name, icon: area.icon || "mdi:floor-plan" } : null;
  }

  getCardSize() {
    return 2;
  }
}
customElements.define("atrium-header", AtriumHeader);
