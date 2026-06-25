# Floorplan

Interactive "sims-like" floorplan for Home Assistant: an isometric render of each
floor with clickable HA entities overlaid on top.

The system is split in two layers so it can be reused across houses:

- **`core/`** — generic engine, identical for every house.
- **`houses/<house>/`** — everything specific to one home: floor images + config.

```
core/
  generate.py        # config.yaml -> generated/floorplan.yaml (picture-elements)
  floor-switcher.js  # floor buttons + show one floor at a time
  editor/            # standalone browser tool to place entity hotspots
houses/
  new-house/
    config.yaml      # source of truth: floors + entities + coordinates
    floors/*.png     # frozen isometric renders, one per floor
    generated/       # gitignored build output
old-plans/           # archived floorplans (incl. previous home)
```

## Workflow

### 1. Produce a floor image (per floor)

There is no precise blueprint, so build the geometry from tape measurements, then
render it. The render must be **frozen** — once hotspots are placed against it,
regenerating the image would shift the coordinates.

1. Measure each room (walls, doors, windows) and sketch each floor to scale.
2. Build a to-scale 2D model in a tool such as **SweetHome3D**.
3. Place major furniture using room **photos** as reference.
4. Export an **isometric render** per floor — use the **same camera angle, zoom
   and style** for every floor so they look like one dollhouse.
5. (Optional) Run one AI stylization pass for polish, then freeze.
6. Save as `houses/<house>/floors/<id>.png`.

> Image generation happens outside this repo (3D tool / AI). This repo only
> stores the frozen images and the code that overlays entities on them.

### 2. Place entity hotspots

Open `core/editor/index.html` in a browser. Load the house `config.yaml` and a
floor image, click the image to drop a hotspot, drag to position it, set the
entity id and tap action, then **Export config.yaml**.

You can also edit `config.yaml` by hand — see the inline comments for the
supported entry types (simple entity, `more-info`, climate badge with stacked
attribute `labels`, `service` button).

### 3. Generate the Lovelace card

```bash
cd www/floorplan
python core/generate.py houses/new-house
```

This writes `houses/new-house/generated/floorplan.yaml` (a `vertical-stack` with
one `picture-elements` card per floor).

### 4. Wire it into the dashboard

- Reference `generated/floorplan.yaml` from a Lovelace view.
- Declare both `custom-lovelace/floorplan.js` (deep-query helpers) and
  `core/floor-switcher.js` as `module` resources in `lovelace_resources`.

## Development

```bash
python -m venv .venv && source .venv/bin/activate
pip install pyyaml pytest
python -m pytest core/tests/
```
