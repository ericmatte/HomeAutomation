const _v = new URL(import.meta.url).search;
export const { TONE } = await import(`../lib/tone.js${_v}`);

export const STYLE = await fetch(new URL(`./area-card.css${_v}`, import.meta.url)).then((r) => r.text());
export const AREA_POPOVER_ITEM_STYLE = await fetch(new URL(`./area-card-popover.css${_v}`, import.meta.url)).then((r) => r.text());

export function ensurePopoverItemStyle() {
  if (document.getElementById("atrium-area-popover-item-style")) return;
  const style = document.createElement("style");
  style.id = "atrium-area-popover-item-style";
  style.textContent = AREA_POPOVER_ITEM_STYLE;
  document.head.appendChild(style);
}

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function nameWithoutAreaPrefix(name, area) {
  return capitalize((name || "").replace(`${area.name} `, "").trim());
}

export function nameWithoutStairs(name) {
  return capitalize((name || "").replace("Upstairs", "").replace("Downstairs", "").trim());
}

export function matchesAny(haystack, needles) {
  const lower = (haystack || "").toLowerCase();
  return needles.some((n) => lower.includes(n));
}

export const ICONS = {
  bedroom: "mdi:bed",
  entrance: "mdi:door",
  sofa: "mdi:sofa",
  fork: "mdi:silverware-fork-knife",
  kitchen: "mdi:countertop",
  bath: "mdi:bathtub",
  corridor: "mdi:walk",
  screen: "mdi:television-classic",
  desk: "mdi:desk",
  wrench: "mdi:wrench",
  sun: "mdi:weather-sunny",
  bulb: "mdi:lightbulb",
  thermo: "mdi:thermometer",
  drop: "mdi:water-percent",
  plus: "mdi:plus",
  minus: "mdi:minus",
  play: "mdi:play",
  vacuum: "mdi:robot-vacuum",
  flame: "mdi:fire",
  snow: "mdi:snowflake",
  fan: "mdi:fan",
  swing: "mdi:swap-horizontal",
  power: "mdi:power",
  toggle: "mdi:toggle-switch-variant",
  auto: "mdi:autorenew",
  cogs: "mdi:cog-outline",
  script: "mdi:script-text",
  play_circle: "mdi:play-circle",
  plant: "mdi:sprout",
  leak: "mdi:water-alert",
  door_open: "mdi:door-open",
  door_closed: "mdi:door",
  propane: "mdi:propane-tank",
};

export const CLIMATE_ACCENT = {
  heat: TONE.heat,
  cool: TONE.cool,
  dry: "var(--state-climate-dry-color, #7fb9ff)",
  heat_cool: TONE.text,
  auto: TONE.text,
  fan_only: TONE.textDim,
  off: TONE.textMute,
};
export const CLIMATE_LABELS = { auto: "Auto", heat_cool: "Heat/Cool", heat: "Heat", cool: "Cool", dry: "Dry", fan_only: "Fan only", off: "Off" };
export const CLIMATE_ICONS = { auto: ICONS.auto, heat_cool: "mdi:sun-snowflake-variant", heat: ICONS.flame, cool: ICONS.snow, dry: ICONS.drop, fan_only: ICONS.fan, off: ICONS.power };

// Specific gauges for high/low and a fan-auto badge; everything else (medium,
// quiet, named modes) collapses to a neutral dot so the dropdown stays calm.
export function iconForFanMode(mode) {
  const m = (mode || "").toLowerCase();
  if (m.includes("auto")) return "mdi:fan-auto";
  if (m === "high" || m === "max" || m === "boost") return "mdi:speedometer";
  if (m === "low" || m === "min") return "mdi:speedometer-slow";
  return "mdi:circle-small";
}

export function iconForSwingMode() {
  return "mdi:circle-small";
}

export function iconForArea(area) {
  if (area.icon) return area.icon;
  const name = (area.name || "").toLowerCase();
  if (/(bed)/.test(name)) return ICONS.bedroom;
  if (/(entrance|hall|entr)/.test(name)) return ICONS.entrance;
  if (/(living|salon|séjour|sejour)/.test(name)) return ICONS.sofa;
  if (/(dining|salle à manger)/.test(name)) return ICONS.fork;
  if (/(kitchen|cuisine)/.test(name)) return ICONS.kitchen;
  if (/(bath|bain)/.test(name)) return ICONS.bath;
  if (/(theatre|cinema|cinéma)/.test(name)) return ICONS.screen;
  if (/(office|bureau)/.test(name)) return ICONS.desk;
  if (/(workshop|établi|garage)/.test(name)) return ICONS.wrench;
  if (/(outside|dehors|extérieur|exterieur)/.test(name)) return ICONS.sun;
  if (/(stairs|escalier|hallway|couloir)/.test(name)) return ICONS.corridor;
  return "mdi:home-outline";
}

export function iconForScene(scene, name) {
  if (scene.icon) return scene.icon;
  const n = (name || scene.name || "").toLowerCase();
  if (/(night|sleep|bed|moon)/.test(n)) return "mdi:weather-night";
  if (/(focus|work|concentrate)/.test(n)) return "mdi:target";
  if (/(gam|play)/.test(n)) return "mdi:gamepad-variant";
  if (/(party|relax|ambian|living)/.test(n)) return "mdi:palette";
  if (/(vacation|away|leave)/.test(n)) return "mdi:palm-tree";
  if (/(pool|water)/.test(n)) return "mdi:pool";
  if (/(escape)/.test(n)) return "mdi:puzzle";
  if (/(warning|alert|alarm|red)/.test(n)) return "mdi:alert";
  if (/(sun|sunset|sunrise|savanna)/.test(n)) return "mdi:weather-sunset";
  if (/(go go|caro)/.test(n)) return "mdi:run-fast";
  return "mdi:palette";
}

export function levelColor(pct) {
  if (pct <= 20) return TONE.danger;
  if (pct <= 40) return TONE.warn;
  return TONE.good;
}

export function fmtBrightnessPct(state) {
  if (state.state !== "on") return 0;
  const b = state.attributes?.brightness;
  if (b == null) return 100;
  return Math.max(0, Math.min(100, Math.round((b / 255) * 100)));
}

export function canDimLight(state) {
  const attrs = state?.attributes || {};
  const modes = attrs.supported_color_modes;
  if (Array.isArray(modes) && modes.length) {
    return modes.some((mode) => mode !== "onoff" && mode !== "unknown");
  }
  // Legacy HA light support flag: SUPPORT_BRIGHTNESS = 1.
  return (Number(attrs.supported_features) & 1) === 1 || attrs.brightness != null;
}

// Live rgb_color of a light in a true color mode → [r, g, b], else null.
// White-temperature modes return null so callers fall back to the yellow tint.
const RGB_COLOR_MODES = ["rgb", "hs", "xy", "rgbw", "rgbww"];
export function lightRgbTriple(state) {
  const attrs = state?.attributes || {};
  const rgb = attrs.rgb_color;
  if (attrs.color_mode && RGB_COLOR_MODES.includes(attrs.color_mode) && Array.isArray(rgb) && rgb.length >= 3) {
    return [rgb[0], rgb[1], rgb[2]];
  }
  return null;
}

const SENSOR_ICON_BY_DC = {
  temperature: "mdi:thermometer",
  humidity: "mdi:water-percent",
  illuminance: "mdi:brightness-5",
  pressure: "mdi:gauge",
  power: "mdi:flash",
  energy: "mdi:lightning-bolt",
  co2: "mdi:molecule-co2",
  carbon_dioxide: "mdi:molecule-co2",
  voc: "mdi:air-filter",
  pm25: "mdi:air-filter",
  current: "mdi:current-ac",
  voltage: "mdi:flash-triangle",
};
export function iconForSensor(state) {
  const attrs = state?.attributes || {};
  return attrs.icon || SENSOR_ICON_BY_DC[attrs.device_class] || "mdi:gauge";
}

export function fmtTimeAgoShort(ts) {
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Long spelled-out form for automation "last triggered" lines.
export function fmtTimeAgoLong(ts) {
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)} days ago`;
  return d.toLocaleDateString();
}

export function fmtCoverPct(state) {
  const p = state.attributes?.current_position;
  if (p == null) return state.state === "open" ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(p)));
}

// Current reading for a sensor, formatted like the header chips: percentages
// rounded, other numbers kept to one decimal, unit glued or spaced per symbol.
export function fmtSensorValue(state) {
  const raw = state?.state;
  if (raw == null || raw === "unavailable" || raw === "unknown") return "—";
  const unit = state.attributes?.unit_of_measurement || "";
  const num = parseFloat(raw);
  let text = raw;
  if (!Number.isNaN(num) && /^-?\d*\.?\d+$/.test(String(raw).trim())) {
    text = unit === "%" ? String(Math.round(num)) : Number.isInteger(num) ? String(num) : num.toFixed(1);
  }
  if (!unit) return text;
  return /^[°%]/.test(unit) ? `${text}${unit}` : `${text} ${unit}`;
}

// HA stores label colors as theme keys ("blue", "red", …). Map them to the
// TONE palette so atrium labels track the rest of the dashboard.
export function labelDescriptor(hass, labelId) {
  const lbl = hass.labels?.[labelId];
  if (!lbl) return null;
  const colorMap = {
    teal: TONE.cool,
    blue: TONE.cool,
    cyan: TONE.cool,
    indigo: TONE.curtain,
    purple: TONE.curtain,
    pink: TONE.curtain,
    red: TONE.danger,
    deep_orange: TONE.heat,
    orange: TONE.warn,
    amber: TONE.warn,
    yellow: TONE.warn,
    light_green: TONE.good,
    green: TONE.good,
    grey: TONE.textDim,
  };
  const color = colorMap[lbl.color] || TONE.textDim;
  return {
    name: lbl.name || labelId,
    icon: lbl.icon || "mdi:tag",
    color,
    bg: `color-mix(in srgb, ${color} 12%, transparent)`,
  };
}
