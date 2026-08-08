/*
 * mystery-terminal-card.js — Terminal de vidéosurveillance
 * Escape room « Meurtre au manoir connecté »
 * Servi par HA depuis  /local/custom-lovelace/mystery-terminal-card.js
 * (ressource déclarée dans .storage/lovelace_resources, type: module)
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
.brand{font-size:calc(26*var(--px)); letter-spacing:calc(3*var(--px)); font-weight:700;}
.sub{font-size:calc(15*var(--px)); color:var(--amber-dim); letter-spacing:calc(2*var(--px));}
.clock{font-size:calc(26*var(--px)); letter-spacing:calc(2*var(--px)); font-variant-numeric:tabular-nums;}
.rec{display:flex; align-items:center; gap:calc(8*var(--px)); color:var(--red); font-size:calc(16*var(--px)); letter-spacing:calc(2*var(--px));}
.dot{width:calc(12*var(--px)); height:calc(12*var(--px)); border-radius:50%; background:var(--red); animation:blink 1.2s steps(2) infinite;}
@keyframes blink{50%{opacity:.15}}
.lockflag{white-space:nowrap; font-size:calc(20*var(--px)); letter-spacing:calc(3*var(--px)); font-weight:700;
  color:var(--red); border:calc(2*var(--px)) solid var(--red); padding:calc(6*var(--px)) calc(14*var(--px));
  background:repeating-linear-gradient(45deg, rgba(255,59,48,.10) 0 calc(8*var(--px)), transparent calc(8*var(--px)) calc(16*var(--px)));
  animation:blink 2s steps(2) infinite;}
.lockflag.ok{color:var(--green); border-color:var(--green); animation:none;
  background:repeating-linear-gradient(45deg, rgba(53,255,106,.10) 0 calc(8*var(--px)), transparent calc(8*var(--px)) calc(16*var(--px)));}

/* ---------- grille principale ---------- */
main{display:grid; grid-template-columns:1.05fr .82fr 1.05fr; gap:calc(12*var(--px)); min-height:0; z-index:5;}
section.col{display:flex; flex-direction:column; gap:calc(10*var(--px)); min-height:0;}
.title{font-size:calc(17*var(--px)); letter-spacing:calc(4*var(--px)); color:var(--amber-dim);
  border-bottom:calc(1*var(--px)) solid var(--line); padding-bottom:calc(6*var(--px)); display:flex; justify-content:space-between;}

/* ---------- caméras ---------- */
.cams{flex:1; min-height:0; display:grid; grid-template-rows:repeat(3,1fr); gap:calc(10*var(--px)); min-height:0;}
.cam{position:relative; border:calc(1*var(--px)) solid var(--line); background:#08080a; overflow:hidden;
  display:grid; grid-template-columns:1fr auto; align-items:center; padding:calc(12*var(--px));
  transition:border-color .12s, background .12s;}
.cam:hover{border-color:var(--amber); background:#101008;}
.cam:active{background:#1a1206;}
.cam .feed{position:absolute; inset:0; opacity:.5;
  background:
    repeating-linear-gradient(to bottom, rgba(255,178,0,.05) 0 calc(2*var(--px)), transparent calc(2*var(--px)) calc(6*var(--px))),
    radial-gradient(circle at 30% 40%, rgba(255,178,0,.12), transparent 60%),
    linear-gradient(160deg,#0d0d10,#050506);}
.cam .meta{position:relative; display:flex; flex-direction:column; gap:calc(6*var(--px));}
.cam .id{font-size:calc(30*var(--px)); font-weight:700; letter-spacing:calc(3*var(--px));}
.cam .zone{font-size:calc(17*var(--px)); color:var(--amber-dim); letter-spacing:calc(2*var(--px));}
.cam .ts{font-size:calc(15*var(--px)); color:var(--amber-dim); font-variant-numeric:tabular-nums;}
.play{position:relative; width:calc(96*var(--px)); height:calc(96*var(--px)); border:calc(2*var(--px)) solid var(--amber);
  display:grid; place-items:center; font-size:calc(38*var(--px)); background:rgba(255,178,0,.08);}
.cam:hover .play{background:var(--amber); color:#000;}

/* ---------- pavé ---------- */
.display{border:calc(2*var(--px)) solid var(--amber-deep); background:#0a0800; padding:calc(10*var(--px));
  text-align:center;}
.display .lab{font-size:calc(14*var(--px)); color:var(--amber-dim); letter-spacing:calc(3*var(--px));}
.digits{font-size:calc(72*var(--px)); letter-spacing:calc(14*var(--px)); line-height:1.1; font-weight:700;
  text-shadow:0 0 calc(18*var(--px)) rgba(255,178,0,.55); font-variant-numeric:tabular-nums;}
.digits .off{color:var(--amber-deep); text-shadow:none;}
.msg{font-size:calc(18*var(--px)); letter-spacing:calc(3*var(--px)); min-height:calc(24*var(--px)); color:var(--amber-dim);}
.msg.err{color:var(--red);} .msg.ok{color:var(--green);}
.display.err{border-color:var(--red); animation:shake .42s;}
.display.ok{border-color:var(--green);}
@keyframes shake{10%,90%{transform:translateX(calc(-6*var(--px)))}20%,80%{transform:translateX(calc(9*var(--px)))}
  30%,50%,70%{transform:translateX(calc(-14*var(--px)))}40%,60%{transform:translateX(calc(14*var(--px)))}100%{transform:none}}
.keys{display:grid; grid-template-columns:repeat(3,1fr); gap:calc(9*var(--px)); flex:1; min-height:0;}
.key{border:calc(1*var(--px)) solid #2a2a30; background:linear-gradient(180deg,#141418,#0a0a0c);
  font-size:calc(42*var(--px)); font-weight:700; display:grid; place-items:center;
  transition:transform .06s, background .1s, border-color .1s, color .1s;}
.key:hover{border-color:var(--amber); background:linear-gradient(180deg,#2a2008,#140f04); color:#fff2cf;}
.key:active{transform:translateY(calc(3*var(--px))); background:var(--amber); color:#000;}
.key.wide{font-size:calc(24*var(--px)); letter-spacing:calc(2*var(--px));}
.key.ok{border-color:var(--green-dim); color:var(--green);} .key.ok:hover{background:#062a11; border-color:var(--green);}
.key.del{border-color:#4a2a10; color:#e08a3c;} .key.del:hover{background:#2a1405; border-color:#e08a3c;}

/* ---------- preuves ---------- */
.counter{border:calc(1*var(--px)) solid var(--line); background:var(--panel); padding:calc(10*var(--px)) calc(16*var(--px));
  display:flex; align-items:baseline; gap:calc(14*var(--px));}
.counter b{white-space:nowrap; font-size:calc(56*var(--px)); line-height:1; font-variant-numeric:tabular-nums;}
.counter span{white-space:nowrap; font-size:calc(17*var(--px)); letter-spacing:calc(3*var(--px)); color:var(--amber-dim);}
.counter.full b, .counter.full{color:var(--green);}
.bars{display:flex; gap:calc(6*var(--px)); margin-left:auto;}
.bars i{width:calc(28*var(--px)); height:calc(28*var(--px)); border:calc(2*var(--px)) solid var(--amber-deep);}
.bars i.on{background:var(--green); border-color:var(--green);}
.slots{display:grid; grid-template-rows:repeat(3,1fr); gap:calc(10*var(--px)); flex:1; min-height:0;}
.slot{position:relative; border:calc(1*var(--px)) dashed #33333a; background:#08080a; padding:calc(14*var(--px));
  display:grid; grid-template-columns:calc(84*var(--px)) 1fr; gap:calc(16*var(--px)); align-items:center; overflow:hidden;}
.slot .mark{border:calc(2*var(--px)) solid #33333a; height:calc(84*var(--px)); display:grid; place-items:center;
  font-size:calc(46*var(--px)); color:#33333a;}
.slot .l1{font-size:calc(28*var(--px)); font-weight:700; letter-spacing:calc(2*var(--px)); color:#4a4a52;}
.slot .l2{font-size:calc(16*var(--px)); letter-spacing:calc(2*var(--px)); color:#3a3a42; margin-top:calc(4*var(--px));}
.slot.on{border-style:solid; border-color:var(--green); background:#04120a;}
.slot.on .mark{border-color:var(--green); color:var(--green); text-shadow:0 0 calc(20*var(--px)) var(--green);}
.slot.on .l1{color:var(--green);} .slot.on .l2{color:#2f8a4c;}
.slot.pop{animation:pop .7s ease-out;}
.slot.pop .mark{animation:stamp .55s cubic-bezier(.2,1.6,.4,1);}
@keyframes pop{0%{box-shadow:inset 0 0 0 calc(200*var(--px)) rgba(53,255,106,.55)}100%{box-shadow:inset 0 0 0 calc(200*var(--px)) rgba(53,255,106,0)}}
@keyframes stamp{0%{transform:scale(2.4) rotate(-14deg); opacity:0}60%{transform:scale(.92) rotate(2deg); opacity:1}100%{transform:none}}

/* ---------- dossier ---------- */
.dossier{border:calc(2*var(--px)) solid var(--red); padding:calc(14*var(--px)); text-align:center;
  background:repeating-linear-gradient(45deg, rgba(255,59,48,.09) 0 calc(10*var(--px)), transparent calc(10*var(--px)) calc(20*var(--px)));}
.dossier .t{font-size:calc(24*var(--px)); font-weight:700; letter-spacing:calc(4*var(--px)); color:var(--red);}
.dossier .s{font-size:calc(15*var(--px)); letter-spacing:calc(2*var(--px)); color:#a03028; margin-top:calc(4*var(--px));}
.dossier.open{border-color:var(--green); color:var(--green); cursor:pointer;
  background:repeating-linear-gradient(45deg, rgba(53,255,106,.10) 0 calc(10*var(--px)), transparent calc(10*var(--px)) calc(20*var(--px)));
  animation:glow 1.4s ease-in-out infinite alternate;}
.dossier.open .t{color:var(--green);} .dossier.open .s{color:#2f8a4c;}
.dossier.open:hover{background:rgba(53,255,106,.18);}
@keyframes glow{to{box-shadow:0 0 calc(34*var(--px)) rgba(53,255,106,.45)}}

/* ---------- journal ---------- */
footer{border:calc(1*var(--px)) solid var(--line); background:var(--panel); padding:calc(8*var(--px)) calc(14*var(--px));
  font-size:calc(15*var(--px)); color:var(--amber-dim); display:flex; gap:calc(28*var(--px)); overflow:hidden; z-index:5;}
footer .ln{white-space:nowrap;}

/* ---------- overlays ---------- */
.ov{position:absolute; inset:0; z-index:70; background:rgba(2,2,3,.94); display:grid; place-items:center; padding:calc(40*var(--px));}
.ov[hidden]{display:none;}
.vidbox{width:100%; height:100%; display:grid; grid-template-rows:auto 1fr auto; gap:calc(12*var(--px));}
.vidbox video{width:100%; height:100%; min-height:0; object-fit:contain; background:#000; border:calc(1*var(--px)) solid var(--line);}
.vidhead{display:flex; justify-content:space-between; align-items:center; font-size:calc(28*var(--px)); letter-spacing:calc(3*var(--px));}
.bigbtn{border:calc(2*var(--px)) solid var(--amber); padding:calc(14*var(--px)) calc(34*var(--px));
  font-size:calc(22*var(--px)); letter-spacing:calc(3*var(--px));}
.bigbtn:hover{background:var(--amber); color:#000;}
.bigbtn.g{border-color:var(--green); color:var(--green);} .bigbtn.g:hover{background:var(--green); color:#000;}
.bigbtn.r{border-color:var(--red); color:var(--red);} .bigbtn.r:hover{background:var(--red); color:#000;}
/* Flux absent ou illisible : un écran de panne crédible plutôt qu'un cadre
   noir. Le jeu reste testable et jouable sans les .mp4. */
.missing{position:relative; display:grid; place-content:center; justify-items:center; gap:calc(14*var(--px));
  height:100%; text-align:center; overflow:hidden;
  border:calc(1*var(--px)) dashed var(--amber-deep); background:#050506;}
.missing::before{content:''; position:absolute; inset:0; opacity:.09; pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23s)'/></svg>");
  animation:drift .25s steps(4) infinite;}
.missing > *{position:relative;}
.missing .mtitle{font-size:calc(44*var(--px)); font-weight:700; letter-spacing:calc(6*var(--px)); color:var(--red);
  animation:blink 1.6s steps(2) infinite;}
.missing .msub{font-size:calc(22*var(--px)); letter-spacing:calc(4*var(--px)); color:var(--amber);}
.missing .mtxt{font-size:calc(20*var(--px)); letter-spacing:calc(2*var(--px)); color:var(--amber-dim); line-height:1.8;}
.missing .mcode{font-size:calc(16*var(--px)); letter-spacing:calc(3*var(--px)); color:var(--amber-deep);
  border:calc(1*var(--px)) solid var(--amber-deep); padding:calc(8*var(--px)) calc(18*var(--px));}

.boot{font-size:calc(26*var(--px)); line-height:1.9; letter-spacing:calc(2*var(--px)); width:calc(1100*var(--px));}
.boot .l{opacity:0; animation:type .01s forwards;}
.boot .l.ok{color:var(--green);}
@keyframes type{to{opacity:1}}
.ov.flash{animation:flash .5s steps(2) 3;}
@keyframes flash{50%{background:rgba(53,255,106,.20)}}

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

const HTML = `
<div class="crt">
  <div class="noise"></div><div class="vig"></div>
  <header>
    <div class="hbox">
      <div>
        <div class="brand">MANOIR — POSTE DE SÉCURITÉ</div>
        <div class="sub">TERMINAL CCTV · UNITÉ B-02 · SOUS-SOL</div>
      </div>
    </div>
    <div class="hbox grow">
      <div class="rec"><span class="dot"></span>ENREGISTREMENT</div>
      <div class="sub" id="phase">ENQUÊTE EN COURS</div>
      <div class="clock" id="clock" style="margin-left:auto">--:--:--</div>
    </div>
    <div class="hbox"><div class="lockflag" id="lockflag">SYSTÈME VERROUILLÉ</div></div>
  </header>

  <main>
    <section class="col">
      <div class="title"><span>ENREGISTREMENTS ARCHIVÉS</span><span>3 FLUX</span></div>
      <div class="cams" id="cams"></div>
    </section>

    <section class="col">
      <div class="title"><span>SAISIE CODE PREUVE</span><span>4 CHIFFRES</span></div>
      <div class="display" id="display">
        <div class="lab">CODE</div>
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

  <div class="ov" id="ovVideo" hidden>
    <div class="vidbox">
      <div class="vidhead"><span id="vidTitle">CAM 01</span><span id="vidZone" class="sub"></span></div>
      <div id="vidHost"></div>
      <div style="display:flex;justify-content:center"><button class="bigbtn" id="vidClose">FERMER LE FLUX</button></div>
    </div>
  </div>

  <div class="ov" id="ovBoot" hidden><div class="boot" id="bootLines"></div></div>

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

class MysteryTerminalCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._buf = "";
    this._prev = null;
    this._pending = null;
    this._logLines = [];
    this._booted = false;
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
    if (!this._built) this._build();
  }

  connectedCallback() {
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), 1000);
  }
  disconnectedCallback() { clearInterval(this._timer); this._timer = null; }
  getCardSize() { return 12; }

  /* ---------------- construction ---------------- */
  _build() {
    this._built = true;
    const s = document.createElement("style"); s.textContent = CSS;
    this.shadowRoot.append(s);
    const w = document.createElement("div"); w.innerHTML = HTML;
    this.shadowRoot.append(w.firstElementChild);
    const $ = (id) => this.shadowRoot.getElementById(id);
    this.$ = $;

    // caméras
    $("cams").innerHTML = this._cameras.map((c, i) => `
      <button class="cam" data-cam="${i}">
        <div class="feed"></div>
        <div class="meta">
          <div class="id">${c.id}</div>
          <div class="zone">${c.zone}</div>
          <div class="ts" data-ts="${i}">--/--/---- --:--:--</div>
        </div>
        <div class="play">▶</div>
      </button>`).join("");
    $("cams").querySelectorAll("[data-cam]").forEach((b) =>
      b.addEventListener("click", () => this._openVideo(+b.dataset.cam)));

    // pavé
    const keys = ["1","2","3","4","5","6","7","8","9","DEL","0","OK"];
    $("keys").innerHTML = keys.map((k) => {
      if (k === "DEL") return `<button class="key wide del" data-k="del">EFFACER</button>`;
      if (k === "OK") return `<button class="key wide ok" data-k="ok">VALIDER</button>`;
      return `<button class="key" data-k="${k}">${k}</button>`;
    }).join("");
    $("keys").querySelectorAll("[data-k]").forEach((b) =>
      b.addEventListener("click", () => this._press(b.dataset.k)));

    // preuves
    $("slots").innerHTML = this._slotsCfg.map((s) => `
      <div class="slot" data-slot="${s.key}">
        <div class="mark">?</div>
        <div>
          <div class="l1">PREUVE NON IDENTIFIÉE</div>
          <div class="l2">??? · ??? · SCELLÉ</div>
        </div>
      </div>`).join("");

    // suspects
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

    $("vidClose").addEventListener("click", () => this._closeVideo());
    $("dossier").addEventListener("click", () => {
      this._sfx(this._unlocked ? "cam" : "err");
      if (this._unlocked) this._show("ovDossier");
    });
    $("dossClose").addEventListener("click", () => { this._sfx("close"); this._hide("ovDossier"); });
    $("confirmNo").addEventListener("click", () => { this._sfx("close"); this._hide("ovConfirm"); });
    $("confirmYes").addEventListener("click", () => this._sendAccusation());

    this._log("TERMINAL EN LIGNE");
    this._log("LIAISON SERVEUR NVR : OK");
    this._renderDigits();
    this._tick();
  }

  /* ---------------- hass ---------------- */
  set hass(hass) {
    this._hass = hass;
    if (!this._built) return;
    const g = (e) => (hass.states[e] ? hass.states[e].state : "unknown");
    const cur = {
      saw: g(ENT.saw) === "on", gun: g(ENT.gun) === "on", poison: g(ENT.poison) === "on",
      unlocked: g(ENT.unlocked) === "on", code: g(ENT.code), phase: g(ENT.phase),
    };
    const prev = this._prev;
    this._unlocked = cur.unlocked;
    const count = ["saw","gun","poison"].filter((k) => cur[k]).length;

    // preuves
    this._slotsCfg.forEach((s) => {
      const el = this.$("slots").querySelector(`[data-slot="${s.key}"]`);
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

    // verrou
    const lf = this.$("lockflag");
    lf.textContent = cur.unlocked ? "SYSTÈME DÉVERROUILLÉ" : "SYSTÈME VERROUILLÉ";
    lf.classList.toggle("ok", cur.unlocked);
    this.$("dossier").classList.toggle("open", cur.unlocked);
    this.$("dosst").textContent = cur.unlocked ? "► OUVRIR LE DOSSIER CONFIDENTIEL" : "DOSSIER CONFIDENTIEL — SCELLÉ";
    this.$("dosss").textContent = cur.unlocked ? "ACCÈS AUTORISÉ · DÉSIGNATION DU SUSPECT" : "ACCÈS REFUSÉ · 3 PREUVES REQUISES";

    // phase
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

  /* ---------------- pavé ---------------- */
  _press(k) {
    if (k === "del") { this._sfx("del"); this._buf = this._buf.slice(0, -1); this._setMsg("", ""); }
    else if (k === "ok") return this._submit();
    else if (this._buf.length < 4) { this._sfx("key"); this._buf += k; this._setMsg("", ""); }
    else this._sfx("del"); // pavé plein : un retour quand même, sinon la touche semble morte
    this._renderDigits();
  }
  _renderDigits() {
    const d = this._buf.padEnd(4, "_").split("");
    this.$("digits").innerHTML = d.map((c, i) =>
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
    const d = this.$("display"); d.classList.add("ok"); setTimeout(() => d.classList.remove("ok"), 1800);
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
    const d = this.$("display"); d.classList.remove("err"); void d.offsetWidth; d.classList.add("err");
    setTimeout(() => d.classList.remove("err"), 1600);
  }
  _setMsg(t, cls) {
    const m = this.$("msg"); m.textContent = t || "EN ATTENTE DE SAISIE"; m.className = "msg " + (cls || "");
  }

  /* ---------------- vidéo ----------------
   * Le terminal doit rester jouable sans les .mp4 : fichier absent, chemin
   * faux ou encodage refusé par le navigateur donnent tous le même écran de
   * panne, crédible dans la fiction. Le chemin attendu part en console, pas à
   * l'écran — les joueurs n'ont pas à le lire.
   */
  _openVideo(i) {
    this._sfx("cam");
    const c = this._cameras[i];
    this.$("vidTitle").textContent = c.id;
    this.$("vidZone").textContent = c.zone;
    const host = this.$("vidHost");
    host.dataset.failed = "";
    host.innerHTML = "";
    this._show("ovVideo");
    this._log(`LECTURE ARCHIVE — ${c.id}`);

    if (!c.file) { this._feedFailed(c, host, true); return; }

    const v = document.createElement("video");
    v.controls = true; v.autoplay = true; v.playsInline = true; v.src = c.file;
    // `error` couvre les deux vrais cas : fichier absent (404) et encodage
    // refusé. Le délai n'est là que pour un chargement qui ne répond jamais —
    // on ne se fie pas à `stalled`, qui se déclenche aussi sur une vidéo saine
    // qui charge lentement.
    clearTimeout(this._bail);
    this._bail = setTimeout(() => this._feedFailed(c, host), 8000);
    v.addEventListener("loadedmetadata", () => clearTimeout(this._bail));
    v.addEventListener("error", () => { clearTimeout(this._bail); this._feedFailed(c, host); });
    host.append(v);
  }
  _feedFailed(c, host, silent) {
    if (host.dataset.failed) return;
    host.dataset.failed = "1";
    host.innerHTML = `
      <div class="missing">
        <div class="mtitle">⚠ ARCHIVE INDISPONIBLE</div>
        <div class="msub">${c.id} · ${c.zone}</div>
        <div class="mtxt">SECTEUR DISQUE CORROMPU — BANDE ILLISIBLE<br>
          L'enregistrement de ce flux n'a pas pu être restauré.</div>
        <div class="mcode">ERR 0x1A · NVR-B02 · RÉINDEXATION REQUISE</div>
      </div>`;
    this._log(`ARCHIVE ILLISIBLE — ${c.id}`);
    if (!silent) this._sfx("err");
    console.warn(
      `[mystery-terminal] flux illisible pour ${c.id} — vérifier « file: » dans le YAML`,
      c.file || "(aucun chemin configuré)");
  }
  _closeVideo() {
    // Fermer avant la fin du chargement ne doit pas faire surgir l'écran de
    // panne dans le vide, ni son bip.
    clearTimeout(this._bail);
    this._sfx("close"); this.$("vidHost").innerHTML = ""; this._hide("ovVideo");
  }

  /* ---------------- déverrouillage ---------------- */
  _unlockSequence() {
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
      const d = document.createElement("div");
      d.className = "l" + (i === lines.length - 1 ? " ok" : "");
      d.textContent = t; d.style.animationDelay = "0s";
      host.append(d);
      if (i === lines.length - 1) this.$("ovBoot").classList.add("flash");
    }, 500 * i));
    setTimeout(() => { this.$("ovBoot").classList.remove("flash"); this._hide("ovBoot"); }, 500 * lines.length + 2200);
    this._log("DOSSIER CONFIDENTIEL DÉVERROUILLÉ");
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
  _show(id) { this.$(id).hidden = false; }
  _hide(id) { this.$(id).hidden = true; }
  _log(t) {
    this._logLines.unshift(`[${this._stamp(true)}] ${t}`);
    this._logLines = this._logLines.slice(0, 4);
    if (this.$) this.$("log").innerHTML = this._logLines.map((l) => `<span class="ln">${l}</span>`).join("");
  }
  _stamp(timeOnly) {
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    const t = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    return timeOnly ? t : `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${t}`;
  }
  _tick() {
    if (!this._built) return;
    this.$("clock").textContent = this._stamp(false);
    const base = Date.now();
    this._cameras.forEach((c, i) => {
      const el = this.$("cams").querySelector(`[data-ts="${i}"]`);
      if (!el) return;
      const d = new Date(base - (i + 1) * 3600000 - (i * 137000));
      const p = (n) => String(n).padStart(2, "0");
      el.textContent = `ARCHIVE ${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    });
  }
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
