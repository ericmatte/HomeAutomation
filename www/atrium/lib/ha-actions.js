// Thin, shared wrappers over hass.callService so the same light/cover idioms
// aren't re-spelled in every component. `entity_id` accepts a single id or an
// array, so these cover both the per-tile and the whole-floor/room cases.

export function callService(hass, domain, service, data) {
  return hass?.callService(domain, service, data);
}

// Toggle a set of lights off if any is on, otherwise on.
export function toggleLights(hass, ids) {
  const anyOn = ids.some((id) => hass.states?.[id]?.state === "on");
  return callService(hass, "light", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
}

// Set brightness; pct ≤ 0 turns off.
export function setLightsBrightness(hass, ids, pct) {
  if (pct <= 0) return callService(hass, "light", "turn_off", { entity_id: ids });
  return callService(hass, "light", "turn_on", { entity_id: ids, brightness_pct: pct });
}

// Move covers to pct: 0 closes, 100 opens, anything between sets the position.
export function setCover(hass, ids, pct) {
  if (pct <= 0) return callService(hass, "cover", "close_cover", { entity_id: ids });
  if (pct >= 100) return callService(hass, "cover", "open_cover", { entity_id: ids });
  return callService(hass, "cover", "set_cover_position", { entity_id: ids, position: pct });
}
