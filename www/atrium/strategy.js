// Propagate this module's URL query string (HA's cache key, or a manual
// ?v=N appended to bust the cache) down to sibling imports. Without it,
// the browser keeps serving stale modules after the strategy resource URL
// is bumped — un-versioned sibling paths stay in cache.
const _v = new URL(import.meta.url).search;
const [, , , shellMod] = await Promise.all([
  import(`./components/area-card.js${_v}`),
  import(`./components/header.js${_v}`),
  import(`./components/floor-label.js${_v}`),
  import(`./lib/shell.js${_v}`),
]);
const { ALL_FLOOR_KEY } = shellMod;

class AtriumStrategy {
  static async generate(_config, hass) {
    // Tabs read top-down: upper floors ascending (1, 2, 3, …), then the
    // basement after them rather than in front. "Other" is appended last.
    const floorSortKey = (f) => {
      const lvl = f.level;
      if (lvl == null) return Number.MAX_SAFE_INTEGER;
      return lvl > 0 ? lvl : 1_000_000 - lvl;
    };
    const floors = Object.values(hass.floors || {}).sort(
      (a, b) => floorSortKey(a) - floorSortKey(b)
    );

    // Virtual floor so areas off-grid (e.g. Outside) still get a tab.
    const orphanAreas = Object.values(hass.areas || {}).filter(
      (a) => !a.floor_id
    );
    const otherFloor = orphanAreas.length
      ? {
          floor_id: null,
          name: "Other",
          icon: "mdi:map-marker-outline",
          level: 999,
        }
      : null;
    const allFloors = otherFloor ? [...floors, otherFloor] : floors;

    const welcomeName = hass.user?.name?.split(" ")?.[0] || "home";

    const headerCard = (floorScope) => ({
      type: "custom:atrium-header",
      welcome_name: welcomeName,
      floor: floorScope,
    });

    const areaCard = (floor, { defaultExpanded = false } = {}) => ({
      type: "custom:atrium-area-card",
      floor: floor.floor_id ?? null,
      ...(defaultExpanded ? { default_expanded: true } : {}),
    });

    const floorLabelCard = (floor) => ({
      type: "custom:atrium-floor-label",
      name: floor.name,
      floor: floor.floor_id ?? null,
    });

    // Each view is `panel: true` so it gets the full viewport width (no
    // sections-view 500px grid clamp), with a vertical-stack inside so we
    // can still ship multiple cards in it.
    const stack = (cards) => ({
      type: "vertical-stack",
      cards: cards.filter(Boolean),
    });

    const baseView = (extra) => ({
      panel: true,
      ...extra,
    });

    const allView = baseView({
      title: "All",
      path: "all",
      icon: "mdi:home",
      cards: [
        stack([
          headerCard(ALL_FLOOR_KEY),
          ...allFloors.flatMap((f) => [floorLabelCard(f), areaCard(f)]),
        ]),
      ],
    });

    const floorViews = allFloors.map((floor) =>
      baseView({
        title: floor.name,
        path: AtriumStrategy.slug(floor.floor_id) || "other",
        icon: floor.icon || AtriumStrategy.iconForFloor(floor),
        cards: [
          stack([
            headerCard(floor.floor_id ?? null),
            floorLabelCard(floor),
            areaCard(floor),
          ]),
        ],
      })
    );

    return {
      title: "Atrium",
      views: [allView, ...floorViews],
    };
  }

  static iconForFloor(floor) {
    const lvl = floor.level;
    if (lvl == null) return "mdi:home";
    if (lvl < 0) return "mdi:home-floor-b";
    if (lvl === 0) return "mdi:home-floor-0";
    return `mdi:home-floor-${Math.min(lvl, 3)}`;
  }

  static slug(s) {
    return (s || "").toString().toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
  }
}

customElements.define("ll-strategy-dashboard-atrium", AtriumStrategy);
