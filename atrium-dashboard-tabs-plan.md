# Atrium Dashboard — Intent-Based Tabs

The top tabs are organized by intent instead of by floor. The `Home` tab keeps
the full floor/area room dashboard; the other tabs reuse the same engine but
scope it to one concern.

## Tabs

| Tab | Kind | Contents |
| --- | --- | --- |
| `Home` | area engine, full | The original all-floors room dashboard (floor dimmer + every category). |
| `Climate` | area engine, profile | Per floor → area: thermostats + temperature/humidity chips. |
| `Energy` | aggregate | Auto-discovered `power`/`energy` sensors + manual YAML. |
| `Safety` | area engine, profile | Per floor → area: doors/windows, leaks, smoke/CO/gas chips (alarms surface only when triggered). |
| `Routines` | area engine, profile | Per floor → area: scenes + automations/scripts drawer. |
| `Maintenance` | aggregate | Battery levels (lowest first) + manual YAML. |

The `atrium-header` (welcome banner + global batteries/problems/offline) stays on
every tab as the single source of aggregate status — the tabs do not duplicate it.

## How it works

- **Area-engine tabs** reuse the `atrium-area-card` element with a `sections`
  profile (and a `heading` for the floor name). `_filterData()` in
  `area-card.js` projects classified entities down to the profile, so chips,
  quick buttons, body sections and the empty-room check all hide non-profile
  categories automatically. Floors with no matching entity render nothing.
- **Aggregate tabs** are built in `strategy.js` from the `hass` registry at
  generate time and emit native `entities` cards (which still update live),
  plus any manual cards/entities from config.

## Configuration

Manual config is additive and tolerant — unknown or missing keys are ignored,
never thrown, so a typo cannot break the dashboard.

```yaml
strategy:
  type: custom:atrium
  energy:
    entities:
      - sensor.hydro_sherbrooke_today_usage
    cards:
      - type: entities
        title: Hydro Sherbrooke
        entities:
          - sensor.hydro_sherbrooke_current_cost
          - sensor.hydro_sherbrooke_today_usage
  maintenance:
    entities:
      - sensor.server_room_temperature
      - binary_sensor.nas_online
    cards:
      - type: markdown
        content: "NAS firmware: {{ states('sensor.nas_firmware') }}"
```

- `energy.entities` / `maintenance.entities` → appended as an extra `entities` card.
- `energy.cards` / `maintenance.cards` → arbitrary Lovelace cards appended as-is.

## Section profile keys

`lights`, `covers`, `climate` (thermostats + temp/humidity), `vacuum`,
`sensors` (graphable + soil + propane), `motion`, `scenes`, `routines`
(automations + scripts), `doors`, `leak`, `safety` (smoke/CO/gas/safety).
