// Propagate this module's URL query string (HA's cache key, or a manual
// ?v=N appended to bust the cache) down to sibling imports. Without it,
// the browser keeps serving stale modules after the strategy resource URL
// is bumped — un-versioned sibling paths stay in cache.
const _v = new URL(import.meta.url).search;
const [, , , , shellMod] = await Promise.all([
  import(`./components/area-card.js${_v}`),
  import(`./components/header.js${_v}`),
  import(`./components/floor-label.js${_v}`),
  import(`./components/validation-card.js${_v}`),
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

    // A single floor section has nothing to accordion against — leave it
    // permanently expanded. Two or more become collapsible.
    const collapsibleFloors = allFloors.length >= 2;

    const welcomeName = hass.user?.name?.split(" ")?.[0] || "home";

    const headerCard = (floorScope, title) => ({
      type: "custom:atrium-header",
      welcome_name: welcomeName,
      ...(title ? { title } : {}),
      floor: floorScope,
    });

    const floorIcon = (floor) => {
      if (floor.icon) return floor.icon;
      const lvl = floor.level;
      if (lvl == null) return "mdi:home";
      if (lvl < 0) return "mdi:home-floor-b";
      if (lvl === 0) return "mdi:home-floor-0";
      return `mdi:home-floor-${Math.min(lvl, 3)}`;
    };

    const areaCard = (floor, { sections, exclude } = {}) => ({
      type: "custom:atrium-area-card",
      floor: floor.floor_id ?? null,
      ...(sections ? { sections } : {}),
      ...(exclude ? { exclude } : {}),
      ...(collapsibleFloors ? {} : { collapsible: false }),
    });

    const floorLabelCard = (floor, showControls = true) => ({
      type: "custom:atrium-floor-label",
      name: floor.name,
      icon: floorIcon(floor),
      floor: floor.floor_id ?? null,
      ...(showControls ? {} : { show_controls: false }),
      ...(collapsibleFloors ? {} : { collapsible: false }),
    });

    // Each view is `panel: true` so it gets the full viewport width (no
    // sections-view 500px grid clamp), with a vertical-stack inside so we
    // can still ship multiple cards in it.
    const stack = (cards) => ({
      type: "vertical-stack",
      cards: cards.filter(Boolean),
    });

    // Aggregate tabs render native cards that don't pad themselves (unlike the
    // area-card / header). Wrap their content so it gets the same 16px side
    // padding as the area views. card-mod is in the user's resources; if it
    // weren't, the key is simply ignored (no padding, no error).
    const paddedStack = (cards) => ({
      type: "vertical-stack",
      cards: cards.filter(Boolean),
      card_mod: { style: ":host { display: block; padding: 0 16px 32px; }" },
    });

    const baseView = (extra) => ({
      panel: true,
      ...extra,
    });

    // Manual config is additive and tolerant: unknown/missing keys are
    // ignored rather than throwing so a typo can't break the whole dashboard.
    const cfg = _config || {};
    const cfgList = (v) => (Array.isArray(v) ? v : []);

    const entitiesCard = (title, ids) =>
      ids.length
        ? { type: "entities", title, entities: ids.map((entity) => ({ entity })) }
        : null;

    // Home is the all-floors room dashboard, minus climate and
    // automations/scripts — each of those has its own dedicated tab, so
    // showing them here too is redundant. The other tabs reuse the same
    // area-card engine but pass a section profile, with a per-floor heading
    // in place of the (light-only) floor dimmer.
    const homeView = baseView({
      title: "Home",
      path: "home",
      icon: "mdi:home",
      cards: [
        stack([
          headerCard(ALL_FLOOR_KEY),
          ...allFloors.flatMap((f) => [
            floorLabelCard(f),
            areaCard(f, {
              exclude: ["climates", "automations", "scripts"],
            }),
          ]),
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
            headerCard(ALL_FLOOR_KEY, title),
            ...allFloors.flatMap((f) => [
              floorLabelCard(f, false),
              areaCard(f, { sections }),
            ]),
          ]),
        ],
      });

    const climateView = intentView({
      title: "Climate",
      path: "climate",
      icon: "mdi:thermostat",
      sections: ["climate"],
    });

    // Validation checklists are per-automation, not per-area, so the card
    // is inserted once at the top rather than reused inside each area-card.
    const routinesView = intentView({
      title: "Routines",
      path: "routines",
      icon: "mdi:robot",
      sections: ["scenes", "routines"],
    });
    routinesView.cards[0].cards.splice(1, 0, { type: "custom:atrium-validation-card" });

    // Custom tabs are aggregate/manual: only what the user adds via YAML (no
    // auto-discovery — the header pill covers batteries, and the user
    // supplies their own cards). No floor/area accordion. Fully config-driven
    // so the dashboard ships with zero of them until `tabs` is populated.
    const slugify = (title) =>
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "tab";

    const customTabView = (tab) => {
      const title = tab.title || "Tab";
      return baseView({
        title,
        path: tab.path || slugify(title),
        icon: tab.icon || "mdi:view-dashboard",
        cards: [
          stack([
            headerCard(ALL_FLOOR_KEY, title),
            paddedStack([
              entitiesCard(tab.entities_title || title, cfgList(tab.entities)),
              ...cfgList(tab.cards),
            ]),
          ]),
        ],
      });
    };

    const customTabs = cfgList(cfg.tabs).map(customTabView);

    return {
      title: "Atrium",
      views: [
        homeView,
        climateView,
        routinesView,
        ...customTabs,
      ],
    };
  }
}

customElements.define("ll-strategy-dashboard-atrium", AtriumStrategy);
