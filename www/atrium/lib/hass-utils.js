// HA replaces registry/state object references whenever something they track
// actually moves, so object identity is a reliable change signal.

export function sameRegistries(host, slot, hass, extraKey) {
  const s = (host[slot] ??= {});
  if (s.e === hass.entities && s.a === hass.areas && s.d === hass.devices && s.k === extraKey) return true;
  s.e = hass.entities; s.a = hass.areas; s.d = hass.devices; s.k = extraKey;
  return false;
}

export function unchangedState(host, slot, st) {
  if (host[slot] === st) return true;
  host[slot] = st;
  return false;
}

export function unchangedStates(host, slot, hass, ids) {
  const states = hass.states;
  const prev = host[slot];
  if (prev) {
    let equal = true;
    for (const id of ids) {
      if (prev[id] !== states[id]) { equal = false; break; }
    }
    if (equal) return true;
  }
  const snap = {};
  for (const id of ids) snap[id] = states[id];
  host[slot] = snap;
  return false;
}
