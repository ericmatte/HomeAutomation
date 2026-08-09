/*
 * Le module enregistre un custom element au chargement, d'où ces stubs
 * minimaux de navigateur pour pouvoir l'importer sans DOM.
 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.HTMLElement = class {};
globalThis.customElements = {
  _defs: new Map(),
  get(name) { return this._defs.get(name); },
  define(name, ctor) { this._defs.set(name, ctor); },
};
globalThis.window = globalThis;

const {
  isDeadState,
  isJournalEntity,
  journalStateLabel,
  journalEntityName,
  journalAreaName,
  journalLine,
  journalSeed,
  escapeHtml,
  JOURNAL_DOMAINS,
  JOURNAL_LINES,
} = await import("../www/custom-lovelace/mystery-terminal-card.js");

const state = (s, extra) => Object.assign({ state: s, attributes: {} }, extra);

test("libelle les binary_sensor selon leur device_class", () => {
  const motion = { device_class: "motion" };
  assert.equal(journalStateLabel("binary_sensor.a", "on", motion), "MOUVEMENT DÉTECTÉ");
  assert.equal(journalStateLabel("binary_sensor.a", "off", motion), "PLUS DE MOUVEMENT");

  const door = { device_class: "door" };
  assert.equal(journalStateLabel("binary_sensor.b", "on", door), "OUVERTURE");
  assert.equal(journalStateLabel("binary_sensor.b", "off", door), "FERMETURE");
});

test("retombe sur ACTIF / INACTIF pour un binary_sensor sans device_class", () => {
  assert.equal(journalStateLabel("binary_sensor.c", "on", {}), "ACTIF");
  assert.equal(journalStateLabel("binary_sensor.c", "off", undefined), "INACTIF");
});

test("libelle les autres domaines par leur état", () => {
  assert.equal(journalStateLabel("light.salon", "on"), "ALLUMÉ");
  assert.equal(journalStateLabel("light.salon", "off"), "ÉTEINT");
  assert.equal(journalStateLabel("lock.porte", "jammed"), "BLOCAGE MÉCANIQUE");
  assert.equal(journalStateLabel("cover.store", "opening"), "OUVERTURE EN COURS");
  assert.equal(journalStateLabel("media_player.sonos", "playing"), "LECTURE");
});

test("dégrossit un état inconnu plutôt que de l'ignorer", () => {
  assert.equal(journalStateLabel("climate.x", "super_eco"), "SUPER ECO");
  assert.equal(journalStateLabel("vacuum.y", "returning"), "RETOUR À LA BASE");
});

test("préfère le friendly_name à l'identifiant", () => {
  assert.equal(journalEntityName("light.salon_principal", { friendly_name: "Plafonnier" }), "Plafonnier");
  assert.equal(journalEntityName("light.salon_principal", {}), "salon principal");
});

test("n'accepte que les domaines qui racontent quelque chose", () => {
  assert.equal(isJournalEntity("binary_sensor.porte"), true);
  assert.equal(isJournalEntity("light.salon"), true);
  assert.equal(isJournalEntity("sensor.temperature_salon"), false);
  assert.equal(isJournalEntity("automation.quelque_chose"), false);
  assert.equal(isJournalEntity("pas_une_entite"), false);
  assert.equal(isJournalEntity(""), false);
  assert.equal(isJournalEntity(undefined), false);
});

test("écarte les entités du jeu, qui dévoileraient la mécanique", () => {
  assert.equal(isJournalEntity("light.mystery_gyrophare"), false);
  assert.equal(isJournalEntity("switch.MYSTERY_relais"), false);
});

test("respecte les domaines et exclusions passés en configuration", () => {
  const opts = { domains: ["sensor"], exclude: ["batterie"] };
  assert.equal(isJournalEntity("sensor.co2_cave", opts), true);
  assert.equal(isJournalEntity("sensor.batterie_capteur", opts), false);
  assert.equal(isJournalEntity("light.salon", opts), false);
  assert.ok(JOURNAL_DOMAINS.includes("binary_sensor"));
});

test("reconnaît les états qui ne racontent rien", () => {
  assert.equal(isDeadState("unavailable"), true);
  assert.equal(isDeadState("unknown"), true);
  assert.equal(isDeadState(""), true);
  assert.equal(isDeadState(null), true);
  assert.equal(isDeadState("on"), false);
});

test("résout la pièce par l'entité puis par son appareil", () => {
  const hass = {
    entities: {
      "light.direct": { area_id: "a_salon" },
      "light.par_appareil": { device_id: "d1" },
      "light.orpheline": {},
    },
    devices: { d1: { area_id: "a_cave" } },
    areas: { a_salon: { name: "Salon" }, a_cave: { name: "Cave" } },
  };
  assert.equal(journalAreaName(hass, "light.direct"), "Salon");
  assert.equal(journalAreaName(hass, "light.par_appareil"), "Cave");
  assert.equal(journalAreaName(hass, "light.orpheline"), null);
  assert.equal(journalAreaName(hass, "light.inconnue"), null);
  assert.equal(journalAreaName({}, "light.direct"), null);
});

test("compose une ligne avec la pièce, le nom et l'état", () => {
  const hass = {
    entities: { "binary_sensor.porte_entree": { area_id: "a1" } },
    areas: { a1: { name: "Entrée" } },
  };
  const line = journalLine(hass, "binary_sensor.porte_entree",
    state("on", { attributes: { device_class: "door", friendly_name: "Porte avant" } }));
  assert.equal(line.text, "ENTRÉE — PORTE AVANT · OUVERTURE");
  assert.equal(line.entityId, "binary_sensor.porte_entree");
});

test("omet le préfixe de pièce quand HA n'en connaît pas", () => {
  const line = journalLine({}, "light.lampe",
    state("on", { attributes: { friendly_name: "Lampe" } }));
  assert.equal(line.text, "LAMPE · ALLUMÉ");
});

test("ignore un changement d'attribut seul", () => {
  const before = state("on", { attributes: { brightness: 10 } });
  const after = state("on", { attributes: { brightness: 200 } });
  assert.equal(journalLine({}, "light.lampe", after, before), null);
});

test("ignore les entrées et sorties d'indisponibilité", () => {
  assert.equal(journalLine({}, "light.lampe", state("unavailable"), state("on")), null);
  assert.equal(journalLine({}, "light.lampe", state("on"), state("unavailable")), null);
  assert.equal(journalLine({}, "light.lampe", state("off"), state("unknown")), null);
  assert.equal(journalLine({}, "light.lampe", null, state("on")), null);
});

test("ignore les entités hors journal même avec un vrai changement", () => {
  assert.equal(journalLine({}, "sensor.temperature", state("21.4"), state("21.3")), null);
  assert.equal(journalLine({}, "light.mystery_gyrophare", state("on"), state("off")), null);
});

test("date la ligne sur last_changed quand HA le fournit", () => {
  const line = journalLine({}, "light.lampe", state("on", { last_changed: "2026-08-07T22:47:12.000Z" }));
  assert.equal(line.at.toISOString(), "2026-08-07T22:47:12.000Z");
});

test("amorce le journal avec les derniers changements réels, du plus récent au plus ancien", () => {
  const hass = {
    states: {
      "light.vieux": state("on", { last_changed: "2026-08-07T20:00:00.000Z" }),
      "binary_sensor.recent": state("on", {
        last_changed: "2026-08-07T22:00:00.000Z",
        attributes: { device_class: "motion", friendly_name: "Détecteur" },
      }),
      "light.moyen": state("off", { last_changed: "2026-08-07T21:00:00.000Z" }),
      "sensor.bruyant": state("21.4", { last_changed: "2026-08-07T23:00:00.000Z" }),
      "light.mystery_gyrophare": state("on", { last_changed: "2026-08-07T23:30:00.000Z" }),
      "light.injoignable": state("unavailable", { last_changed: "2026-08-07T23:45:00.000Z" }),
    },
  };
  const seed = journalSeed(hass, 7);
  assert.deepEqual(seed.map((e) => e.entityId),
    ["binary_sensor.recent", "light.moyen", "light.vieux"]);
  assert.equal(seed[0].text, "DÉTECTEUR · MOUVEMENT DÉTECTÉ");
});

test("tronque l'amorçage au nombre de lignes demandé", () => {
  const states = {};
  for (let i = 0; i < 40; i++) {
    states[`light.l${i}`] = state("on", { last_changed: `2026-08-07T12:${String(i).padStart(2, "0")}:00.000Z` });
  }
  assert.equal(journalSeed({ states }, 4).length, 4);
  assert.equal(journalSeed({ states }).length, JOURNAL_LINES);
  assert.equal(journalSeed({}, 5).length, 0);
});

test("garde assez d'historique pour remplir le bloc du mur d'images", () => {
  assert.ok(JOURNAL_LINES >= 15, `JOURNAL_LINES=${JOURNAL_LINES} est trop court`);
});

test("échappe le texte venu du registre HA", () => {
  assert.equal(escapeHtml(`<img src=x onerror="a">`), "&lt;img src=x onerror=&quot;a&quot;&gt;");
  assert.equal(escapeHtml("Salon & cave"), "Salon &amp; cave");
});
