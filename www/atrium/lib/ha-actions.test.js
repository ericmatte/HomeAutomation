// Run: node --test www/atrium/lib/ha-actions.test.js
import test from "node:test";
import assert from "node:assert/strict";

const { callService, toggleLights, setLightsBrightness } = await import("./ha-actions.js");

function makeHass(states = {}) {
  const calls = [];
  return { states, callService: (...a) => calls.push(a), calls };
}

test("callService forwards to hass and no-ops when hass is missing", () => {
  const hass = makeHass();
  callService(hass, "light", "turn_on", { entity_id: "light.a" });
  assert.deepEqual(hass.calls, [["light", "turn_on", { entity_id: "light.a" }]]);
  assert.doesNotThrow(() => callService(undefined, "light", "turn_on", {}));
});

test("toggleLights turns off when any light is on, else on", () => {
  const onHass = makeHass({ "light.a": { state: "off" }, "light.b": { state: "on" } });
  toggleLights(onHass, ["light.a", "light.b"]);
  assert.equal(onHass.calls[0][1], "turn_off");

  const offHass = makeHass({ "light.a": { state: "off" } });
  toggleLights(offHass, ["light.a"]);
  assert.equal(offHass.calls[0][1], "turn_on");
});

test("setLightsBrightness turns off at pct ≤ 0, else sets brightness_pct", () => {
  const off = makeHass();
  setLightsBrightness(off, ["light.a"], 0);
  assert.deepEqual(off.calls[0], ["light", "turn_off", { entity_id: ["light.a"] }]);

  const on = makeHass();
  setLightsBrightness(on, "light.a", 40);
  assert.deepEqual(on.calls[0], ["light", "turn_on", { entity_id: "light.a", brightness_pct: 40 }]);
});
