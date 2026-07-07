const _v = new URL(import.meta.url).search;
const [hassUtilsMod, domUtilsMod, haActionsMod, shellMod, accordionMod] = await Promise.all([
  import(`../lib/hass-utils.js${_v}`),
  import(`../lib/dom-utils.js${_v}`),
  import(`../lib/ha-actions.js${_v}`),
  import(`../lib/shell.js${_v}`),
  import(`../lib/floor-accordion.js${_v}`),
]);
const { sameRegistries, areaIdForEntity } = hassUtilsMod;
const { tint, pctFromPointerX, DRAG_THRESHOLD_PX } = domUtilsMod;
const { toggleLights, setLightsBrightness } = haActionsMod;
const { SHELL_TONE, SHELL_STYLE } = shellMod;
const { floorAccordion } = accordionMod;

// After a drag, hold the slider at the requested value for a moment so it
// doesn't snap back to the (lagging) hass average while the bulbs ramp; release
// early once the live average lands within tolerance.
const OPTIMISTIC_HOLD_MS = 1500;
const OPTIMISTIC_TOLERANCE_PCT = 5;

class AtriumFloorLabel extends HTMLElement {
  constructor() {
    super();
    this._dragging = false;
    this._dragPct = null;
  }

  setConfig(config) {
    if (config.floor === undefined) throw new Error("floor is required");
    this._name = config.name || "";
    this._icon = typeof config.icon === "string" ? config.icon : null;
    // `floor: null` targets areas not assigned to any floor.
    this.floorId = config.floor === null ? null : config.floor;
    this._showControls = config.show_controls !== false;
    // Single-floor dashboards pass collapsible:false → no chevron/toggle.
    this._collapsible = config.collapsible !== false;
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.padding = "0 16px";
    // Sticky on the host (not the inner `.atrium-shell-floor-label`, which is too
    // shallow to scroll inside). z-index stays below the atrium-shell-header (2)
    // so we slide under it cleanly.
    this.style.position = "sticky";
    this.style.top =
      "calc(var(--header-height, 0px) + var(--atrium-shell-header-height, 0px))";
    this.style.zIndex = "1";
    if (this._collapsible) {
      this._unsub = floorAccordion.subscribe(() => this._reflectOpen());
      if (this._mounted) this._reflectOpen();
    }
  }

  disconnectedCallback() {
    this._unsub?.();
    this._unsub = null;
  }

  set hass(hass) {
    this._hass = hass;
    // Release the optimistic lock once the live hass average is within 5%
    // of the user-requested value, or the timeout expires — avoids the
    // slider bouncing while lights ramp.
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
          if (Math.abs(avg - this._optimisticPct) <= OPTIMISTIC_TOLERANCE_PCT) {
            this._optimisticPct = null;
            this._optimisticUntil = 0;
          }
        }
      }
    }
    this._render();
  }

  floorLights() {
    const hass = this._hass;
    if (!hass) return [];
    if (sameRegistries(this, "_lightsReg", hass, this.floorId) && this._lightsCache) {
      return this._lightsCache;
    }
    const out = [];
    for (const ent of Object.values(hass.entities)) {
      if (!ent.entity_id?.startsWith("light.")) continue;
      if (ent.hidden) continue;
      const areaId = areaIdForEntity(hass, ent);
      if (!areaId) continue;
      const area = hass.areas?.[areaId];
      if (!area || (area.floor_id ?? null) !== this.floorId) continue;
      out.push(ent.entity_id);
    }
    this._lightsCache = out;
    return out;
  }

  _mount() {
    if (this._mounted) return;
    this.innerHTML = `
      <style>${SHELL_STYLE}</style>
      <div class="atrium-shell-floor-label"${this._collapsible ? ` role="button" tabindex="0" aria-expanded="false"` : ""}>
        ${this._icon ? `<ha-icon class="atrium-shell-fl-icon" icon="${this._icon}"></ha-icon>` : ""}
        <span class="atrium-shell-fl-name"></span>
        ${this._collapsible ? `<ha-icon class="atrium-shell-fl-chev" icon="mdi:chevron-down"></ha-icon>` : ""}
        <div class="atrium-shell-fl-line"></div>
        ${this._showControls ? `
        <div class="atrium-shell-fl-controls">
          <span class="atrium-shell-fl-count"></span>
          <div class="atrium-shell-fl-dimmer" role="slider"
               aria-label="Floor brightness" aria-valuemin="0" aria-valuemax="100">
            <div class="atrium-shell-fl-dimmer-track"></div>
            <div class="atrium-shell-fl-dimmer-fill"></div>
            <div class="atrium-shell-fl-dimmer-thumb"></div>
          </div>
          <button class="atrium-shell-fl-bulb" type="button" aria-label="Toggle all floor lights">
            <ha-icon icon="mdi:lightbulb"></ha-icon>
          </button>
        </div>
        ` : ""}
      </div>
    `;
    this._nameEl = this.querySelector(".atrium-shell-fl-name");
    this._lineEl = this.querySelector(".atrium-shell-fl-line");
    this._labelEl = this.querySelector(".atrium-shell-floor-label");
    this._nameEl.textContent = this._name;

    // The whole label row toggles the floor; the light controls keep their
    // own actions by not letting their clicks bubble up to the row.
    if (this._collapsible) {
      this._labelEl.addEventListener("click", () => this._toggleOpen());
      this._labelEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._toggleOpen();
        }
      });
    }

    if (this._showControls) {
      this._controlsEl = this.querySelector(".atrium-shell-fl-controls");
      this._countEl = this.querySelector(".atrium-shell-fl-count");
      this._dimmerEl = this.querySelector(".atrium-shell-fl-dimmer");
      this._fillEl = this.querySelector(".atrium-shell-fl-dimmer-fill");
      this._thumbEl = this.querySelector(".atrium-shell-fl-dimmer-thumb");
      this._btnEl = this.querySelector(".atrium-shell-fl-bulb");
      this._controlsEl.addEventListener("click", (e) => e.stopPropagation());
      this._bindPointer();
      this._btnEl.addEventListener("click", () => this._toggleAll());
    }
    this._mounted = true;
    this._reflectOpen();
  }

  _toggleOpen() {
    floorAccordion.toggle(this.floorId);
  }

  _reflectOpen() {
    if (!this._labelEl || !this._collapsible) return;
    const open = floorAccordion.isOpen(this.floorId);
    this._labelEl.classList.toggle("is-open", open);
    this._labelEl.setAttribute("aria-expanded", open ? "true" : "false");
  }

  _computeVisibleState(lightIds) {
    let onCount = 0;
    let brightnessSum = 0;
    for (const id of lightIds) {
      const s = this._hass.states[id];
      if (!s) continue;
      if (s.state === "on") {
        onCount += 1;
        brightnessSum += s.attributes?.brightness || 0;
      }
    }
    const totalCount = lightIds.length;
    const avgBright = onCount > 0 ? Math.round(brightnessSum / onCount / 2.55) : 50;
    const optimistic = this._optimisticPct;
    const optimisticActive =
      optimistic != null && Date.now() < (this._optimisticUntil || 0);
    const isOn = onCount > 0 || this._dragging || optimisticActive;
    const pct =
      this._dragPct ??
      (optimisticActive ? optimistic : isOn ? avgBright : 0);
    return { onCount, totalCount, isOn, pct };
  }

  _render() {
    this._mount();

    const lightIds = this.floorLights();
    const hasLights = lightIds.length > 0;

    if (!this._showControls) return;

    this._controlsEl.style.display = hasLights ? "" : "none";
    if (!hasLights) return;

    const { onCount, totalCount, isOn, pct } = this._computeVisibleState(lightIds);

    const sig = `${onCount}/${totalCount}|${isOn ? 1 : 0}|${pct}|${this._dragging ? 1 : 0}`;
    if (sig === this._lastRenderSig) return;
    this._lastRenderSig = sig;

    this._countEl.textContent = `${onCount}/${totalCount}`;

    const accent = SHELL_TONE.light;
    this._fillEl.style.width = isOn ? `${pct}%` : "0%";
    this._fillEl.style.background = isOn ? accent : "transparent";
    this._fillEl.style.transition = this._dragging
      ? "none"
      : "width .2s ease, background .2s ease";
    this._thumbEl.style.left = `calc(${pct}% - 7px)`;
    // Mix with the page bg (not transparent) so the slider track behind the
    // thumb stays hidden when the floor is off.
    this._thumbEl.style.background = isOn
      ? accent
      : `color-mix(in srgb, var(--primary-text-color, #e8e9ec) 28%, var(--primary-background-color, #0e0f12))`;
    this._thumbEl.style.transition = this._dragging
      ? "none"
      : "left .2s ease, background .2s ease";

    this._btnEl.style.background = isOn ? tint(SHELL_TONE.light, 16) : tint(SHELL_TONE.text, 5);
    this._btnEl.style.color = isOn ? accent : SHELL_TONE.textMute;
  }

  _bindPointer() {
    const target = this._dimmerEl;
    let startX = 0;
    let pointerDown = false;
    let dragStarted = false;
    let activePointerId = null;

    const pctFromEvent = (e) => pctFromPointerX(target, e.clientX);

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
          this._optimisticPct = finalPct;
          this._optimisticUntil = Date.now() + OPTIMISTIC_HOLD_MS;
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
      if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD_PX && !dragStarted) return;
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
    // If the browser drops capture (context menu, scroll takeover) treat
    // it as a cancel so the slider doesn't get stuck in dragging mode.
    target.addEventListener("lostpointercapture", (e) => {
      if (e.pointerId !== activePointerId) return;
      endDrag(e, false);
    });
  }

  _toggleAll() {
    if (!this._hass) return;
    const ids = this.floorLights();
    if (ids.length === 0) return;
    toggleLights(this._hass, ids);
  }

  _applyBrightness(pct) {
    if (!this._hass) return;
    const ids = this.floorLights();
    if (ids.length === 0) return;
    setLightsBrightness(this._hass, ids, pct);
  }

  getCardSize() {
    return 1;
  }
}
customElements.define("atrium-floor-label", AtriumFloorLabel);
