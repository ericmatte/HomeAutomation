// Long-press threshold and the drag-start slop, shared by every pointer
// gesture (tiles, quick-buttons, floor dimmer) so they feel consistent.
export const LONG_PRESS_MS = 480;
export const DRAG_THRESHOLD_PX = 6;

export function el(tag, className, innerHTML) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (innerHTML != null) e.innerHTML = innerHTML;
  return e;
}

export function haIcon(icon, sizePx) {
  return sizePx
    ? `<ha-icon icon="${icon}" style="--mdc-icon-size:${sizePx}px"></ha-icon>`
    : `<ha-icon icon="${icon}"></ha-icon>`;
}

// A translucent tint of `color` over the background — the dashboard's one
// idiom for chip/pill/swatch fills.
export function tint(color, pct = 12) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

// Inject a <style> into document.head exactly once, keyed by id. Popover
// content is body-attached, so its rules can't live in a shadow root.
export function injectStyleOnce(id, css) {
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

// Open Home Assistant's more-info dialog for an entity.
export function fireMoreInfo(target, entityId) {
  target.dispatchEvent(
    new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    })
  );
}

export function vibrate(ms = 15) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
}

// Pointer x → 0-100% across an element's width.
export function pctFromPointerX(target, clientX) {
  const r = target.getBoundingClientRect();
  return Math.max(0, Math.min(100, Math.round(((clientX - r.left) / r.width) * 100)));
}

// Tap vs long-press on a button-like element (no drag). Long-press haptic-buzzes
// and fires `onLongPress`; a plain release fires `onTap`. Clicks are swallowed so
// the two handlers stay the only entry points. For swipe surfaces that also drag,
// see `_bindSwipeTile`.
export function bindLongPress(target, { onTap, onLongPress, ms = LONG_PRESS_MS }) {
  let timer = 0;
  let didLongPress = false;
  target.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    didLongPress = false;
    timer = setTimeout(() => {
      didLongPress = true;
      vibrate();
      onLongPress?.(e);
    }, ms);
  });
  target.addEventListener("pointerup", (e) => {
    e.stopPropagation();
    clearTimeout(timer);
    if (!didLongPress) onTap?.(e);
  });
  target.addEventListener("pointercancel", () => clearTimeout(timer));
  target.addEventListener("click", (e) => e.stopPropagation());
}
