// Atrium area card — per-floor accordion renderer.
//
// Faithful port of the V2 design (opt1v2-accordion.jsx) to vanilla DOM.
// Given a `floor` config, walks every HA area on that floor and emits a
// collapsible room card per area: header row with live sensor chips
// (temp / humidity / motion / leak / door / soil / propane / battery),
// quick toggles for "all lights" + "all covers", and an expanded body
// with swipe-to-dim light tiles, swipe-to-position cover tiles, door
// state tiles, climate tiles with +/− setpoint, robot vacuum tiles with
// a command row, an icon-only scene row, and an inline collapsible
// "Automations & scripts" drawer.
//
// Everything is discovered from the HA registry — no hardcoded entity ids.

// See strategy.js — we pass our own URL query through so the cache buster
// also reaches popover.js. import.meta.url here already inherits whatever
// query strategy.js used to load us.
const _v = new URL(import.meta.url).search;
const { openPopover, closePopoverFor, buildPopoverHeader } = await import(`./popover.js${_v}`);

// ---------- Design tokens (mirrors opt1v2-accordion.jsx TONE) -------------
const TONE = {
  bg: "#0e0f12",
  surface: "#16181d",
  surface2: "#1d2026",
  surface3: "#252931",
  line: "rgba(255,255,255,0.06)",
  line2: "rgba(255,255,255,0.10)",
  text: "#e8e9ec",
  textDim: "#9aa0aa",
  textMute: "#666b75",
  light: "#f5c451",
  lightBg: "rgba(245,196,81,0.14)",
  curtain: "#9b7fd1",
  curtainBg: "rgba(155,127,209,0.14)",
  motion: "#5cc6ff",
  motionBg: "rgba(92,198,255,0.12)",
  heat: "#ff8a5b",
  cool: "#5cc6ff",
  warn: "#f0b13a",
  danger: "#ff5252",
  good: "#7dc97a",
};

// ---------- Per-floor stylesheet -----------------------------------------
// Injected once on first connect. Class names are prefixed `v2-`.
const STYLE = `
/* Mobile: single column (unchanged from original layout). Desktop widens to
   2 columns at 900px and 3 columns at 1380px. The strategy hands us a wide
   section (max_columns: 3 + column_span: 3) so there's room to spread out. */
.v2-root { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; align-items: start; max-width: 1800px; }
@media (min-width: 900px) { .v2-root { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1380px) { .v2-root { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.v2-floor-label { display: flex; align-items: center; gap: 8px; padding: 14px 4px 4px; font-size: 12px; color: ${TONE.textDim}; letter-spacing: .6px; text-transform: uppercase; font-weight: 600; grid-column: 1 / -1; }
.v2-floor-label > .line { flex: 1; height: 1px; background: ${TONE.line}; }

.v2-room { background: var(--ha-card-background, var(--card-background-color, ${TONE.surface})); border-radius: 14px; border: 1px solid var(--ha-card-border-color, var(--divider-color, transparent)); overflow: hidden; transition: border-color .2s; scroll-margin-bottom: 16px; }
.v2-room.expanded { border-color: var(--ha-card-border-color, var(--divider-color, ${TONE.line2})); }

.v2-row { padding: 14px; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
.v2-room-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: transparent; color: ${TONE.textDim}; line-height: 0; transition: color .25s ease; }
.v2-room-icon.on { background: transparent; color: ${TONE.light}; }
.v2-room-mid { flex: 1; min-width: 0; }
.v2-room-name { font-size: 16px; font-weight: 500; letter-spacing: -.1px; color: ${TONE.text}; line-height: 16px; }
.v2-room-title-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; line-height: 16px; }
.v2-chips { margin-top: 2px; font-size: 13px; line-height: 16px; color: ${TONE.textDim}; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; transform: translate(-4px, 4px); }
.v2-chip { display: inline-flex; align-items: center; gap: 4px; padding: 0; line-height: 0; }
.v2-chip > span { line-height: 16px; }
.v2-chip ha-icon { --mdc-icon-size: 16px; }
.v2-chip.has-bg { padding: 2px 7px 2px 6px; border-radius: 999px; }
.v2-chip.pulse { animation: v2-pulse 1.4s ease infinite; font-weight: 600; }
.v2-chip.clickable { cursor: pointer; transition: opacity .15s; }
.v2-chip.clickable:hover { opacity: .7; }
.v2-motion-pill { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; line-height: 16px; color: ${TONE.motion}; padding: 2px 6px 2px 5px; border-radius: 999px; background: ${TONE.motionBg}; cursor: pointer; transition: opacity .15s; }
.v2-motion-pill ha-icon { --mdc-icon-size: 14px; line-height: 0; }
.v2-motion-pill:hover { opacity: .7; }
.v2-room-actions { display: flex; align-items: center; gap: 6px; }
.v2-quick-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 36px; height: 36px; padding: 0 12px; border-radius: 10px; border: none; cursor: pointer; background: rgba(255,255,255,0.04); color: ${TONE.textDim}; font-family: inherit; transition: background .25s ease, color .25s ease; }
.v2-quick-btn.on-light { background: ${TONE.lightBg}; color: ${TONE.light}; }
.v2-quick-btn.on-cover { background: ${TONE.curtainBg}; color: ${TONE.curtain}; }
.v2-chev { transition: transform .2s; color: ${TONE.textMute}; margin-left: 2px; display: inline-flex; }
.v2-room.expanded .v2-chev { transform: rotate(180deg); }

.v2-body-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .25s ease; }
.v2-room.expanded .v2-body-wrap { grid-template-rows: 1fr; }
/* .v2-body must have no padding so its min-content height collapses to 0
   when the grid track is 0fr (otherwise padding leaks visibly when closed). */
.v2-body { overflow: hidden; min-height: 0; }
.v2-body-inner { padding: 0 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.v2-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.v2-section-title { font-size: 11px; color: ${TONE.textMute}; letter-spacing: .6px; text-transform: uppercase; font-weight: 600; }
.v2-section-hint { font-size: 10.5px; color: ${TONE.textMute}; opacity: .7; }
.v2-grid { display: grid; gap: 6px; }
.v2-grid.cols-1 { grid-template-columns: 1fr; }
.v2-grid.cols-2 { grid-template-columns: 1fr 1fr; }

.v2-tile { position: relative; border-radius: 12px; padding: 6px 14px; background: ${TONE.surface2}; overflow: hidden; user-select: none; touch-action: pan-y; cursor: pointer; min-height: 52px; display: flex; flex-direction: column; justify-content: center; transition: background .25s ease; }
.v2-tile.unavailable { opacity: .65; cursor: not-allowed; }
.v2-tile-fill { position: absolute; top: 0; bottom: 0; left: 0; width: 0%; pointer-events: none; transition: width .25s ease, background .2s ease; }
.v2-tile-fill.light { background: var(--tile-fill, linear-gradient(90deg, rgb(var(--rgb-state-light-active-color, 245 196 81) / 0.22) 0%, rgb(var(--rgb-state-light-active-color, 245 196 81) / 0.30) 100%)); }
.v2-tile-fill.cover { background: linear-gradient(90deg, rgba(155,127,209,0.18) 0%, rgba(155,127,209,0.28) 100%); }
.v2-tile.pressed .v2-tile-fill.light { background: var(--tile-fill-pressed, linear-gradient(90deg, rgb(var(--rgb-state-light-active-color, 245 196 81) / 0.38) 0%, rgb(var(--rgb-state-light-active-color, 245 196 81) / 0.48) 100%)); }
.v2-tile.pressed .v2-tile-fill.cover { background: linear-gradient(90deg, rgba(155,127,209,0.32) 0%, rgba(155,127,209,0.44) 100%); }
.v2-tile-thumb { display: none !important; }
.v2-tile-body { position: relative; display: flex; align-items: center; gap: 10px; }
.v2-swatch { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.04); color: ${TONE.textMute}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; cursor: pointer; transition: background .25s ease, color .25s ease; }
.v2-swatch.on-light { background: var(--tile-swatch-bg, rgb(var(--rgb-state-light-active-color, 245 196 81) / 0.18)); color: var(--tile-accent, var(--state-light-active-color, ${TONE.light})); }
.v2-swatch.on-cover { background: ${TONE.curtainBg}; color: ${TONE.curtain}; }
.v2-swatch.on-heat { background: rgba(255,138,91,0.18); color: ${TONE.heat}; }
.v2-tile-text { flex: 1; min-width: 0; }
.v2-tile-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${TONE.text}; }
.v2-tile-state { font-size: 12px; color: ${TONE.textMute}; transition: color .25s ease; }
.v2-tile-state.on-light { color: var(--tile-accent, var(--state-light-active-color, ${TONE.light})); }
.v2-tile-state.on-cover { color: ${TONE.curtain}; }
.v2-tile-state.on-heat { color: ${TONE.heat}; }
.v2-unavail-dot { position: absolute; top: -4px; right: -4px; width: 14px; height: 14px; border-radius: 999px; background: ${TONE.warn}; color: #1a1208; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; line-height: 1; }


.v2-climate { position: relative; background: ${TONE.surface2}; border-radius: 12px; padding: 12px 14px; overflow: visible; }
.v2-climate-bg { position: absolute; inset: 0; pointer-events: none; opacity: .28; display: block; overflow: hidden; border-radius: 12px; }
.v2-climate-bg mini-graph-card { --ha-card-background: transparent; --ha-card-box-shadow: none; --ha-card-border-radius: 0; --ha-card-border-width: 0; background: transparent !important; box-shadow: none !important; display: block; width: 100%; height: 100%; }
.v2-climate-content { position: relative; z-index: 1; }
.v2-climate-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.v2-climate-meta { display: flex; justify-content: space-between; font-size: 9.5px; line-height: 12px; color: ${TONE.textMute}; letter-spacing: .4px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
.v2-climate-meta-range { font-variant-numeric: tabular-nums; text-transform: none; letter-spacing: 0; }
.v2-climate-target { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
.v2-climate-temp { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; color: ${TONE.text}; line-height: 24px; }
.v2-tiny-btn { width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; background: rgba(255,255,255,0.05); color: ${TONE.text}; display: inline-flex; align-items: center; justify-content: center; }
.v2-climate-extras { margin-top: 10px; padding-top: 10px; border-top: 1px solid ${TONE.line}; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.v2-climate-menu-btn { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 8px; border-radius: 8px; border: none; cursor: pointer; background: rgba(255,255,255,0.05); color: ${TONE.textDim}; font-family: inherit; font-size: 11.5px; line-height: 14px; }
.v2-climate-menu-btn ha-icon { --mdc-icon-size: 13px; }
.v2-climate-menu-btn .label { line-height: 14px; text-transform: capitalize; }

.v2-vacuum { background: ${TONE.surface2}; border-radius: 12px; padding: 12px 14px; }
.v2-vacuum-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.v2-vacuum-primary { width: 100%; height: 34px; border-radius: 9px; border: none; cursor: pointer; background: rgba(92,198,255,0.16); color: ${TONE.cool}; font-family: inherit; font-size: 13.5px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 8px; }
.v2-vacuum-cmd-row { display: flex; gap: 4px; }
.v2-vacuum-cmd { flex: 1; height: 34px; border-radius: 8px; border: none; cursor: pointer; background: rgba(255,255,255,0.05); color: ${TONE.text}; display: inline-flex; align-items: center; justify-content: center; }
.v2-vacuum-cmd.active { background: rgba(92,198,255,0.16); color: ${TONE.cool}; }

.v2-scenes { display: flex; flex-wrap: wrap; gap: 6px; }
.v2-scene-btn { position: relative; height: 32px; max-width: 160px; padding: 0 10px 0 8px; border-radius: 9px; border: none; cursor: pointer; background: rgba(255,255,255,0.05); color: ${TONE.text}; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 12px; line-height: 14px; transition: background .2s ease, color .2s ease; }
.v2-scene-btn:hover { background: ${TONE.lightBg}; color: ${TONE.light}; }
.v2-scene-btn ha-icon { --mdc-icon-size: 15px; flex-shrink: 0; color: ${TONE.textDim}; transition: color .2s ease; }
.v2-scene-btn:hover ha-icon { color: ${TONE.light}; }
.v2-scene-btn-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

.v2-autos-trigger { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; margin-top: 4px; border-radius: 10px; border: none; cursor: pointer; background: rgba(255,255,255,0.03); color: ${TONE.textDim}; font-family: inherit; transition: background .15s ease; align-self: flex-start; }
.v2-autos-trigger:hover { background: rgba(255,255,255,0.06); }
.v2-autos-trigger.open { background: rgba(255,255,255,0.08); }
.v2-autos-trigger-iconwrap { width: 20px; height: 20px; border-radius: 6px; background: rgba(255,255,255,0.05); color: ${TONE.textDim}; display: inline-flex; align-items: center; justify-content: center; }
.v2-autos-trigger-label { font-size: 12px; color: ${TONE.text}; font-weight: 500; line-height: 14px; }
.v2-autos-trigger-meta { font-size: 11px; color: ${TONE.textMute}; font-variant-numeric: tabular-nums; line-height: 14px; }
.v2-auto-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-bottom: 1px solid ${TONE.line}; }
.v2-auto-row:last-child { border-bottom: none; }
.v2-auto-row.disabled { opacity: .55; }
.v2-auto-swatch { position: relative; flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; background: rgba(255,255,255,0.06); color: ${TONE.text}; display: inline-flex; align-items: center; justify-content: center; transition: background .15s ease; }
.v2-auto-swatch.script { background: rgba(255,255,255,0.04); color: ${TONE.textDim}; cursor: default; }
.v2-auto-row.disabled .v2-auto-swatch:not(.script) { background: rgba(255,255,255,0.03); color: ${TONE.textMute}; }
.v2-auto-body { flex: 1; min-width: 0; text-align: left; background: transparent; border: none; padding: 0; cursor: pointer; color: ${TONE.text}; font-family: inherit; }
.v2-auto-name { font-size: 12.5px; font-weight: 500; color: ${TONE.text}; line-height: 1.3; }
.v2-auto-name.disabled { color: ${TONE.textDim}; }
.v2-auto-last { font-size: 10.5px; color: ${TONE.textMute}; margin-top: 2px; }
.v2-auto-labels { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.v2-auto-label { display: inline-flex; align-items: center; gap: 3px; padding: 1.5px 6px 1.5px 5px; border-radius: 999px; font-size: 9.5px; font-weight: 500; line-height: 1.5; }
.v2-auto-play { flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; background: rgba(92,198,255,0.12); color: ${TONE.cool}; display: inline-flex; align-items: center; justify-content: center; transition: background .15s ease; }
.v2-auto-play.disabled { background: rgba(255,255,255,0.03); color: ${TONE.textMute}; cursor: not-allowed; }

.v2-sparkline { width: 100%; height: 42px; margin-top: 4px; display: block; }

@keyframes v2-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .35; }
}
`;

// Popover-only item styles. The popover container itself comes from the
// shared `openPopover()` helper (atrium-popover.js); the row rules mirror the
// in-card .v2-auto-* styles because the popover is body-attached and lives
// outside our card's shadow scope. Climate dropdown items follow the same
// pattern.
const AREA_POPOVER_ITEM_STYLE = `
.v2-pop-list-rooms { background: ${TONE.surface2}; }
.v2-pop-list-rooms .v2-auto-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-bottom: 1px solid ${TONE.line}; }
.v2-pop-list-rooms .v2-auto-row:last-child { border-bottom: none; }
.v2-pop-list-rooms .v2-auto-row.disabled { opacity: .55; }
.v2-pop-list-rooms .v2-auto-swatch { position: relative; flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; background: rgba(255,255,255,0.06); color: ${TONE.text}; display: inline-flex; align-items: center; justify-content: center; transition: background .15s ease; }
.v2-pop-list-rooms .v2-auto-swatch.script { background: rgba(255,255,255,0.04); color: ${TONE.textDim}; cursor: default; }
.v2-pop-list-rooms .v2-auto-row.disabled .v2-auto-swatch:not(.script) { background: rgba(255,255,255,0.03); color: ${TONE.textMute}; }
.v2-pop-list-rooms .v2-auto-body { flex: 1; min-width: 0; text-align: left; background: transparent; border: none; padding: 0; cursor: pointer; color: ${TONE.text}; font-family: inherit; }
.v2-pop-list-rooms .v2-auto-name { font-size: 12.5px; font-weight: 500; color: ${TONE.text}; line-height: 1.3; }
.v2-pop-list-rooms .v2-auto-name.disabled { color: ${TONE.textDim}; }
.v2-pop-list-rooms .v2-auto-last { font-size: 10.5px; color: ${TONE.textMute}; margin-top: 2px; }
.v2-pop-list-rooms .v2-auto-labels { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.v2-pop-list-rooms .v2-auto-label { display: inline-flex; align-items: center; gap: 3px; padding: 1.5px 6px 1.5px 5px; border-radius: 999px; font-size: 9.5px; font-weight: 500; line-height: 1.5; }
.v2-pop-list-rooms .v2-auto-play { flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; background: rgba(92,198,255,0.12); color: ${TONE.cool}; display: inline-flex; align-items: center; justify-content: center; transition: background .15s ease; }
.v2-pop-list-rooms .v2-auto-play.disabled { background: rgba(255,255,255,0.03); color: ${TONE.textMute}; cursor: not-allowed; }

.v2-pop-menu { display: flex; flex-direction: column; min-width: 140px; padding: 2px; }
.v2-pop-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 9px; border: none; border-radius: 7px; background: transparent; color: ${TONE.text}; font-size: 12.5px; line-height: 14px; font-family: inherit; cursor: pointer; text-align: left; }
.v2-pop-menu-item:hover { background: rgba(255,255,255,0.05); }
.v2-pop-menu-item.active { color: ${TONE.cool}; }
.v2-pop-menu-item ha-icon { --mdc-icon-size: 14px; flex-shrink: 0; }
`;
function v2EnsurePopoverItemStyle() {
  if (document.getElementById("atrium-area-popover-item-style")) return;
  const style = document.createElement("style");
  style.id = "atrium-area-popover-item-style";
  style.textContent = AREA_POPOVER_ITEM_STYLE;
  document.head.appendChild(style);
}

// ---------- Helpers -----------------------------------------------------
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const slug = (s) => (s || "").toString().toLowerCase().replace(/[^a-z0-9_]+/g, "_");

function nameWithoutAreaPrefix(name, area) {
  return capitalize((name || "").replace(`${area.name} `, "").trim());
}

function nameWithoutStairs(name) {
  return capitalize((name || "").replace("Upstairs", "").replace("Downstairs", "").trim());
}

function matchesAny(haystack, needles) {
  const lower = (haystack || "").toLowerCase();
  return needles.some((n) => lower.includes(n));
}

const ICONS = {
  // Room
  bedroom: "mdi:bed",
  bed: "mdi:bed",
  entrance: "mdi:door",
  door: "mdi:door",
  sofa: "mdi:sofa",
  fork: "mdi:silverware-fork-knife",
  kitchen: "mdi:countertop",
  bath: "mdi:bathtub",
  corridor: "mdi:walk",
  stairs: "mdi:stairs",
  screen: "mdi:television-classic",
  desk: "mdi:desk",
  wrench: "mdi:wrench",
  sun: "mdi:weather-sunny",
  // Generic
  bulb: "mdi:lightbulb",
  curtain: "mdi:blinds-horizontal",
  motion: "mdi:motion-sensor",
  thermo: "mdi:thermometer",
  drop: "mdi:water-percent",
  plus: "mdi:plus",
  minus: "mdi:minus",
  chevron: "mdi:chevron-down",
  chevron_up: "mdi:chevron-up",
  play: "mdi:play",
  pause: "mdi:pause",
  stop: "mdi:stop",
  pin: "mdi:crosshairs-gps",
  dock: "mdi:home-import-outline",
  vacuum: "mdi:robot-vacuum",
  flame: "mdi:fire",
  snow: "mdi:snowflake",
  fan: "mdi:fan",
  swing: "mdi:swap-horizontal",
  power: "mdi:power",
  auto: "mdi:autorenew",
  cogs: "mdi:cog-outline",
  script: "mdi:script-text",
  play_circle: "mdi:play-circle",
  // Sensor chips
  plant: "mdi:sprout",
  leak: "mdi:water-alert",
  door_open: "mdi:door-open",
  door_closed: "mdi:door",
  propane: "mdi:propane-tank",
  battery: "mdi:battery",
  // Header
  search: "mdi:magnify",
  dots: "mdi:dots-horizontal",
};

// Try to pick a Material Design icon from an HA area's icon (already mdi-style)
// or guess from the area name.
function iconForArea(area) {
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

function iconForScene(scene, name) {
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

function levelColor(pct) {
  if (pct <= 20) return TONE.danger;
  if (pct <= 40) return TONE.warn;
  return TONE.good;
}

function fmtBrightnessPct(state) {
  if (state.state !== "on") return 0;
  const b = state.attributes?.brightness;
  if (b == null) return 100;
  return Math.max(0, Math.min(100, Math.round((b / 255) * 100)));
}

function fmtCoverPct(state) {
  const p = state.attributes?.current_position;
  if (p == null) return state.state === "open" ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(p)));
}

// ---------- Automation labels (matches HA label registry colors loosely) --
function labelDescriptor(hass, labelId) {
  const lbl = hass.labels?.[labelId];
  if (!lbl) return null;
  // HA stores label colors as theme keys, e.g. "blue", "red"…
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
    bg: `${color}20`,
  };
}

// ---------- Main element --------------------------------------------------
class AtriumAreaCard extends HTMLElement {
  constructor() {
    super();
    this._expanded = new Set();
    this._dragState = new Map(); // entity_id → { pct, kind, ts }
    this._lastSig = "";
    this._floorId = null;
  }

  setConfig(config) {
    if (config.floor === undefined) throw new Error("floor is required");
    // `floor: null` (or "_orphans") selects areas that aren't assigned to any
    // floor — used for the "Other" tab.
    this._floorId = config.floor === null ? null : config.floor;
    this._showLabel = config.show_floor_label === true;
    this._defaultExpanded = config.default_expanded === true;
  }

  connectedCallback() {
    // Panel-mode views host this card edge-to-edge. Add the V2 layout's
    // standard horizontal gutter + a bottom buffer so the last room doesn't
    // hug the screen edges.
    this.style.display = "block";
    this.style.padding = "0 16px 32px";
  }

  _areaFloorId(area) {
    return area?.floor_id ?? null;
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._lastSig) {
      this._lastSig = sig;
      this._build();
    } else {
      this._update();
    }
  }

  // Cheap signature so we rebuild structure only when the entity set on
  // this floor actually changes.
  _signature() {
    const hass = this._hass;
    if (!hass?.areas || !hass?.entities) return "boot";
    const parts = [this._floorId];
    for (const a of Object.values(hass.areas)) {
      if (this._areaFloorId(a) !== this._floorId) continue;
      parts.push(`A:${a.area_id}`);
    }
    for (const e of Object.values(hass.entities)) {
      const areaId = e.area_id || hass.devices?.[e.device_id]?.area_id;
      if (!areaId) continue;
      const area = hass.areas[areaId];
      if (!area || this._areaFloorId(area) !== this._floorId) continue;
      parts.push(e.entity_id);
    }
    return parts.join("|");
  }

  // ---------- Data extraction ---------------------------------------------
  _areasOnFloor() {
    return Object.values(this._hass.areas)
      .filter((a) => this._areaFloorId(a) === this._floorId)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  _entitiesForArea(area) {
    const hass = this._hass;
    return Object.values(hass.entities)
      .filter((e) => {
        if (e.hidden) return false;
        const areaId = e.area_id || hass.devices?.[e.device_id]?.area_id;
        return areaId === area.area_id;
      });
  }

  _classify(area, entities) {
    const hass = this._hass;
    const out = {
      lights: [],
      covers: [],
      doors: [], // binary_sensor with door/window/garage_door classes
      climates: [],
      vacuums: [],
      scenes: [],
      mediaPlayers: [],
      sensors: { motion: [], leak: [], soil: [], propane: [], temp: null, humid: null },
      automations: [],
      scripts: [],
    };

    for (const e of entities) {
      const domain = e.entity_id.split(".")[0];
      const st = hass.states?.[e.entity_id];
      const dc = st?.attributes?.device_class;
      if (domain === "light") out.lights.push(e);
      else if (domain === "cover") out.covers.push(e);
      else if (domain === "climate") out.climates.push(e);
      else if (domain === "vacuum") out.vacuums.push(e);
      else if (domain === "scene") out.scenes.push(e);
      else if (domain === "media_player") out.mediaPlayers.push(e);
      else if (domain === "automation") out.automations.push(e);
      else if (domain === "script") out.scripts.push(e);
      else if (domain === "binary_sensor") {
        if (dc === "motion" || dc === "occupancy" || dc === "presence") out.sensors.motion.push(e);
        else if (dc === "moisture") out.sensors.leak.push(e);
        else if (dc === "door" || dc === "garage_door" || dc === "window" || dc === "opening") out.doors.push(e);
      } else if (domain === "sensor") {
        if (
          matchesAny(e.entity_id, ["soil", "plant"])
          && dc !== "battery"
          && !matchesAny(e.entity_id, ["battery"])
          && (dc === "moisture" || st?.attributes?.unit_of_measurement === "%")
        ) {
          out.sensors.soil.push(e);
        } else if (matchesAny(e.entity_id, ["propane", "fuel_tank", "gas_tank"])) {
          out.sensors.propane.push(e);
        } else if (dc === "temperature") {
          // Prefer the area-bound temperature sensor; otherwise use first.
          if (e.entity_id === area.temperature_entity_id || !out.sensors.temp) out.sensors.temp = e;
        } else if (dc === "humidity" && !matchesAny(e.entity_id, ["soil"])) {
          if (e.entity_id === area.humidity_entity_id || !out.sensors.humid) out.sensors.humid = e;
        }
      }
    }

    return out;
  }

  // ---------- Service helpers ---------------------------------------------
  _call(domain, service, data) {
    if (!this._hass) return;
    return this._hass.callService(domain, service, data);
  }

  _moreInfo(entityId) {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  // ---------- DOM building ------------------------------------------------
  _build() {
    if (!this._hass) return;
    this.innerHTML = "";
    // Styles live as a child of this element so they sit in the same shadow
    // scope as our descendants — `document.head` doesn't reach inside
    // hui-card's shadow root.
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLE;
    this.appendChild(styleEl);

    const root = document.createElement("div");
    root.className = "v2-root";
    this._refs = { areas: new Map() };

    const areas = this._areasOnFloor();
    // Per-floor views opt into default-expanded so each room's controls are
    // visible on tab open. Seed once so manual collapses survive rebuilds.
    if (this._defaultExpanded && !this._seededDefault) {
      for (const a of areas) this._expanded.add(a.area_id);
      this._seededDefault = true;
    }
    for (const area of areas) {
      const entities = this._entitiesForArea(area);
      const data = this._classify(area, entities);
      if (this._areaIsEmpty(data)) continue;
      const card = this._buildRoomCard(area, data);
      root.appendChild(card);
    }
    this.appendChild(root);
    this._update(); // first state pass
  }

  _areaIsEmpty(d) {
    return (
      d.lights.length === 0 &&
      d.covers.length === 0 &&
      d.doors.length === 0 &&
      d.climates.length === 0 &&
      d.vacuums.length === 0 &&
      d.scenes.length === 0 &&
      d.automations.length === 0 &&
      d.scripts.length === 0 &&
      !d.sensors.temp &&
      !d.sensors.humid &&
      d.sensors.motion.length === 0
    );
  }

  _buildRoomCard(area, data) {
    const expanded = this._expanded.has(area.area_id);
    const card = document.createElement("div");
    card.className = "v2-room" + (expanded ? " expanded" : "");
    card.dataset.area = area.area_id;

    // Seed the per-area ref entry early — every section builder below mutates
    // `this._refs.areas.get(area.area_id).<map>` while wiring its tiles, so the
    // entry must already exist when they run.
    const areaRef = {
      card, data,
      lights: new Map(),
      climates: new Map(), vacuums: new Map(), automations: new Map(),
    };
    this._refs.areas.set(area.area_id, areaRef);

    // Header row -----------------------------------------------------------
    const row = document.createElement("div");
    row.className = "v2-row";
    row.addEventListener("click", () => this._toggleExpanded(area.area_id));

    const icon = document.createElement("div");
    icon.className = "v2-room-icon";
    icon.innerHTML = `<ha-icon icon="${iconForArea(area)}" style="--mdc-icon-size:28px"></ha-icon>`;

    const mid = document.createElement("div");
    mid.className = "v2-room-mid";
    const titleRow = document.createElement("div");
    titleRow.className = "v2-room-title-row";
    const title = document.createElement("div");
    title.className = "v2-room-name";
    title.textContent = nameWithoutStairs(area.name);
    titleRow.appendChild(title);
    const motionPill = document.createElement("div");
    motionPill.className = "v2-motion-pill";
    motionPill.style.display = "none";
    motionPill.innerHTML = `<ha-icon icon="mdi:motion-sensor" style="--mdc-icon-size:14px"></ha-icon><span>motion</span>`;
    titleRow.appendChild(motionPill);
    mid.appendChild(titleRow);

    const chips = document.createElement("div");
    chips.className = "v2-chips";
    mid.appendChild(chips);

    const actions = document.createElement("div");
    actions.className = "v2-room-actions";
    const bulbBtn = document.createElement("button");
    bulbBtn.className = "v2-quick-btn";
    bulbBtn.style.display = data.lights.length ? "inline-flex" : "none";
    bulbBtn.innerHTML = `<ha-icon icon="mdi:lightbulb" style="--mdc-icon-size:14px"></ha-icon><span class="count" style="font-size:12px;font-weight:600;display:none"></span>`;
    bulbBtn.addEventListener("click", (e) => { e.stopPropagation(); this._toggleAllLights(data.lights); });
    actions.appendChild(bulbBtn);
    const coverBtn = document.createElement("button");
    coverBtn.className = "v2-quick-btn";
    coverBtn.style.display = data.covers.length ? "inline-flex" : "none";
    coverBtn.innerHTML = `<ha-icon icon="mdi:blinds-horizontal" style="--mdc-icon-size:14px"></ha-icon>`;
    coverBtn.addEventListener("click", (e) => { e.stopPropagation(); this._toggleAllCovers(data.covers); });
    actions.appendChild(coverBtn);
    const chev = document.createElement("span");
    chev.className = "v2-chev";
    chev.innerHTML = `<ha-icon icon="mdi:chevron-down" style="--mdc-icon-size:16px"></ha-icon>`;
    actions.appendChild(chev);

    row.append(icon, mid, actions);
    card.appendChild(row);

    // Body -----------------------------------------------------------------
    // Wrap the body in a grid container so we can animate from 0fr to 1fr
    // (height: 0 -> auto). .v2-body provides the clip (overflow:hidden +
    // min-height:0). .v2-body-inner carries the padding — keeping padding off
    // .v2-body prevents it from leaking visible height when collapsed.
    const bodyWrap = document.createElement("div");
    bodyWrap.className = "v2-body-wrap";
    const body = document.createElement("div");
    body.className = "v2-body";
    const bodyInner = document.createElement("div");
    bodyInner.className = "v2-body-inner";

    const sections = [];
    if (data.lights.length) sections.push(this._buildLightsSection(area, data.lights));
    if (data.climates.length) sections.push(this._buildClimateSection(area, data.climates, data.sensors));
    if (data.vacuums.length) sections.push(this._buildVacuumSection(area, data.vacuums));
    if (data.scenes.length) sections.push(this._buildScenesSection(area, data.scenes));
    const drawer = this._buildAutomationsDrawer(area, data.automations, data.scripts);
    if (drawer) sections.push(drawer);
    for (const s of sections) bodyInner.appendChild(s);

    body.appendChild(bodyInner);
    bodyWrap.appendChild(body);
    card.appendChild(bodyWrap);

    // Attach the remaining header refs onto the entry seeded at the top.
    Object.assign(areaRef, { row, icon, motionPill, chips, bulbBtn, coverBtn, body });
    return card;
  }

  // ---------- Sections ----------------------------------------------------
  _section(title, children) {
    const wrap = document.createElement("div");
    const header = document.createElement("div");
    header.className = "v2-section-header";
    const t = document.createElement("div");
    t.className = "v2-section-title";
    t.textContent = title;
    header.appendChild(t);
    wrap.appendChild(header);
    const inner = document.createElement("div");
    inner.style.cssText = "display:flex;flex-direction:column;gap:6px";
    if (Array.isArray(children)) children.forEach((c) => inner.appendChild(c));
    else inner.appendChild(children);
    wrap.appendChild(inner);
    return wrap;
  }

  _buildLightsSection(area, lights) {
    const grid = document.createElement("div");
    grid.className = "v2-grid " + (lights.length === 1 ? "cols-1" : "cols-2");
    for (const light of lights) grid.appendChild(this._buildLightTile(area, light));
    return this._section("Lights", grid);
  }

  _buildLightTile(area, light) {
    const tile = document.createElement("div");
    tile.className = "v2-tile";
    tile.dataset.entity = light.entity_id;

    const fill = document.createElement("div");
    fill.className = "v2-tile-fill light";
    tile.appendChild(fill);
    const thumb = document.createElement("div");
    thumb.className = "v2-tile-thumb light";
    thumb.style.display = "none";
    tile.appendChild(thumb);

    const body = document.createElement("div");
    body.className = "v2-tile-body";
    const swatch = document.createElement("div");
    swatch.className = "v2-swatch";
    swatch.title = "Open entity";
    swatch.innerHTML = `<ha-icon icon="${ICONS.bulb}" style="--mdc-icon-size:14px"></ha-icon>`;
    swatch.addEventListener("pointerdown", (e) => e.stopPropagation());
    swatch.addEventListener("pointerup", (e) => e.stopPropagation());
    swatch.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      this._moreInfo(light.entity_id);
    });
    const text = document.createElement("div");
    text.className = "v2-tile-text";
    const name = document.createElement("div");
    name.className = "v2-tile-name";
    name.textContent = nameWithoutAreaPrefix(this._entityName(light), area);
    const state = document.createElement("div");
    state.className = "v2-tile-state";
    text.append(name, state);
    body.append(swatch, text);
    tile.appendChild(body);

    this._bindSwipeTile(tile, fill, thumb, swatch, state, light.entity_id, "light");

    const ref = { tile, fill, thumb, swatch, state, name };
    this._refs.areas.get(area.area_id).lights.set(light.entity_id, ref);
    return tile;
  }

  _buildClimateSection(area, climates, sensors) {
    const grid = document.createElement("div");
    grid.className = "v2-grid " + (climates.length > 1 ? "cols-2" : "cols-1");
    grid.style.gap = "8px";
    for (const c of climates) grid.appendChild(this._buildClimateTile(area, c, sensors));
    return this._section("Climate", grid);
  }

  _buildClimateTile(area, climate, sensors) {
    const tile = document.createElement("div");
    tile.className = "v2-climate";
    tile.dataset.entity = climate.entity_id;

    // Background layer: dimmed 24h history graph behind everything.
    const bg = document.createElement("div");
    bg.className = "v2-climate-bg";
    let graph = null;
    const tempId =
      this._findTemperatureSensorForDevice(climate.device_id) ||
      area.temperature_entity_id;
    if (tempId) {
      graph = this._tryCreateMiniGraph(tempId, climate.entity_id);
      if (graph) bg.appendChild(graph);
    }
    tile.appendChild(bg);

    // Foreground content
    const content = document.createElement("div");
    content.className = "v2-climate-content";
    tile.appendChild(content);

    // Header row: swatch + name + state
    const row = document.createElement("div");
    row.className = "v2-climate-row";
    const swatch = document.createElement("div");
    swatch.className = "v2-swatch";
    swatch.style.cursor = "pointer";
    swatch.innerHTML = `<ha-icon icon="${ICONS.thermo}" style="--mdc-icon-size:13px"></ha-icon>`;
    const text = document.createElement("div");
    text.style.flex = "1";
    const name = document.createElement("div");
    name.style.cssText = `font-size:13.5px;line-height:16px;color:${TONE.text}`;
    name.textContent = nameWithoutAreaPrefix(this._entityName(climate), area);
    const sub = document.createElement("div");
    sub.style.cssText = "font-size:11.5px;line-height:14px;text-transform:capitalize;display:flex;align-items:center;gap:6px";
    text.append(name, sub);
    row.append(swatch, text);
    content.appendChild(row);

    // 24h meta strip (label + min/max range).
    const meta = document.createElement("div");
    meta.className = "v2-climate-meta";
    const metaLabel = document.createElement("span");
    metaLabel.textContent = "24h";
    const metaRange = document.createElement("span");
    metaRange.className = "v2-climate-meta-range";
    meta.append(metaLabel, metaRange);
    content.appendChild(meta);

    // Setpoint controls
    const setpointRow = document.createElement("div");
    setpointRow.className = "v2-climate-target";
    const minus = document.createElement("button");
    minus.className = "v2-tiny-btn";
    minus.innerHTML = `<ha-icon icon="${ICONS.minus}" style="--mdc-icon-size:14px"></ha-icon>`;
    minus.addEventListener("click", (e) => { e.stopPropagation(); this._adjustClimate(climate.entity_id, -0.5); });
    const temp = document.createElement("div");
    temp.className = "v2-climate-temp";
    const plus = document.createElement("button");
    plus.className = "v2-tiny-btn";
    plus.innerHTML = `<ha-icon icon="${ICONS.plus}" style="--mdc-icon-size:14px"></ha-icon>`;
    plus.addEventListener("click", (e) => { e.stopPropagation(); this._adjustClimate(climate.entity_id, 0.5); });
    setpointRow.append(minus, temp, plus);
    content.appendChild(setpointRow);

    // Extras row (heat pump fan / swing dropdowns)
    const extras = document.createElement("div");
    extras.className = "v2-climate-extras";
    extras.style.display = "none";
    const fanMenu = this._buildClimateMenu("fan", climate.entity_id);
    const swingMenu = this._buildClimateMenu("swing", climate.entity_id);
    extras.append(fanMenu.el, swingMenu.el);
    content.appendChild(extras);

    // Mode dropdown is anchored to the swatch. When the entity has multiple
    // hvac modes the swatch opens a mode picker; otherwise it opens more-info.
    let modeItems = [], modeCurrent = null, modeOnPick = () => {};
    const modeMenu = {
      setItems: (items, current, onPick) => {
        modeItems = items;
        modeCurrent = current;
        modeOnPick = onPick;
      },
    };

    swatch.addEventListener("click", (e) => {
      e.stopPropagation();
      if (swatch.dataset.menu === "mode") {
        this._openClimateMenu(swatch, modeItems, modeCurrent, modeOnPick);
      } else {
        this._moreInfo(climate.entity_id);
      }
    });

    const ref = { tile, swatch, name, sub, temp, extras, graph, meta, metaRange, modeMenu, fanMenu, swingMenu };
    this._refs.areas.get(area.area_id).climates.set(climate.entity_id, ref);
    return tile;
  }

  // Shared list popover for hvac mode / fan / swing pickers. Items rebuild
  // on every open so the active marker tracks the live state.
  _openClimateMenu(anchor, items, current, onPick) {
    v2EnsurePopoverItemStyle();
    const list = document.createElement("div");
    list.className = "v2-pop-menu";
    for (const it of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "v2-pop-menu-item" + (it.id === current ? " active" : "");
      b.innerHTML = `<ha-icon icon="${it.icon || ICONS.thermo}"></ha-icon><span>${it.label}</span>`;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        closePopoverFor(anchor);
        onPick(it.id);
      });
      list.appendChild(b);
    }
    openPopover({ anchor, content: list });
  }

  _buildClimateMenu(kind, entityId) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "v2-climate-menu-btn";
    const iconMap = { mode: ICONS.thermo, fan: ICONS.fan, swing: ICONS.swing };
    const icon = iconMap[kind] || ICONS.cogs;
    btn.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span class="label"></span>`;

    let cachedItems = [], cachedCurrent = null, cachedOnPick = () => {};
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._openClimateMenu(btn, cachedItems, cachedCurrent, cachedOnPick);
    });

    const setItems = (items, current, onPick) => {
      cachedItems = items;
      cachedCurrent = current;
      cachedOnPick = onPick;
      const matched = items.find((i) => i.id === current);
      btn.querySelector(".label").textContent = matched?.label || (current || "—");
    };

    return { el: btn, btn, setItems };
  }

  _findTemperatureSensorForDevice(deviceId) {
    if (!deviceId) return null;
    const found = Object.values(this._hass.entities).find(
      (e) =>
        e.device_id === deviceId &&
        e.entity_id.startsWith("sensor.") &&
        this._hass.states?.[e.entity_id]?.attributes?.device_class === "temperature"
    );
    return found?.entity_id || null;
  }

  _tryCreateMiniGraph(sensorId, climateId) {
    try {
      const el = document.createElement("mini-graph-card");
      el.setConfig({
        entities: [
          { entity: sensorId, name: "Temperature", color: TONE.cool, show_line: true, show_points: false, show_fill: true },
          {
            entity: climateId,
            attribute: "temperature",
            name: "Target",
            color: TONE.heat,
            show_line: true,
            show_points: false,
            show_legend: false,
            show_fill: false,
          },
        ],
        hours_to_show: 24,
        points_per_hour: 2,
        line_width: 1.6,
        height: 120,
        show: { name: false, icon: false, state: false, legend: false, extrema: false, labels: false, labels_secondary: false, fill: "fade" },
        animate: false,
      });
      el.hass = this._hass;
      return el;
    } catch (_) {
      return null;
    }
  }

  _adjustClimate(entityId, delta) {
    const st = this._hass.states?.[entityId];
    if (!st) return;
    const cur = st.attributes?.temperature;
    if (cur == null) return;
    this._call("climate", "set_temperature", {
      entity_id: entityId,
      temperature: Math.round((cur + delta) * 2) / 2,
    });
  }

  _buildVacuumSection(area, vacuums) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:8px";
    for (const v of vacuums) wrap.appendChild(this._buildVacuumTile(area, v));
    return this._section("Vacuum", wrap);
  }

  _buildVacuumTile(area, vacuum) {
    const tile = document.createElement("div");
    tile.className = "v2-vacuum";
    tile.dataset.entity = vacuum.entity_id;

    const row = document.createElement("div");
    row.className = "v2-vacuum-row";
    const swatch = document.createElement("div");
    swatch.className = "v2-swatch";
    swatch.style.width = "30px";
    swatch.style.height = "30px";
    swatch.innerHTML = `<ha-icon icon="${ICONS.vacuum}" style="--mdc-icon-size:16px"></ha-icon>`;
    swatch.addEventListener("click", () => this._moreInfo(vacuum.entity_id));
    const text = document.createElement("div");
    text.style.flex = "1";
    const name = document.createElement("div");
    name.style.cssText = `font-size:14px;font-weight:500;color:${TONE.text}`;
    name.textContent = nameWithoutAreaPrefix(this._entityName(vacuum), area);
    const sub = document.createElement("div");
    sub.style.cssText = "font-size:11.5px;display:flex;align-items:center;gap:6px";
    text.append(name, sub);
    const batt = document.createElement("span");
    batt.style.cssText = "font-size:12px;font-weight:600;font-variant-numeric:tabular-nums";
    row.append(swatch, text, batt);
    tile.appendChild(row);

    const primary = document.createElement("button");
    primary.className = "v2-vacuum-primary";
    tile.appendChild(primary);

    const cmds = document.createElement("div");
    cmds.className = "v2-vacuum-cmd-row";
    const mkCmd = (icon, action, service) => {
      const b = document.createElement("button");
      b.className = "v2-vacuum-cmd";
      b.dataset.action = action;
      b.innerHTML = `<ha-icon icon="${icon}" style="--mdc-icon-size:14px"></ha-icon>`;
      b.addEventListener("click", () => this._call("vacuum", service, { entity_id: vacuum.entity_id }));
      cmds.appendChild(b);
      return b;
    };
    const cStart = mkCmd(ICONS.play, "start", "start");
    const cPause = mkCmd(ICONS.pause, "pause", "pause");
    const cStop = mkCmd(ICONS.stop, "stop", "stop");
    const cLoc = mkCmd(ICONS.pin, "locate", "locate");
    const cDock = mkCmd(ICONS.dock, "return", "return_to_base");
    tile.appendChild(cmds);

    primary.addEventListener("click", () => {
      const st = this._hass.states?.[vacuum.entity_id];
      const isCleaning = st?.state === "cleaning" || st?.state === "returning";
      this._call("vacuum", isCleaning ? "pause" : "start", { entity_id: vacuum.entity_id });
    });

    const ref = { tile, swatch, name, sub, batt, primary, cmds: { start: cStart, pause: cPause, stop: cStop, loc: cLoc, dock: cDock } };
    this._refs.areas.get(area.area_id).vacuums.set(vacuum.entity_id, ref);
    return tile;
  }

  _buildScenesSection(area, scenes) {
    const wrap = document.createElement("div");
    wrap.className = "v2-scenes";
    for (const s of scenes) {
      const btn = document.createElement("button");
      btn.className = "v2-scene-btn";
      const sceneName = this._entityName(s);
      btn.title = sceneName;
      btn.innerHTML = `<ha-icon icon="${iconForScene(s, sceneName)}"></ha-icon><span class="v2-scene-btn-name"></span>`;
      btn.querySelector(".v2-scene-btn-name").textContent = nameWithoutAreaPrefix(sceneName, area);
      btn.addEventListener("click", () => this._call("scene", "turn_on", { entity_id: s.entity_id }));
      wrap.appendChild(btn);
    }
    const header = document.createElement("div");
    header.className = "v2-section-header";
    const t = document.createElement("div");
    t.className = "v2-section-title";
    t.textContent = "Scenes";
    const hint = document.createElement("div");
    hint.className = "v2-section-hint";
    hint.textContent = `${scenes.length}`;
    header.append(t, hint);
    const section = document.createElement("div");
    section.appendChild(header);
    section.appendChild(wrap);
    return section;
  }

  _buildAutomationsDrawer(area, automations, scripts) {
    const items = [...automations, ...scripts];
    if (!items.length) return null;
    const total = items.length;
    const disabledCount = automations.filter((a) => this._hass.states?.[a.entity_id]?.state === "off").length;

    let titleBase;
    if (automations.length && scripts.length) titleBase = "Automations &amp; scripts";
    else if (scripts.length) titleBase = scripts.length > 1 ? "Scripts" : "Script";
    else titleBase = automations.length > 1 ? "Automations" : "Automation";
    const popTitleBase = titleBase.replace("&amp;", "&");
    const metaText = `· ${total}${disabledCount ? ` · ${disabledCount} off` : ""}`;
    const popTitle = `${popTitleBase} · ${total}${disabledCount ? ` (${disabledCount} off)` : ""}`;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "v2-autos-trigger";
    trigger.innerHTML = `
      <span class="v2-autos-trigger-iconwrap"><ha-icon icon="${ICONS.cogs}" style="--mdc-icon-size:12px"></ha-icon></span>
      <span class="v2-autos-trigger-label">${titleBase}</span>
      <span class="v2-autos-trigger-meta">${metaText}</span>
    `;
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this._openAutomationsPopover(area, items, trigger, popTitle);
    });
    return trigger;
  }

  _openAutomationsPopover(area, items, anchor, title) {
    v2EnsurePopoverItemStyle();

    const root = document.createElement("div");
    root.appendChild(buildPopoverHeader(title));
    const listEl = document.createElement("div");
    listEl.className = "v2-pop-list v2-pop-list-rooms";
    for (const item of items) listEl.appendChild(this._buildAutomationRow(area, item));
    root.appendChild(listEl);

    openPopover({
      anchor,
      content: root,
      width: Math.min(340, window.innerWidth - 24),
      onClose: () => anchor.classList.remove("open"),
    });
    anchor.classList?.add?.("open");
  }

  _buildAutomationRow(area, item) {
    const hass = this._hass;
    const state = hass.states?.[item.entity_id];
    const isScript = item.entity_id.startsWith("script.");
    const enabled = isScript ? true : state?.state !== "off";

    const row = document.createElement("div");
    row.className = "v2-auto-row" + (!enabled ? " disabled" : "");
    row.dataset.entity = item.entity_id;

    // Icon swatch — toggle for automations, static for scripts
    let swatch;
    if (isScript) {
      swatch = document.createElement("div");
      swatch.className = "v2-auto-swatch script";
      swatch.innerHTML = `<ha-icon icon="${ICONS.script}" style="--mdc-icon-size:15px"></ha-icon>`;
    } else {
      swatch = document.createElement("button");
      swatch.className = "v2-auto-swatch";
      swatch.innerHTML = `<ha-icon icon="${ICONS.cogs}" style="--mdc-icon-size:15px"></ha-icon>` +
        `<svg class="slash" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:${enabled ? "none" : "block"}">
           <line x1="4" y1="20" x2="20" y2="4" stroke="${TONE.textMute}" stroke-width="1.8" stroke-linecap="round" />
         </svg>`;
      swatch.title = enabled ? "Disable automation" : "Enable automation";
      swatch.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOn = this._hass.states?.[item.entity_id]?.state !== "off";
        this._call("automation", isOn ? "turn_off" : "turn_on", { entity_id: item.entity_id });
      });
    }

    const body = document.createElement("button");
    body.className = "v2-auto-body";
    body.addEventListener("click", () => this._moreInfo(item.entity_id));
    const name = document.createElement("div");
    name.className = "v2-auto-name" + (enabled ? "" : " disabled");
    name.textContent = this._entityName(item);
    const last = document.createElement("div");
    last.className = "v2-auto-last";
    const labels = document.createElement("div");
    labels.className = "v2-auto-labels";
    body.append(name, last, labels);

    const play = document.createElement("button");
    play.className = "v2-auto-play" + (!enabled ? " disabled" : "");
    play.title = isScript ? "Run script" : "Trigger automation";
    play.innerHTML = `<ha-icon icon="${isScript ? ICONS.play_circle : ICONS.play}" style="--mdc-icon-size:${isScript ? 16 : 13}px"></ha-icon>`;
    play.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isScript) {
        this._call("script", "turn_on", { entity_id: item.entity_id });
        return;
      }
      const isOn = this._hass.states?.[item.entity_id]?.state !== "off";
      if (!isOn) return;
      this._call("automation", "trigger", { entity_id: item.entity_id });
    });

    row.append(swatch, body, play);

    const ref = { row, swatch, name, last, labels, play, isScript };
    this._refs.areas.get(area.area_id).automations.set(item.entity_id, ref);
    return row;
  }

  // ---------- Pointer / gesture --------------------------------------------
  _bindSwipeTile(tile, fill, thumb, swatch, stateEl, entityId, kind) {
    const ref = {
      startX: 0, startY: 0, dragging: false, longPress: false, lpTimer: 0,
      pointerId: null, onMove: null, onUp: null, onCancel: null,
    };
    const detach = () => {
      if (ref.onMove) window.removeEventListener("pointermove", ref.onMove);
      if (ref.onUp) window.removeEventListener("pointerup", ref.onUp);
      if (ref.onCancel) window.removeEventListener("pointercancel", ref.onCancel);
      ref.onMove = ref.onUp = ref.onCancel = null;
      if (ref.pointerId !== null) {
        try { tile.releasePointerCapture(ref.pointerId); } catch (_) {}
      }
      ref.pointerId = null;
    };
    const resetVisuals = () => {
      fill.style.transition = "";
      thumb.style.transition = "";
    };

    tile.addEventListener("pointerdown", (e) => {
      if (tile.classList.contains("unavailable")) return;
      if (ref.pointerId !== null) return; // already tracking another pointer
      ref.startX = e.clientX;
      ref.startY = e.clientY;
      ref.dragging = false;
      ref.longPress = false;
      ref.pointerId = e.pointerId;
      try { tile.setPointerCapture(e.pointerId); } catch (_) {}
      tile.classList.add("pressed");
      ref.lpTimer = setTimeout(() => {
        ref.longPress = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
        this._moreInfo(entityId);
      }, 480);

      ref.onMove = (ev) => {
        if (ev.pointerId !== ref.pointerId) return;
        const dx = ev.clientX - ref.startX;
        const dy = ev.clientY - ref.startY;
        if (!ref.dragging && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
          ref.dragging = true;
          clearTimeout(ref.lpTimer);
        }
        if (ref.dragging) {
          const r = tile.getBoundingClientRect();
          const pct = Math.max(0, Math.min(100, Math.round(((ev.clientX - r.left) / r.width) * 100)));
          this._dragState.set(entityId, { pct, kind });
          // Live preview during drag — disable easing on BOTH fill and thumb so they track together
          fill.style.transition = "none";
          fill.style.width = `${pct}%`;
          thumb.style.transition = "none";
          thumb.style.display = "block";
          thumb.style.left = `calc(${pct}% - 2px)`;
          thumb.style.opacity = "1";
          stateEl.textContent = `${pct}%`;
          stateEl.classList.add(kind === "light" ? "on-light" : "on-cover");
        }
      };

      ref.onUp = (ev) => {
        if (ev.pointerId !== ref.pointerId) return;
        clearTimeout(ref.lpTimer);
        const drag = this._dragState.get(entityId);
        this._dragState.delete(entityId);
        const wasDragging = ref.dragging;
        const wasLongPress = ref.longPress;
        detach();
        tile.classList.remove("pressed");
        ref.startX = 0;
        ref.dragging = false;
        resetVisuals();
        if (wasDragging && drag) {
          if (kind === "light") {
            if (drag.pct <= 0) this._call("light", "turn_off", { entity_id: entityId });
            else this._call("light", "turn_on", { entity_id: entityId, brightness_pct: drag.pct });
          } else {
            if (drag.pct <= 0) this._call("cover", "close_cover", { entity_id: entityId });
            else if (drag.pct >= 100) this._call("cover", "open_cover", { entity_id: entityId });
            else this._call("cover", "set_cover_position", { entity_id: entityId, position: drag.pct });
          }
        } else if (!wasLongPress) {
          // Tap — pointer capture guarantees this pointer-down/up sequence
          // belongs to this tile, so toggle without consulting ev.target
          // (which is unreliable under capture / shadow DOM).
          if (kind === "light") {
            const st = this._hass.states?.[entityId];
            if (st?.state === "on") this._call("light", "turn_off", { entity_id: entityId });
            else this._call("light", "turn_on", { entity_id: entityId, brightness_pct: 100 });
          } else {
            const pct = fmtCoverPct(this._hass.states?.[entityId] || { attributes: {} });
            this._call("cover", pct > 5 ? "close_cover" : "open_cover", { entity_id: entityId });
          }
        }
      };

      ref.onCancel = (ev) => {
        if (ev.pointerId !== ref.pointerId) return;
        clearTimeout(ref.lpTimer);
        this._dragState.delete(entityId);
        detach();
        tile.classList.remove("pressed");
        ref.startX = 0;
        ref.dragging = false;
        resetVisuals();
      };

      window.addEventListener("pointermove", ref.onMove);
      window.addEventListener("pointerup", ref.onUp);
      window.addEventListener("pointercancel", ref.onCancel);
    });
  }

  _toggleExpanded(areaId) {
    const card = this._refs.areas.get(areaId)?.card;
    if (!card) return;
    if (this._expanded.has(areaId)) {
      this._expanded.delete(areaId);
      card.classList.remove("expanded");
    } else {
      this._expanded.add(areaId);
      card.classList.add("expanded");
      // Wait for the body's height transition (250ms) to settle, then nudge
      // the page just enough to reveal any overflow at the bottom. With
      // `block: "nearest"` + scroll-margin-bottom on .v2-room, this is a
      // no-op when the expanded card is already fully visible.
      setTimeout(() => {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 270);
    }
  }

  _toggleAllLights(lights) {
    if (!lights.length) return;
    const ids = lights.map((l) => l.entity_id);
    const anyOn = ids.some((id) => this._hass.states?.[id]?.state === "on");
    this._call("light", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
  }

  _toggleAllCovers(covers) {
    if (!covers.length) return;
    const ids = covers.map((c) => c.entity_id);
    const anyOpen = ids.some((id) => fmtCoverPct(this._hass.states?.[id] || { attributes: {} }) > 5);
    this._call("cover", anyOpen ? "close_cover" : "open_cover", { entity_id: ids });
  }

  _entityName(entity) {
    if (entity.name) return entity.name;
    const st = this._hass.states?.[entity.entity_id];
    return (
      st?.attributes?.friendly_name ||
      entity.entity_id.split(".").pop().replace(/_/g, " ")
    );
  }

  // ---------- Incremental state update -------------------------------------
  _update() {
    if (!this._refs) return;
    const hass = this._hass;
    for (const [areaId, ar] of this._refs.areas) {
      this._updateChips(ar);
      this._updateQuickButtons(ar);

      for (const [entId, ref] of ar.lights) this._updateLightRef(ref, entId);
      for (const [entId, ref] of ar.climates) this._updateClimateRef(ref, entId);
      for (const [entId, ref] of ar.vacuums) this._updateVacuumRef(ref, entId);
      for (const [entId, ref] of ar.automations) this._updateAutomationRef(ref, entId);
    }
  }

  _updateChips(ar) {
    const hass = this._hass;
    const data = ar.data;
    const chips = ar.chips;
    chips.innerHTML = "";

    // motion pill — clicking it opens the active (or first) motion sensor
    const activeMotion = data.sensors.motion.find((s) => hass.states?.[s.entity_id]?.state === "on") || data.sensors.motion[0];
    const motionOn = !!activeMotion && hass.states?.[activeMotion.entity_id]?.state === "on";
    ar.motionPill.style.display = motionOn ? "inline-flex" : "none";
    ar.motionPill.onclick = activeMotion
      ? (e) => { e.stopPropagation(); this._moreInfo(activeMotion.entity_id); }
      : null;

    const addSpan = (icon, color, text, opts = {}) => {
      const span = document.createElement("span");
      span.className = "v2-chip" + (opts.bg ? " has-bg" : "") + (opts.pulse ? " pulse" : "") + (opts.entityId ? " clickable" : "");
      if (opts.bg) span.style.background = opts.bg;
      span.style.color = color;
      span.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span>${text}</span>`;
      if (opts.entityId) {
        span.addEventListener("click", (e) => {
          e.stopPropagation();
          this._moreInfo(opts.entityId);
        });
      }
      chips.appendChild(span);
    };

    if (data.sensors.temp) {
      const st = hass.states?.[data.sensors.temp.entity_id];
      if (st && st.state !== "unavailable") addSpan(ICONS.thermo, TONE.textDim, `${parseFloat(st.state).toFixed(1)}°`, { entityId: data.sensors.temp.entity_id });
    }
    if (data.sensors.humid) {
      const st = hass.states?.[data.sensors.humid.entity_id];
      if (st && st.state !== "unavailable") addSpan(ICONS.drop, TONE.textDim, `${Math.round(parseFloat(st.state))}%`, { entityId: data.sensors.humid.entity_id });
    }
    for (const s of data.sensors.soil) {
      const st = hass.states?.[s.entity_id];
      if (st && st.state !== "unavailable") addSpan(ICONS.plant, TONE.good, `${Math.round(parseFloat(st.state))}%`, { entityId: s.entity_id });
    }
    // Leak chip — multiple leak sensors get summarised to first-on or "Dry"
    if (data.sensors.leak.length) {
      const leaky = data.sensors.leak.find((s) => hass.states?.[s.entity_id]?.state === "on");
      if (leaky) {
        addSpan(ICONS.leak, TONE.danger, "Leak!", { bg: "rgba(255,82,82,0.16)", pulse: true, entityId: leaky.entity_id });
      } else {
        addSpan(ICONS.leak, TONE.textDim, "Dry", { entityId: data.sensors.leak[0].entity_id });
      }
    }
    for (const d of data.doors) {
      const isOpen = hass.states?.[d.entity_id]?.state === "on";
      const span = document.createElement("span");
      span.className = "v2-chip clickable" + (isOpen ? " has-bg" : "");
      if (isOpen) span.style.background = "rgba(255,138,91,0.16)";
      span.style.color = isOpen ? TONE.heat : TONE.textDim;
      span.title = this._entityName(d);
      span.innerHTML = `<ha-icon icon="${isOpen ? ICONS.door_open : ICONS.door_closed}"></ha-icon>`;
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        this._moreInfo(d.entity_id);
      });
      chips.appendChild(span);
    }
    for (const p of data.sensors.propane) {
      const st = hass.states?.[p.entity_id];
      if (st && st.state !== "unavailable") {
        const pct = Math.round(parseFloat(st.state));
        const c = levelColor(pct);
        addSpan(ICONS.propane, c, `${pct}%`, { bg: `${c}1f`, entityId: p.entity_id });
      }
    }
  }

  _updateQuickButtons(ar) {
    const hass = this._hass;
    const data = ar.data;
    const onCount = data.lights.filter((l) => hass.states?.[l.entity_id]?.state === "on").length;
    const openCount = data.covers.filter((c) => fmtCoverPct(hass.states?.[c.entity_id] || { attributes: {} }) > 5).length;
    ar.icon.classList.toggle("on", onCount > 0);
    ar.bulbBtn.classList.toggle("on-light", onCount > 0);
    const countSpan = ar.bulbBtn.querySelector(".count");
    if (countSpan) {
      countSpan.style.display = onCount > 0 ? "inline" : "none";
      countSpan.textContent = onCount;
    }
    ar.coverBtn.classList.toggle("on-cover", openCount > 0);
  }

  _updateLightRef(ref, entityId) {
    const st = this._hass.states?.[entityId];
    if (!st) return;
    if (this._dragState.has(entityId)) return; // pointer event owns the visuals
    const unavailable = st.state === "unavailable";
    ref.tile.classList.toggle("unavailable", unavailable);
    const on = st.state === "on";
    const pct = fmtBrightnessPct(st);
    ref.fill.style.width = on ? `${pct}%` : "0%";
    ref.thumb.style.left = `calc(${pct}% - 2px)`;
    ref.thumb.style.display = on ? "block" : "none";
    ref.thumb.style.opacity = "0.55";
    ref.swatch.classList.toggle("on-light", on && !unavailable);
    ref.state.classList.toggle("on-light", on && !unavailable);
    ref.state.textContent = unavailable ? "Unavailable" : on ? `${pct}%` : "Off";

    // RGB tint: when the bulb is in a true color mode, use its current rgb_color
    // for the fill/swatch/state accent. White-temperature modes fall back to
    // the default yellow tint via the CSS var defaults.
    const cm = st.attributes?.color_mode;
    const rgb = st.attributes?.rgb_color;
    const colorModes = ["rgb", "hs", "xy", "rgbw", "rgbww"];
    const isColorMode = on && !unavailable && cm && colorModes.includes(cm) && Array.isArray(rgb) && rgb.length >= 3;
    if (isColorMode) {
      const [r, g, b] = rgb;
      ref.tile.style.setProperty("--tile-accent", `rgb(${r},${g},${b})`);
      ref.tile.style.setProperty("--tile-swatch-bg", `rgba(${r},${g},${b},0.20)`);
      ref.tile.style.setProperty("--tile-fill", `linear-gradient(90deg, rgba(${r},${g},${b},0.24) 0%, rgba(${r},${g},${b},0.34) 100%)`);
      ref.tile.style.setProperty("--tile-fill-pressed", `linear-gradient(90deg, rgba(${r},${g},${b},0.40) 0%, rgba(${r},${g},${b},0.52) 100%)`);
    } else {
      ref.tile.style.removeProperty("--tile-accent");
      ref.tile.style.removeProperty("--tile-swatch-bg");
      ref.tile.style.removeProperty("--tile-fill");
      ref.tile.style.removeProperty("--tile-fill-pressed");
    }
  }

  _updateClimateRef(ref, entityId) {
    const st = this._hass.states?.[entityId];
    if (!st) return;
    const mode = st.state;
    const ACCENT = {
      heat: TONE.heat, cool: TONE.cool, dry: "#7fb9ff",
      heat_cool: TONE.text, auto: TONE.text, fan_only: TONE.textDim, off: TONE.textMute,
    };
    const HVAC_LABELS = { auto: "Auto", heat_cool: "Heat/Cool", heat: "Heat", cool: "Cool", dry: "Dry", fan_only: "Fan only", off: "Off" };
    const HVAC_ICONS = { auto: ICONS.auto, heat_cool: ICONS.auto, heat: ICONS.flame, cool: ICONS.snow, dry: ICONS.drop, fan_only: ICONS.fan, off: ICONS.power };
    const accent = ACCENT[mode] || TONE.cool;
    ref.swatch.style.background = `${accent}24`;
    ref.swatch.style.color = accent;
    ref.swatch.innerHTML = `<ha-icon icon="${HVAC_ICONS[mode] || ICONS.thermo}" style="--mdc-icon-size:13px"></ha-icon>`;
    ref.tile.style.opacity = mode === "off" ? "0.85" : "1";

    const attrs = st.attributes || {};
    const cur = attrs.current_temperature;
    const tgt = attrs.temperature;
    const hum = attrs.current_humidity;
    const subParts = [];
    subParts.push(`${(HVAC_LABELS[mode] || mode.replace("_", " "))}${cur != null ? ` · ${cur}°` : ""}`);
    // "Heat" stays gray unless the unit is actively calling for heat — a
    // furnace sitting idle in heat mode shouldn't read as urgent.
    const labelColor = mode === "heat" && attrs.hvac_action !== "heating"
      ? TONE.textDim
      : accent;
    ref.sub.innerHTML = `<span style="color:${labelColor}">${subParts.join(" ")}</span>` +
      (hum != null
        ? `<span style="color:${TONE.textDim};display:inline-flex;align-items:center;gap:3px;text-transform:none"><ha-icon icon="${ICONS.drop}" style="--mdc-icon-size:10px"></ha-icon>${Math.round(hum)}%</span>`
        : "");

    if (tgt != null && mode !== "off" && mode !== "fan_only") {
      ref.temp.textContent = `${(+tgt).toFixed(1)}°`;
    } else {
      ref.temp.textContent = mode === "off" ? "Off" : "—";
    }

    // Wire dropdowns based on entity capabilities.
    const hvacModes = Array.isArray(attrs.hvac_modes) ? attrs.hvac_modes : [];
    const fanModes = Array.isArray(attrs.fan_modes) ? attrs.fan_modes : [];
    const swingModes = Array.isArray(attrs.swing_modes) ? attrs.swing_modes : [];
    const isMultiMode = hvacModes.length > 1;

    ref.swatch.dataset.menu = isMultiMode ? "mode" : "";
    if (isMultiMode) {
      ref.modeMenu.setItems(
        hvacModes.map((m) => ({ id: m, label: HVAC_LABELS[m] || m, icon: HVAC_ICONS[m] })),
        mode,
        (id) => this._call("climate", "set_hvac_mode", { entity_id: entityId, hvac_mode: id }),
      );
    }

    const showFan = fanModes.length > 1 && mode !== "off";
    const showSwing = swingModes.length > 1 && mode !== "off";
    if (showFan) {
      ref.fanMenu.el.style.display = "";
      ref.fanMenu.setItems(
        fanModes.map((f) => ({ id: f, label: capitalize(f.replace(/_/g, " ")) })),
        attrs.fan_mode,
        (id) => this._call("climate", "set_fan_mode", { entity_id: entityId, fan_mode: id }),
      );
    } else {
      ref.fanMenu.el.style.display = "none";
    }
    if (showSwing) {
      ref.swingMenu.el.style.display = "";
      ref.swingMenu.setItems(
        swingModes.map((s) => ({ id: s, label: capitalize(s.replace(/_/g, " ")) })),
        attrs.swing_mode,
        (id) => this._call("climate", "set_swing_mode", { entity_id: entityId, swing_mode: id }),
      );
    } else {
      ref.swingMenu.el.style.display = "none";
    }
    ref.extras.style.display = (showFan || showSwing) ? "flex" : "none";

    // Best-effort 24h min/max from the temperature sensor (mini-graph internals
    // aren't a stable API; we fall back gracefully if unavailable).
    if (ref.metaRange) {
      try {
        const bounds = ref.graph?.bound;
        if (Array.isArray(bounds) && bounds.length === 2 && isFinite(bounds[0]) && isFinite(bounds[1])) {
          ref.metaRange.textContent = `${(+bounds[0]).toFixed(1)}° · ${(+bounds[1]).toFixed(1)}°`;
        } else if (cur != null) {
          ref.metaRange.textContent = "";
        }
      } catch (_) {
        ref.metaRange.textContent = "";
      }
    }

    // Update mini-graph hass binding
    if (ref.graph) ref.graph.hass = this._hass;
  }

  _updateVacuumRef(ref, entityId) {
    const st = this._hass.states?.[entityId];
    if (!st) return;
    const VACUUM_STATUS = {
      docked:    { label: "Docked",    color: TONE.textDim, primary: "Start cleaning", primaryIcon: ICONS.play, primaryService: "start" },
      cleaning:  { label: "Cleaning",  color: TONE.good,    primary: "Pause",          primaryIcon: ICONS.pause, primaryService: "pause" },
      paused:    { label: "Paused",    color: TONE.light,   primary: "Resume",         primaryIcon: ICONS.play, primaryService: "start" },
      returning: { label: "Returning", color: TONE.cool,    primary: "Pause",          primaryIcon: ICONS.pause, primaryService: "pause" },
      error:     { label: "Error",     color: TONE.danger,  primary: "Retry",          primaryIcon: ICONS.play, primaryService: "start" },
      idle:      { label: "Idle",      color: TONE.textDim, primary: "Start cleaning", primaryIcon: ICONS.play, primaryService: "start" },
    };
    const status = VACUUM_STATUS[st.state] || VACUUM_STATUS.idle;
    ref.swatch.style.background = (st.state === "cleaning" || st.state === "returning") ? "rgba(92,198,255,0.18)" : "rgba(255,255,255,0.05)";
    ref.swatch.style.color = (st.state === "cleaning" || st.state === "returning") ? TONE.cool : TONE.textDim;
    ref.sub.style.color = status.color;
    ref.sub.textContent = status.label;
    const battery = st.attributes?.battery_level;
    if (battery != null) {
      const c = battery <= 20 ? TONE.danger : battery <= 50 ? TONE.light : TONE.good;
      ref.batt.style.color = c;
      ref.batt.textContent = `${battery}%`;
    } else {
      ref.batt.textContent = "";
    }
    ref.primary.innerHTML = `<ha-icon icon="${status.primaryIcon}" style="--mdc-icon-size:13px"></ha-icon>${status.primary}`;
    for (const [k, b] of Object.entries(ref.cmds)) {
      const isActive =
        (k === "start" && st.state === "cleaning") ||
        (k === "pause" && st.state === "paused") ||
        (k === "dock" && st.state === "returning");
      b.classList.toggle("active", isActive);
    }
  }

  _updateAutomationRef(ref, entityId) {
    const hass = this._hass;
    const st = hass.states?.[entityId];
    if (!st) return;
    const enabled = ref.isScript ? true : st.state !== "off";
    ref.row.classList.toggle("disabled", !enabled);
    ref.name.classList.toggle("disabled", !enabled);
    if (!ref.isScript) {
      const slash = ref.swatch.querySelector(".slash");
      if (slash) slash.style.display = enabled ? "none" : "block";
      ref.swatch.title = enabled ? "Disable automation" : "Enable automation";
    }
    const lastTs = st.attributes?.last_triggered;
    ref.last.textContent = lastTs ? `Last triggered: ${this._fmtTimeAgo(lastTs)}` : "Never triggered";
    // Labels
    ref.labels.innerHTML = "";
    const ent = hass.entities[entityId];
    const labelIds = ent?.labels || [];
    for (const lid of labelIds) {
      const desc = labelDescriptor(hass, lid);
      if (!desc) continue;
      const chip = document.createElement("span");
      chip.className = "v2-auto-label";
      chip.style.background = desc.bg;
      chip.style.color = desc.color;
      chip.innerHTML = `<ha-icon icon="${desc.icon}" style="--mdc-icon-size:9px"></ha-icon>${desc.name}`;
      ref.labels.appendChild(chip);
    }
    ref.play.classList.toggle("disabled", !enabled);
  }

  _fmtTimeAgo(ts) {
    const d = new Date(ts);
    const now = Date.now();
    const diff = (now - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
    if (diff < 86400 * 30) return `${Math.round(diff / 86400)} days ago`;
    return d.toLocaleDateString();
  }

  static getConfigElement() { return null; }
  static getStubConfig() { return { floor: "" }; }
  getCardSize() { return 1; }
}

customElements.define("atrium-area-card", AtriumAreaCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "atrium-area-card",
  name: "Atrium Area Card",
  description: "Renders every area on a floor with the V2 accordion design (swipe-to-dim tiles, chips, scenes, automations drawer)",
});
