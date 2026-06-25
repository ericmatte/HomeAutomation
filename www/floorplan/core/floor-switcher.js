/**
 * Generic floor switcher for the picture-elements floorplan.
 *
 * Reads the hidden "floorplan-meta:<id>:<name>[:default]" marker that
 * core/generate.py embeds in every floor's picture-elements card, injects a
 * row of floor buttons, and shows one floor at a time. House-agnostic: it
 * adapts to however many floors the generated card contains.
 *
 * Declare this file in lovelace_resources (module). The deep query helpers are
 * reused from custom-lovelace/floorplan.js, which must load first.
 */

const MARKER_PREFIX = "floorplan-meta:";
let pollInterval;
let floorButtons = [];

const parseMarker = (title) => {
  const [, id, name, flag] = title.split(":");
  return { id, name, isDefault: flag === "default" };
};

const findFloorCards = () => {
  const cards = [...querySelectorAllDeep("hui-picture-elements-card")];
  return cards
    .map((card) => {
      const marker = card.___config?.elements?.find((el) =>
        el.title?.startsWith(MARKER_PREFIX)
      );
      return marker ? { card, meta: parseMarker(marker.title) } : null;
    })
    .filter(Boolean);
};

const showFloor = (floors, activeId) => {
  floors.forEach(({ card, meta }) => {
    card.style.display = meta.id === activeId ? "" : "none";
  });
  floorButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.floorId === activeId);
    button.style.fontWeight = button.dataset.floorId === activeId ? "700" : "400";
  });
};

const buildButtonBar = (floors, container) => {
  const bar = document.createElement("div");
  bar.className = "floorplan-switcher";
  bar.style.cssText =
    "display:flex;gap:8px;justify-content:center;margin:8px 0;flex-wrap:wrap;";

  floorButtons = floors.map(({ meta }) => {
    const button = document.createElement("button");
    button.textContent = meta.name;
    button.dataset.floorId = meta.id;
    button.style.cssText =
      "padding:6px 16px;border-radius:20px;border:none;cursor:pointer;" +
      "background:var(--card-background-color,#fff);color:var(--primary-text-color,#000);" +
      "box-shadow:var(--ha-card-box-shadow,0 1px 3px rgba(0,0,0,0.2));";
    button.addEventListener("click", () => showFloor(floors, meta.id));
    bar.appendChild(button);
    return button;
  });

  container.prepend(bar);
};

const setupSwitcher = () => {
  const floors = findFloorCards();
  if (floors.length < 2) return false; // nothing to switch yet

  const container = floors[0].card.parentElement;
  if (container.querySelector(".floorplan-switcher")) return true; // already wired

  buildButtonBar(floors, container);

  const active = floors.find((f) => f.meta.isDefault) || floors[0];
  showFloor(floors, active.meta.id);
  return true;
};

const start = () => {
  clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    if (setupSwitcher()) clearInterval(pollInterval);
  }, 100);
};

document.body.addEventListener("click", () => requestAnimationFrame(start));
window.addEventListener("resize", start);
start();
