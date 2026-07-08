// Run: node --test www/atrium/strategy.test.js
//
// strategy.js registers a custom element with no direct exports; it also
// cascade-imports every other custom element in the dashboard (area-card,
// header, floor-label, validation-card) purely to register them, none of
// which are exercised by generate() itself. Stub the browser globals they
// all touch at import time (fetch for CSS/JSON, HTMLElement, customElements)
// so the whole module graph loads under plain Node, then grab the
// registered strategy class out of the customElements.define() call.
import test from "node:test";
import assert from "node:assert/strict";

globalThis.fetch = async () => ({ text: async () => "", json: async () => ({}) });
globalThis.HTMLElement = class {};
globalThis.window = globalThis;
let registered;
globalThis.customElements = { define: (_tag, cls) => { registered = cls; } };

await import("./strategy.js");
const AtriumStrategy = registered;

const hass = { floors: {}, areas: {}, user: { name: "Eric" } };

test("generate: with no cfg.tabs, ships zero custom tabs", async () => {
  const result = await AtriumStrategy.generate({}, hass);
  assert.deepEqual(
    result.views.map((v) => v.path),
    ["home", "climate", "routines"]
  );
});

test("generate: cfg.tabs are appended in order, after routines", async () => {
  const cfg = {
    tabs: [
      { title: "Energy", icon: "mdi:lightning-bolt" },
      { title: "Maintenance", icon: "mdi:wrench" },
    ],
  };
  const result = await AtriumStrategy.generate(cfg, hass);
  assert.deepEqual(
    result.views.map((v) => v.path),
    ["home", "climate", "routines", "energy", "maintenance"]
  );
});

test("generate: a custom tab uses its title/icon, or falls back to a slugified path", async () => {
  const cfg = { tabs: [{ title: "Weird Name!" }] };
  const result = await AtriumStrategy.generate(cfg, hass);
  const tab = result.views.at(-1);
  assert.equal(tab.title, "Weird Name!");
  assert.equal(tab.path, "weird-name");
  assert.equal(tab.icon, "mdi:view-dashboard");
});

test("generate: a custom tab honors an explicit path override", async () => {
  const cfg = { tabs: [{ title: "Energy", path: "power" }] };
  const result = await AtriumStrategy.generate(cfg, hass);
  assert.equal(result.views.at(-1).path, "power");
});

test("generate: a custom tab's entities card uses entities_title, falling back to title", async () => {
  const cfg = {
    tabs: [
      { title: "Maintenance", entities: ["sensor.cpu"], entities_title: "System" },
      { title: "Energy", entities: ["sensor.power"] },
    ],
  };
  const result = await AtriumStrategy.generate(cfg, hass);
  const [maintenance, energy] = result.views.slice(-2);
  const maintenanceEntitiesCard = maintenance.cards[0].cards[1].cards[0];
  const energyEntitiesCard = energy.cards[0].cards[1].cards[0];
  assert.equal(maintenanceEntitiesCard.title, "System");
  assert.equal(energyEntitiesCard.title, "Energy");
});
