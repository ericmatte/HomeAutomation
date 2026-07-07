// HA replaces registry/state object references whenever something they track
// actually moves, so object identity is a reliable change signal.

export function sameRegistries(host, slot, hass, extraKey) {
  const s = (host[slot] ??= {});
  if (s.entities === hass.entities && s.areas === hass.areas && s.devices === hass.devices && s.key === extraKey) return true;
  s.entities = hass.entities; s.areas = hass.areas; s.devices = hass.devices; s.key = extraKey;
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

// An entity's area is either set directly on the entity or inherited from its
// device.
export function areaIdForEntity(hass, ent) {
  return ent?.area_id || hass.devices?.[ent?.device_id]?.area_id || null;
}

export function areaForEntity(hass, entityId) {
  const areaId = areaIdForEntity(hass, hass.entities?.[entityId]);
  return areaId ? hass.areas?.[areaId] || null : null;
}

export function friendlyName(state, fallbackId) {
  return state?.attributes?.friendly_name || fallbackId;
}

// Display name for a registry entity: its custom name, else its live
// friendly_name, else a humanized object id.
export function entityDisplayName(hass, entity) {
  if (entity.name) return entity.name;
  const st = hass.states?.[entity.entity_id];
  return friendlyName(st, entity.entity_id.split(".").pop().replace(/_/g, " "));
}
