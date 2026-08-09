# Revue de code (high) — branche `escape-2` vs `main` — 2026-08-08

Revue effectuée avec `/code-review high` sur l'ensemble du diff de la branche
`escape-2` par rapport à `main` (~4680 lignes : `automations.yaml`,
`scripts.yaml`, la carte custom `mystery-terminal-card.js`, dashboards, tests,
docs). 8 angles d'analyse en parallèle ont produit ~35 candidats ; les plus
sérieux ont été vérifiés directement dans le code (lecture, `git diff`, et
exécution réelle des tests pour le finding n°1).

**Statut : aucun correctif appliqué. Ce document sert de base à validation
avant ajustement.**

---

## Findings confirmés, du plus critique au moins critique

### 1. 🔴 Critique — confirmé en exécutant les tests
**Fichier :** `www/custom-lovelace/mystery-terminal-card.js:358`

Un commentaire CSS contient un backtick autour de `` `stopPropagation` ``
*à l'intérieur* du template literal ``const CSS = `...` ``. Ce backtick ferme
prématurément la chaîne CSS et rend tout le reste du fichier JS invalide.

Exécution de `node --test tests/mystery-terminal.test.mjs` →
`SyntaxError: Unexpected identifier 'stopPropagation'`, le module entier
refuse de se parser.

**Impact :** la carte du terminal ne se charge plus du tout dans le
navigateur — écran vide/carte cassée en plein jeu.

**Correctif proposé :** retirer les backticks du commentaire (ou les
échapper), ex. remplacer par des guillemets simples.

---

### 2. 🟠 Élevé
**Fichier :** `scripts.yaml:1575`

```yaml
wait_for_trigger:
  trigger: media_player.stopped_playing
```

Aucun autre trigger `media_player.*` n'existe ailleurs dans le repo, et
`stopped_playing` ne correspond à aucun état réel du domaine `media_player`
(playing/paused/idle/off/standby/buffering/on — pas de "stopped"). Ce trigger
ne se déclenchera probablement jamais.

**Impact :** avec `continue_on_timeout: true`, l'échec est silencieux :
après *Final Reveal.mp4*, le script attend systématiquement 5 minutes avant
d'enchaîner sur la chanson "Winner" et les toiles — à chaque partie.

**Correctif proposé :** utiliser `trigger: state`,
`entity_id: media_player.theatre_tv`, `to: idle` (comme le dit le commentaire
juste au-dessus : "le Chromecast repasse à idle").

---

### 3. 🟠 Élevé
**Fichier :** `automations.yaml:1190, 1337, 2534`

`condition: switch.is_off` ciblant `input_boolean.guest_mode`. Le seul autre
précédent dans le repo (`light.is_on` ligne 406) cible bien une entité
`light.*` — domaine assorti. Ici, `switch.is_off` cible un `input_boolean`,
domaine différent : la condition risque d'échouer à la validation HA ou de
ne jamais matcher.

**Impact :** les 3 automations "Motion" concernées (éclairage automatique
sur détection de mouvement) pourraient être invalidées ou se comporter mal
quel que soit l'état réel du mode invité.

**Correctif proposé :** remplacer par
`condition: state, entity_id: input_boolean.guest_mode, state: 'off'` (déjà
le pattern existant ailleurs).

---

### 4. 🟠 Élevé — touche au contrat "v1 ne doit jamais casser"
**Fichier :** `automations.yaml:1078, 1594, 1715`

Trois automations v1/TEA ("Light on when opening workshop door", "Phone
call", "Escape room - Part 2") ont désormais
`condition: input_boolean.escape_v2_active == off`. Confirmé dans
`scripts.yaml` (lignes 511, 686) : ce flag n'est remis à `off` QUE par
`reset_after_escape_roome`, jamais par le script de démarrage v1.

**Impact :** si une partie v2 est abandonnée/plantée sans reset, puis que
quelqu'un lance v1, ces 3 automations restent muettes : plus de réponse à
"indice", bouton mort, et surtout le capteur de vibration qui signale le
trésor trouvé ne déclenche plus rien — la fin de TEA casse silencieusement.

**Correctif à discuter — deux options :**
- Garantir que le script de démarrage v1 force `escape_v2_active` à off ; ou
- Ajouter une garde générique commune plutôt que 3 copier-coller.

---

### 5. 🟡 Moyen
**Fichier :** `automations.yaml:261` — "Motion (5 min before sunset, 1h after)"

Diff confirmé : le bloc `choose` (5 min le jour / 1h la nuit) a été
supprimé, il ne reste que le délai fixe de 1h.

**Impact :** en plein jour, la lumière de chambre reste maintenant allumée
1h après un mouvement au lieu de 5 min — contredit le nom même de
l'automation. Semble être un effet de bord non intentionnel (aucun commit
ne mentionne ce changement).

---

### 6. 🟡 Moyen
**Fichier :** `automations.yaml:793` — "Lights on when arriving or opening the door"

Diff confirmé : le bloc `if trigger id: [a person] then: light.turn_on
area_id: entrance` a été supprimé.

**Impact :** une arrivée détectée par présence (personne) sans passage par
le capteur de porte n'allume plus que 2 lampes au lieu de toute la zone
"entrance". Aucun commit ne mentionne ce changement non plus.

---

### 7. 🟡 Moyen
**Fichier :** `automations.yaml:2587` — "Sync entrance with living room"

Diff confirmé :
`extra_conditions: [condition: sun, after: sunset, before: sunrise]` →
`extra_conditions: []`.

**Impact :** la synchro chandelier/lampes salon, avant limitée à la nuit,
s'applique maintenant aussi en plein jour. Peut interagir avec
`mystery_sonos_glow` (v2) qui manipule aussi le chandelier.

---

### 8. 🟢 Faible-moyen — doc vs code
**Fichier :** `www/custom-lovelace/mystery-terminal-card.js:705`

Le code (et son commentaire) dit explicitement que T4.1 se déclenche
*seulement* au premier toucher du mur CCTV, jamais sur l'écran de saisie —
changement volontaire (commit `a2d1462`). Mais `docs/escape-room-v2/design.md:73`
et `dialogues.md:39` disent encore "premier clic sur l'écran de saisie".

**Impact :** pas un bug de code, mais la doc n'a pas suivi. Risque gameplay
réel : si personne ne touche jamais l'onglet CCTV, la réplique T4.1 ne se
joue jamais de toute la partie.

---

### 9. 🟢 Faible — doc vs code
**Fichier :** `automations.yaml:743`

Même schéma : le garde-fou `escape_v2_active` sur la lumière de la
buanderie a été retiré volontairement (commit `486f1e8`), mais
`docs/escape-room-v2/todo/manual-before-first-test.md` (lignes ~39-40)
décrit encore l'ancien comportement et coche des cases obsolètes.

---

## Plan proposé (à valider avant tout ajustement)

1. Corriger le bug bloquant #1 (backtick cassant la carte JS) — trivial et
   sans ambiguïté.
2. Corriger #2 (trigger `media_player.stopped_playing` → `state`/`idle`).
3. Corriger #3 (`switch.is_off` → `condition: state`) sur les 3 occurrences.
4. Discuter du comportement voulu pour #4 avant de toucher quoi que ce soit
   — forcer le reset au démarrage v1, ou garde générique.
5. Confirmer si #5, #6, #7 sont des régressions accidentelles (probable,
   aucun commit ne les mentionne) ou des changements volontaires faits via
   l'UI HA — avant de les "corriger".
6. Mettre à jour la doc pour #8 et #9 (`design.md`, `dialogues.md`,
   `manual-before-first-test.md`) pour refléter le comportement actuel.

Un commit sera fait entre chaque correctif, comme d'habitude.
