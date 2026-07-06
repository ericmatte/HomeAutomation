// Run: node --test www/atrium/lib/floor-accordion.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { floorAccordion } from "./floor-accordion.js";

// The controller is a module singleton, so each test resets to all-closed
// via close() before asserting.

test("nothing is open by default", () => {
  floorAccordion.close();
  assert.equal(floorAccordion.isOpen("a"), false);
  assert.equal(floorAccordion.isOpen(null), false);
});

test("toggle opens a floor", () => {
  floorAccordion.close();
  floorAccordion.toggle("a");
  assert.equal(floorAccordion.isOpen("a"), true);
});

test("toggling the open floor again closes it", () => {
  floorAccordion.close();
  floorAccordion.toggle("a");
  floorAccordion.toggle("a");
  assert.equal(floorAccordion.isOpen("a"), false);
});

test("only one floor is open at a time", () => {
  floorAccordion.close();
  floorAccordion.toggle("a");
  floorAccordion.toggle("b");
  assert.equal(floorAccordion.isOpen("a"), false);
  assert.equal(floorAccordion.isOpen("b"), true);
});

test("null floor id (the 'Other' floor) is a valid, distinct key", () => {
  floorAccordion.close();
  floorAccordion.toggle(null);
  assert.equal(floorAccordion.isOpen(null), true);
  assert.equal(floorAccordion.isOpen("a"), false);
  // opening a real floor closes the null one
  floorAccordion.toggle("a");
  assert.equal(floorAccordion.isOpen(null), false);
});

test("open() is idempotent and does not toggle off", () => {
  floorAccordion.close();
  floorAccordion.open("a");
  floorAccordion.open("a");
  assert.equal(floorAccordion.isOpen("a"), true);
});

test("subscribers are notified on change and can unsubscribe", () => {
  floorAccordion.close();
  let count = 0;
  const unsub = floorAccordion.subscribe(() => {
    count += 1;
  });
  floorAccordion.toggle("a");
  floorAccordion.toggle("a");
  assert.equal(count, 2);
  unsub();
  floorAccordion.toggle("a");
  assert.equal(count, 2);
  floorAccordion.close();
});
