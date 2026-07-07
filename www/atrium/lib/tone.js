// Canonical color palette for the whole dashboard. Both the area-card
// (`area-card-shared.js`) and the shell (`shell.js`) derive their tokens from
// here so there is a single source of truth.
export const TONE = {
  text: "var(--primary-text-color, #e8e9ec)",
  textDim: "var(--secondary-text-color, #9aa0aa)",
  textMute: "color-mix(in srgb, var(--secondary-text-color, #9aa0aa) 70%, transparent)",
  light: "var(--state-light-active-color, #f5c451)",
  curtain: "var(--state-cover-active-color, #9b7fd1)",
  heat: "var(--state-climate-heat-color, #ff8a5b)",
  cool: "var(--state-climate-cool-color, #5cc6ff)",
  warn: "var(--warning-color, #f0b13a)",
  danger: "var(--error-color, #ff5252)",
  good: "var(--success-color, #7dc97a)",
};
