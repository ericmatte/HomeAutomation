// Run: node --test www/atrium/components/area-card-updaters.test.js
//
// area-card-shared.js fetches CSS at module scope; stub `fetch` before
// importing so the module graph can load under plain Node (no bundler/DOM).
import test from "node:test";
import assert from "node:assert/strict";

globalThis.fetch = async () => ({ text: async () => "" });

const { _bindSwipeTile, _updateToggleRef, _updateLightRef, _updateSwitchRef } = await import("./area-card-updaters.js");

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
    _hass: { states, entities: {} },
    _dragState: new Map(),
    _call: (...args) => calls.push(args),
    _moreInfo: () => {},
    _updateToggleRef,
    calls,
  };
}

// Minimal fakes for the tile/fill/thumb/swatch/state DOM surface that
// _updateToggleRef (and the _updateLightRef/_updateSwitchRef wrappers around
// it) read and write.
function makeClassList() {
  const classes = new Set();
  return {
    classes,
    toggle(name, on) { on ? classes.add(name) : classes.delete(name); },
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
  };
}

function makeToggleRef() {
  return {
    tile: { classList: makeClassList(), style: { setProperty() {}, removeProperty() {} } },
    fill: { style: {} },
    thumb: { style: {} },
    swatch: { classList: makeClassList() },
    iconEl: { setAttribute() {} },
    state: { classList: makeClassList(), textContent: "" },
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

// _updateLightRef and _updateSwitchRef both delegate to the shared
// _updateToggleRef (see PR #12 review comment); these cover that each still
// gets its kind-specific behavior through that shared path.

test("_updateSwitchRef: dimmable-looking attributes are still ignored (switches never dim)", () => {
  const ref = makeToggleRef();
  const entityId = "switch.fan";
  const ctx = makeContext({
    [entityId]: { state: "on", attributes: { brightness: 128 }, last_updated: "2024-01-01T00:00:00Z" },
  });

  _updateSwitchRef.call(ctx, ref, entityId);

  assert.equal(ref.tile.classList.contains("no-dim"), true);
  assert.equal(ref.fill.style.width, "100%");
  assert.equal(ref.thumb.style.display, "none");
  assert.equal(ref.state.textContent.startsWith("On"), true);
});

test("_updateSwitchRef: unavailable state renders as unavailable with no fill", () => {
  const ref = makeToggleRef();
  const entityId = "switch.fan";
  const ctx = makeContext({ [entityId]: { state: "unavailable", attributes: {} } });

  _updateSwitchRef.call(ctx, ref, entityId);

  assert.equal(ref.tile.classList.contains("unavailable"), true);
  assert.equal(ref.fill.style.width, "0%");
  assert.equal(ref.state.textContent, "Unavailable");
});

test("_updateLightRef: dimmable light on renders a brightness percentage and thumb", () => {
  const ref = makeToggleRef();
  const entityId = "light.living_room";
  const ctx = makeContext({
    [entityId]: {
      state: "on",
      attributes: { supported_color_modes: ["brightness"], brightness: 128 },
      last_updated: "2024-01-01T00:00:00Z",
    },
  });

  _updateLightRef.call(ctx, ref, entityId);

  assert.equal(ref.tile.classList.contains("no-dim"), false);
  assert.equal(ref.fill.style.width, "50%");
  assert.equal(ref.thumb.style.display, "block");
  assert.equal(ref.state.textContent.startsWith("50%"), true);
});

test("_updateLightRef: non-dimmable light on renders 'On' with no thumb (matches switch styling)", () => {
  const ref = makeToggleRef();
  const entityId = "light.hallway";
  const ctx = makeContext({
    [entityId]: { state: "on", attributes: { supported_color_modes: ["onoff"] } },
  });

  _updateLightRef.call(ctx, ref, entityId);

  assert.equal(ref.tile.classList.contains("no-dim"), true);
  assert.equal(ref.fill.style.width, "100%");
  assert.equal(ref.thumb.style.display, "none");
  assert.equal(ref.state.textContent, "On");
});

test("_updateLightRef: a drag in progress leaves the ref untouched", () => {
  const ref = makeToggleRef();
  const entityId = "light.living_room";
  const ctx = makeContext({
    [entityId]: { state: "on", attributes: { supported_color_modes: ["brightness"], brightness: 255 } },
  });
  ctx._dragState.set(entityId, { pct: 10, kind: "light" });

  _updateLightRef.call(ctx, ref, entityId);

  assert.equal(ref.state.textContent, ""); // untouched
});
