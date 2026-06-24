# Atrium Dashboard Tabs Redesign Plan

## Summary
Replace the current floor-first top tabs with task-based views while keeping the floor/area hierarchy inside each view where it still matters.

## Current Issue
The existing floor tabs are not very useful for day-to-day use because the `All` / `Home` view already covers floor navigation. In practice, the top-level dashboard should organize by intent, not by building layout.

## Proposed Tabs
- `Home`
- `Climate`
- `Energy`
- `Safety`
- `Routines`
- `Maintenance`

## Configuration Model
Use a hybrid approach:

- Automatic discovery for entities Atrium can infer from Home Assistant metadata.
- Optional manual YAML configuration for setup-specific sections that cannot be inferred cleanly, such as Hydro Sherbrooke and system monitoring.

This keeps the dashboard mostly self-maintaining while still allowing explicit control where discovery is not enough.

## View Behavior

### Home
The current all-floors room dashboard. This remains the broad entry point and preserves the existing floor/area overview.

### Climate
Show only `Floor -> Area -> climate controls/sensors`.

### Energy
Combine automatically discovered energy sensors with manually configured cards.

### Safety
Surface doors/windows, leaks, problem sensors, and unavailable safety devices.

### Routines
Show `Floor -> Area -> scenes/scripts/automations`.

### Maintenance
Include batteries, unavailable devices, problem lists, and manually configured system cards/entities.

## Example Strategy Config

```yaml
strategy:
  type: custom:atrium
  energy:
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
```

## Assumptions
- Atrium can keep using Home Assistant floor and area metadata as the base hierarchy.
- Automatic discovery should be conservative and only include entities that clearly match each tab’s intent.
- Manual configuration should remain additive, not replace discovery.
- The `Home` tab should continue to behave like the existing all-floors dashboard.

## Future Implementation Notes
- Define discovery rules per tab so the automatic set stays predictable.
- Keep manual sections schema-light and local to the relevant tab.
- Preserve the existing floor/area rendering model inside task-based tabs where it improves scanning and navigation.
- Add examples for common custom setups once the tab structure settles.
