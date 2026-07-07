const _v = new URL(import.meta.url).search;
const { TONE } = await import(`./tone.js${_v}`);

// The shell only needs a subset of the canonical palette; derive it so both
// stay in lockstep.
export const SHELL_TONE = {
  text: TONE.text,
  textMute: TONE.textMute,
  light: TONE.light,
  cool: TONE.cool,
  warn: TONE.warn,
  danger: TONE.danger,
  good: TONE.good,
};

export const SHELL_STYLE = await fetch(new URL(`./shell.css${_v}`, import.meta.url)).then((r) => r.text());

// Strip the redundant "Battery"/"Level" tokens and normalize to sentence
// case so battery rows stay scannable in the popover.
export function shellCleanBatteryName(name) {
  if (!name) return "";
  let clean = name.replace(/\b(battery|level)\b/gi, " ");
  clean = clean.replace(/_+/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();
  if (!clean) return name;
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function shellBatteryIcon(entityId, hass) {
  const st = hass?.states?.[entityId];
  if (st?.attributes?.icon) return st.attributes.icon;
  const id = entityId.toLowerCase();
  if (id.includes("motion")) return "mdi:motion-sensor";
  if (id.includes("door") || id.includes("contact")) return "mdi:door";
  if (id.includes("window")) return "mdi:window-closed-variant";
  if (id.includes("leak") || id.includes("water")) return "mdi:water-alert";
  if (id.includes("curtain") || id.includes("shade") || id.includes("blind")) return "mdi:blinds-horizontal";
  if (id.includes("soil") || id.includes("moisture")) return "mdi:water-percent";
  if (id.includes("vibration")) return "mdi:vibrate";
  if (id.includes("dimmer") || id.includes("button") || id.includes("remote") || id.includes("switch")) return "mdi:remote";
  if (id.includes("temperature") || id.includes("humidity") || id.includes("climate")) return "mdi:thermometer";
  if (id.includes("propane") || id.includes("tank") || id.includes("fuel")) return "mdi:propane-tank";
  return "mdi:battery";
}

function shellBatteryTier(pct) {
  if (pct <= 20) return "critical";
  if (pct <= 40) return "low";
  return "ok";
}
export function shellBatteryColor(pct) {
  const tier = shellBatteryTier(pct);
  if (tier === "critical") return "var(--error-color, #ff7a7a)";
  if (tier === "low") return "var(--warning-color, #f0b13a)";
  return "var(--success-color, #7dc97a)";
}

// Domains where "unavailable" actually signals a problem. Excludes
// script/scene/zone/automation where "unavailable" is expected or meaningless.
export const PROBLEM_UNAVAILABLE_DOMAINS = new Set([
  "light",
  "switch",
  "sensor",
  "binary_sensor",
  "cover",
  "climate",
  "media_player",
  "fan",
  "lock",
  "vacuum",
  "humidifier",
  "water_heater",
  "valve",
  "camera",
]);

export function shellProblemIcon(st) {
  if (st?.attributes?.icon) return st.attributes.icon;
  const id = st?.entity_id || "";
  const domain = id.split(".")[0];
  const dc = st?.attributes?.device_class;
  if (dc === "moisture" || id.toLowerCase().includes("leak")) return "mdi:water-alert";
  if (dc === "smoke") return "mdi:smoke-detector-alert";
  if (dc === "gas") return "mdi:gas-cylinder";
  if (dc === "carbon_monoxide" || dc === "co") return "mdi:molecule-co";
  if (dc === "tamper" || dc === "safety") return "mdi:shield-alert";
  if (dc === "problem") return "mdi:alert-circle";
  const domainIcons = {
    light: "mdi:lightbulb",
    switch: "mdi:toggle-switch",
    cover: "mdi:window-shutter",
    sensor: "mdi:gauge",
    binary_sensor: "mdi:radiobox-marked",
    climate: "mdi:thermostat",
    media_player: "mdi:speaker",
    lock: "mdi:lock",
    vacuum: "mdi:robot-vacuum",
    camera: "mdi:cctv",
    fan: "mdi:fan",
    humidifier: "mdi:air-humidifier",
    water_heater: "mdi:water-boiler",
    valve: "mdi:valve",
  };
  return domainIcons[domain] || "mdi:help-circle-outline";
}

export const ALL_FLOOR_KEY = "__all__";

export function shellInitialFromName(name) {
  const trim = (name || "").trim();
  if (!trim) return "?";
  return trim[0].toUpperCase();
}

export function shellPersonStatus(state) {
  const raw = state?.state || "unknown";
  if (raw === "home") return { tone: "is-home", label: "Home" };
  if (raw === "not_home" || raw === "away") return { tone: "is-away", label: "Away" };
  if (raw === "unknown" || raw === "unavailable") return { tone: "is-away", label: "?" };
  return { tone: "is-zone", label: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

export function shellFormatTemp(value) {
  if (value == null || Number.isNaN(value)) return null;
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function formatTempRange(temps) {
  if (!temps.length) return "";
  const min = shellFormatTemp(Math.min(...temps));
  const max = shellFormatTemp(Math.max(...temps));
  return min === max ? `${min}°` : `${min} – ${max}°`;
}
