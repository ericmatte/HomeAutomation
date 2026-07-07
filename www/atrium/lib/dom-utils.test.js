// Run: node --test www/atrium/lib/dom-utils.test.js
import test from "node:test";
import assert from "node:assert/strict";

const { tint, pctFromPointerX, injectStyleOnce } = await import("./dom-utils.js");

test("tint builds a color-mix string with the given percentage", () => {
  assert.equal(tint("red", 16), "color-mix(in srgb, red 16%, transparent)");
  assert.equal(tint("var(--x)"), "color-mix(in srgb, var(--x) 12%, transparent)");
});

test("pctFromPointerX maps and clamps pointer x to 0-100", () => {
  const target = { getBoundingClientRect: () => ({ left: 0, width: 100 }) };
  assert.equal(pctFromPointerX(target, 40), 40);
  assert.equal(pctFromPointerX(target, -20), 0);
  assert.equal(pctFromPointerX(target, 250), 100);
});

test("injectStyleOnce appends a keyed <style> exactly once", () => {
  const appended = [];
  const byId = {};
  globalThis.document = {
    getElementById: (id) => byId[id] || null,
    createElement: () => ({ id: "", textContent: "" }),
    head: { appendChild: (node) => { appended.push(node); byId[node.id] = node; } },
  };
  injectStyleOnce("dup-style", "a{}");
  injectStyleOnce("dup-style", "a{}");
  assert.equal(appended.length, 1);
  assert.equal(appended[0].textContent, "a{}");
  delete globalThis.document;
});
