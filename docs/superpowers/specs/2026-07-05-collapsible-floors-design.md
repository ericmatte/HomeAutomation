# Collapsible floors (accordion) — Atrium dashboard

## Goal

Make each floor in the Atrium dashboard collapsible, as an accordion:

- **Default: all floors closed** (including the Home tab, which today opens
  rooms by default).
- Click a floor to open it with an animation (reuse the existing collapse
  pattern where possible).
- Only one floor open at a time: opening a floor closes the current one.
- **When closed**, show a partial preview of the body: the real area (room)
  cards overlap by a few pixels like a stacked deck, clipped by an
  `overflow: hidden` container. When opened, the cards re-place into the
  normal masonry layout.

Scope: **all floor-rendering tabs** — Home, Climate, Routines.

## Current structure

`strategy.js` renders, per floor, two **sibling** cards flat inside a
`vertical-stack`:

1. `atrium-floor-label` — the sticky header (name, icon, floor dimmer, bulb).
2. `atrium-area-card` — a masonry (`_root` → `.atrium-col` columns) of
   `.atrium-room` cards.

They share no state. The existing per-room collapse inside `area-card` uses
`grid-template-rows: 0fr → 1fr` (`area-card.css`) — that is the "other
collapsible" to echo, but it collapses to zero height, so it can't express a
non-zero peek directly (`fr` and `px` don't interpolate).

## Architecture

### Shared accordion controller — new `lib/floor-accordion.js`

A tiny module singleton holding which floor is open:

- State: `openKey` (sentinel `undefined` at load → **all closed**).
  `null` floor id (the virtual "Other" floor) is a valid key, normalized via
  `keyOf(floorId)`.
- `toggle(floorId)` — open it, or close it if it was already open. Notifies.
- `open(floorId)` / `close()` / `isOpen(floorId)`.
- `subscribe(fn)` → returns an unsubscribe fn.

Single-floor-open falls out of `openKey` being a single value. Keyed by
`floorId` globally: a floor opened on one tab reads open on the others, which
is fine because only one view is visible at a time and it keeps state
consistent across tabs.

Both the floor label and the area card of a given floor already know their
`floorId` (via `config.floor`), so both subscribe with it.

### `floor-label.js`

- Clicking the name/icon/line zone → `floorAccordion.toggle(floorId)`.
- The dimmer and bulb keep their own actions via `stopPropagation`.
- Add a chevron (reuse `.atrium-chev`, rotate 180° when open) + `aria-expanded`.
- Subscribe to reflect open/closed in the chevron/aria.

### `area-card.js` + `area-card.css` — peek mechanism (Option A)

Wrap the masonry in `.atrium-floor-body { overflow: hidden }`.

- **Collapsed (peek):** container height = fixed peek (`--floor-peek-height`,
  ~one row). Real `.atrium-room` cards overlap via `transform: translateY`
  with a per-card cumulative offset (a `--i` index custom property set in JS)
  → stacked-deck look. `transform` does not affect layout box height, so the
  masonry distribution (`offsetHeight` measurement) stays correct.
- **Open:** `translateY(0)` and container height → the natural content height.
- Clicking the peek → `floorAccordion.toggle(floorId)`.
- Subscribe to the controller to switch modes.

Masonry note: `_layoutMasonry` must measure natural card heights, so layout
runs without the collapsed transforms affecting measurement (transforms are
layout-neutral, so this is inherently safe); ensure the collapsed class is a
purely visual overlay.

The exact overlap geometry (peek height, visible sliver, overlap px) is
exposed as CSS variables for visual tuning by the user.

## Files

- **new** `www/atrium/lib/floor-accordion.js`
- **new** `www/atrium/lib/floor-accordion.test.js` (node:test, pure logic)
- `www/atrium/components/floor-label.js`
- `www/atrium/components/area-card.js`
- `www/atrium/components/area-card.css`

No `strategy.js` change (both cards already carry the right `floor`).
`validation-checklists.json` does not apply (dashboard UI, not an
automation/blueprint).

## Testing

- Unit: `floor-accordion.js` via `node:test` — default all-closed, toggle,
  exclusivity (one open at a time), `null` key, subscribe/unsubscribe.
- Visual (user, no HA access here): open/close animation, accordion
  exclusivity, peek stacked-deck look, chevron rotation, dimmer/bulb still
  clickable while collapsed, across Home / Climate / Routines.
