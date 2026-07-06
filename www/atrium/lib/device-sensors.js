// Pure data transform: no hass, no DOM. Splits the "leftover" sensor pools
// (extras / other) into sensors that share a device_id with a light or
// switch in the same area, versus sensors that stay in the generic pools.
// Callers are responsible for keeping motion/leak/door/temp/humid winners
// out of `extras`/`other` in the first place — this function never sees
// them, so it can never steal a sensor already feeding an area-level chip.
export function groupDeviceSensors({ lights, switches, extras, other }) {
  const deviceTargets = new Map(); // device_id -> entity_id[]
  const addTargets = (entities) => {
    for (const e of entities) {
      if (!e.device_id) continue;
      if (!deviceTargets.has(e.device_id)) deviceTargets.set(e.device_id, []);
      deviceTargets.get(e.device_id).push(e.entity_id);
    }
  };
  addTargets(lights);
  addTargets(switches);

  const deviceSensors = new Map();
  const attach = (targetId, entity) => {
    if (!deviceSensors.has(targetId)) deviceSensors.set(targetId, []);
    deviceSensors.get(targetId).push(entity);
  };

  const split = (pool) => {
    const kept = [];
    for (const entity of pool) {
      const targets = entity.device_id ? deviceTargets.get(entity.device_id) : null;
      if (targets && targets.length) {
        for (const targetId of targets) attach(targetId, entity);
      } else {
        kept.push(entity);
      }
    }
    return kept;
  };

  return {
    deviceSensors,
    extras: split(extras),
    other: split(other),
  };
}
