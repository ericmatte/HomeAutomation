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

    const areaCard = (floor, { defaultExpanded = false, sections, heading } = {}) => ({
      type: "custom:atrium-area-card",
      floor: floor.floor_id ?? null,
      ...(defaultExpanded ? { default_expanded: true } : {}),
      ...(sections ? { sections } : {}),
      ...(heading ? { heading } : {}),
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

    // Home keeps the full all-floors room dashboard (floor dimmer + every
    // category). The other tabs reuse the same area-card engine but pass a
    // section profile so each renders only the entities matching its intent,
    // with a per-floor heading in place of the (light-only) floor dimmer.
    const homeView = baseView({
      title: "Home",
      path: "home",
      icon: "mdi:home",
      cards: [
        stack([
          headerCard(ALL_FLOOR_KEY),
          ...allFloors.flatMap((f) => [floorLabelCard(f), areaCard(f)]),
        ]),
      ],
    });

    const intentView = ({ title, path, icon, sections }) =>
      baseView({
        title,
        path,
        icon,
        cards: [
          stack([
            headerCard(ALL_FLOOR_KEY),
            ...allFloors.map((f) =>
              areaCard(f, { sections, heading: f.name, defaultExpanded: true })
            ),
          ]),
        ],
      });

    const climateView = intentView({
      title: "Climate",
      path: "climate",
      icon: "mdi:thermostat",
      sections: ["climate"],
    });

    const routinesView = intentView({
      title: "Routines",
      path: "routines",
      icon: "mdi:robot",
      sections: ["scenes", "routines"],
    });

    return {
      title: "Atrium",
      views: [homeView, climateView, routinesView],
    };
  }
}

customElements.define("ll-strategy-dashboard-atrium", AtriumStrategy);
