// Run: node --test www/atrium/components/area-card-updaters.test.js
//
// area-card-shared.js fetches CSS at module scope; stub `fetch` before
// importing so the module graph can load under plain Node (no bundler/DOM).
import test from "node:test";
import assert from "node:assert/strict";

globalThis.fetch = async () => ({ text: async () => "" });

const { _bindSwipeTile } = await import("./area-card-updaters.js");

// Minimal fakes for the DOM surface _bindSwipeTile touches. Pointer event
// listeners are captured directly so tests can invoke them without a real
// PointerEvent/EventTarget stack.
function makeTile() {
  const handlers = {};
  return {
    handlers,
    classList: { contains: () => false, add() {}, remove() {} },
    addEventListener(type, fn) { handlers[type] = fn; },
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, width: 100 }),
  };
}

function makeStyleEl() {
  return { style: {}, classList: { add() {}, remove() {} }, textContent: "" };
}

function makeWindow() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, fn) { listeners[type] = fn; },
    removeEventListener(type, fn) { if (listeners[type] === fn) delete listeners[type]; },
  };
}

function makeContext(states) {
  const calls = [];
  return {
    _hass: { states },
    _dragState: new Map(),
    _call: (...args) => calls.push(args),
    _moreInfo: () => {},
    calls,
  };
}

function pressAndDrift(tile, win, { dx = 10, dy = 0 } = {}) {
  tile.handlers.pointerdown({ clientX: 0, clientY: 0, pointerId: 1 });
  win.listeners.pointermove({ clientX: dx, clientY: dy, pointerId: 1 });
}

test("switch tile: a small horizontal drift still toggles on release (no dead swipe)", () => {
  const origWindow = globalThis.window;
  globalThis.window = makeWindow();
  try {
    const tile = makeTile();
    const fill = makeStyleEl();
    const thumb = makeStyleEl();
    const stateEl = makeStyleEl();
    const entityId = "switch.fan";
    const ctx = makeContext({ [entityId]: { state: "off", attributes: {} } });

    _bindSwipeTile.call(ctx, tile, fill, thumb, /* swatch */ {}, stateEl, entityId, "switch");

    pressAndDrift(tile, globalThis.window, { dx: 10 });
    globalThis.window.listeners.pointerup({ clientX: 10, clientY: 0, pointerId: 1 });

    assert.deepEqual(ctx.calls, [["switch", "turn_on", { entity_id: entityId }]]);
  } finally {
    globalThis.window = origWindow;
  }
});

test("non-dimmable light tile: a small horizontal drift still toggles on release", () => {
  const origWindow = globalThis.window;
  globalThis.window = makeWindow();
  try {
    const tile = makeTile();
    const fill = makeStyleEl();
    const thumb = makeStyleEl();
    const stateEl = makeStyleEl();
    const entityId = "light.hallway";
    const ctx = makeContext({
      [entityId]: { state: "off", attributes: { supported_color_modes: ["onoff"] } },
    });

    _bindSwipeTile.call(ctx, tile, fill, thumb, /* swatch */ {}, stateEl, entityId, "light");

    pressAndDrift(tile, globalThis.window, { dx: 10 });
    globalThis.window.listeners.pointerup({ clientX: 10, clientY: 0, pointerId: 1 });

    assert.deepEqual(ctx.calls, [["light", "turn_on", { entity_id: entityId }]]);
  } finally {
    globalThis.window = origWindow;
  }
});

test("dimmable light tile: a horizontal drag still previews and commits a brightness (regression)", () => {
  const origWindow = globalThis.window;
  globalThis.window = makeWindow();
  try {
    const tile = makeTile();
    const fill = makeStyleEl();
    const thumb = makeStyleEl();
    const stateEl = makeStyleEl();
    const entityId = "light.living_room";
    const ctx = makeContext({
      [entityId]: { state: "on", attributes: { supported_color_modes: ["brightness"] } },
    });

    _bindSwipeTile.call(ctx, tile, fill, thumb, /* swatch */ {}, stateEl, entityId, "light");

    pressAndDrift(tile, globalThis.window, { dx: 50 });
    globalThis.window.listeners.pointermove({ clientX: 60, clientY: 0, pointerId: 1 });
    globalThis.window.listeners.pointerup({ clientX: 60, clientY: 0, pointerId: 1 });

    assert.equal(ctx.calls.length, 1);
    assert.equal(ctx.calls[0][0], "light");
    assert.equal(ctx.calls[0][1], "turn_on");
    assert.equal(ctx.calls[0][2].entity_id, entityId);
    assert.equal(ctx.calls[0][2].brightness_pct, 60);
  } finally {
    globalThis.window = origWindow;
  }
});
