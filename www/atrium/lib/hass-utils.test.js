// Run: node --test www/atrium/lib/hass-utils.test.js
import test from "node:test";
import assert from "node:assert/strict";

const { areaIdForEntity, areaForEntity, friendlyName, entityDisplayName } = await import("./hass-utils.js");

const hass = {
  entities: {
    "light.direct": { entity_id: "light.direct", area_id: "kitchen" },
    "light.via_device": { entity_id: "light.via_device", device_id: "dev1" },
    "light.orphan": { entity_id: "light.orphan" },
    "light.named": { entity_id: "light.named", name: "Reading Lamp" },
    "light.friendly": { entity_id: "light.friendly" },
  },
  devices: { dev1: { area_id: "office" } },
  areas: { kitchen: { area_id: "kitchen", name: "Kitchen" }, office: { area_id: "office", name: "Office" } },
  states: { "light.friendly": { attributes: { friendly_name: "Desk Light" } } },
};

test("areaIdForEntity prefers the entity's own area, else the device's", () => {
  assert.equal(areaIdForEntity(hass, hass.entities["light.direct"]), "kitchen");
  assert.equal(areaIdForEntity(hass, hass.entities["light.via_device"]), "office");
  assert.equal(areaIdForEntity(hass, hass.entities["light.orphan"]), null);
});

test("areaForEntity resolves to the area object via the device fallback", () => {
  assert.equal(areaForEntity(hass, "light.via_device").name, "Office");
  assert.equal(areaForEntity(hass, "light.orphan"), null);
});

test("friendlyName falls back to the given id", () => {
  assert.equal(friendlyName({ attributes: { friendly_name: "X" } }, "light.x"), "X");
  assert.equal(friendlyName(undefined, "light.x"), "light.x");
});

test("entityDisplayName: custom name > friendly_name > humanized id", () => {
  assert.equal(entityDisplayName(hass, hass.entities["light.named"]), "Reading Lamp");
  assert.equal(entityDisplayName(hass, hass.entities["light.friendly"]), "Desk Light");
  assert.equal(entityDisplayName(hass, hass.entities["light.orphan"]), "orphan");
});
