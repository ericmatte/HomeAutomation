/*
 * mystery-terminal-card.js — Terminal de vidéosurveillance
 * Escape room « Meurtre au manoir connecté »
 * Servi par HA depuis  /local/custom-lovelace/mystery-terminal-card.js
 * (ressource déclarée dans .storage/lovelace_resources, type: module)
 *
 * Une seule carte, deux modes d'affichage :
 *   « code »  — pavé numérique, registre des preuves, dossier confidentiel
 *   « cctv »  — mur d'images 2×2 : 3 archives en boucle + bloc d'information
 *
 * Le mode vit dans sessionStorage, donc *par onglet* : on ouvre deux fois la
 * même URL, on bascule le second en CCTV, et chacun garde son mode au
 * rechargement. Une entité HA ferait basculer les deux ensemble.
 */

const ENT = {
  code: "input_text.mystery_code_input",
  saw: "input_boolean.mystery_evidence_saw",
  gun: "input_boolean.mystery_evidence_gun",
  poison: "input_boolean.mystery_evidence_poison",
  unlocked: "input_boolean.mystery_terminal_unlocked",
  accusation: "input_select.mystery_accusation_choice",
  phase: "input_select.mystery_phase",
};

const PHASE_LABEL = {
  idle: "EN VEILLE",
  investigation: "ENQUÊTE EN COURS",
  autopsy_done: "RAPPORT D'AUTOPSIE REÇU",
  accusation: "PROCÉDURE D'ACCUSATION",
  solved: "AFFAIRE CLASSÉE",
};

const MODE_KEY = "mystery-terminal-mode";
const MODES = ["code", "cctv"];

/* ══════════════════════════════════════════════════════════════════
 *  JOURNAL DES CAPTEURS — logique pure, sans DOM
 *
 *  Le bloc « JOURNAL CAPTEURS » de l'écran CCTV n'invente rien : il
 *  retranscrit les vrais changements d'état de la maison. Tout ce qui suit est
 *  exporté et couvert par tests/mystery-terminal.test.mjs.
 * ══════════════════════════════════════════════════════════════════ */

// `sensor` est volontairement absent : les valeurs numériques changent en
// continu (température, puissance, batterie…) et noieraient les événements
// intéressants en quelques secondes.
export const JOURNAL_DOMAINS = [
  "binary_sensor", "light", "switch", "lock", "cover",
  "fan", "media_player", "climate", "person", "device_tracker", "vacuum",
];

// Les entités du jeu lui-même dévoileraient la mécanique aux joueurs.
export const JOURNAL_EXCLUDE = ["mystery"];

export const JOURNAL_LINES = 7;

// [ état « on », état « off » ] par device_class de binary_sensor.
const BINARY_LABELS = {
  motion: ["MOUVEMENT DÉTECTÉ", "PLUS DE MOUVEMENT"],
  occupancy: ["PRÉSENCE DÉTECTÉE", "ZONE VIDE"],
  presence: ["PRÉSENCE DÉTECTÉE", "ZONE VIDE"],
  door: ["OUVERTURE", "FERMETURE"],
  garage_door: ["OUVERTURE", "FERMETURE"],
  window: ["OUVERTURE", "FERMETURE"],
  opening: ["OUVERTURE", "FERMETURE"],
  moisture: ["FUITE DÉTECTÉE", "PLUS DE FUITE"],
  smoke: ["FUMÉE DÉTECTÉE", "AIR NORMAL"],
  gas: ["GAZ DÉTECTÉ", "AIR NORMAL"],
  carbon_monoxide: ["MONOXYDE DÉTECTÉ", "AIR NORMAL"],
  sound: ["SON DÉTECTÉ", "SILENCE"],
  vibration: ["VIBRATION", "STABLE"],
  battery: ["BATTERIE FAIBLE", "BATTERIE OK"],
  problem: ["ANOMALIE SIGNALÉE", "RETOUR À LA NORMALE"],
  tamper: ["SABOTAGE DÉTECTÉ", "RETOUR À LA NORMALE"],
  connectivity: ["EN LIGNE", "HORS LIGNE"],
  power: ["SOUS TENSION", "HORS TENSION"],
  plug: ["BRANCHÉ", "DÉBRANCHÉ"],
  lock: ["DÉVERROUILLÉ", "VERROUILLÉ"],
  running: ["EN MARCHE", "ARRÊTÉ"],
  cold: ["FROID ANORMAL", "TEMPÉRATURE NORMALE"],
  heat: ["SURCHAUFFE", "TEMPÉRATURE NORMALE"],
};

const DOMAIN_LABELS = {
  light: { on: "ALLUMÉ", off: "ÉTEINT" },
  switch: { on: "ACTIVÉ", off: "DÉSACTIVÉ" },
  fan: { on: "EN MARCHE", off: "ARRÊTÉ" },
  lock: {
    locked: "VERROUILLÉ", unlocked: "DÉVERROUILLÉ", open: "OUVERT",
    locking: "VERROUILLAGE EN COURS", unlocking: "DÉVERROUILLAGE EN COURS",
    jammed: "BLOCAGE MÉCANIQUE",
  },
  cover: {
    open: "OUVERT", closed: "FERMÉ",
    opening: "OUVERTURE EN COURS", closing: "FERMETURE EN COURS",
  },
  media_player: {
    playing: "LECTURE", paused: "PAUSE", idle: "EN ATTENTE",
    off: "ÉTEINT", on: "ALLUMÉ", standby: "VEILLE", buffering: "MISE EN MÉMOIRE",
  },
  climate: {
    off: "ARRÊT", heat: "CHAUFFAGE", cool: "CLIMATISATION",
    heat_cool: "AUTOMATIQUE", auto: "AUTOMATIQUE",
    dry: "DÉSHUMIDIFICATION", fan_only: "VENTILATION",
  },
  person: { home: "AU MANOIR", not_home: "HORS DU MANOIR" },
  device_tracker: { home: "AU MANOIR", not_home: "HORS DU MANOIR" },
  vacuum: {
    cleaning: "NETTOYAGE", docked: "À LA BASE", returning: "RETOUR À LA BASE",
    idle: "EN ATTENTE", paused: "PAUSE", error: "ERREUR",
  },
};

const DEAD_STATES = ["unavailable", "unknown", "none", ""];

/** Un état que HA ne sait pas encore lire ne raconte rien. */
export function isDeadState(state) {
  return state == null || DEAD_STATES.includes(String(state).toLowerCase());
}

/** L'entité a-t-elle sa place dans le journal ? */
export function isJournalEntity(entityId, opts) {
  if (!entityId || String(entityId).indexOf(".") < 0) return false;
  const o = opts || {};
  const domains = o.domains || JOURNAL_DOMAINS;
  const exclude = o.exclude || JOURNAL_EXCLUDE;
  if (!domains.includes(String(entityId).split(".")[0])) return false;
  const id = String(entityId).toLowerCase();
  return !exclude.some((frag) => id.includes(String(frag).toLowerCase()));
}

/** Libellé français de l'état, dérivé du domaine et du device_class. */
export function journalStateLabel(entityId, state, attributes) {
  const domain = String(entityId).split(".")[0];
  const raw = String(state);
  if (domain === "binary_sensor") {
    const pair = BINARY_LABELS[(attributes || {}).device_class];
    if (pair) return raw === "on" ? pair[0] : pair[1];
    return raw === "on" ? "ACTIF" : "INACTIF";
  }
  const map = DOMAIN_LABELS[domain];
  if (map && map[raw]) return map[raw];
  return raw.toUpperCase().replace(/_/g, " ");
}

/** Nom lisible de l'entité : friendly_name, sinon l'identifiant dégrossi. */
export function journalEntityName(entityId, attributes) {
  const friendly = (attributes || {}).friendly_name;
  if (friendly) return String(friendly);
  return String(entityId).split(".").slice(1).join(".").replace(/_/g, " ");
}

/** Pièce de l'entité, via son inscription au registre puis son appareil. */
export function journalAreaName(hass, entityId) {
  if (!hass) return null;
  const reg = (hass.entities || {})[entityId];
  if (!reg) return null;
  let areaId = reg.area_id;
  if (!areaId && reg.device_id) {
    const device = (hass.devices || {})[reg.device_id];
    areaId = device && device.area_id;
  }
  const area = areaId && (hass.areas || {})[areaId];
  return area && area.name ? String(area.name) : null;
}

/**
 * Une ligne de journal à partir d'un état, ou null si l'événement n'a rien à
 * raconter. `oldState` est absent lors de l'amorçage.
 */
export function journalLine(hass, entityId, newState, oldState, opts) {
  if (!isJournalEntity(entityId, opts)) return null;
  if (!newState || isDeadState(newState.state)) return null;
  // Changement d'attribut seul (luminosité, position…) : l'état n'a pas bougé.
  if (oldState && oldState.state === newState.state) return null;
  // Retour d'un appareil injoignable : HA rejoue son état, ce n'est pas un
  // événement du manoir. Très fréquent au redémarrage de HA.
  if (oldState && isDeadState(oldState.state)) return null;

  const attrs = newState.attributes || {};
  const area = journalAreaName(hass, entityId);
  const name = journalEntityName(entityId, attrs).toUpperCase();
  const label = journalStateLabel(entityId, newState.state, attrs);
  return {
    entityId,
    at: newState.last_changed ? new Date(newState.last_changed) : new Date(),
    text: `${area ? area.toUpperCase() + " — " : ""}${name} · ${label}`,
  };
}

/**
 * Amorçage : les `limit` derniers changements réels de la maison, du plus
 * récent au plus ancien. Le journal est plein dès la première seconde.
 */
export function journalSeed(hass, limit, opts) {
  const states = (hass && hass.states) || {};
  return Object.keys(states)
    .filter((id) => isJournalEntity(id, opts))
    .map((id) => journalLine(hass, id, states[id], null, opts))
    .filter(Boolean)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit == null ? JOURNAL_LINES : limit);
}

/* ══════════════════════════════════════════════════════════════════
 *  Styles
 * ══════════════════════════════════════════════════════════════════ */

const CSS = `
:host{
  display:block; height:100%; width:100%;
  container-type:size;
  --px: 0.0926cqh;            /* 1px @ 1080 de haut */
  --amber:#ffb200; --amber-dim:#8a6209; --amber-deep:#3a2905;
  --green:#35ff6a; --green-dim:#0e5c25;
  --red:#ff3b30; --bg:#050506; --panel:#0c0c0e; --line:#1c1c20;
  font-family:'IBM Plex Mono','SFMono-Regular',Consolas,'Liberation Mono',monospace;
  color:var(--amber);
  -webkit-font-smoothing:antialiased;
  user-select:none; cursor:default;
}
*{box-sizing:border-box; margin:0; padding:0;}
button{font:inherit; color:inherit; background:none; border:none; cursor:pointer;}
.crt{position:relative; height:100%; width:100%; background:var(--bg); overflow:hidden;
  display:grid; grid-template-rows:auto 1fr auto; padding:calc(14*var(--px));
  gap:calc(12*var(--px));}
.crt::after{content:''; position:absolute; inset:0; pointer-events:none; z-index:60;
  background:repeating-linear-gradient(to bottom, rgba(0,0,0,.35) 0 calc(1*var(--px)), rgba(0,0,0,0) calc(1*var(--px)) calc(3*var(--px)));
  mix-blend-mode:multiply;}
.vig{position:absolute; inset:0; pointer-events:none; z-index:59;
  background:radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,.75) 100%);}
.noise{position:absolute; inset:-50%; pointer-events:none; z-index:58; opacity:.05;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>");
  animation:drift .5s steps(3) infinite;}
@keyframes drift{0%{transform:translate(0,0)}33%{transform:translate(-2%,1%)}66%{transform:translate(1%,-2%)}100%{transform:translate(0,0)}}

/* ---------- bandeau ---------- */
header{display:flex; align-items:stretch; gap:calc(10*var(--px)); z-index:5;}
.hbox{border:calc(1*var(--px)) solid var(--line); background:var(--panel);
  padding:calc(10*var(--px)) calc(16*var(--px)); display:flex; align-items:center; gap:calc(14*var(--px));}
.hbox.grow{flex:1;}
.brand{font-size:calc(26*var(--px)); letter-spacing:calc(3*var(--px)); font-weight:700; white-space:nowrap;}
.sub{font-size:calc(15*var(--px)); color:var(--amber-dim); letter-spacing:calc(2*var(--px)); white-space:nowrap;}
.clock{font-size:calc(26*var(--px)); letter-spacing:calc(2*var(--px)); font-variant-numeric:tabular-nums; white-space:nowrap;}
.rec{display:flex; align-items:center; gap:calc(8*var(--px)); color:var(--red); font-size:calc(16*var(--px)); letter-spacing:calc(2*var(--px)); white-space:nowrap;}
.dot{width:calc(12*var(--px)); height:calc(12*var(--px)); border-radius:50%; background:var(--red); animation:blink 1.2s steps(2) infinite;}
@keyframes blink{50%{opacity:.15}}
.lockflag{white-space:nowrap; font-size:calc(20*var(--px)); letter-spacing:calc(3*var(--px)); font-weight:700;
  color:var(--red); border:calc(2*var(--px)) solid var(--red); padding:calc(6*var(--px)) calc(14*var(--px));
  background:repeating-linear-gradient(45deg, rgba(255,59,48,.10) 0 calc(8*var(--px)), transparent calc(8*var(--px)) calc(16*var(--px)));
  animation:blink 2s steps(2) infinite;}
.lockflag.ok{color:var(--green); border-color:var(--green); animation:none;
  background:repeating-linear-gradient(45deg, rgba(53,255,106,.10) 0 calc(8*var(--px)), transparent calc(8*var(--px)) calc(16*var(--px)));}

/* ---------- grille principale ---------- */
main{display:grid; gap:calc(12*var(--px)); min-height:0; z-index:5;}
main.code{grid-template-columns:1fr 1.15fr;}
main.cctv{grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr;}
section.col{display:flex; flex-direction:column; gap:calc(10*var(--px)); min-height:0;}
.title{font-size:calc(17*var(--px)); letter-spacing:calc(4*var(--px)); color:var(--amber-dim);
  border-bottom:calc(1*var(--px)) solid var(--line); padding-bottom:calc(6*var(--px)); display:flex; justify-content:space-between;}

/* ---------- pavé ---------- */
.display{border:calc(2*var(--px)) solid var(--amber-deep); background:#0a0800; padding:calc(14*var(--px));
  text-align:center;}
.display .lab{font-size:calc(15*var(--px)); color:var(--amber-dim); letter-spacing:calc(3*var(--px));}
.digits{font-size:calc(104*var(--px)); letter-spacing:calc(20*var(--px)); line-height:1.1; font-weight:700;
  text-shadow:0 0 calc(22*var(--px)) rgba(255,178,0,.55); font-variant-numeric:tabular-nums;}
.digits .off{color:var(--amber-deep); text-shadow:none;}
.msg{font-size:calc(21*var(--px)); letter-spacing:calc(3*var(--px)); min-height:calc(28*var(--px)); color:var(--amber-dim);}
.msg.err{color:var(--red);} .msg.ok{color:var(--green);}
.display.err{border-color:var(--red); animation:shake .42s;}
.display.ok{border-color:var(--green);}
@keyframes shake{10%,90%{transform:translateX(calc(-6*var(--px)))}20%,80%{transform:translateX(calc(9*var(--px)))}
  30%,50%,70%{transform:translateX(calc(-14*var(--px)))}40%,60%{transform:translateX(calc(14*var(--px)))}100%{transform:none}}
.keys{display:grid; grid-template-columns:repeat(3,1fr); gap:calc(10*var(--px)); flex:1; min-height:0;}
.key{border:calc(1*var(--px)) solid #2a2a30; background:linear-gradient(180deg,#141418,#0a0a0c);
  font-size:calc(56*var(--px)); font-weight:700; display:grid; place-items:center;
  transition:transform .06s, background .1s, border-color .1s, color .1s;}
.key:hover{border-color:var(--amber); background:linear-gradient(180deg,#2a2008,#140f04); color:#fff2cf;}
.key:active{transform:translateY(calc(3*var(--px))); background:var(--amber); color:#000;}
.key.wide{font-size:calc(28*var(--px)); letter-spacing:calc(2*var(--px));}
.key.ok{border-color:var(--green-dim); color:var(--green);} .key.ok:hover{background:#062a11; border-color:var(--green);}
.key.del{border-color:#4a2a10; color:#e08a3c;} .key.del:hover{background:#2a1405; border-color:#e08a3c;}

/* ---------- preuves ---------- */
.counter{border:calc(1*var(--px)) solid var(--line); background:var(--panel); padding:calc(12*var(--px)) calc(18*var(--px));
  display:flex; align-items:baseline; gap:calc(16*var(--px));}
.counter b{white-space:nowrap; font-size:calc(64*var(--px)); line-height:1; font-variant-numeric:tabular-nums;}
.counter span{white-space:nowrap; font-size:calc(18*var(--px)); letter-spacing:calc(3*var(--px)); color:var(--amber-dim);}
.counter.full b, .counter.full{color:var(--green);}
.bars{display:flex; gap:calc(6*var(--px)); margin-left:auto;}
.bars i{width:calc(30*var(--px)); height:calc(30*var(--px)); border:calc(2*var(--px)) solid var(--amber-deep);}
.bars i.on{background:var(--green); border-color:var(--green);}
.slots{display:grid; grid-template-rows:repeat(3,1fr); gap:calc(10*var(--px)); flex:1; min-height:0;}
.slot{position:relative; border:calc(1*var(--px)) dashed #33333a; background:#08080a; padding:calc(16*var(--px));
  display:grid; grid-template-columns:calc(96*var(--px)) 1fr; gap:calc(18*var(--px)); align-items:center; overflow:hidden;}
.slot .mark{border:calc(2*var(--px)) solid #33333a; height:calc(96*var(--px)); display:grid; place-items:center;
  font-size:calc(52*var(--px)); color:#33333a;}
.slot .l1{font-size:calc(32*var(--px)); font-weight:700; letter-spacing:calc(2*var(--px)); color:#4a4a52;}
.slot .l2{font-size:calc(17*var(--px)); letter-spacing:calc(2*var(--px)); color:#3a3a42; margin-top:calc(6*var(--px));}
.slot.on{border-style:solid; border-color:var(--green); background:#04120a;}
.slot.on .mark{border-color:var(--green); color:var(--green); text-shadow:0 0 calc(20*var(--px)) var(--green);}
.slot.on .l1{color:var(--green);} .slot.on .l2{color:#2f8a4c;}
.slot.pop{animation:pop .7s ease-out;}
.slot.pop .mark{animation:stamp .55s cubic-bezier(.2,1.6,.4,1);}
@keyframes pop{0%{box-shadow:inset 0 0 0 calc(200*var(--px)) rgba(53,255,106,.55)}100%{box-shadow:inset 0 0 0 calc(200*var(--px)) rgba(53,255,106,0)}}
@keyframes stamp{0%{transform:scale(2.4) rotate(-14deg); opacity:0}60%{transform:scale(.92) rotate(2deg); opacity:1}100%{transform:none}}

/* ---------- dossier ---------- */
.dossier{border:calc(2*var(--px)) solid var(--red); padding:calc(16*var(--px)); text-align:center;
  background:repeating-linear-gradient(45deg, rgba(255,59,48,.09) 0 calc(10*var(--px)), transparent calc(10*var(--px)) calc(20*var(--px)));}
.dossier .t{font-size:calc(26*var(--px)); font-weight:700; letter-spacing:calc(4*var(--px)); color:var(--red);}
.dossier .s{font-size:calc(16*var(--px)); letter-spacing:calc(2*var(--px)); color:#a03028; margin-top:calc(5*var(--px));}
.dossier.open{border-color:var(--green); color:var(--green); cursor:pointer;
  background:repeating-linear-gradient(45deg, rgba(53,255,106,.10) 0 calc(10*var(--px)), transparent calc(10*var(--px)) calc(20*var(--px)));
  animation:glow 1.4s ease-in-out infinite alternate;}
.dossier.open .t{color:var(--green);} .dossier.open .s{color:#2f8a4c;}
.dossier.open:hover{background:rgba(53,255,106,.18);}
@keyframes glow{to{box-shadow:0 0 calc(34*var(--px)) rgba(53,255,106,.45)}}

/* ---------- mur d'images ---------- */
.cell{position:relative; border:calc(1*var(--px)) solid var(--line); background:#08080a; overflow:hidden; min-height:0;}
.cell .vidhost{position:absolute; inset:0;}
.cell video{width:100%; height:100%; object-fit:cover; display:block;
  filter:grayscale(.35) contrast(1.15) brightness(.9);}
.cell .ovl{position:absolute; inset:0; pointer-events:none; z-index:2;
  background:repeating-linear-gradient(to bottom, rgba(255,178,0,.05) 0 calc(2*var(--px)), transparent calc(2*var(--px)) calc(6*var(--px)));}
.cell .tag{position:absolute; z-index:3; top:calc(12*var(--px)); left:calc(14*var(--px)); display:flex; align-items:center; gap:calc(10*var(--px));
  background:rgba(2,2,3,.72); padding:calc(6*var(--px)) calc(12*var(--px)); border:calc(1*var(--px)) solid var(--line);}
.cell .tag .id{white-space:nowrap; font-size:calc(30*var(--px)); font-weight:700; letter-spacing:calc(3*var(--px));}
.cell .tag .zone{white-space:nowrap; font-size:calc(15*var(--px)); color:var(--amber-dim); letter-spacing:calc(2*var(--px));}
.cell .live{white-space:nowrap; position:absolute; z-index:3; top:calc(12*var(--px)); right:calc(14*var(--px)); display:flex; align-items:center;
  gap:calc(8*var(--px)); font-size:calc(15*var(--px)); color:var(--red); letter-spacing:calc(2*var(--px));
  background:rgba(2,2,3,.72); padding:calc(6*var(--px)) calc(12*var(--px));}
.cell .ts{position:absolute; z-index:3; bottom:calc(12*var(--px)); right:calc(14*var(--px)); font-size:calc(17*var(--px));
  color:var(--amber); background:rgba(2,2,3,.72); padding:calc(4*var(--px)) calc(10*var(--px)); font-variant-numeric:tabular-nums;}

/* ---------- bloc d'information (mur d'images) ----------
   Diagnostic volontairement fictif : un manoir laissé à l'abandon, pas les
   vraies statistiques de Home Assistant. */
.info{display:flex; flex-direction:column; gap:calc(9*var(--px)); padding:calc(12*var(--px));
  border:calc(1*var(--px)) solid var(--line); background:var(--panel); min-height:0; overflow:hidden;}
.info .hd{flex:none; font-size:calc(17*var(--px)); letter-spacing:calc(4*var(--px)); color:var(--amber-dim);
  border-bottom:calc(1*var(--px)) solid var(--line); padding-bottom:calc(8*var(--px));
  display:flex; justify-content:space-between; white-space:nowrap;}
.gauges{flex:none; display:grid; grid-template-columns:1fr 1fr; gap:calc(6*var(--px)) calc(18*var(--px));}
.g{display:flex; flex-direction:column; gap:calc(4*var(--px));}
.g .k{font-size:calc(13*var(--px)); letter-spacing:calc(2*var(--px)); color:var(--amber-dim); white-space:nowrap;}
.g .v{font-size:calc(20*var(--px)); font-variant-numeric:tabular-nums; white-space:nowrap;}
.g .v small{font-size:calc(14*var(--px)); color:var(--amber-dim); letter-spacing:calc(1*var(--px));}
.g .v.warn{color:var(--red);}
.bar{height:calc(6*var(--px)); border:calc(1*var(--px)) solid var(--amber-deep); position:relative;}
.bar i{position:absolute; inset:calc(1*var(--px)); width:var(--w,50%); background:var(--amber);}
.bar.warn i{background:var(--red);}
.faults{flex:none; border:calc(1*var(--px)) solid #2a1a08; background:#0a0603; padding:calc(8*var(--px)) calc(10*var(--px));}
.faults .ft{font-size:calc(13*var(--px)); letter-spacing:calc(2*var(--px)); color:#7a4a10; margin-bottom:calc(5*var(--px));}
.faults .fr{display:flex; justify-content:space-between; font-size:calc(14*var(--px)); color:#8a5a1a;
  letter-spacing:calc(1*var(--px)); white-space:nowrap; line-height:1.55;}
.faults .fr b{color:#b06a1a; font-weight:400;}
.feed{flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column; gap:calc(4*var(--px));}
.feed .fh{font-size:calc(13*var(--px)); letter-spacing:calc(2*var(--px)); color:var(--amber-dim); flex:none;}
.feed .fbody{min-height:0; overflow:hidden;}
.feed .fl{font-size:calc(15*var(--px)); letter-spacing:calc(1*var(--px)); color:var(--amber); white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis; opacity:.85; animation:fadein .4s;}
.feed .fl:nth-child(n+5){opacity:.4;}
.feed .fq{font-size:calc(15*var(--px)); letter-spacing:calc(2*var(--px)); color:var(--amber-deep);}
@keyframes fadein{from{opacity:0; transform:translateX(calc(-10*var(--px)))}}
.info .foot{flex:none; border-top:calc(1*var(--px)) solid var(--line); padding-top:calc(8*var(--px));
  font-size:calc(13*var(--px)); letter-spacing:calc(2*var(--px)); color:#5a4210; text-align:center; white-space:nowrap;}

/* ---------- journal ---------- */
/* padding-right : réserve la place des deux boutons de régie, qui flottent
   au-dessus du pied de page. */
footer{border:calc(1*var(--px)) solid var(--line); background:var(--panel);
  padding:calc(8*var(--px)) calc(130*var(--px)) calc(8*var(--px)) calc(14*var(--px));
  font-size:calc(15*var(--px)); color:var(--amber-dim); display:flex; gap:calc(28*var(--px)); overflow:hidden; z-index:5;}
footer .ln{white-space:nowrap;}

/* ---------- boutons de régie ---------- */
/* Discrets : ce sont des boutons de régie, pas des éléments de jeu. Le plein
   écran met la carte elle-même en plein écran, ce qui masque aussi la barre
   latérale de HA. Le second bascule cet onglet entre saisie et mur d'images. */
.regie{position:absolute; z-index:65; bottom:calc(16*var(--px));
  width:calc(46*var(--px)); height:calc(46*var(--px)); display:grid; place-items:center;
  border:calc(1*var(--px)) solid var(--amber-deep); background:rgba(5,5,6,.9);
  color:var(--amber-dim); font-size:calc(22*var(--px)); line-height:1;
  transition:color .12s, border-color .12s, background .12s;}
.regie:hover{color:#000; background:var(--amber); border-color:var(--amber);}
#fsbtn{right:calc(18*var(--px));}
#modebtn{right:calc(74*var(--px));}
:host(:fullscreen){width:100vw; height:100vh;}
:host(:-webkit-full-screen){width:100vw; height:100vh;}

/* ---------- overlays ---------- */
.ov{position:absolute; inset:0; z-index:70; background:rgba(2,2,3,.94); display:grid; place-items:center; padding:calc(40*var(--px));}
.ov[hidden]{display:none;}
.bigbtn{border:calc(2*var(--px)) solid var(--amber); padding:calc(14*var(--px)) calc(34*var(--px));
  font-size:calc(22*var(--px)); letter-spacing:calc(3*var(--px));}
.bigbtn:hover{background:var(--amber); color:#000;}
.bigbtn.g{border-color:var(--green); color:var(--green);} .bigbtn.g:hover{background:var(--green); color:#000;}
.bigbtn.r{border-color:var(--red); color:var(--red);} .bigbtn.r:hover{background:var(--red); color:#000;}

/* Flux absent ou illisible : un écran de panne crédible plutôt qu'un cadre
   noir. Le mur reste présentable sans les .mp4. */
.missing{position:relative; display:grid; place-content:center; justify-items:center; gap:calc(14*var(--px));
  height:100%; text-align:center; overflow:hidden;
  border:calc(1*var(--px)) dashed var(--amber-deep); background:#050506;}
.missing::before{content:''; position:absolute; inset:0; opacity:.09; pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23s)'/></svg>");
  animation:drift .25s steps(4) infinite;}
.missing > *{position:relative;}
.missing .mtitle{font-size:calc(34*var(--px)); font-weight:700; letter-spacing:calc(6*var(--px)); color:var(--red);
  animation:blink 1.6s steps(2) infinite;}
.missing .msub{font-size:calc(19*var(--px)); letter-spacing:calc(4*var(--px)); color:var(--amber);}
.missing .mtxt{font-size:calc(17*var(--px)); letter-spacing:calc(2*var(--px)); color:var(--amber-dim); line-height:1.8;}
.missing .mcode{font-size:calc(14*var(--px)); letter-spacing:calc(3*var(--px)); color:var(--amber-deep);
  border:calc(1*var(--px)) solid var(--amber-deep); padding:calc(8*var(--px)) calc(18*var(--px));}
/* Rappel de montage, volontairement minuscule et terne : utile à Eric pendant
   la préparation, illisible de loin pendant la partie. */
.missing .mpath{font-size:calc(13*var(--px)); letter-spacing:calc(1*var(--px)); color:#3a3a42;
  margin-top:calc(6*var(--px));}
.missing .mpath b{color:#55555f; font-weight:400;}

.boot{font-size:calc(30*var(--px)); line-height:1.9; letter-spacing:calc(2*var(--px)); width:calc(1100*var(--px));}
.boot .l{opacity:0; animation:type .01s forwards;}
.boot .l.ok{color:var(--green);}
@keyframes type{to{opacity:1}}
.ov.flash{animation:flash .5s steps(2) 3;}
@keyframes flash{50%{background:rgba(53,255,106,.20)}}

/* ---------- transmission de l'inspecteur ---------- */
/* Le texte s'affiche en même temps que la voix : si le navigateur bloque la
   lecture audio, les joueurs lisent quand même le message. */
.saywrap{width:calc(1500*var(--px)); border:calc(2*var(--px)) solid var(--amber);
  background:#0a0800; padding:calc(40*var(--px)); text-align:center;}
.saywrap .who{font-size:calc(20*var(--px)); letter-spacing:calc(5*var(--px)); color:var(--amber-dim);
  display:flex; align-items:center; justify-content:center; gap:calc(12*var(--px));}
.saywrap .who .dot{background:var(--amber);}
.saywrap .txt{font-size:calc(34*var(--px)); line-height:1.55; margin-top:calc(24*var(--px));
  text-shadow:0 0 calc(14*var(--px)) rgba(255,178,0,.35);}

.dosswrap{width:100%; height:100%; display:grid; grid-template-rows:auto 1fr auto; gap:calc(18*var(--px));}
.dosshead{text-align:center;}
.dosshead h2{font-size:calc(46*var(--px)); letter-spacing:calc(8*var(--px)); color:var(--green);}
.dosshead p{font-size:calc(19*var(--px)); letter-spacing:calc(3*var(--px)); color:var(--amber-dim); margin-top:calc(8*var(--px));}
.suspects{display:grid; grid-template-columns:repeat(3,1fr); gap:calc(20*var(--px)); min-height:0;}
.sus{border:calc(1*var(--px)) solid var(--line); background:var(--panel); display:grid; grid-template-rows:1fr auto;
  overflow:hidden; transition:border-color .12s, transform .12s;}
.sus:hover{border-color:var(--red); transform:translateY(calc(-6*var(--px)));}
.sus .ph{background:#0a0a0c; overflow:hidden; display:grid; place-items:center; min-height:0;}
.sus .ph img{width:100%; height:100%; object-fit:cover; filter:grayscale(1) contrast(1.25) brightness(.85);}
.sus .ph .stub{width:100%; height:100%; display:grid; place-items:center; font-size:calc(15*var(--px)); color:var(--amber-deep);
  letter-spacing:calc(2*var(--px)); text-align:center; padding:calc(10*var(--px));
  background:repeating-linear-gradient(135deg,#0e0e11 0 calc(10*var(--px)),#08080a calc(10*var(--px)) calc(20*var(--px)));}
.sus .body{padding:calc(16*var(--px)); border-top:calc(1*var(--px)) solid var(--line);}
.sus .n{font-size:calc(32*var(--px)); font-weight:700; letter-spacing:calc(3*var(--px));}
.sus .d{font-size:calc(17*var(--px)); color:var(--amber-dim); letter-spacing:calc(2*var(--px)); margin-top:calc(6*var(--px));}
.dossfoot{display:flex; justify-content:center; gap:calc(20*var(--px));}
.confirm{width:calc(900*var(--px)); border:calc(2*var(--px)) solid var(--red); background:#0a0203; padding:calc(34*var(--px)); text-align:center;}
.confirm h3{font-size:calc(34*var(--px)); letter-spacing:calc(4*var(--px)); color:var(--red);}
.confirm p{font-size:calc(20*var(--px)); color:var(--amber); margin:calc(18*var(--px)) 0 calc(28*var(--px)); line-height:1.6;}
.confirm .row{display:flex; gap:calc(18*var(--px)); justify-content:center;}
`;

/* ══════════════════════════════════════════════════════════════════
 *  Gabarits
 * ══════════════════════════════════════════════════════════════════ */

const REGIE = `
  <button class="regie" id="modebtn" title="Basculer écran de saisie / mur d'images">📹</button>
  <button class="regie" id="fsbtn" title="Plein écran">⛶</button>`;

const HEAD = (brand, sub, rec) => `
  <header>
    <div class="hbox">
      <div>
        <div class="brand">${brand}</div>
        <div class="sub">${sub}</div>
      </div>
    </div>
    <div class="hbox grow">
      <div class="rec"><span class="dot"></span>${rec}</div>
      <div class="sub" id="phase">ENQUÊTE EN COURS</div>
      <div class="clock" id="clock" style="margin-left:auto">--:--:--</div>
    </div>
    <div class="hbox"><div class="lockflag" id="lockflag">SYSTÈME VERROUILLÉ</div></div>
  </header>`;

const HTML_CODE = `
<div class="crt">
  <div class="noise"></div><div class="vig"></div>
  ${HEAD("MANOIR — POSTE DE SÉCURITÉ", "TERMINAL DE SAISIE · UNITÉ B-02 · SOUS-SOL", "ENREGISTREMENT")}

  <main class="code">
    <section class="col">
      <div class="title"><span>SAISIE CODE PREUVE</span><span>4 CHIFFRES</span></div>
      <div class="display" id="display">
        <div class="lab">CODE RELEVÉ SUR L'ÉTIQUETTE</div>
        <div class="digits" id="digits"></div>
        <div class="msg" id="msg">EN ATTENTE DE SAISIE</div>
      </div>
      <div class="keys" id="keys"></div>
    </section>

    <section class="col">
      <div class="title"><span>REGISTRE DES PREUVES</span><span>SCELLÉ</span></div>
      <div class="counter" id="counter">
        <b id="cnum">0 / 3</b><span>PREUVES ENREGISTRÉES</span>
        <div class="bars" id="bars"><i></i><i></i><i></i></div>
      </div>
      <div class="slots" id="slots"></div>
      <button class="dossier" id="dossier">
        <div class="t" id="dosst">DOSSIER CONFIDENTIEL — SCELLÉ</div>
        <div class="s" id="dosss">ACCÈS REFUSÉ · 3 PREUVES REQUISES</div>
      </button>
    </section>
  </main>

  <footer id="log"></footer>
  ${REGIE}

  <div class="ov" id="ovBoot" hidden><div class="boot" id="bootLines"></div></div>

  <div class="ov" id="ovSay" hidden>
    <div class="saywrap">
      <div class="who"><span class="dot"></span>TRANSMISSION — INSPECTEUR BEAUCHAMP-LATULIPPE</div>
      <div class="txt" id="sayText"></div>
    </div>
  </div>

  <div class="ov" id="ovDossier" hidden>
    <div class="dosswrap">
      <div class="dosshead">
        <h2>DOSSIER CONFIDENTIEL — DÉVERROUILLÉ</h2>
        <p>DÉSIGNEZ LE SUSPECT. LA DÉSIGNATION EST DÉFINITIVE ET TRANSMISE À L'INSPECTEUR.</p>
      </div>
      <div class="suspects" id="suspects"></div>
      <div class="dossfoot"><button class="bigbtn" id="dossClose">RETOUR AU TERMINAL</button></div>
    </div>
  </div>

  <div class="ov" id="ovConfirm" hidden>
    <div class="confirm">
      <h3>CONFIRMER L'ACCUSATION</h3>
      <p id="confirmText"></p>
      <div class="row">
        <button class="bigbtn" id="confirmNo">ANNULER</button>
        <button class="bigbtn r" id="confirmYes">TRANSMETTRE L'ACCUSATION</button>
      </div>
    </div>
  </div>
</div>`;

const HTML_CCTV = (cells) => `
<div class="crt">
  <div class="noise"></div><div class="vig"></div>
  ${HEAD("MANOIR — MUR D'IMAGES", "ARCHIVES CCTV · UNITÉ B-02 · SOUS-SOL", "RELECTURE EN BOUCLE")}

  <main class="cctv">
    ${cells}
    <div class="info">
      <div class="hd"><span>UNITÉ NVR-4 · DIAGNOSTIC</span><span id="uptime">UP 000:00</span></div>
      <div class="gauges">
        <div class="g">
          <div class="k">ESPACE DISQUE</div>
          <div class="v warn">94 %<small> / 2 To</small></div>
          <div class="bar warn"><i style="--w:94%"></i></div>
        </div>
        <div class="g">
          <div class="k">CANAUX ACTIFS</div>
          <div class="v">03<small> / 08</small></div>
          <div class="bar"><i style="--w:37%"></i></div>
        </div>
        <div class="g">
          <div class="k">TEMP. BAIE</div>
          <div class="v" id="temp">41,2 °C</div>
          <div class="bar"><i style="--w:72%"></i></div>
        </div>
        <div class="g">
          <div class="k">LATENCE RÉSEAU</div>
          <div class="v" id="lat">248 ms</div>
          <div class="bar"><i style="--w:58%"></i></div>
        </div>
      </div>
      <div class="faults">
        <div class="ft">CANAUX HORS SERVICE — 4</div>
        <div class="fr"><span>CAM 04 · CUISINE</span><b>SIGNAL PERDU</b></div>
        <div class="fr"><span>CAM 05 · COULOIR ÉTAGE</span><b>OBJECTIF OBSTRUÉ</b></div>
        <div class="fr"><span>CAM 06 · CHAMBRE PRINCIPALE</span><b>CÂBLE SECTIONNÉ</b></div>
        <div class="fr"><span>CAM 08 · GRENIER</span><b>NON INSTALLÉE</b></div>
      </div>
      <div class="feed">
        <div class="fh">JOURNAL CAPTEURS — MANOIR</div>
        <div class="fbody" id="feed"></div>
      </div>
      <div class="foot">MAINTENANCE ANNUELLE ÉCHUE DEPUIS 412 JOURS · CONTRAT RÉSILIÉ</div>
    </div>
  </main>

  <footer id="log"></footer>
  ${REGIE}
</div>`;

/* ══════════════════════════════════════════════════════════════════
 *  La carte
 * ══════════════════════════════════════════════════════════════════ */

class MysteryTerminalCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._buf = "";
    this._prev = null;
    this._pending = null;
    this._logLines = [];
    this._feed = [];
    this._camBail = [];
    this._mode = readMode();
  }

  setConfig(config) {
    this._config = config || {};
    this._muted = this._config.sound === false;
    this._volume = this._config.volume === undefined ? 0.05 : Number(this._config.volume);
    this._cameras = this._config.cameras || [
      { id: "CAM 01", zone: "ATELIER — SOUS-SOL", file: "" },
      { id: "CAM 02", zone: "SALON — REZ-DE-CHAUSSÉE", file: "" },
      { id: "CAM 03", zone: "SALLE À MANGER — REZ-DE-CHAUSSÉE", file: "" },
    ];
    this._suspects = this._config.suspects || [
      { option: "gardener", name: "LE JARDINIER", room: "ATELIER AU SOUS-SOL", weapon: "SCIE", portrait: "" },
      { option: "heiress", name: "L'HÉRITIÈRE", room: "SALON", weapon: "FUSIL", portrait: "" },
      { option: "butler", name: "LE MAJORDOME", room: "SALLE À MANGER", weapon: "POISON", portrait: "" },
    ];
    this._slotsCfg = this._config.evidence || [
      { key: "saw", entity: ENT.saw, label: "SCIE À MAIN", detail: "ATELIER · LE JARDINIER" },
      { key: "gun", entity: ENT.gun, label: "FUSIL", detail: "SALON · L'HÉRITIÈRE" },
      { key: "poison", entity: ENT.poison, label: "POT D'ÉPICES « POISON »", detail: "SALLE À MANGER · LE MAJORDOME" },
    ];
    // Journal des capteurs : les valeurs par défaut suffisent, `journal:` dans
    // le YAML ne sert qu'à écarter un capteur bavard ou à élargir les domaines.
    const j = this._config.journal || {};
    this._journalOpts = {
      domains: j.domains || JOURNAL_DOMAINS,
      exclude: JOURNAL_EXCLUDE.concat(j.exclude || []),
    };
    this._journalLines = j.lines == null ? JOURNAL_LINES : Number(j.lines);
    this._render();
  }

  connectedCallback() {
    // Le plein écran peut aussi être quitté par Échap : on suit l'état réel du
    // document plutôt que de mémoriser le nôtre.
    if (!this._onFs) {
      this._onFs = () => this._syncFullscreen();
      document.addEventListener("fullscreenchange", this._onFs);
      document.addEventListener("webkitfullscreenchange", this._onFs);
    }
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), 1000);
  }
  disconnectedCallback() {
    clearInterval(this._timer); this._timer = null;
    clearTimeout(this._sayHide);
    this._clearCamBails();
    if (this._unsubSay) { this._unsubSay(); this._unsubSay = null; this._evSub = false; }
    if (this._unsubJournal) { this._unsubJournal(); this._unsubJournal = null; this._journalSub = false; }
    if (this._onFs) {
      document.removeEventListener("fullscreenchange", this._onFs);
      document.removeEventListener("webkitfullscreenchange", this._onFs);
      this._onFs = null;
    }
  }
  getCardSize() { return 12; }

  /* ---------------- modes ---------------- */
  _toggleMode() {
    this._sfx("cam");
    this._mode = this._mode === "cctv" ? "code" : "cctv";
    writeMode(this._mode);
    this._render();
  }

  /* ---------------- construction ----------------
   * Basculer de mode reconstruit tout le shadow DOM. L'état de la partie vit
   * dans Home Assistant et dans l'instance (journal, tampon de saisie), donc
   * rien ne se perd — et on évite de maintenir deux arbres en parallèle.
   */
  _render() {
    if (!this._config) return;
    this._clearCamBails();
    this.shadowRoot.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = CSS;
    this.shadowRoot.append(style);

    const wrap = document.createElement("div");
    wrap.innerHTML = this._mode === "cctv" ? HTML_CCTV(this._cellsHtml()) : HTML_CODE;
    this.shadowRoot.append(wrap.firstElementChild);

    const $ = (id) => this.shadowRoot.getElementById(id);
    this.$ = $;

    $("modebtn").textContent = this._mode === "cctv" ? "⌨" : "📹";
    $("modebtn").addEventListener("click", () => this._toggleMode());
    $("fsbtn").addEventListener("click", () => this._toggleFullscreen());
    this._syncFullscreen();

    if (this._mode === "cctv") this._buildWall(); else this._buildCode();

    // Rejouer l'état courant sans rejouer les animations de transition.
    this._rebuilt = true;
    this._renderLog();
    this._renderFeed();
    this._tick();
    if (this._hass) this._applyHass(this._hass);
  }

  _buildCode() {
    const $ = this.$;
    const keys = ["1","2","3","4","5","6","7","8","9","DEL","0","OK"];
    $("keys").innerHTML = keys.map((k) => {
      if (k === "DEL") return `<button class="key wide del" data-k="del">EFFACER</button>`;
      if (k === "OK") return `<button class="key wide ok" data-k="ok">VALIDER</button>`;
      return `<button class="key" data-k="${k}">${k}</button>`;
    }).join("");
    $("keys").querySelectorAll("[data-k]").forEach((b) =>
      b.addEventListener("click", () => this._press(b.dataset.k)));

    $("slots").innerHTML = this._slotsCfg.map((s) => `
      <div class="slot" data-slot="${s.key}">
        <div class="mark">?</div>
        <div>
          <div class="l1">PREUVE NON IDENTIFIÉE</div>
          <div class="l2">??? · ??? · SCELLÉ</div>
        </div>
      </div>`).join("");

    $("suspects").innerHTML = this._suspects.map((s, i) => `
      <button class="sus" data-sus="${i}">
        <div class="ph">${s.portrait
          ? `<img src="${s.portrait}" alt="">`
          : `<div class="stub">[ PORTRAIT ${s.name} ]<br>portrait: /local/mystery/…jpg</div>`}</div>
        <div class="body">
          <div class="n">${s.name}</div>
          <div class="d">PIÈCE — ${s.room}</div>
          <div class="d">ARME — ${s.weapon}</div>
        </div>
      </button>`).join("");
    $("suspects").querySelectorAll("[data-sus]").forEach((b) =>
      b.addEventListener("click", () => this._askConfirm(+b.dataset.sus)));

    $("dossier").addEventListener("click", () => {
      this._sfx(this._unlocked ? "cam" : "err");
      if (this._unlocked) this._show("ovDossier");
    });
    $("dossClose").addEventListener("click", () => { this._sfx("close"); this._hide("ovDossier"); });
    $("confirmNo").addEventListener("click", () => { this._sfx("close"); this._hide("ovConfirm"); });
    $("confirmYes").addEventListener("click", () => this._sendAccusation());

    this._renderDigits();
    this._setMsg("", "");
    this._log("TERMINAL DE SAISIE EN LIGNE");
  }

  /* ---------------- mur d'images ----------------
   * Les trois archives tournent en boucle, muettes et sans contrôle : c'est un
   * écran d'ambiance, aucune interaction n'est prévue. Fichier absent, chemin
   * faux ou encodage refusé donnent tous le même écran de panne, crédible dans
   * la fiction — le mur reste présentable sans les .mp4.
   */
  _cellsHtml() {
    return this._cameras.slice(0, 3).map((c, i) => `
      <div class="cell">
        <div class="vidhost" data-vid="${i}"></div>
        <div class="ovl"></div>
        <div class="tag"><span class="id">${c.id}</span><span class="zone">${c.zone}</span></div>
        <div class="live"><span class="dot"></span>BOUCLE</div>
        <div class="ts" data-ts="${i}">--/-- --:--:--</div>
      </div>`).join("");
  }

  _buildWall() {
    this._cameras.slice(0, 3).forEach((c, i) => {
      const host = this.shadowRoot.querySelector(`[data-vid="${i}"]`);
      if (!host) return;
      if (!c.file) { this._cellFailed(c, host); return; }
      const v = document.createElement("video");
      v.autoplay = true; v.loop = true; v.muted = true; v.defaultMuted = true;
      v.playsInline = true; v.controls = false; v.src = c.file;
      // `error` couvre les deux vrais cas : fichier absent (404) et encodage
      // refusé. Le délai n'est là que pour un chargement qui ne répond jamais.
      this._camBail[i] = setTimeout(() => this._cellFailed(c, host), 8000);
      v.addEventListener("loadedmetadata", () => clearTimeout(this._camBail[i]));
      v.addEventListener("error", () => { clearTimeout(this._camBail[i]); this._cellFailed(c, host); });
      host.append(v);
      // Certains navigateurs refusent l'autoplay tant que la page n'a pas été
      // touchée ; l'échec est silencieux, un clic dans la page suffit ensuite.
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    });
    this._log("MUR D'IMAGES EN LIGNE");
    this._log("ARCHIVES EN LECTURE — BOUCLE CONTINUE");
  }

  _cellFailed(c, host) {
    if (host.dataset.failed) return;
    host.dataset.failed = "1";
    host.innerHTML = `
      <div class="missing">
        <div class="mtitle">⚠ ARCHIVE INDISPONIBLE</div>
        <div class="msub">${c.id} · ${c.zone}</div>
        <div class="mtxt">SECTEUR DISQUE CORROMPU — BANDE ILLISIBLE</div>
        <div class="mcode">ERR 0x1A · NVR-B02 · RÉINDEXATION REQUISE</div>
        <div class="mpath">${this._dropHint(c.file)}</div>
      </div>`;
    this._log(`ARCHIVE ILLISIBLE — ${c.id}`);
    console.warn(
      `[mystery-terminal] flux illisible pour ${c.id} — vérifier « file: » dans le YAML`,
      c.file || "(aucun chemin configuré)");
  }

  // Où déposer le fichier. HA sert `config/www/` sous `/local/`, donc on
  // retraduit l'URL en chemin disque : c'est celui-là qu'on veut lire quand on
  // a le dossier ouvert devant soi.
  _dropHint(file) {
    if (!file) return "renseigner « file: » dans dashboards/mystery-terminal.yaml";
    const disk = file.startsWith("/local/") ? "config/www/" + file.slice(7) : file;
    return `fichier non trouvé → <b>${disk}</b>`;
  }

  _clearCamBails() {
    this._camBail.forEach((t) => clearTimeout(t));
    this._camBail = [];
  }

  /* ---------------- hass ---------------- */
  set hass(hass) {
    this._hass = hass;
    // Home Assistant nous parle par événement : le message de l'inspecteur est
    // trop long pour tenir dans un input_text (255 caractères max).
    if (!this._evSub && hass.connection) {
      this._evSub = true;
      hass.connection
        .subscribeEvents((ev) => this._inspectorSays(ev.data.message), "mystery_terminal_say")
        .then((unsub) => { this._unsubSay = unsub; })
        .catch(() => { this._evSub = false; });
    }
    this._startJournal(hass);
    this._applyHass(hass);
  }

  _applyHass(hass) {
    if (!this.$ || !this.$("lockflag")) return;
    const g = (e) => (hass.states[e] ? hass.states[e].state : "unknown");
    const cur = {
      saw: g(ENT.saw) === "on", gun: g(ENT.gun) === "on", poison: g(ENT.poison) === "on",
      unlocked: g(ENT.unlocked) === "on", code: g(ENT.code), phase: g(ENT.phase),
    };
    // Après une reconstruction, on repose l'état sans rejouer les animations.
    const prev = this._rebuilt ? null : this._prev;
    this._rebuilt = false;
    this._unlocked = cur.unlocked;
    const count = ["saw","gun","poison"].filter((k) => cur[k]).length;
    cur.count = count;

    if (this.$("slots")) {
      // preuves
      this._slotsCfg.forEach((s) => {
        const el = this.$("slots").querySelector(`[data-slot="${s.key}"]`);
        if (!el) return;
        const on = cur[s.key];
        if (on === el.classList.contains("on")) return;
        el.classList.toggle("on", on);
        el.querySelector(".mark").textContent = on ? "✓" : "?";
        el.querySelector(".l1").textContent = on ? s.label : "PREUVE NON IDENTIFIÉE";
        el.querySelector(".l2").textContent = on ? s.detail : "??? · ??? · SCELLÉ";
        if (on && prev) {
          el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
          this._log(`PREUVE ENREGISTRÉE — ${s.label}`);
        }
      });

      // compteur
      this.$("cnum").textContent = `${count} / 3`;
      this.$("counter").classList.toggle("full", count === 3);
      this.$("bars").querySelectorAll("i").forEach((b, i) => b.classList.toggle("on", i < count));

      // dossier
      this.$("dossier").classList.toggle("open", cur.unlocked);
      this.$("dosst").textContent = cur.unlocked ? "► OUVRIR LE DOSSIER CONFIDENTIEL" : "DOSSIER CONFIDENTIEL — SCELLÉ";
      this.$("dosss").textContent = cur.unlocked ? "ACCÈS AUTORISÉ · DÉSIGNATION DU SUSPECT" : "ACCÈS REFUSÉ · 3 PREUVES REQUISES";
    } else if (prev && count > prev.count) {
      this._log(`REGISTRE MIS À JOUR — ${count} / 3 PREUVES`);
    }

    // verrou + phase, sur les deux écrans
    const lf = this.$("lockflag");
    lf.textContent = cur.unlocked ? "SYSTÈME DÉVERROUILLÉ" : "SYSTÈME VERROUILLÉ";
    lf.classList.toggle("ok", cur.unlocked);
    this.$("phase").textContent = PHASE_LABEL[cur.phase] || String(cur.phase || "").toUpperCase();

    // séquence de déverrouillage
    if (prev && !prev.unlocked && cur.unlocked) this._unlockSequence();

    // retour de validation
    if (this._pending && cur.code === "") {
      const gained = count > this._pending.count;
      clearTimeout(this._pending.t);
      this._pending = null;
      gained ? this._flashOk() : this._flashErr();
    }
    this._prev = cur;
  }

  /* ---------------- journal des capteurs ----------------
   * Rien n'est inventé ici : ce sont les vrais changements d'état de la maison.
   * L'abonnement est pris une seule fois et survit aux bascules de mode ; seul
   * l'affichage dépend de l'écran courant.
   */
  _startJournal(hass) {
    if (this._journalSub || !hass.connection) return;
    this._journalSub = true;
    if (!this._feed.length) {
      this._feed = journalSeed(hass, this._journalLines, this._journalOpts)
        .map((e) => `[${stampTime(e.at)}] ${e.text}`);
      this._renderFeed();
    }
    hass.connection
      .subscribeEvents((ev) => this._onStateChanged(ev), "state_changed")
      .then((unsub) => { this._unsubJournal = unsub; })
      .catch(() => { this._journalSub = false; });
  }

  _onStateChanged(ev) {
    const d = ev && ev.data;
    if (!d) return;
    const line = journalLine(this._hass, d.entity_id, d.new_state, d.old_state, this._journalOpts);
    if (!line) return;
    this._feed.unshift(`[${stampTime(line.at)}] ${line.text}`);
    this._feed = this._feed.slice(0, this._journalLines);
    this._renderFeed();
  }

  _renderFeed() {
    const host = this.$ && this.$("feed");
    if (!host) return;
    host.innerHTML = this._feed.length
      ? this._feed.map((l) => `<div class="fl">${escapeHtml(l)}</div>`).join("")
      : `<div class="fq">AUCUN ÉVÉNEMENT — MANOIR SILENCIEUX</div>`;
  }

  /* ---------------- pavé ---------------- */
  _press(k) {
    if (k === "del") { this._sfx("del"); this._buf = this._buf.slice(0, -1); this._setMsg("", ""); }
    else if (k === "ok") return this._submit();
    else if (this._buf.length < 4) { this._sfx("key"); this._buf += k; this._setMsg("", ""); }
    else this._sfx("del"); // pavé plein : un retour quand même, sinon la touche semble morte
    this._renderDigits();
  }
  _renderDigits() {
    const el = this.$ && this.$("digits");
    if (!el) return;
    const d = this._buf.padEnd(4, "_").split("");
    el.innerHTML = d.map((c, i) =>
      i < this._buf.length ? `<span>${c}</span>` : `<span class="off">_</span>`).join("");
  }
  _submit() {
    if (this._buf.length < 4) { this._sfx("err"); this._setMsg("CODE INCOMPLET", "err"); this._shake(); return; }
    this._sfx("submit");
    const code = this._buf;
    this._setMsg("VÉRIFICATION EN COURS…", "");
    this._log(`CODE SOUMIS — ${code}`);
    const count = ["saw","gun","poison"].filter((k) => this._prev && this._prev[k]).length;
    this._pending = { count, t: setTimeout(() => { this._pending = null; this._flashErr(); }, 6000) };
    this._call("input_text", "set_value", { entity_id: ENT.code, value: code });
    this._buf = ""; this._renderDigits();
  }
  _flashOk() {
    this._sfx("ok");
    this._setMsg("PREUVE VALIDÉE — ENREGISTRÉE", "ok");
    const d = this.$ && this.$("display");
    if (d) { d.classList.add("ok"); setTimeout(() => d.classList.remove("ok"), 1800); }
    setTimeout(() => this._setMsg("EN ATTENTE DE SAISIE", ""), 3000);
  }
  _flashErr() {
    this._sfx("err");
    this._setMsg("CODE INVALIDE", "err");
    this._log("CODE REJETÉ — AUCUNE CORRESPONDANCE");
    this._shake();
    setTimeout(() => this._setMsg("EN ATTENTE DE SAISIE", ""), 3000);
  }
  _shake() {
    const d = this.$ && this.$("display");
    if (!d) return;
    d.classList.remove("err"); void d.offsetWidth; d.classList.add("err");
    setTimeout(() => d.classList.remove("err"), 1600);
  }
  _setMsg(t, cls) {
    const m = this.$ && this.$("msg");
    if (!m) return;
    m.textContent = t || "EN ATTENTE DE SAISIE"; m.className = "msg " + (cls || "");
  }

  /* ---------------- déverrouillage ----------------
   * La séquence plein écran est réservée à l'écran de saisie : c'est là que
   * sont les joueurs et la souris. Le mur d'images bascule au vert au même
   * moment et se contente de noter la ligne.
   */
  _unlockSequence() {
    this._log("DOSSIER CONFIDENTIEL DÉVERROUILLÉ");
    if (!this.$("ovBoot")) return;
    const lines = [
      "► 3/3 PREUVES ENREGISTRÉES",
      "► VÉRIFICATION DES SCELLÉS…",
      "► DÉCHIFFREMENT DU CONTENEUR SÉCURISÉ…",
      "► AUTORISATION NIVEAU 3 ACCORDÉE",
      "► DOSSIER CONFIDENTIEL DÉVERROUILLÉ",
    ];
    const host = this.$("bootLines"); host.innerHTML = "";
    this._sfx("unlock");
    this._show("ovBoot");
    lines.forEach((t, i) => setTimeout(() => {
      const boot = this.$ && this.$("bootLines");
      if (!boot) return;
      const d = document.createElement("div");
      d.className = "l" + (i === lines.length - 1 ? " ok" : "");
      d.textContent = t; d.style.animationDelay = "0s";
      boot.append(d);
      if (i === lines.length - 1) this.$("ovBoot").classList.add("flash");
    }, 500 * i));
    setTimeout(() => {
      const ov = this.$ && this.$("ovBoot");
      if (!ov) return;
      ov.classList.remove("flash"); this._hide("ovBoot");
    }, 500 * lines.length + 2200);
  }

  /* ---------------- accusation ---------------- */
  _askConfirm(i) {
    this._sfx("warn");
    this._choice = this._suspects[i];
    this.$("confirmText").innerHTML =
      `VOUS DÉSIGNEZ <b>${this._choice.name}</b><br>${this._choice.room} · ${this._choice.weapon}<br><br>CETTE DÉCISION NE PEUT PAS ÊTRE ANNULÉE.`;
    this._show("ovConfirm");
  }
  _sendAccusation() {
    this._sfx("accuse");
    this._call("input_select", "select_option", { entity_id: ENT.accusation, option: this._choice.option });
    this._log(`ACCUSATION TRANSMISE — ${this._choice.name}`);
    this._hide("ovConfirm"); this._hide("ovDossier");
  }

  /* ---------------- voix de l'inspecteur sur le terminal ----------------
   * Les joueurs sont au sous-sol devant l'écran ; le téléphone, lui, est au
   * salon. Les moments qui suivent une action à l'écran (le dénouement) se
   * jouent donc ici, avec la même voix HenriNeural que le téléphone.
   * Le texte s'affiche en même temps : si le navigateur refuse de lire l'audio,
   * la partie continue quand même.
   *
   * Uniquement sur l'écran de saisie : les deux onglets reçoivent l'événement,
   * et laisser le mur d'images lire l'audio en même temps donnerait un écho.
   */
  async _inspectorSays(message) {
    if (!message) return;
    if (this._mode !== "code" || !this.$("ovSay")) {
      this._log("TRANSMISSION EN COURS — ÉCRAN DE SAISIE");
      return;
    }
    this.$("sayText").textContent = message;
    this._show("ovSay");
    clearTimeout(this._sayHide);
    // Même estimation que côté Home Assistant : ~2,3 mots par seconde.
    const secs = Math.max(6, Math.ceil(message.split(/\s+/).length / 2.3));
    this._sayHide = setTimeout(() => {
      if (this.$ && this.$("ovSay")) this._hide("ovSay");
    }, (secs + 2) * 1000);
    try {
      const url = await this._ttsUrl(message);
      const audio = new Audio(url);
      audio.volume = 1;
      await audio.play();
    } catch (e) {
      // Autoplay bloqué, TTS indisponible, hors ligne… le texte reste lisible.
      this._log("TRANSMISSION — LECTURE AUDIO IMPOSSIBLE");
      console.warn("[mystery-terminal] lecture TTS impossible", e);
    }
  }
  async _ttsUrl(message) {
    const body = {
      message,
      language: "fr-FR",
      options: { voice: "HenriNeural" },
    };
    // engine_id depuis HA 2023.7 ; platform sur les versions antérieures.
    try {
      const r = await this._hass.callApi("POST", "tts_get_url", {
        ...body, engine_id: "tts.home_assistant_cloud",
      });
      return r.path || r.url;
    } catch (e) {
      const r = await this._hass.callApi("POST", "tts_get_url", {
        ...body, platform: "cloud",
      });
      return r.path || r.url;
    }
  }

  /* ---------------- plein écran ----------------
   * On met la carte elle-même en plein écran, pas la page : ça masque aussi la
   * barre latérale et l'en-tête de Home Assistant, et il ne reste que le
   * terminal. Les unités `cqh` suivent, la mise en page se recalcule seule.
   */
  _toggleFullscreen() {
    this._sfx("cam");
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      return;
    }
    const req = this.requestFullscreen || this.webkitRequestFullscreen;
    if (!req) return;
    const r = req.call(this);
    // La version standard renvoie une promesse, la version webkit non.
    if (r && r.catch) r.catch(() => this._log("PLEIN ÉCRAN REFUSÉ PAR LE NAVIGATEUR"));
  }
  _syncFullscreen() {
    const b = this.$ && this.$("fsbtn");
    if (!b) return;
    const on = (document.fullscreenElement || document.webkitFullscreenElement) === this;
    b.textContent = on ? "⤡" : "⛶";
    b.title = on ? "Quitter le plein écran" : "Plein écran";
  }

  /* ---------------- son ----------------
   * Bips synthétisés à la volée : aucun fichier à déployer, rien à mettre en
   * cache, et pas de blocage autoplay puisque chaque son suit un clic.
   * `sound: false` dans le YAML coupe tout ; `volume:` règle le niveau.
   */
  _audio() {
    if (this._ac !== undefined) return this._ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    this._ac = AC ? new AC() : null;
    return this._ac;
  }
  _beep(freq, ms, opts) {
    if (this._muted) return;
    const o = opts || {};
    const ac = this._audio();
    if (!ac) return;
    // Le contexte démarre suspendu tant que l'utilisateur n'a rien touché.
    if (ac.state === "suspended") ac.resume();
    const t0 = ac.currentTime;
    const dur = ms / 1000;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (o.sweep) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + o.sweep), t0 + dur);
    }
    // Enveloppe très courte : un clic net de terminal, pas une note tenue.
    const peak = (o.gain || 1) * this._volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  _seq(notes) {
    notes.forEach((n) => setTimeout(() => this._beep(n[0], n[1], n[2]), n[3] || 0));
  }
  _sfx(name) {
    switch (name) {
      case "key":    this._beep(1180, 40, { gain: 0.9 }); break;
      case "del":    this._beep(430, 80, { sweep: -190, gain: 0.9 }); break;
      case "submit": this._seq([[720, 50, { gain: 0.9 }, 0], [1080, 70, { gain: 0.9 }, 55]]); break;
      case "cam":    this._beep(560, 95, { type: "sawtooth", gain: 0.75 }); break;
      case "close":  this._beep(360, 70, { gain: 0.75 }); break;
      case "ok":     this._seq([[784, 110, { type: "triangle", gain: 1.1 }, 0],
                                [988, 110, { type: "triangle", gain: 1.1 }, 90],
                                [1319, 190, { type: "triangle", gain: 1.1 }, 180]]); break;
      case "err":    this._beep(190, 280, { type: "sawtooth", sweep: -70, gain: 1.3 }); break;
      case "unlock": this._seq([[523, 120, { type: "triangle", gain: 1.1 }, 0],
                                [659, 120, { type: "triangle", gain: 1.1 }, 130],
                                [784, 120, { type: "triangle", gain: 1.1 }, 260],
                                [1047, 420, { type: "triangle", gain: 1.2 }, 390]]); break;
      case "warn":   this._beep(240, 200, { type: "sawtooth", gain: 1.1 }); break;
      case "accuse": this._seq([[160, 300, { type: "sawtooth", gain: 1.4 }, 0],
                                [110, 520, { type: "sawtooth", gain: 1.4 }, 220]]); break;
    }
  }

  /* ---------------- utilitaires ---------------- */
  _call(domain, service, data) {
    if (this._hass && this._hass.callService) this._hass.callService(domain, service, data);
  }
  _show(id) { const el = this.$(id); if (el) el.hidden = false; }
  _hide(id) { const el = this.$(id); if (el) el.hidden = true; }
  _log(t) {
    this._logLines.unshift(`[${stampTime()}] ${t}`);
    this._logLines = this._logLines.slice(0, 4);
    this._renderLog();
  }
  _renderLog() {
    const host = this.$ && this.$("log");
    if (!host) return;
    host.innerHTML = this._logLines.map((l) => `<span class="ln">${escapeHtml(l)}</span>`).join("");
  }
  _tick() {
    if (!this.$ || !this.$("clock")) return;
    this.$("clock").textContent = stampFull();
    if (this._mode !== "cctv") return;
    const p = (n) => String(n).padStart(2, "0");
    if (!this._boot) this._boot = Date.now();
    // Diagnostic NVR : du décor, pas les vraies statistiques de Home Assistant.
    const up = 41 * 86400 + Math.floor((Date.now() - this._boot) / 1000);
    this.$("uptime").textContent =
      `UP ${Math.floor(up / 86400)}J ${p(Math.floor((up % 86400) / 3600))}:${p(Math.floor((up % 3600) / 60))}`;
    this.$("temp").textContent = (41 + Math.random() * 1.4).toFixed(1).replace(".", ",") + " °C";
    this.$("lat").textContent = (230 + Math.floor(Math.random() * 60)) + " ms";
    const base = Date.now();
    this._cameras.slice(0, 3).forEach((c, i) => {
      const el = this.shadowRoot.querySelector(`[data-ts="${i}"]`);
      if (!el) return;
      const d = new Date(base - (i + 1) * 3600000 - i * 137000);
      el.textContent = `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    });
  }
}

/* ---------------- petits utilitaires de module ---------------- */

export function stampTime(date) {
  const d = date || new Date(), p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function stampFull(date) {
  const d = date || new Date(), p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${stampTime(d)}`;
}

// Les noms d'entités viennent du registre HA : on les traite comme du texte.
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Le mode vit dans sessionStorage : il est propre à l'onglet, donc les deux
// écrans restent indépendants et survivent à un F5. Certains navigateurs en
// navigation privée refusent l'accès : on retombe sur l'écran de saisie.
function readMode() {
  try {
    const m = window.sessionStorage.getItem(MODE_KEY);
    return MODES.includes(m) ? m : "code";
  } catch (e) { return "code"; }
}
function writeMode(mode) {
  try { window.sessionStorage.setItem(MODE_KEY, mode); } catch (e) { /* sans persistance */ }
}

if (!customElements.get("mystery-terminal-card")) {
  customElements.define("mystery-terminal-card", MysteryTerminalCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "mystery-terminal-card",
  name: "Terminal de vidéosurveillance",
  description: "Terminal CCTV pour l'escape room « Meurtre au manoir connecté »",
});
