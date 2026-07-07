// Canonical color palette for the whole dashboard. Both the area-card
// (`area-card-shared.js`) and the shell (`shell.js`) derive their tokens from
// here so there is a single source of truth.
export const TONE = {
  bg: "var(--primary-background-color, #0e0f12)",
  surface: "var(--ha-card-background, var(--card-background-color, #16181d))",
  surface2: "color-mix(in srgb, var(--primary-text-color, #e8e9ec) 6%, transparent)",
  surface3: "color-mix(in srgb, var(--primary-text-color, #e8e9ec) 10%, transparent)",
  line: "var(--divider-color, rgba(127,127,127,0.18))",
  line2: "color-mix(in srgb, var(--primary-text-color, #e8e9ec) 10%, transparent)",
  text: "var(--primary-text-color, #e8e9ec)",
  textDim: "var(--secondary-text-color, #9aa0aa)",
  textMute: "color-mix(in srgb, var(--secondary-text-color, #9aa0aa) 70%, transparent)",
  light: "var(--state-light-active-color, #f5c451)",
  lightBg: "color-mix(in srgb, var(--state-light-active-color, #f5c451) 14%, transparent)",
  curtain: "var(--state-cover-active-color, #9b7fd1)",
  curtainBg: "color-mix(in srgb, var(--state-cover-active-color, #9b7fd1) 14%, transparent)",
  motion: "var(--state-binary_sensor-motion-color, #5cc6ff)",
  motionBg: "color-mix(in srgb, var(--state-binary_sensor-motion-color, #5cc6ff) 12%, transparent)",
  heat: "var(--state-climate-heat-color, #ff8a5b)",
  cool: "var(--state-climate-cool-color, #5cc6ff)",
  warn: "var(--warning-color, #f0b13a)",
  danger: "var(--error-color, #ff5252)",
  good: "var(--success-color, #7dc97a)",
};
