// Run: node --test www/atrium/components/area-card-shared.test.js
//
// area-card-shared.js fetches CSS at module scope; stub `fetch` before import.
import test from "node:test";
import assert from "node:assert/strict";

globalThis.fetch = async () => ({ text: async () => "" });

const { lightRgbTriple, iconForSensor, fmtTimeAgoLong } = await import("./area-card-shared.js");

test("lightRgbTriple returns the rgb triple only for true color modes", () => {
  assert.deepEqual(
    lightRgbTriple({ attributes: { color_mode: "rgb", rgb_color: [10, 20, 30] } }),
    [10, 20, 30]
  );
  assert.equal(lightRgbTriple({ attributes: { color_mode: "color_temp", rgb_color: [1, 2, 3] } }), null);
  assert.equal(lightRgbTriple({ attributes: { color_mode: "rgb" } }), null);
  assert.equal(lightRgbTriple(undefined), null);
});

test("iconForSensor: explicit icon > device_class map > gauge fallback", () => {
  assert.equal(iconForSensor({ attributes: { icon: "mdi:custom" } }), "mdi:custom");
  assert.equal(iconForSensor({ attributes: { device_class: "humidity" } }), "mdi:water-percent");
  assert.equal(iconForSensor({ attributes: { device_class: "nonsense" } }), "mdi:gauge");
  assert.equal(iconForSensor(undefined), "mdi:gauge");
});

test("fmtTimeAgoLong buckets recent timestamps", () => {
  assert.equal(fmtTimeAgoLong(Date.now()), "just now");
  assert.equal(fmtTimeAgoLong(Date.now() - 5 * 60 * 1000), "5 minutes ago");
  assert.equal(fmtTimeAgoLong(Date.now() - 3 * 3600 * 1000), "3 hours ago");
});
