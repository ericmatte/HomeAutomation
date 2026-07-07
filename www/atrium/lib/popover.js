// Body-attached popover so it escapes parent overflow/transform clipping
// (rooms have `overflow: hidden`). Only one popover open at a time across
// the app.

const STYLE_ID = "atrium-popover-style";

const _v = new URL(import.meta.url).search;
const STYLE = await fetch(new URL(`./popover.css${_v}`, import.meta.url)).then((r) => r.text());

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = STYLE;
  document.head.appendChild(el);
}

const _registry = new Map();

export function closeAllPopovers() {
  for (const close of [..._registry.values()]) close();
}

export function closePopoverFor(anchor) {
  const close = _registry.get(anchor);
  if (close) close();
}

export function openPopover({ anchor, content, width, maxWidth, onClose }) {
  ensureStyle();

  if (_registry.has(anchor)) {
    _registry.get(anchor)();
    return null;
  }
  closeAllPopovers();

  const pop = document.createElement("div");
  pop.className = "atrium-pop";
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

    let left = aRect.left;
    if (left + popW > window.innerWidth - margin) left = aRect.right - popW;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - popW));

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
    anchor.classList?.remove?.("atrium-pop-open");

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
    // The popover lives on document.body but anchors live inside nested shadow
    // roots (hui-card, …). Across a shadow boundary `e.target` is retargeted to
    // the host, so `anchor.contains(e.target)` is false even when the click IS
    // on the anchor — which used to close-then-reopen on a repeat anchor click.
    // composedPath() pierces the shadow boundaries and reports the true path.
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    if (path.includes(pop) || path.includes(anchor)) return;
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
  anchor.classList?.add?.("atrium-pop-open");

  return { close };
}

export function buildPopoverHeader(title, count) {
  const h = document.createElement("div");
  h.className = "atrium-pop-header";
  const t = document.createElement("span");
  t.className = "atrium-pop-title";
  t.textContent = title;
  h.appendChild(t);
  if (count != null) {
    const c = document.createElement("span");
    c.className = "atrium-pop-count";
    c.textContent = count;
    h.appendChild(c);
  }
  return h;
}

export function buildPopoverEmpty(text) {
  const e = document.createElement("div");
  e.className = "atrium-pop-empty";
  e.textContent = text;
  return e;
}

// Header + optional extra content + a list of items (or an empty placeholder).
// Callers inject their own item stylesheet and track the anchor via `onClose`.
export function openListPopover({
  anchor, title, countLabel, items, buildItem,
  emptyText, extraContent, listClass = "atrium-pop-list", listStyle, width, onClose,
}) {
  const root = document.createElement("div");
  root.appendChild(buildPopoverHeader(title, countLabel));
  if (extraContent) root.appendChild(extraContent);

  const list = document.createElement("div");
  list.className = listClass;
  if (listStyle) list.style.cssText = listStyle;
  if (!items.length && emptyText != null) {
    list.appendChild(buildPopoverEmpty(emptyText));
  } else {
    for (const item of items) list.appendChild(buildItem(item));
  }
  root.appendChild(list);

  return openPopover({ anchor, content: root, width, onClose });
}
