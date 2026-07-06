export const COLLAPSIBLE = false;
const _v = new URL(import.meta.url).search;
const [popoverMod, sharedMod] = await Promise.all([
  import(`../lib/popover.js${_v}`),
  import(`./area-card-shared.js${_v}`),
]);
const { openPopover, closePopoverFor, buildPopoverHeader } = popoverMod;
const {
  TONE, ICONS,
  iconForArea, iconForScene,
  nameWithoutAreaPrefix, nameWithoutStairs,
  ensurePopoverItemStyle,
  fmtSensorValue,
} = sharedMod;

export function _buildRoomCard(area, data) {
  const expanded = COLLAPSIBLE ? this._expanded.has(area.area_id) : true;
  // No accordion content → render header-only and skip the chevron / click
  // handler so the row reads as static info.
  const hasBody =
    data.lights.length > 0 ||
    data.switches.length > 0 ||
    data.climates.length > 0 ||
    data.sensors.extras.length > 0 ||
    data.inputSelects.length > 0 ||
    data.scenes.length > 0 ||
    data.automations.length > 0 ||
    data.scripts.length > 0;
  const card = document.createElement("div");
  card.className =
    "atrium-room" + (expanded && hasBody ? " expanded" : "") + (hasBody ? "" : " no-body");
  card.dataset.area = area.area_id;

  // Seed the per-area ref entry before delegating — section builders
  // mutate `this._refs.areas.get(area.area_id).<map>` while wiring tiles.
  const areaRef = {
    card, data,
    lights: new Map(),
    switches: new Map(),
    climates: new Map(), automations: new Map(),
    inputSelects: new Map(),
    sensors: new Map(),
  };
  this._refs.areas.set(area.area_id, areaRef);

  const headerRefs = this._buildRoomHeader(area, data, hasBody);
  card.appendChild(headerRefs.row);

  if (hasBody) {
    const { bodyWrap, body } = this._buildRoomBody(area, data);
    card.appendChild(bodyWrap);
    Object.assign(areaRef, headerRefs, { body });
  } else {
    Object.assign(areaRef, headerRefs);
  }
  return card;
}

export function _buildRoomHeader(area, data, hasBody = true) {
  const row = document.createElement("div");
  row.className = "atrium-row";
  if (hasBody && COLLAPSIBLE) {
    row.classList.add("clickable");
    row.addEventListener("click", () => this._toggleExpanded(area.area_id));
  }

  const icon = document.createElement("div");
  icon.className = "atrium-room-icon";
  if (area.picture) {
    icon.classList.add("has-img");
    icon.style.backgroundImage = `url("${area.picture}")`;
  } else {
    icon.innerHTML = `<ha-icon icon="${iconForArea(area)}" style="--mdc-icon-size:28px"></ha-icon>`;
  }

  const mid = document.createElement("div");
  mid.className = "atrium-room-mid";
  const titleRow = document.createElement("div");
  titleRow.className = "atrium-room-title-row";
  const title = document.createElement("div");
  title.className = "atrium-room-name";
  title.textContent = nameWithoutStairs(area.name);
  titleRow.appendChild(title);
  const motionPill = document.createElement("div");
  motionPill.className = "atrium-motion-pill";
  motionPill.style.display = "none";
  motionPill.innerHTML = `<ha-icon icon="mdi:motion-sensor" style="--mdc-icon-size:14px"></ha-icon><span>motion</span>`;
  titleRow.appendChild(motionPill);
  mid.appendChild(titleRow);

  const chips = document.createElement("div");
  chips.className = "atrium-chips";
  mid.appendChild(chips);

  const actions = document.createElement("div");
  actions.className = "atrium-room-actions";
  const bulbBtn = document.createElement("button");
  bulbBtn.className = "atrium-quick-btn";
  bulbBtn.style.display = data.lights.length ? "inline-flex" : "none";
  bulbBtn.innerHTML = `<ha-icon icon="mdi:lightbulb" style="--mdc-icon-size:20px"></ha-icon><span class="count" style="font-size:12px;font-weight:600;display:none"></span>`;
  bulbBtn.addEventListener("click", (e) => { e.stopPropagation(); this._toggleAllLights(data.lights); });
  const bulbCountEl = bulbBtn.querySelector(".count");
  actions.appendChild(bulbBtn);
  const coverBtn = document.createElement("button");
  coverBtn.className = "atrium-quick-btn";
  coverBtn.style.display = data.covers.length ? "inline-flex" : "none";
  coverBtn.innerHTML = `<ha-icon icon="mdi:blinds-horizontal" style="--mdc-icon-size:20px"></ha-icon>`;
  {
    let lpTimer = 0, didLongPress = false;
    coverBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      didLongPress = false;
      lpTimer = setTimeout(() => {
        didLongPress = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
        if (data.covers.length) this._moreInfo(data.covers[0].entity_id);
      }, 480);
    });
    coverBtn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      clearTimeout(lpTimer);
      if (!didLongPress) this._toggleAllCovers(data.covers);
    });
    coverBtn.addEventListener("pointercancel", () => clearTimeout(lpTimer));
    coverBtn.addEventListener("click", (e) => e.stopPropagation());
  }
  actions.appendChild(coverBtn);
  if (hasBody && COLLAPSIBLE) {
    const chev = document.createElement("span");
    chev.className = "atrium-chev";
    chev.innerHTML = `<ha-icon icon="mdi:chevron-down" style="--mdc-icon-size:16px"></ha-icon>`;
    actions.appendChild(chev);
  }

  row.append(icon, mid, actions);
  return { row, icon, motionPill, chips, bulbBtn, bulbCountEl, coverBtn };
}

export function _buildRoomBody(area, data) {
  // Wrap as a grid so the body can animate from 0fr to 1fr (height: 0 →
  // auto). Padding lives on .atrium-body-inner so it doesn't leak visible
  // height when the wrap collapses.
  const bodyWrap = document.createElement("div");
  bodyWrap.className = "atrium-body-wrap";
  const body = document.createElement("div");
  body.className = "atrium-body";
  const bodyInner = document.createElement("div");
  bodyInner.className = "atrium-body-inner";

  const sections = [];
  if (data.lights.length) sections.push(this._buildLightsSection(area, data.lights));
  if (data.switches.length) sections.push(this._buildSwitchesSection(area, data.switches));
  if (data.climates.length) sections.push(this._buildClimateSection(area, data.climates, data.sensors));
  if (data.sensors.extras.length) sections.push(this._buildSensorsSection(area, data.sensors.extras));
  if (data.inputSelects.length) sections.push(this._buildInputSelectsSection(area, data.inputSelects));
  if (data.scenes.length) sections.push(this._buildScenesSection(area, data.scenes));
  const routines = this._buildAutomationsSection(area, data.automations, data.scripts);
  if (routines) sections.push(routines);
  for (const s of sections) bodyInner.appendChild(s);
  if (data.hiddenRoutines?.length) {
    bodyInner.appendChild(this._buildHiddenRoutinesBtn(area, data.hiddenRoutines));
  }

  body.appendChild(bodyInner);
  bodyWrap.appendChild(body);
  return { bodyWrap, body };
}

export function _section(title, children) {
  const wrap = document.createElement("div");
  const inner = document.createElement("div");
  inner.style.cssText = "display:flex;flex-direction:column;gap:6px";
  if (Array.isArray(children)) children.forEach((c) => inner.appendChild(c));
  else inner.appendChild(children);
  wrap.appendChild(inner);
  return wrap;
}

export function _buildLightsSection(area, lights) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid " + (lights.length === 1 ? "cols-1" : "cols-2");
  for (const light of lights) grid.appendChild(this._buildLightTile(area, light));
  return this._section("Lights", grid);
}

export function _buildLightTile(area, light) {
  const tile = document.createElement("div");
  tile.className = "atrium-tile";
  tile.dataset.entity = light.entity_id;

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
    `<ha-icon icon="${ICONS.bulb}" style="--mdc-icon-size:20px"></ha-icon>` +
    `<span class="atrium-unavail-dot">!</span>`;
  const iconEl = swatch.querySelector("ha-icon");
  const text = document.createElement("div");
  text.className = "atrium-tile-text";
  const name = document.createElement("div");
  name.className = "atrium-tile-name";
  name.textContent = nameWithoutAreaPrefix(this._entityName(light), area);
  const state = document.createElement("div");
  state.className = "atrium-tile-state";
  text.append(name, state);
  body.append(swatch, text);
  tile.appendChild(body);

  this._bindSwipeTile(tile, fill, thumb, swatch, state, light.entity_id, "light");

  const ref = { tile, fill, thumb, swatch, iconEl, state, name };
  this._refs.areas.get(area.area_id).lights.set(light.entity_id, ref);
  return tile;
}

export function _buildSwitchesSection(area, switches) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid " + (switches.length === 1 ? "cols-1" : "cols-2");
  for (const s of switches) grid.appendChild(this._buildSwitchTile(area, s));
  return this._section("Switches", grid);
}

// Same tile as a light but on/off only: no brightness fill/thumb drag, tap
// toggles, long-press opens more-info (handled by `_bindSwipeTile`'s "switch"
// kind). Reuses the light tile's `.light` fill/swatch classes for an
// identical look.
export function _buildSwitchTile(area, entity) {
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
    `<ha-icon icon="${ICONS.toggle}" style="--mdc-icon-size:20px"></ha-icon>` +
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

  this._bindSwipeTile(tile, fill, thumb, swatch, state, entity.entity_id, "switch");

  const ref = { tile, fill, thumb, swatch, iconEl, state, name };
  this._refs.areas.get(area.area_id).switches.set(entity.entity_id, ref);
  return tile;
}

export function _buildClimateSection(area, climates, sensors) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid cols-1";
  grid.style.gap = "8px";
  for (const c of climates) grid.appendChild(this._buildClimateTile(area, c, sensors));
  return this._section("Climate", grid);
}

export function _buildClimateTile(area, climate, sensors) {
  const tile = document.createElement("div");
  tile.className = "atrium-climate";
  tile.dataset.entity = climate.entity_id;

  // Mini-graph is instantiated lazily on first expansion — rooms that
  // never open don't pay the mount cost.
  const bg = document.createElement("div");
  bg.className = "atrium-climate-bg";
  const tempId =
    this._findTemperatureSensorForDevice(climate.device_id) ||
    area.temperature_entity_id;
  const makeGraph = tempId
    ? () => {
        const g = this._tryCreateMiniGraph(tempId, climate.entity_id);
        if (g) bg.appendChild(g);
        return g;
      }
    : null;
  tile.appendChild(bg);

  const content = document.createElement("div");
  content.className = "atrium-climate-content";
  tile.appendChild(content);

  const row = document.createElement("div");
  row.className = "atrium-climate-row";
  const swatch = document.createElement("div");
  swatch.className = "atrium-swatch";
  swatch.style.cursor = "pointer";
  swatch.innerHTML =
    `<ha-icon icon="${ICONS.thermo}" style="--mdc-icon-size:20px"></ha-icon>` +
    `<span class="atrium-swatch-caret"><ha-icon icon="mdi:menu-down"></ha-icon></span>`;
  const text = document.createElement("div");
  text.style.flex = "1";
  const name = document.createElement("button");
  name.type = "button";
  name.className = "atrium-climate-name";
  name.textContent = nameWithoutAreaPrefix(this._entityName(climate), area);
  name.addEventListener("click", (e) => {
    e.stopPropagation();
    this._moreInfo(climate.entity_id);
  });
  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11.5px;line-height:14px;text-transform:capitalize;display:flex;align-items:center;gap:6px";
  text.append(name, sub);
  row.append(swatch, text);
  content.appendChild(row);

  const meta = document.createElement("div");
  meta.className = "atrium-climate-meta";
  const metaLabel = document.createElement("span");
  metaLabel.textContent = "24h";
  const metaRange = document.createElement("span");
  metaRange.className = "atrium-climate-meta-range";
  meta.append(metaLabel, metaRange);
  content.appendChild(meta);

  const setpointRow = document.createElement("div");
  setpointRow.className = "atrium-climate-target";
  const minus = document.createElement("button");
  minus.className = "atrium-tiny-btn";
  minus.innerHTML = `<ha-icon icon="${ICONS.minus}" style="--mdc-icon-size:20px"></ha-icon>`;
  minus.addEventListener("click", (e) => { e.stopPropagation(); this._adjustClimate(climate.entity_id, -0.5); });
  const temp = document.createElement("div");
  temp.className = "atrium-climate-temp";
  const plus = document.createElement("button");
  plus.className = "atrium-tiny-btn";
  plus.innerHTML = `<ha-icon icon="${ICONS.plus}" style="--mdc-icon-size:20px"></ha-icon>`;
  plus.addEventListener("click", (e) => { e.stopPropagation(); this._adjustClimate(climate.entity_id, 0.5); });
  setpointRow.append(minus, temp, plus);
  content.appendChild(setpointRow);

  const extras = document.createElement("div");
  extras.className = "atrium-climate-extras";
  extras.style.display = "none";
  const fanMenu = this._buildClimateMenu("fan", climate.entity_id);
  const swingMenu = this._buildClimateMenu("swing", climate.entity_id);
  extras.append(fanMenu.el, swingMenu.el);
  content.appendChild(extras);

  // The swatch doubles as the mode-picker anchor when the entity exposes
  // multiple hvac modes; otherwise it opens more-info.
  let modeItems = [], modeCurrent = null, modeOnPick = () => {};
  const modeMenu = {
    setItems: (items, current, onPick) => {
      modeItems = items;
      modeCurrent = current;
      modeOnPick = onPick;
    },
  };

  swatch.addEventListener("click", (e) => {
    e.stopPropagation();
    if (swatch.dataset.menu === "mode") {
      this._openClimateMenu(swatch, modeItems, modeCurrent, modeOnPick);
    } else {
      this._moreInfo(climate.entity_id);
    }
  });

  const ref = {
    tile, swatch, name, sub, temp, extras, meta, metaRange,
    modeMenu, fanMenu, swingMenu,
    graph: null, makeGraph, tempId,
  };
  this._refs.areas.get(area.area_id).climates.set(climate.entity_id, ref);
  // Wake the graph immediately on default-expanded floors so the sparkline
  // is populated as the body slides in.
  if (COLLAPSIBLE ? this._expanded.has(area.area_id) : true) this._wakeClimateGraph(ref);
  return tile;
}

export function _openClimateMenu(anchor, items, current, onPick) {
  ensurePopoverItemStyle();
  const list = document.createElement("div");
  list.className = "atrium-pop-menu";
  for (const it of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "atrium-pop-menu-item" + (it.id === current ? " active" : "");
    b.innerHTML = `<ha-icon icon="${it.icon || ICONS.thermo}"></ha-icon><span>${it.label}</span>`;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      closePopoverFor(anchor);
      onPick(it.id);
    });
    list.appendChild(b);
  }
  this._openAnchors.add(anchor);
  openPopover({
    anchor,
    content: list,
    onClose: () => this._openAnchors.delete(anchor),
  });
}

export function _buildClimateMenu(kind, entityId) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "atrium-climate-menu-btn";
  const iconMap = { mode: ICONS.thermo, fan: ICONS.fan, swing: ICONS.swing };
  const icon = iconMap[kind] || ICONS.cogs;
  btn.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span class="label"></span>`;

  let cachedItems = [], cachedCurrent = null, cachedOnPick = () => {};
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    this._openClimateMenu(btn, cachedItems, cachedCurrent, cachedOnPick);
  });

  const setItems = (items, current, onPick) => {
    cachedItems = items;
    cachedCurrent = current;
    cachedOnPick = onPick;
    const matched = items.find((i) => i.id === current);
    btn.querySelector(".label").textContent = matched?.label || (current || "—");
  };

  return { el: btn, btn, setItems };
}

export function _buildSensorsSection(area, sensors) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid " + (sensors.length > 1 ? "cols-2" : "cols-1");
  grid.style.gap = "8px";
  for (const s of sensors) grid.appendChild(this._buildSensorTile(area, s));
  return this._section("Sensors", grid);
}

export function _buildSensorTile(area, sensor) {
  // Header-chip style: swatch icon + name + current reading. Tap → more-info.
  const tile = document.createElement("div");
  tile.className = "atrium-sensor";
  tile.dataset.entity = sensor.entity_id;
  tile.addEventListener("click", () => this._moreInfo(sensor.entity_id));

  const row = document.createElement("div");
  row.className = "atrium-sensor-row";
  const icon = document.createElement("ha-icon");
  icon.className = "atrium-sensor-icon";
  const st = this._hass.states?.[sensor.entity_id];
  const dc = st?.attributes?.device_class;
  const ICON_BY_DC = {
    temperature: "mdi:thermometer",
    humidity: "mdi:water-percent",
    illuminance: "mdi:brightness-5",
    pressure: "mdi:gauge",
    power: "mdi:flash",
    energy: "mdi:lightning-bolt",
    co2: "mdi:molecule-co2",
    carbon_dioxide: "mdi:molecule-co2",
    voc: "mdi:air-filter",
    pm25: "mdi:air-filter",
    current: "mdi:current-ac",
    voltage: "mdi:flash-triangle",
  };
  icon.setAttribute("icon", st?.attributes?.icon || ICON_BY_DC[dc] || "mdi:gauge");
  const name = document.createElement("div");
  name.className = "atrium-sensor-name";
  name.textContent = nameWithoutAreaPrefix(this._entityName(sensor), area);
  const value = document.createElement("div");
  value.className = "atrium-sensor-value";
  value.textContent = fmtSensorValue(st);
  row.append(icon, name, value);
  tile.appendChild(row);

  const ref = { tile, value };
  this._refs.areas.get(area.area_id).sensors.set(sensor.entity_id, ref);
  return tile;
}

export function _buildInputSelectsSection(area, inputSelects) {
  const tiles = inputSelects.map((s) => this._buildInputSelectTile(area, s));
  return this._section("Selectors", tiles);
}

export function _buildInputSelectTile(area, entity) {
  const hass = this._hass;
  // A single badge-height button (inline icon + name + current value + caret),
  // styled like the scene badges. Tapping it opens the shared popover menu —
  // reused from the climate mode picker — with one item per option; picking
  // one fires input_select.select_option.
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "atrium-select";
  btn.dataset.entity = entity.entity_id;

  const iconEl = document.createElement("ha-icon");
  iconEl.className = "atrium-select-icon";
  const icon =
    hass.entities?.[entity.entity_id]?.icon ??
    hass.states?.[entity.entity_id]?.attributes?.icon ??
    "mdi:form-select";
  iconEl.setAttribute("icon", icon);

  const name = document.createElement("div");
  name.className = "atrium-select-name";
  name.textContent = nameWithoutAreaPrefix(this._entityName(entity), area);

  const value = document.createElement("div");
  value.className = "atrium-select-value";

  const caret = document.createElement("ha-icon");
  caret.className = "atrium-select-caret";
  caret.setAttribute("icon", "mdi:menu-down");

  btn.append(iconEl, name, value, caret);

  let cachedItems = [], cachedCurrent = null;
  // Short tap → option picker; long press → more-info dialog, mirroring the
  // light tile / cover button long-press.
  let lpTimer = 0, didLongPress = false;
  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    didLongPress = false;
    lpTimer = setTimeout(() => {
      didLongPress = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
      this._moreInfo(entity.entity_id);
    }, 480);
  });
  btn.addEventListener("pointerup", (e) => {
    e.stopPropagation();
    clearTimeout(lpTimer);
    if (!didLongPress) {
      this._openClimateMenu(btn, cachedItems, cachedCurrent, (option) =>
        this._call("input_select", "select_option", { entity_id: entity.entity_id, option })
      );
    }
  });
  btn.addEventListener("pointercancel", () => clearTimeout(lpTimer));
  btn.addEventListener("click", (e) => e.stopPropagation());

  const setItems = (items, current) => {
    cachedItems = items;
    cachedCurrent = current;
  };

  const ref = { btn, value, setItems };
  this._refs.areas.get(area.area_id).inputSelects.set(entity.entity_id, ref);
  return btn;
}

export function _buildScenesSection(area, scenes) {
  const wrap = document.createElement("div");
  wrap.className = "atrium-scenes";

  let isDragging = false;
  let startX = 0;
  let scrollStart = 0;
  let dragMoved = false;

  wrap.addEventListener("pointerdown", (e) => {
    dragMoved = false;
    if (e.target === wrap || e.target.closest(".atrium-scene-btn") === null) {
      isDragging = true;
      startX = e.clientX;
      scrollStart = wrap.scrollLeft;
      wrap.classList.add("dragging");
      wrap.setPointerCapture(e.pointerId);
    }
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) dragMoved = true;
    wrap.scrollLeft = scrollStart - dx;
  });
  wrap.addEventListener("pointerup", (e) => {
    if (isDragging && e.target === wrap) {
      wrap.releasePointerCapture(e.pointerId);
    }
    isDragging = false;
    wrap.classList.remove("dragging");
  });

  for (const s of scenes) {
    const btn = document.createElement("button");
    btn.className = "atrium-scene-btn";
    const sceneName = this._entityName(s);
    btn.title = sceneName;
    btn.innerHTML = `<ha-icon icon="${iconForScene(s, sceneName)}"></ha-icon><span class="atrium-scene-btn-name"></span>`;
    btn.querySelector(".atrium-scene-btn-name").textContent = nameWithoutAreaPrefix(sceneName, area);
    btn.addEventListener("click", (e) => {
      if (dragMoved) { e.preventDefault(); return; }
      this._call("scene", "turn_on", { entity_id: s.entity_id });
    });
    wrap.appendChild(btn);
  }
  const section = document.createElement("div");
  section.appendChild(wrap);
  return section;
}

export function _buildAutomationsSection(area, automations, scripts) {
  const items = [...automations, ...scripts];
  if (!items.length) return null;

  let title;
  if (automations.length && scripts.length) title = "Automations & scripts";
  else if (scripts.length) title = scripts.length > 1 ? "Scripts" : "Script";
  else title = automations.length > 1 ? "Automations" : "Automation";

  // Same rows as the old popover, now grouped on a surface and dropped
  // straight into the room body like every other section. The .atrium-auto-*
  // row styles live in area-card.css (card scope); the surface background is
  // inlined since .atrium-pop-list-rooms only exists in the popover stylesheet.
  const list = document.createElement("div");
  list.style.cssText =
    "background:color-mix(in srgb, var(--primary-text-color, #e8e9ec) 6%, transparent);border-radius:12px;overflow:hidden";
  for (const item of items) list.appendChild(this._buildAutomationRow(area, item));
  return this._section(title, list);
}

export function _buildAutomationRow(area, item) {
  const hass = this._hass;
  const state = hass.states?.[item.entity_id];
  const isScript = item.entity_id.startsWith("script.");
  const enabled = isScript ? true : state?.state !== "off";
  const customIcon = hass.entities?.[item.entity_id]?.icon ?? state?.attributes?.icon ?? null;

  const row = document.createElement("div");
  row.className = "atrium-auto-row" + (!enabled ? " disabled" : "") + (isScript ? " is-clickable" : "");
  row.dataset.entity = item.entity_id;
  // Scripts have no dedicated action of their own on this row (no toggle, no
  // useful "run" here) — the whole row just opens the entity's more-info,
  // same as tapping the name. Body/play don't stopPropagation for scripts so
  // clicks on them bubble up to this listener too.
  if (isScript) row.addEventListener("click", () => this._moreInfo(item.entity_id));

  let swatch;
  if (isScript) {
    swatch = document.createElement("div");
    swatch.className = "atrium-auto-swatch script";
    swatch.innerHTML = `<ha-icon icon="${customIcon || ICONS.script}" style="--mdc-icon-size:15px"></ha-icon>`;
  } else {
    // Stock HA toggle: animated, and reflects enable/disable directly. Setting
    // `.checked` from the updater doesn't re-fire `change`, so no feedback loop.
    swatch = document.createElement("ha-switch");
    swatch.className = "atrium-auto-toggle";
    swatch.checked = enabled;
    swatch.setAttribute("aria-label", `Toggle ${this._entityName(item)}`);
    swatch.addEventListener("click", (e) => e.stopPropagation());
    swatch.addEventListener("change", (e) => {
      e.stopPropagation();
      this._call("automation", e.target.checked ? "turn_on" : "turn_off", { entity_id: item.entity_id });
    });
  }

  const body = document.createElement("button");
  body.className = "atrium-auto-body";
  if (!isScript) body.addEventListener("click", () => this._moreInfo(item.entity_id));
  const name = document.createElement("div");
  name.className = "atrium-auto-name" + (enabled ? "" : " disabled");
  if (!isScript && customIcon) {
    name.className += " has-icon";
    name.innerHTML = `<ha-icon icon="${customIcon}" style="--mdc-icon-size:13px"></ha-icon>`;
    name.appendChild(document.createTextNode(this._entityName(item)));
  } else {
    name.textContent = this._entityName(item);
  }
  const last = document.createElement("div");
  last.className = "atrium-auto-last";
  const labels = document.createElement("div");
  labels.className = "atrium-auto-labels";
  body.append(name, last, labels);

  const play = document.createElement("button");
  play.className = "atrium-auto-play" + (!enabled ? " disabled" : "");
  play.title = isScript ? "" : "Trigger automation";
  play.innerHTML = `<ha-icon icon="${isScript ? ICONS.play_circle : ICONS.play}" style="--mdc-icon-size:${isScript ? 16 : 13}px"></ha-icon>`;
  play.addEventListener("click", (e) => {
    if (isScript) return; // bubbles to the row, which opens the more-info dialog
    e.stopPropagation();
    const isOn = this._hass.states?.[item.entity_id]?.state !== "off";
    if (!isOn) return;
    this._call("automation", "trigger", { entity_id: item.entity_id });
  });

  row.append(swatch, body, play);

  const ref = { row, swatch, name, last, labels, play, isScript };
  this._refs.areas.get(area.area_id).automations.set(item.entity_id, ref);
  return row;
}

export function _buildHiddenRoutinesBtn(area, hiddenItems) {
  const rows = hiddenItems.map((item) => this._buildAutomationRow(area, item));

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "atrium-autos-trigger";
  const count = hiddenItems.length;
  btn.innerHTML =
    `<span class="atrium-autos-trigger-iconwrap"><ha-icon icon="mdi:eye-off-outline" style="--mdc-icon-size:20px"></ha-icon></span>` +
    `<span class="atrium-autos-trigger-label">${count} hidden</span>`;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    ensurePopoverItemStyle();
    const list = document.createElement("div");
    list.className = "atrium-pop-list-rooms";
    list.style.cssText = "border-radius:12px;overflow:hidden";
    for (const row of rows) list.appendChild(row);
    const wrap = document.createElement("div");
    wrap.appendChild(buildPopoverHeader("Hidden routines", String(count)));
    wrap.appendChild(list);
    this._openAnchors.add(btn);
    openPopover({
      anchor: btn,
      content: wrap,
      width: 320,
      onClose: () => this._openAnchors.delete(btn),
    });
  });

  return btn;
}
