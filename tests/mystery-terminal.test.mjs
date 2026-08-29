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

/* La carte elle-même n'est pas exportée : on la récupère par le registre des
 * custom elements, et on construit une instance nue (sans passer par le
 * constructeur, qui réclame un vrai shadow DOM) pour tester une méthode. */
const Card = customElements.get("mystery-terminal-card");

const fakeEl = () => {
  const classes = new Set();
  return {
    hidden: false,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
  };
};

const revealHarness = () => {
  const els = { revealStart: fakeEl(), revealVideo: fakeEl() };
  const card = Object.create(Card.prototype);
  card.plays = 0;
  card.$ = (id) => els[id];
  card._sfx = () => {};
  card._log = () => {};
  card._revealMedia = "media-source://media_source/local/Final Reveal.mp4";
  card._resolveMedia = async () => "http://x/final.mp4";
  els.revealVideo.play = async () => { card.plays += 1; };
  return { card, els };
};

test("un second clic pendant l'ouverture des portes ne relance pas la vidéo", async () => {
  const { card, els } = revealHarness();
  const first = card._beginReveal();
  await card._beginReveal();
  assert.equal(els.revealStart.hidden, false, "les portes s'écartent encore");
  await first;
  assert.equal(card.plays, 1);
});

test("la vidéo introuvable rearme le bouton de révélation", async (t) => {
  const { card, els } = revealHarness();
  const warn = console.warn;
  console.warn = () => {};
  t.after(() => { console.warn = warn; });
  card._resolveMedia = async () => { throw new Error("introuvable"); };
  await card._beginReveal();
  assert.equal(els.revealStart.hidden, false);
  assert.equal(els.revealStart.classList.contains("opening"), false);
  assert.equal(card._revealStage, "ready");
  await card._beginReveal();
  assert.equal(card._revealStage, "ready", "un nouveau clic reste possible");
});

const lockHarness = () => {
  const els = { ovLock: fakeEl() };
  const crt = fakeEl();
  const card = Object.create(Card.prototype);
  card.$ = (id) => els[id];
  card._sfx = () => {};
  card._hide = (id) => { els[id].hidden = true; };
  card.shadowRoot = { querySelector: (sel) => (sel === ".crt" ? crt : null) };
  return { card, els, crt };
};

test("le fondu du terminal attend que les portes du coffre soient ouvertes", async () => {
  const { card, els, crt } = lockHarness();
  card._openLock();

  assert.equal(els.ovLock.classList.contains("opening"), true, "les portes partent");
  assert.equal(
    crt.classList.contains("revealing"), false,
    "le fondu jouerait derrière les portes fermées",
  );
  assert.equal(els.ovLock.hidden, false);

  await new Promise((r) => setTimeout(r, 800));
  assert.equal(els.ovLock.hidden, true);
  assert.equal(crt.classList.contains("revealing"), true);
});

test("un second clic pendant l'ouverture ne rejoue pas le coffre", async () => {
  const { card, crt } = lockHarness();
  let sons = 0;
  card._sfx = () => { sons += 1; };
  card._openLock();
  card._openLock();
  assert.equal(sons, 1);
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(crt.classList.contains("revealing"), true);
});

/* Le bouton Indice a déjà semblé manquer sur la caméra du Majordome : ces tests
 * verrouillent qui en a un, qui l'a éteint, et ce que fait chaque clic. */
const wallHarness = () => {
  const card = Object.create(Card.prototype);
  card._cameras = [
    { id: "CAM 01", zone: "ATELIER", file: "a.mp4" },
    { id: "CAM 02", zone: "SALON", file: "b.mp4" },
    { id: "CAM 03", zone: "SALLE À MANGER", file: "c.mp4" },
  ];
  return card;
};

const hintButtons = (html) =>
  [...html.matchAll(/class="ffbtn hintbtn([^"]*)"[\s\S]*?data-hint="([^"]*)"/g)]
    .map(([, cls, suspect]) => ({ off: cls.includes("off"), suspect }));

test("chaque caméra porte un bouton indice, éteint seulement chez le Jardinier", () => {
  const buttons = hintButtons(wallHarness()._cellsHtml());
  assert.deepEqual(buttons, [
    { off: true, suspect: "" },
    { off: false, suspect: "heiress" },
    { off: false, suspect: "butler" },
  ]);
});

test("le bouton du Majordome n'est jamais rendu disabled — le clic doit passer", () => {
  const html = wallHarness()._cellsHtml();
  assert.equal(/<button[^>]*\sdisabled/.test(html), false);
  assert.match(html, /data-hint="butler"/);
});

test("un indice réel appelle le script Home Assistant", () => {
  const card = wallHarness();
  const calls = [];
  card._sfx = () => {};
  card._log = () => {};
  card._call = (domain, service, data) => calls.push([domain, service, data]);
  card._requestHint("butler");
  assert.equal(calls.length, 1);
  const [domain, service, data] = calls[0];
  assert.equal(domain, "script");
  assert.equal(service, "turn_on");
  assert.equal(data.entity_id, "script.mystery_hint_request");
  assert.deepEqual(data.variables, { suspect: "butler" });
});

test("le bouton éteint refuse au lieu d'appeler quoi que ce soit", () => {
  const card = wallHarness();
  const sons = [];
  const calls = [];
  card._sfx = (n) => sons.push(n);
  card._log = () => {};
  card._call = (...a) => calls.push(a);
  card._requestHint("");
  assert.deepEqual(sons, ["err"]);
  assert.equal(calls.length, 0);
});

/* L'empilement des overlays s'est déjà retourné contre nous : le message de
 * l'inspecteur passait derrière l'écran-verrou et personne ne le voyait. */
const cardSource = await import("node:fs/promises")
  .then((fs) => fs.readFile(new URL("../www/custom-lovelace/mystery-terminal-card.js", import.meta.url), "utf8"));

const zIndexOf = (selector) => {
  const rule = cardSource.match(
    new RegExp(`${selector.replace(/[.#*]/g, "\\$&")}\\{[^}]*z-index:(\\d+)`));
  assert.ok(rule, `pas de z-index trouvé pour ${selector}`);
  return Number(rule[1]);
};

test("le message de l'inspecteur passe au-dessus de l'écran-verrou", () => {
  assert.ok(zIndexOf(".ov#ovSay") > zIndexOf(".ov#ovLock"),
    "l'écran-verrou avale le message de l'inspecteur");
});

test("le dossier et l'accusation restent au-dessus du message", () => {
  const say = zIndexOf(".ov#ovSay");
  assert.ok(zIndexOf(".ov#ovDossier, .ov#ovConfirm") > say);
});

test("les boutons plein écran et bascule de vue dominent tous les overlays", () => {
  const regie = zIndexOf(".regie");
  for (const sel of [".ov", ".ov#ovLock", ".ov#ovSay", ".ov#ovDossier, .ov#ovConfirm"]) {
    assert.ok(regie > zIndexOf(sel), `${sel} passe devant les boutons de régie`);
  }
});

/* Le message d'accueil du terminal part au premier signe de vie devant les
 * écrans — mais jamais avant que l'inspecteur ait annoncé les caméras. */
globalThis.document = globalThis.document || { addEventListener() {}, removeEventListener() {} };

const touchHarness = (phase, firstTouch = "off") => {
  const card = Object.create(Card.prototype);
  const calls = [];
  card._mode = "cctv";
  // Court-circuite l'horloge : connectedCallback la démarre en dernier.
  card._timer = 1;
  card._call = (...a) => calls.push(a);
  card._hass = {
    states: {
      "input_select.mystery_phase": { state: phase },
      "input_boolean.mystery_terminal_first_touch": { state: firstTouch },
    },
  };
  const listeners = {};
  card.addEventListener = (type, fn) => { listeners[type] = fn; };
  Card.prototype.connectedCallback.call(card);
  return { card, calls, listeners };
};

test("un mouvement de souris déclenche l'accueil du terminal", () => {
  const { calls, listeners } = touchHarness("investigation");
  listeners.pointermove();
  assert.deepEqual(calls, [
    ["input_boolean", "turn_on", { entity_id: "input_boolean.mystery_terminal_first_touch" }],
  ]);
});

test("rien ne part avant l'appel qui annonce les caméras", () => {
  const { calls, listeners } = touchHarness("idle");
  listeners.pointermove();
  listeners.pointerdown();
  assert.equal(calls.length, 0);
});

test("la rafale de pointermove n'envoie qu'un seul appel", () => {
  const { calls, listeners } = touchHarness("investigation");
  for (let i = 0; i < 50; i += 1) listeners.pointermove();
  assert.equal(calls.length, 1);
});

test("l'accueil ne rejoue pas si Home Assistant l'a déjà enregistré", () => {
  const { calls, listeners } = touchHarness("investigation", "on");
  listeners.pointermove();
  assert.equal(calls.length, 0);
});

test("le tactile déclenche aussi, faute de mouvement de souris", () => {
  const { calls, listeners } = touchHarness("autopsy_done");
  listeners.pointerdown();
  assert.equal(calls.length, 1);
});

/* Le dossier confidentiel et l'accusation se jouent désormais sur le mur
 * d'images : l'écran de saisie n'affiche plus que du noir pendant ce temps
 * (ovBlackout, sans z-index dédié — donc le rang de base de .ov), toujours
 * sous le message de l'inspecteur. */
test("l'écran de saisie masqué par le dossier reste sous les messages de l'inspecteur", () => {
  assert.ok(zIndexOf(".ov#ovSay") > zIndexOf(".ov"),
    "le fond noir du dossier avalerait le message de l'inspecteur");
});

test("transmettre l'accusation referme la confirmation et le dossier", () => {
  const els = { ovConfirm: fakeEl() };
  const card = Object.create(Card.prototype);
  card.$ = (id) => els[id];
  card._sfx = () => {};
  card._log = () => {};
  const calls = [];
  card._call = (...a) => calls.push(a);
  card._choice = { option: "butler", name: "LE MAJORDOME" };
  card._sendAccusation();
  assert.equal(els.ovConfirm.hidden, true);
  assert.deepEqual(calls, [
    ["input_select", "select_option", { entity_id: "input_select.mystery_accusation_choice", option: "butler" }],
    ["input_boolean", "turn_off", { entity_id: "input_boolean.mystery_dossier_open" }],
  ]);
});

test("la musique de victoire joue sur l'écran, résolue via media_source", async (t) => {
  const card = Object.create(Card.prototype);
  card._log = () => {};
  const resolved = [];
  card._resolveMedia = async (id) => { resolved.push(id); return "http://x/victory.mp3"; };
  const audios = [];
  const RealAudio = globalThis.Audio;
  globalThis.Audio = class {
    constructor(url) { this.url = url; this.playing = false; audios.push(this); }
    play() { this.playing = true; return Promise.resolve(); }
    pause() { this.playing = false; }
  };
  t.after(() => { globalThis.Audio = RealAudio; });

  await card._playVictoryMusic();
  assert.equal(resolved[0], "media-source://media_source/local/Jamie Foxx - Winner ft Justin Timberlake  TI.mp3");
  assert.equal(audios.length, 1);
  assert.equal(audios[0].playing, true);

  card._stopVictoryMusic();
  assert.equal(audios[0].playing, false);
  assert.equal(card._victoryAudio, null);
});

test("une résolution de média ratée n'empêche pas le tour d'honneur de continuer", async (t) => {
  const card = Object.create(Card.prototype);
  card._log = () => {};
  card._resolveMedia = async () => { throw new Error("introuvable"); };
  const warn = console.warn;
  console.warn = () => {};
  t.after(() => { console.warn = warn; });
  await assert.doesNotReject(card._playVictoryMusic());
  assert.equal(card._victoryAudio, undefined);
});

test("le bouton Fermer de l'écran final arrête la musique et relance le reset", () => {
  const card = Object.create(Card.prototype);
  card._sfx = () => {};
  const calls = [];
  card._call = (...a) => calls.push(a);
  let paused = false;
  card._victoryAudio = { pause: () => { paused = true; } };
  card._closeGame();
  assert.equal(paused, true);
  assert.equal(card._victoryAudio, null);
  assert.deepEqual(calls, [["script", "turn_on", { entity_id: "script.reset_after_escape_roome" }]]);
});

/* Le mur d'images doit repartir vierge dans les deux cas : une nouvelle partie
 * qui démarre, et le bouton FERMER qui remet tout à zéro sans en relancer une. */
const hassHarness = () => {
  const els = {};
  const card = Object.create(Card.prototype);
  const stopped = { music: 0 };
  card.$ = (id) => {
    if (id === "slots") return null;
    if (!els[id]) {
      const el = fakeEl();
      el.classList.toggle = (c, on) => (on ? el.classList.add(c) : el.classList.remove(c));
      els[id] = Object.assign(el, {
        textContent: "", querySelector: () => null, querySelectorAll: () => [],
      });
    }
    return els[id];
  };
  card._hide = (id) => { card.$(id).hidden = true; };
  card._show = (id) => { card.$(id).hidden = false; };
  card._log = () => {};
  card._call = () => {};
  card._slotsCfg = [];
  card._stopVictoryMusic = () => { stopped.music += 1; };
  card._revealMedia = "media-source://media_source/local/Final Reveal.mp4";
  card._revealStage = "end";
  card._touchSent = true;
  card.$("ovReveal").hidden = false;
  return { card, els, stopped };
};

const etat = (phase, revealMedia = "") => ({
  states: {
    "input_boolean.mystery_evidence_saw": { state: "off" },
    "input_boolean.mystery_evidence_gun": { state: "off" },
    "input_boolean.mystery_evidence_poison": { state: "off" },
    "input_boolean.mystery_terminal_unlocked": { state: "on" },
    "input_boolean.mystery_dossier_open": { state: "off" },
    "input_text.mystery_code_input": { state: "" },
    "input_text.mystery_reveal_media": { state: revealMedia },
    "input_select.mystery_phase": { state: phase },
  },
});

test("FERMER fait disparaître le THE END du mur d'images", () => {
  const { card, els, stopped } = hassHarness();
  card._prev = { phase: "solved", count: 0, unlocked: true };
  card._applyHass(etat("idle"));
  assert.equal(els.ovReveal.hidden, true, "le THE END reste affiché après FERMER");
  assert.equal(card._revealStage, null);
  assert.equal(card._revealMedia, null);
  assert.equal(stopped.music, 1, "la musique de victoire continue");
});

test("une nouvelle partie repart aussi d'un mur vierge", () => {
  const { card, els, stopped } = hassHarness();
  card._prev = { phase: "idle", count: 0, unlocked: true };
  card._applyHass(etat("investigation"));
  assert.equal(els.ovReveal.hidden, true);
  assert.equal(stopped.music, 1);
});

test("une phase qui avance en cours de partie ne balaie rien", () => {
  const { card, els, stopped } = hassHarness();
  card._prev = { phase: "investigation", count: 0, unlocked: true };
  card._applyHass(etat("autopsy_done"));
  assert.equal(els.ovReveal.hidden, false, "le mur a été effacé en pleine partie");
  assert.equal(stopped.music, 0);
});

test("quitter la vue coupe la musique de victoire", () => {
  const card = Object.create(Card.prototype);
  let paused = 0;
  card._clearCamBails = () => {};
  card._victoryAudio = { pause: () => { paused += 1; } };
  card.disconnectedCallback();
  assert.equal(paused, 1, "la musique continue alors que le bouton FERMER est parti");
  assert.equal(card._victoryAudio, null);
});

test("relancer le tour d'honneur coupe la piste précédente", async (t) => {
  const vraiAudio = globalThis.Audio;
  t.after(() => { globalThis.Audio = vraiAudio; });
  let paused = 0;
  const jouees = [];
  globalThis.Audio = class {
    constructor(url) { jouees.push(url); }
    pause() { paused += 1; }
    play() { return Promise.resolve(); }
  };
  const card = Object.create(Card.prototype);
  card._log = () => {};
  card._resolveMedia = async () => "http://manoir/win.mp3";
  await card._playVictoryMusic();
  await card._playVictoryMusic();
  assert.equal(jouees.length, 2);
  assert.equal(paused, 1, "les deux pistes jouent l'une par-dessus l'autre");
});
