const _v = new URL(import.meta.url).search;
const [hassUtilsMod, sharedMod] = await Promise.all([
  import(`../lib/hass-utils.js${_v}`),
  import(`./area-card-shared.js${_v}`),
]);
const { unchangedState, unchangedStates } = hassUtilsMod;
const {
  TONE, ICONS,
  CLIMATE_ACCENT, CLIMATE_LABELS, CLIMATE_ICONS,
  capitalize,
  canDimLight, fmtBrightnessPct, fmtCoverPct, fmtSensorValue,
  iconForFanMode, iconForSwingMode,
  levelColor,
  labelDescriptor,
} = sharedMod;

export function _updateChips(ar) {
  const hass = this._hass;
  const data = ar.data;

  // The set of entity ids whose state can affect this card's chips is fixed
  // at build time; cache it on the area ref so unchangedStates can early-out
  // on identity equality when none of those states moved.
  if (!ar._chipIds) {
    const ids = [];
    for (const s of data.sensors.motion) ids.push(s.entity_id);
    if (data.sensors.temp) ids.push(data.sensors.temp.entity_id);
    if (data.sensors.humid) ids.push(data.sensors.humid.entity_id);
    for (const s of data.sensors.soil) ids.push(s.entity_id);
    for (const s of data.sensors.leak) ids.push(s.entity_id);
    for (const d of data.doors) ids.push(d.entity_id);
    for (const p of data.sensors.propane) ids.push(p.entity_id);
    ar._chipIds = ids;
  }
  if (unchangedStates(ar, "_chipStates", hass, ar._chipIds)) return;

  const activeMotion = data.sensors.motion.find((s) => hass.states?.[s.entity_id]?.state === "on") || data.sensors.motion[0];
  const motionOn = !!activeMotion && hass.states?.[activeMotion.entity_id]?.state === "on";
  ar.motionPill.style.display = motionOn ? "inline-flex" : "none";
  ar.motionPill.onclick = activeMotion
    ? (e) => { e.stopPropagation(); this._moreInfo(activeMotion.entity_id); }
    : null;

  const chips = ar.chips;
  chips.innerHTML = "";

  const addSpan = (icon, color, text, opts = {}) => {
    const span = document.createElement("span");
    span.className = "atrium-chip" + (opts.bg ? " has-bg" : "") + (opts.pulse ? " pulse" : "") + (opts.entityId ? " clickable" : "");
    if (opts.bg) span.style.background = opts.bg;
    span.style.color = color;
    span.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span>${text}</span>`;
    if (opts.entityId) {
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        this._moreInfo(opts.entityId);
      });
    }
    chips.appendChild(span);
  };

  if (data.sensors.temp) {
    const st = hass.states?.[data.sensors.temp.entity_id];
    if (st && st.state !== "unavailable") addSpan(ICONS.thermo, TONE.textDim, `${parseFloat(st.state).toFixed(1)}°`, { entityId: data.sensors.temp.entity_id });
  }
  if (data.sensors.humid) {
    const st = hass.states?.[data.sensors.humid.entity_id];
    if (st && st.state !== "unavailable") addSpan(ICONS.drop, TONE.textDim, `${Math.round(parseFloat(st.state))}%`, { entityId: data.sensors.humid.entity_id });
  }
  for (const s of data.sensors.soil) {
    const st = hass.states?.[s.entity_id];
    if (st && st.state !== "unavailable") addSpan(ICONS.plant, TONE.good, `${Math.round(parseFloat(st.state))}%`, { entityId: s.entity_id });
  }
  if (data.sensors.leak.length) {
    const leaky = data.sensors.leak.find((s) => hass.states?.[s.entity_id]?.state === "on");
    if (leaky) {
      addSpan(ICONS.leak, TONE.danger, "Leak!", { bg: "color-mix(in srgb, var(--error-color, #ff5252) 16%, transparent)", pulse: true, entityId: leaky.entity_id });
    } else {
      addSpan(ICONS.leak, TONE.textDim, "Dry", { entityId: data.sensors.leak[0].entity_id });
    }
  }
  for (const d of data.doors) {
    const isOpen = hass.states?.[d.entity_id]?.state === "on";
    const span = document.createElement("span");
    span.className = "atrium-chip clickable" + (isOpen ? " has-bg" : "");
    if (isOpen) span.style.background = "color-mix(in srgb, var(--state-climate-heat-color, #ff8a5b) 16%, transparent)";
    span.style.color = isOpen ? TONE.heat : TONE.textDim;
    span.title = this._entityName(d);
    span.innerHTML = `<ha-icon icon="${isOpen ? ICONS.door_open : ICONS.door_closed}"></ha-icon>`;
    span.addEventListener("click", (e) => {
      e.stopPropagation();
      this._moreInfo(d.entity_id);
    });
    chips.appendChild(span);
  }
  for (const p of data.sensors.propane) {
    const st = hass.states?.[p.entity_id];
    if (st && st.state !== "unavailable") {
      const pct = Math.round(parseFloat(st.state));
      const c = levelColor(pct);
      addSpan(ICONS.propane, c, `${pct}%`, { bg: `color-mix(in srgb, ${c} 12%, transparent)`, entityId: p.entity_id });
    }
  }
}

export function _updateQuickButtons(ar) {
  const hass = this._hass;
  const data = ar.data;
  const onCount = data.lights.filter((l) => hass.states?.[l.entity_id]?.state === "on").length;
  const openCount = data.covers.filter((c) => fmtCoverPct(hass.states?.[c.entity_id] || { attributes: {} }) > 5).length;
  ar.icon.classList.toggle("on", onCount > 0);
  ar.card.classList.toggle("lights-on", onCount > 0);
  ar.bulbBtn.classList.toggle("on-light", onCount > 0);
  if (ar.bulbCountEl) {
    ar.bulbCountEl.style.display = onCount > 0 ? "inline" : "none";
    ar.bulbCountEl.textContent = onCount;
  }
  ar.coverBtn.classList.toggle("on-cover", openCount > 0);
}

export function _updateLightRef(ref, entityId) {
  const hass = this._hass;
  const st = hass.states?.[entityId];
  if (!st) return;
  if (this._dragState.has(entityId)) return; // pointer event owns the visuals
  if (unchangedState(ref, "_lastState", st)) return;

  const icon = hass.entities?.[entityId]?.icon ?? st.attributes?.icon ?? ICONS.bulb;
  if (icon !== ref._icon) {
    ref._icon = icon;
    ref.iconEl.setAttribute("icon", icon);
  }
  const unavailable = st.state === "unavailable";
  ref.tile.classList.toggle("unavailable", unavailable);
  const on = st.state === "on";
  const canDim = canDimLight(st);
  const pct = fmtBrightnessPct(st);
  ref.tile.classList.toggle("no-dim", !canDim);
  ref.fill.style.width = on ? `${canDim ? pct : 100}%` : "0%";
  ref.thumb.style.left = `calc(${pct}% - 2px)`;
  ref.thumb.style.display = on && canDim ? "block" : "none";
  ref.thumb.style.opacity = "0.55";
  ref.swatch.classList.toggle("on-light", on && !unavailable);
  ref.state.classList.toggle("on-light", on && !unavailable);
  ref.state.textContent = unavailable ? "Unavailable" : on ? (canDim ? `${pct}%` : "On") : "Off";

  // True color modes get the bulb's live rgb_color; white-temperature modes
  // fall back to the default yellow tint via the CSS var defaults.
  const cm = st.attributes?.color_mode;
  const rgb = st.attributes?.rgb_color;
  const colorModes = ["rgb", "hs", "xy", "rgbw", "rgbww"];
  const isColorMode = on && !unavailable && cm && colorModes.includes(cm) && Array.isArray(rgb) && rgb.length >= 3;
  if (isColorMode) {
    const [r, g, b] = rgb;
    ref.tile.style.setProperty("--tile-accent", `rgb(${r},${g},${b})`);
    ref.tile.style.setProperty("--tile-swatch-bg", `rgba(${r},${g},${b},0.20)`);
    ref.tile.style.setProperty("--tile-fill", `linear-gradient(90deg, rgba(${r},${g},${b},0.24) 0%, rgba(${r},${g},${b},0.34) 100%)`);
    ref.tile.style.setProperty("--tile-fill-pressed", `linear-gradient(90deg, rgba(${r},${g},${b},0.40) 0%, rgba(${r},${g},${b},0.52) 100%)`);
  } else {
    ref.tile.style.removeProperty("--tile-accent");
    ref.tile.style.removeProperty("--tile-swatch-bg");
    ref.tile.style.removeProperty("--tile-fill");
    ref.tile.style.removeProperty("--tile-fill-pressed");
  }
}

export function _updateSensorRef(ref, entityId) {
  if (!ref.value) return;
  ref.value.textContent = fmtSensorValue(this._hass.states?.[entityId]);
}

export function _wakeClimateGraph(ref) {
  if (ref.graph || !ref.makeGraph) return;
  ref.graph = ref.makeGraph();
  if (ref.graph) ref.graph.hass = this._hass;
}

// Only push hass to the mini-graph while the card is expanded — a collapsed
// card hides the bg layer behind `grid-template-rows: 0fr`. Own identity
// slots so the caller's ordering doesn't matter.
export function _syncClimateGraph(ref, st, isExpanded) {
  if (!isExpanded || !ref.graph) return;
  const tempSt = ref.tempId ? this._hass.states?.[ref.tempId] : null;
  const stSame = unchangedState(ref, "_graphClimateSt", st);
  const tempSame = unchangedState(ref, "_graphTempSt", tempSt);
  if (stSame && tempSame) return;
  ref.graph.hass = this._hass;
}

export function _updateClimateRef(ref, entityId, isExpanded) {
  const st = this._hass.states?.[entityId];
  if (!st) return;
  this._syncClimateGraph(ref, st, isExpanded);
  if (unchangedState(ref, "_lastState", st)) return;
  const mode = st.state;
  const attrs = st.attributes || {};
  const accent = CLIMATE_ACCENT[mode] || TONE.cool;

  ref.swatch.style.background = `color-mix(in srgb, ${accent} 14%, transparent)`;
  ref.swatch.style.color = accent;
  ref.swatch.innerHTML =
    `<ha-icon icon="${CLIMATE_ICONS[mode] || ICONS.thermo}" style="--mdc-icon-size:13px"></ha-icon>` +
    `<span class="atrium-swatch-caret"><ha-icon icon="mdi:menu-down"></ha-icon></span>`;
  ref.tile.style.opacity = mode === "off" ? "0.85" : "1";

  const cur = attrs.current_temperature;
  const tgt = attrs.temperature;
  const hum = attrs.current_humidity;
  // Idle "heat" mode reads as urgent if we color it like an active heat
  // call — keep it gray until the unit is actually heating.
  const labelColor = mode === "heat" && attrs.hvac_action !== "heating"
    ? TONE.textDim
    : accent;
  const subLabel = `${(CLIMATE_LABELS[mode] || mode.replace("_", " "))}${cur != null ? ` · ${cur}°` : ""}`;
  ref.sub.innerHTML = `<span style="color:${labelColor}">${subLabel}</span>` +
    (hum != null
      ? `<span style="color:${TONE.textDim};display:inline-flex;align-items:center;gap:3px;text-transform:none"><ha-icon icon="${ICONS.drop}" style="--mdc-icon-size:10px"></ha-icon>${Math.round(hum)}%</span>`
      : "");

  if (tgt != null && mode !== "off" && mode !== "fan_only") {
    ref.temp.textContent = `${(+tgt).toFixed(1)}°`;
  } else {
    ref.temp.textContent = mode === "off" ? "Off" : "—";
  }

  this._wireClimateDropdowns(ref, entityId, attrs, mode);
  this._updateClimate24hRange(ref, cur);
}

export function _wireClimateDropdowns(ref, entityId, attrs, mode) {
  const hvacModes = Array.isArray(attrs.hvac_modes) ? attrs.hvac_modes : [];
  const fanModes = Array.isArray(attrs.fan_modes) ? attrs.fan_modes : [];
  const swingModes = Array.isArray(attrs.swing_modes) ? attrs.swing_modes : [];
  const isMultiMode = hvacModes.length > 1;

  ref.swatch.dataset.menu = isMultiMode ? "mode" : "";
  ref.swatch.classList.toggle("has-dropdown", isMultiMode);
  if (isMultiMode) {
    ref.modeMenu.setItems(
      hvacModes.map((m) => ({ id: m, label: CLIMATE_LABELS[m] || m, icon: CLIMATE_ICONS[m] })),
      mode,
      (id) => this._call("climate", "set_hvac_mode", { entity_id: entityId, hvac_mode: id }),
    );
  }

  const showFan = fanModes.length > 1 && mode !== "off";
  const showSwing = swingModes.length > 1 && mode !== "off";
  if (showFan) {
    ref.fanMenu.el.style.display = "";
    ref.fanMenu.setItems(
      fanModes.map((f) => ({ id: f, label: capitalize(f.replace(/_/g, " ")), icon: iconForFanMode(f) })),
      attrs.fan_mode,
      (id) => this._call("climate", "set_fan_mode", { entity_id: entityId, fan_mode: id }),
    );
  } else {
    ref.fanMenu.el.style.display = "none";
  }
  if (showSwing) {
    ref.swingMenu.el.style.display = "";
    ref.swingMenu.setItems(
      swingModes.map((s) => ({ id: s, label: capitalize(s.replace(/_/g, " ")), icon: iconForSwingMode(s) })),
      attrs.swing_mode,
      (id) => this._call("climate", "set_swing_mode", { entity_id: entityId, swing_mode: id }),
    );
  } else {
    ref.swingMenu.el.style.display = "none";
  }
  ref.extras.style.display = (showFan || showSwing) ? "flex" : "none";
}

// Best-effort 24h min/max from the mini-graph — `graph.bound` isn't a stable
// API, so we fall back gracefully if it disappears.
export function _updateClimate24hRange(ref, cur) {
  if (!ref.metaRange) return;
  try {
    const bounds = ref.graph?.bound;
    if (Array.isArray(bounds) && bounds.length === 2 && isFinite(bounds[0]) && isFinite(bounds[1])) {
      ref.metaRange.textContent = `${(+bounds[0]).toFixed(1)}° · ${(+bounds[1]).toFixed(1)}°`;
    } else if (cur != null) {
      ref.metaRange.textContent = "";
    }
  } catch (_) {
    ref.metaRange.textContent = "";
  }
}

export function _updateVacuumRef(ref, entityId) {
  const st = this._hass.states?.[entityId];
  if (!st) return;
  if (unchangedState(ref, "_lastState", st)) return;
  const VACUUM_STATUS = {
    docked:    { label: "Docked",    color: TONE.textDim, primary: "Start cleaning", primaryIcon: ICONS.play, primaryService: "start" },
    cleaning:  { label: "Cleaning",  color: TONE.good,    primary: "Pause",          primaryIcon: ICONS.pause, primaryService: "pause" },
    paused:    { label: "Paused",    color: TONE.light,   primary: "Resume",         primaryIcon: ICONS.play, primaryService: "start" },
    returning: { label: "Returning", color: TONE.cool,    primary: "Pause",          primaryIcon: ICONS.pause, primaryService: "pause" },
    error:     { label: "Error",     color: TONE.danger,  primary: "Retry",          primaryIcon: ICONS.play, primaryService: "start" },
    idle:      { label: "Idle",      color: TONE.textDim, primary: "Start cleaning", primaryIcon: ICONS.play, primaryService: "start" },
  };
  const status = VACUUM_STATUS[st.state] || VACUUM_STATUS.idle;
  ref.swatch.style.background = (st.state === "cleaning" || st.state === "returning")
    ? "color-mix(in srgb, var(--state-climate-cool-color, #5cc6ff) 18%, transparent)"
    : `color-mix(in srgb, var(--primary-text-color, #e8e9ec) 5%, transparent)`;
  ref.swatch.style.color = (st.state === "cleaning" || st.state === "returning") ? TONE.cool : TONE.textDim;
  ref.sub.style.color = status.color;
  ref.sub.textContent = status.label;
  const battery = st.attributes?.battery_level;
  if (battery != null) {
    const c = battery <= 20 ? TONE.danger : battery <= 50 ? TONE.light : TONE.good;
    ref.batt.style.color = c;
    ref.batt.textContent = `${battery}%`;
  } else {
    ref.batt.textContent = "";
  }
  for (const [k, b] of Object.entries(ref.cmds)) {
    const isActive =
      (k === "start" && st.state === "cleaning") ||
      (k === "pause" && st.state === "paused") ||
      (k === "dock" && st.state === "returning");
    b.classList.toggle("active", isActive);
  }
}

export function _updateAutomationRef(ref, entityId) {
  const hass = this._hass;
  const st = hass.states?.[entityId];
  if (!st) return;
  if (unchangedState(ref, "_lastState", st)) return;
  const enabled = ref.isScript ? true : st.state !== "off";
  ref.row.classList.toggle("disabled", !enabled);
  ref.name.classList.toggle("disabled", !enabled);
  if (!ref.isScript && "checked" in ref.swatch) {
    ref.swatch.checked = enabled;
  }
  const lastTs = st.attributes?.last_triggered;
  ref.last.textContent = lastTs ? `Last triggered: ${this._fmtTimeAgo(lastTs)}` : "Never triggered";
  ref.labels.innerHTML = "";
  const ent = hass.entities[entityId];
  const labelIds = ent?.labels || [];
  for (const lid of labelIds) {
    const desc = labelDescriptor(hass, lid);
    if (!desc) continue;
    const chip = document.createElement("span");
    chip.className = "atrium-auto-label";
    chip.style.background = desc.bg;
    chip.style.color = desc.color;
    chip.innerHTML = `<ha-icon icon="${desc.icon}" style="--mdc-icon-size:9px"></ha-icon>${desc.name}`;
    ref.labels.appendChild(chip);
  }
  ref.play.classList.toggle("disabled", !enabled);
}

export function _bindSwipeTile(tile, fill, thumb, swatch, stateEl, entityId, kind) {
  const ref = {
    startX: 0, startY: 0, dragging: false, moved: false, longPress: false, lpTimer: 0,
    pointerId: null, onMove: null, onUp: null, onCancel: null,
  };
  const detach = () => {
    if (ref.onMove) window.removeEventListener("pointermove", ref.onMove);
    if (ref.onUp) window.removeEventListener("pointerup", ref.onUp);
    if (ref.onCancel) window.removeEventListener("pointercancel", ref.onCancel);
    ref.onMove = ref.onUp = ref.onCancel = null;
    if (ref.pointerId !== null) {
      try { tile.releasePointerCapture(ref.pointerId); } catch (_) {}
    }
    ref.pointerId = null;
  };
  const resetVisuals = () => {
    fill.style.transition = "";
    thumb.style.transition = "";
  };

  tile.addEventListener("pointerdown", (e) => {
    if (tile.classList.contains("unavailable")) return;
    if (ref.pointerId !== null) return;
    ref.startX = e.clientX;
    ref.startY = e.clientY;
    ref.dragging = false;
    ref.moved = false;
    ref.longPress = false;
    ref.pointerId = e.pointerId;
    try { tile.setPointerCapture(e.pointerId); } catch (_) {}
    tile.classList.add("pressed");
    ref.lpTimer = setTimeout(() => {
      ref.longPress = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
      this._moreInfo(entityId);
    }, 480);

    ref.onMove = (ev) => {
      if (ev.pointerId !== ref.pointerId) return;
      const dx = ev.clientX - ref.startX;
      const dy = ev.clientY - ref.startY;
      if (!ref.dragging && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        clearTimeout(ref.lpTimer);
        ref.moved = true;
        const st = this._hass.states?.[entityId];
        if (kind === "light" && !canDimLight(st)) return;
        ref.dragging = true;
      }
      if (ref.dragging) {
        const r = tile.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, Math.round(((ev.clientX - r.left) / r.width) * 100)));
        this._dragState.set(entityId, { pct, kind });
        // Disable easing on both fill and thumb so they track the pointer
        // together during the live preview.
        fill.style.transition = "none";
        fill.style.width = `${pct}%`;
        thumb.style.transition = "none";
        thumb.style.display = "block";
        thumb.style.left = `calc(${pct}% - 2px)`;
        thumb.style.opacity = "1";
        stateEl.textContent = `${pct}%`;
        stateEl.classList.add(kind === "light" ? "on-light" : "on-cover");
      }
    };

    ref.onUp = (ev) => {
      if (ev.pointerId !== ref.pointerId) return;
      clearTimeout(ref.lpTimer);
      const drag = this._dragState.get(entityId);
      this._dragState.delete(entityId);
      const wasDragging = ref.dragging;
      const wasMoved = ref.moved;
      const wasLongPress = ref.longPress;
      detach();
      tile.classList.remove("pressed");
      ref.startX = 0;
      ref.dragging = false;
      ref.moved = false;
      resetVisuals();
      if (wasDragging && drag) {
        if (kind === "light") {
          if (drag.pct <= 0) this._call("light", "turn_off", { entity_id: entityId });
          else this._call("light", "turn_on", { entity_id: entityId, brightness_pct: drag.pct });
        } else {
          if (drag.pct <= 0) this._call("cover", "close_cover", { entity_id: entityId });
          else if (drag.pct >= 100) this._call("cover", "open_cover", { entity_id: entityId });
          else this._call("cover", "set_cover_position", { entity_id: entityId, position: drag.pct });
        }
      } else if (!wasLongPress && !wasMoved) {
        // Pointer capture guarantees this down/up sequence belongs to this
        // tile, so toggle without consulting ev.target (unreliable under
        // capture / shadow DOM).
        if (kind === "light") {
          const st = this._hass.states?.[entityId];
          if (st?.state === "on") this._call("light", "turn_off", { entity_id: entityId });
          else if (canDimLight(st)) this._call("light", "turn_on", { entity_id: entityId, brightness_pct: 100 });
          else this._call("light", "turn_on", { entity_id: entityId });
        } else {
          const pct = fmtCoverPct(this._hass.states?.[entityId] || { attributes: {} });
          this._call("cover", pct > 5 ? "close_cover" : "open_cover", { entity_id: entityId });
        }
      }
    };

    ref.onCancel = (ev) => {
      if (ev.pointerId !== ref.pointerId) return;
      clearTimeout(ref.lpTimer);
      this._dragState.delete(entityId);
      detach();
      tile.classList.remove("pressed");
      ref.startX = 0;
      ref.dragging = false;
      ref.moved = false;
      resetVisuals();
    };

    window.addEventListener("pointermove", ref.onMove);
    window.addEventListener("pointerup", ref.onUp);
    window.addEventListener("pointercancel", ref.onCancel);
  });
}
