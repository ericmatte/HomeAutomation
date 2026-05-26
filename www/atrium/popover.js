// Shared popover used by every dropdown / detail popup in the V2 dashboard
// (battery + problem badges, automations drawer, climate dropdowns).
//
// Behaviour:
//   - Default origin: below the anchor, left-edge aligned with the anchor —
//     i.e. the popover extends downward and to the right. Flips to right-edge
//     alignment when it doesn't fit horizontally; flips above when it doesn't
//     fit vertically.
//   - Animates on open AND close (opacity + slide).
//   - Re-clicking the same anchor while the popover is open closes it (toggle).
//     Opening a different popover closes the current one first — only one is
//     open at a time across the app.
//   - Dismisses on outside click/touch, Escape, scroll outside, or resize.
//   - Body-attached, so it escapes any parent overflow/transform clipping
//     (rooms have `overflow: hidden`).

const STYLE_ID = "atrium-popover-style";
const STYLE = `
.v2-pop {
  position: fixed; z-index: 9999;
  background: #1a1d23; color: #e8e9ec;
  border-radius: 12px; padding: 4px;
  box-shadow: 0 16px 38px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06);
  font-family: var(--primary-font-family, inherit);
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 140ms ease-out, transform 140ms ease-out;
  will-change: opacity, transform;
}
.v2-pop.flip-top { transform: translateY(4px); }
.v2-pop.open { opacity: 1; transform: translateY(0); }
.v2-pop-header {
  padding: 8px 12px 6px;
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
}
.v2-pop-title {
  font-size: 11px; color: #9aa0aa;
  letter-spacing: .6px; text-transform: uppercase; font-weight: 600;
}
.v2-pop-count { font-size: 10.5px; color: #9aa0aa; font-variant-numeric: tabular-nums; }
.v2-pop-list { max-height: 60vh; overflow-y: auto; border-radius: 10px; }
.v2-pop-empty {
  padding: 18px 12px; text-align: center; color: #9aa0aa; font-size: 12px;
}
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = STYLE;
  document.head.appendChild(el);
}

// Track open popovers keyed by anchor — lets the trigger toggle and the
// app close any sibling popover when opening a new one.
const _registry = new Map();

export function closeAllPopovers() {
  for (const close of [..._registry.values()]) close();
}

export function closePopoverFor(anchor) {
  const close = _registry.get(anchor);
  if (close) close();
}

export function isPopoverOpenFor(anchor) {
  return _registry.has(anchor);
}

// Open a popover anchored to `anchor`. Returns `{ close }` or `null` if the
// call toggled an existing open popover closed.
//
// Options:
//   anchor   — HTMLElement the popover is positioned against.
//   content  — HTMLElement appended inside the popover container.
//   width    — optional fixed width (number → px, string → as-is).
//   maxWidth — optional max width.
//   onClose  — callback fired after the close animation finishes.
export function openPopover({ anchor, content, width, maxWidth, onClose }) {
  ensureStyle();

  if (_registry.has(anchor)) {
    _registry.get(anchor)();
    return null;
  }
  closeAllPopovers();

  const pop = document.createElement("div");
  pop.className = "v2-pop";
  pop.setAttribute("role", "dialog");
  if (width != null) pop.style.width = typeof width === "number" ? `${width}px` : width;
  if (maxWidth != null) pop.style.maxWidth = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;
  pop.appendChild(content);

  // Append off-screen first so we can measure the popover before positioning.
  pop.style.left = "-9999px";
  pop.style.top = "0px";
  document.body.appendChild(pop);

  const place = () => {
    const aRect = anchor.getBoundingClientRect();
    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;
    const margin = 8;
    const gap = 6;

    // Horizontal: prefer left-edge alignment (popover extends right). Flip to
    // right-edge alignment if that overflows; finally clamp to the viewport.
    let left = aRect.left;
    if (left + popW > window.innerWidth - margin) left = aRect.right - popW;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - popW));

    // Vertical: prefer below; flip above only if "above" actually has room.
    let top = aRect.bottom + gap;
    let flipTop = false;
    if (top + popH > window.innerHeight - margin) {
      const above = aRect.top - popH - gap;
      if (above >= margin) {
        top = above;
        flipTop = true;
      } else {
        top = Math.max(margin, window.innerHeight - margin - popH);
      }
    }

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.classList.toggle("flip-top", flipTop);
  };
  place();

  let opened = false;
  requestAnimationFrame(() => {
    pop.classList.add("open");
    opened = true;
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("touchstart", onDown, true);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onResize);
    _registry.delete(anchor);
    anchor.classList?.remove?.("v2-pop-open");

    const finish = () => {
      pop.removeEventListener("transitionend", onEnd);
      if (pop.parentNode) pop.parentNode.removeChild(pop);
      if (onClose) onClose();
    };
    const onEnd = (e) => {
      if (e.target !== pop || e.propertyName !== "opacity") return;
      finish();
    };

    if (!opened) {
      finish();
      return;
    }
    pop.addEventListener("transitionend", onEnd);
    pop.classList.remove("open");
    // Safety net in case the browser drops the transitionend event.
    setTimeout(finish, 240);
  };

  const onDown = (e) => {
    if (pop.contains(e.target) || anchor.contains(e.target)) return;
    close();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const onScroll = (e) => { if (pop.contains(e.target)) return; close(); };
  const onResize = () => place();

  document.addEventListener("mousedown", onDown, true);
  document.addEventListener("touchstart", onDown, true);
  document.addEventListener("keydown", onKey);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);

  _registry.set(anchor, close);
  anchor.classList?.add?.("v2-pop-open");

  return { close };
}

export function buildPopoverHeader(title, count) {
  const h = document.createElement("div");
  h.className = "v2-pop-header";
  const t = document.createElement("span");
  t.className = "v2-pop-title";
  t.textContent = title;
  h.appendChild(t);
  if (count != null) {
    const c = document.createElement("span");
    c.className = "v2-pop-count";
    c.textContent = count;
    h.appendChild(c);
  }
  return h;
}

export function buildPopoverEmpty(text) {
  const e = document.createElement("div");
  e.className = "v2-pop-empty";
  e.textContent = text;
  return e;
}
