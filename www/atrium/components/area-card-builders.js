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
} = sharedMod;

export function _buildRoomCard(area, data) {
  const expanded = this._expanded.has(area.area_id);
  // No accordion content → render header-only and skip the chevron / click
  // handler so the row reads as static info.
  const hasBody =
    data.lights.length > 0 ||
    data.climates.length > 0 ||
    data.vacuums.length > 0 ||
    data.sensors.extras.length > 0 ||
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
    climates: new Map(), vacuums: new Map(), automations: new Map(),
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
  if (hasBody) {
    row.addEventListener("click", () => this._toggleExpanded(area.area_id));
  }

  const icon = document.createElement("div");
  icon.className = "atrium-room-icon";
  icon.innerHTML = `<ha-icon icon="${iconForArea(area)}" style="--mdc-icon-size:28px"></ha-icon>`;

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
  bulbBtn.innerHTML = `<ha-icon icon="mdi:lightbulb" style="--mdc-icon-size:14px"></ha-icon><span class="count" style="font-size:12px;font-weight:600;display:none"></span>`;
  bulbBtn.addEventListener("click", (e) => { e.stopPropagation(); this._toggleAllLights(data.lights); });
  const bulbCountEl = bulbBtn.querySelector(".count");
  actions.appendChild(bulbBtn);
  const coverBtn = document.createElement("button");
  coverBtn.className = "atrium-quick-btn";
  coverBtn.style.display = data.covers.length ? "inline-flex" : "none";
  coverBtn.innerHTML = `<ha-icon icon="mdi:blinds-horizontal" style="--mdc-icon-size:14px"></ha-icon>`;
  coverBtn.addEventListener("click", (e) => { e.stopPropagation(); this._toggleAllCovers(data.covers); });
  actions.appendChild(coverBtn);
  if (hasBody) {
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
  if (data.climates.length) sections.push(this._buildClimateSection(area, data.climates, data.sensors));
  if (data.vacuums.length) sections.push(this._buildVacuumSection(area, data.vacuums));
  if (data.sensors.extras.length) sections.push(this._buildSensorsSection(area, data.sensors.extras));
  if (data.scenes.length) sections.push(this._buildScenesSection(area, data.scenes));
  const drawer = this._buildAutomationsDrawer(area, data.automations, data.scripts);
  if (drawer) sections.push(drawer);
  for (const s of sections) bodyInner.appendChild(s);

  body.appendChild(bodyInner);
  bodyWrap.appendChild(body);
  return { bodyWrap, body };
}

export function _section(title, children) {
  const wrap = document.createElement("div");
  const header = document.createElement("div");
  header.className = "atrium-section-header";
  const t = document.createElement("div");
  t.className = "atrium-section-title";
  t.textContent = title;
  header.appendChild(t);
  wrap.appendChild(header);
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
  swatch.title = "Open entity";
  swatch.innerHTML =
    `<ha-icon icon="${ICONS.bulb}" style="--mdc-icon-size:14px"></ha-icon>` +
    `<span class="atrium-unavail-dot">!</span>`;
  swatch.addEventListener("pointerdown", (e) => e.stopPropagation());
  swatch.addEventListener("pointerup", (e) => e.stopPropagation());
  swatch.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    this._moreInfo(light.entity_id);
  });
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

  const ref = { tile, fill, thumb, swatch, state, name };
  this._refs.areas.get(area.area_id).lights.set(light.entity_id, ref);
  return tile;
}

export function _buildClimateSection(area, climates, sensors) {
  const grid = document.createElement("div");
  grid.className = "atrium-grid " + (climates.length > 1 ? "cols-2" : "cols-1");
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
    `<ha-icon icon="${ICONS.thermo}" style="--mdc-icon-size:13px"></ha-icon>` +
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
  minus.innerHTML = `<ha-icon icon="${ICONS.minus}" style="--mdc-icon-size:14px"></ha-icon>`;
  minus.addEventListener("click", (e) => { e.stopPropagation(); this._adjustClimate(climate.entity_id, -0.5); });
  const temp = document.createElement("div");
  temp.className = "atrium-climate-temp";
  const plus = document.createElement("button");
  plus.className = "atrium-tiny-btn";
  plus.innerHTML = `<ha-icon icon="${ICONS.plus}" style="--mdc-icon-size:14px"></ha-icon>`;
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
  if (this._expanded.has(area.area_id)) this._wakeClimateGraph(ref);
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
  // Mirrors the climate tile shape: mini-graph as a faded background, only
  // an icon + name overlaid. Tap anywhere → more-info. Lazy graph mount so
  // collapsed rooms don't fetch history.
  const tile = document.createElement("div");
  tile.className = "atrium-sensor";
  tile.dataset.entity = sensor.entity_id;
  tile.addEventListener("click", () => this._moreInfo(sensor.entity_id));

  const bg = document.createElement("div");
  bg.className = "atrium-sensor-bg";
  tile.appendChild(bg);
  const makeGraph = () => {
    const g = this._tryCreateSensorMiniGraph(sensor.entity_id);
    if (g) bg.appendChild(g);
    return g;
  };

  const content = document.createElement("div");
  content.className = "atrium-sensor-content";
  const row = document.createElement("div");
  row.className = "atrium-sensor-row";
  const swatch = document.createElement("div");
  swatch.className = "atrium-swatch";
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
  const icon = st?.attributes?.icon || ICON_BY_DC[dc] || "mdi:gauge";
  swatch.innerHTML = `<ha-icon icon="${icon}" style="--mdc-icon-size:13px"></ha-icon>`;
  const name = document.createElement("div");
  name.className = "atrium-sensor-name";
  name.textContent = nameWithoutAreaPrefix(this._entityName(sensor), area);
  row.append(swatch, name);
  content.appendChild(row);
  tile.appendChild(content);

  const ref = { tile, graph: null, makeGraph };
  this._refs.areas.get(area.area_id).sensors.set(sensor.entity_id, ref);
  if (this._expanded.has(area.area_id)) this._wakeSensorGraph(ref);
  return tile;
}

export function _buildVacuumSection(area, vacuums) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:8px";
  for (const v of vacuums) wrap.appendChild(this._buildVacuumTile(area, v));
  return this._section("Vacuum", wrap);
}

export function _buildVacuumTile(area, vacuum) {
  const tile = document.createElement("div");
  tile.className = "atrium-vacuum";
  tile.dataset.entity = vacuum.entity_id;

  const row = document.createElement("div");
  row.className = "atrium-vacuum-row";
  const swatch = document.createElement("div");
  swatch.className = "atrium-swatch";
  swatch.style.width = "30px";
  swatch.style.height = "30px";
  swatch.innerHTML = `<ha-icon icon="${ICONS.vacuum}" style="--mdc-icon-size:16px"></ha-icon>`;
  swatch.addEventListener("click", () => this._moreInfo(vacuum.entity_id));
  const text = document.createElement("div");
  text.style.flex = "1";
  const name = document.createElement("div");
  name.style.cssText = `font-size:14px;font-weight:500;color:${TONE.text}`;
  name.textContent = nameWithoutAreaPrefix(this._entityName(vacuum), area);
  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11.5px;display:flex;align-items:center;gap:6px";
  text.append(name, sub);
  const batt = document.createElement("span");
  batt.style.cssText = "font-size:12px;font-weight:600;font-variant-numeric:tabular-nums";
  row.append(swatch, text, batt);
  tile.appendChild(row);

  const primary = document.createElement("button");
  primary.className = "atrium-vacuum-primary";
  tile.appendChild(primary);

  const cmds = document.createElement("div");
  cmds.className = "atrium-vacuum-cmd-row";
  const mkCmd = (icon, action, service) => {
    const b = document.createElement("button");
    b.className = "atrium-vacuum-cmd";
    b.dataset.action = action;
    b.innerHTML = `<ha-icon icon="${icon}" style="--mdc-icon-size:14px"></ha-icon>`;
    b.addEventListener("click", () => this._call("vacuum", service, { entity_id: vacuum.entity_id }));
    cmds.appendChild(b);
    return b;
  };
  const cStart = mkCmd(ICONS.play, "start", "start");
  const cPause = mkCmd(ICONS.pause, "pause", "pause");
  const cStop = mkCmd(ICONS.stop, "stop", "stop");
  const cLoc = mkCmd(ICONS.pin, "locate", "locate");
  const cDock = mkCmd(ICONS.dock, "return", "return_to_base");
  tile.appendChild(cmds);

  primary.addEventListener("click", () => {
    const st = this._hass.states?.[vacuum.entity_id];
    const isCleaning = st?.state === "cleaning" || st?.state === "returning";
    this._call("vacuum", isCleaning ? "pause" : "start", { entity_id: vacuum.entity_id });
  });

  const ref = { tile, swatch, name, sub, batt, primary, cmds: { start: cStart, pause: cPause, stop: cStop, loc: cLoc, dock: cDock } };
  this._refs.areas.get(area.area_id).vacuums.set(vacuum.entity_id, ref);
  return tile;
}

export function _buildScenesSection(area, scenes) {
  const wrap = document.createElement("div");
  wrap.className = "atrium-scenes";
  for (const s of scenes) {
    const btn = document.createElement("button");
    btn.className = "atrium-scene-btn";
    const sceneName = this._entityName(s);
    btn.title = sceneName;
    btn.innerHTML = `<ha-icon icon="${iconForScene(s, sceneName)}"></ha-icon><span class="atrium-scene-btn-name"></span>`;
    btn.querySelector(".atrium-scene-btn-name").textContent = nameWithoutAreaPrefix(sceneName, area);
    btn.addEventListener("click", () => this._call("scene", "turn_on", { entity_id: s.entity_id }));
    wrap.appendChild(btn);
  }
  const header = document.createElement("div");
  header.className = "atrium-section-header";
  const t = document.createElement("div");
  t.className = "atrium-section-title";
  t.textContent = "Scenes";
  const hint = document.createElement("div");
  hint.className = "atrium-section-hint";
  hint.textContent = `${scenes.length}`;
  header.append(t, hint);
  const section = document.createElement("div");
  section.appendChild(header);
  section.appendChild(wrap);
  return section;
}

export function _buildAutomationsDrawer(area, automations, scripts) {
  const items = [...automations, ...scripts];
  if (!items.length) return null;
  const total = items.length;
  const disabledCount = automations.filter((a) => this._hass.states?.[a.entity_id]?.state === "off").length;

  let titleBase;
  if (automations.length && scripts.length) titleBase = "Automations &amp; scripts";
  else if (scripts.length) titleBase = scripts.length > 1 ? "Scripts" : "Script";
  else titleBase = automations.length > 1 ? "Automations" : "Automation";
  const popTitleBase = titleBase.replace("&amp;", "&");
  const metaText = `· ${total}${disabledCount ? ` · ${disabledCount} off` : ""}`;
  const popTitle = `${popTitleBase} · ${total}${disabledCount ? ` (${disabledCount} off)` : ""}`;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "atrium-autos-trigger";
  trigger.innerHTML = `
    <span class="atrium-autos-trigger-iconwrap"><ha-icon icon="${ICONS.cogs}" style="--mdc-icon-size:12px"></ha-icon></span>
    <span class="atrium-autos-trigger-label">${titleBase}</span>
    <span class="atrium-autos-trigger-meta">${metaText}</span>
  `;
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    this._openAutomationsPopover(area, items, trigger, popTitle);
  });
  return trigger;
}

export function _openAutomationsPopover(area, items, anchor, title) {
  ensurePopoverItemStyle();

  const root = document.createElement("div");
  root.appendChild(buildPopoverHeader(title));
  const listEl = document.createElement("div");
  listEl.className = "atrium-pop-list atrium-pop-list-rooms";
  for (const item of items) listEl.appendChild(this._buildAutomationRow(area, item));
  root.appendChild(listEl);

  this._openAnchors.add(anchor);
  openPopover({
    anchor,
    content: root,
    width: Math.min(340, window.innerWidth - 24),
    onClose: () => {
      anchor.classList.remove("open");
      this._openAnchors.delete(anchor);
    },
  });
  anchor.classList?.add?.("open");
}

export function _buildAutomationRow(area, item) {
  const hass = this._hass;
  const state = hass.states?.[item.entity_id];
  const isScript = item.entity_id.startsWith("script.");
  const enabled = isScript ? true : state?.state !== "off";

  const row = document.createElement("div");
  row.className = "atrium-auto-row" + (!enabled ? " disabled" : "");
  row.dataset.entity = item.entity_id;

  let swatch;
  if (isScript) {
    swatch = document.createElement("div");
    swatch.className = "atrium-auto-swatch script";
    swatch.innerHTML = `<ha-icon icon="${ICONS.script}" style="--mdc-icon-size:15px"></ha-icon>`;
  } else {
    swatch = document.createElement("button");
    swatch.className = "atrium-auto-swatch";
    swatch.innerHTML = `<ha-icon icon="${ICONS.cogs}" style="--mdc-icon-size:15px"></ha-icon>` +
      `<svg class="slash" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:${enabled ? "none" : "block"}">
         <line x1="4" y1="20" x2="20" y2="4" stroke="${TONE.textMute}" stroke-width="1.8" stroke-linecap="round" />
       </svg>`;
    swatch.title = enabled ? "Disable automation" : "Enable automation";
    swatch.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOn = this._hass.states?.[item.entity_id]?.state !== "off";
      this._call("automation", isOn ? "turn_off" : "turn_on", { entity_id: item.entity_id });
    });
  }

  const body = document.createElement("button");
  body.className = "atrium-auto-body";
  body.addEventListener("click", () => this._moreInfo(item.entity_id));
  const name = document.createElement("div");
  name.className = "atrium-auto-name" + (enabled ? "" : " disabled");
  name.textContent = this._entityName(item);
  const last = document.createElement("div");
  last.className = "atrium-auto-last";
  const labels = document.createElement("div");
  labels.className = "atrium-auto-labels";
  body.append(name, last, labels);

  const play = document.createElement("button");
  play.className = "atrium-auto-play" + (!enabled ? " disabled" : "");
  play.title = isScript ? "Run script" : "Trigger automation";
  play.innerHTML = `<ha-icon icon="${isScript ? ICONS.play_circle : ICONS.play}" style="--mdc-icon-size:${isScript ? 16 : 13}px"></ha-icon>`;
  play.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isScript) {
      this._call("script", "turn_on", { entity_id: item.entity_id });
      return;
    }
    const isOn = this._hass.states?.[item.entity_id]?.state !== "off";
    if (!isOn) return;
    this._call("automation", "trigger", { entity_id: item.entity_id });
  });

  row.append(swatch, body, play);

  const ref = { row, swatch, name, last, labels, play, isScript };
  this._refs.areas.get(area.area_id).automations.set(item.entity_id, ref);
  return row;
}
