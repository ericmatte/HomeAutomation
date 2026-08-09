# Revue de code (high) — branche `escape-2` vs `main` — 2026-08-08

Première passe faite par `/code-review high` (9 findings), puis **contre-vérifiée
finding par finding** : lecture du code, `git log -S` pour retrouver le commit
d'origine de chaque hunk, documentation Home Assistant, et interrogation de
l'instance HA en direct (logs système, `ha_eval_template`).

Résultat : **2 vrais bugs sur 9**. 4 findings visaient en réalité des
changements faits par l'utilisateur dans l'interface HA et récupérés par le
commit de synchro `dae48d0 "Update config"` — ce ne sont pas des régressions de
la branche. 2 findings étaient factuellement faux.

---

## Vrais problèmes

### V1. 🔴 Backtick dans un commentaire CSS — la carte ne se charge plus
**Fichier :** `www/custom-lovelace/mystery-terminal-card.js:358`

Confirmé en exécutant `node --test tests/mystery-terminal.test.mjs` :
`SyntaxError: Unexpected identifier 'stopPropagation'`. Le backtick du
commentaire ferme le template literal `const CSS = \`...\`` et invalide tout le
reste du fichier. La carte est morte dans le navigateur.

**Statut : corrigé** (passe de nettoyage des commentaires).

---

### V2. 🟠 La v1 reste muette si une partie v2 est abandonnée sans reset
**Fichiers :** `automations.yaml:1078, 1594, 1715` + `scripts.yaml:139`
(`escape_room:`)

Trois automations v1/TEA sont désormais gardées par
`input_boolean.escape_v2_active == off`. Ce drapeau est mis à `on` par
`mystery_start` et remis à `off` **uniquement** par `reset_after_escape_roome`.
`escape_room:` (démarrage v1) n'y touche jamais.

**Scénario :** partie v2 abandonnée ou plantée sans reset → on lance la v1 →
« Light on when opening workshop door » ne répond plus, le bouton « Phone
call » est mort, et surtout le capteur de vibration qui signale le trésor
trouvé ne déclenche plus rien : **la fin de la v1 casse silencieusement**.

**Statut : corrigé** — `escape_room:` remet `escape_v2_active` à `off` en
première étape, comme `mystery_start` le met à `on`.

---

## À discuter (pas corrigé)

### D1. 🟠 `homeassistant.reload_config_entry` est réservé aux admins
**Fichiers :** `scripts.yaml:160` (`escape_room`), `986` (`mystery_start`),
`459` (`reset_after_escape_roome`)

[La doc HA](https://www.home-assistant.io/actions/homeassistant.reload_config_entry/)
est explicite : « Only users with administrator rights can run this action ».
Les trois scripts l'appellent en **première étape**.

Indice concret dans les logs de l'instance en direct :
`script.reset_after_escape_roome` et `script.escape_room` ont journalisé
aujourd'hui `Error executing script. Unauthorized for call_service at pos 1`
— donc ces scripts *sont* lancés depuis un compte non-admin. Et
`configuration.yaml` déclare justement le dashboard du terminal avec
`require_admin: false`.

Au mieux le `continue_on_error: true` avale l'erreur et **le rechargement VoIP
n'a jamais lieu** (le téléphone garde l'ancienne voix / l'ancien état). Au pire
le script s'arrête à l'étape 1.

**À vérifier en live** (je n'ai pas accès à l'instance) : lancer
`script.mystery_start` depuis le compte utilisé pendant la partie et regarder
si l'étape 1 passe. Si elle échoue, deux options : lancer les scripts depuis un
compte admin, ou déplacer le reload dans une automation dédiée (les automations
tournent sans contexte utilisateur, donc en admin).

---

### D2. 🟡 Une mauvaise accusation peut rendre un suspect muet pour de bon
**Fichier :** `scripts.yaml:1611` (branche `else` de `mystery_denouement`)

La branche « mauvaise accusation » force `input_select.mystery_phase` à
`autopsy_done`. Or les automations des suspects
(`mystery_suspect_triggers`, `mystery_butler_patio`,
`mystery_knife_drawer`) et `mystery_auto_autopsy` exigent toutes
`phase == investigation`.

**Scénario :** les 3 codes-preuves sont saisissables sans avoir interrogé les 3
suspects (le pot d'épices ne dépend pas du bouton du Majordome). Groupe qui
trouve les 3 codes sans avoir déclenché le Majordome → accusation ratée →
phase forcée à `autopsy_done` → le Majordome ne parlera plus **de toute la
partie**, et l'autopsie automatique ne partira jamais.

**À trancher :** est-ce voulu ? Sinon, la branche `else` devrait rendre la
phase précédente (`investigation` si les 3 `*_done` ne sont pas tous à `on`)
plutôt que forcer `autopsy_done`.

---

## Findings écartés

### E1. `trigger: media_player.stopped_playing` — **faux positif**
`scripts.yaml:1575`. La première revue affirmait que ce trigger n'existe pas.
Il existe bel et bien :
[home-assistant.io/triggers/media_player.stopped_playing](https://github.com/home-assistant/home-assistant.io/blob/current/source/_triggers/media_player.stopped_playing.markdown).
C'est un « entity trigger » de HA 2026.7+, exactement de la même famille que le
`trigger: light.turned_off` déjà présent dans `automations.yaml:3075`. Rien à
corriger.

### E2. `condition: switch.is_off` sur `input_boolean.guest_mode` — **hors périmètre**
`automations.yaml:1190, 1337, 2534`. `git log -S` montre que ces 3 blocs
viennent tous du commit de synchro `dae48d0 "Update config"`, avec la
sérialisation typique de l'interface HA (`options: {behavior: any, for:
00:00:00}`). L'instance en direct ne journalise **aucune** erreur
`Invalid config for` : les 3 automations chargent normalement. Ce n'est pas du
code de la branche escape room ; y toucher reviendrait à défaire un réglage
fait à la souris.

### E3, E4, E5. Régressions présumées sur les automations maison — **hors périmètre**
- `automations.yaml:261` — délai 5 min/1 h fusionné en 1 h fixe
- `automations.yaml:793` — bloc « a person » → `light.turn_on area entrance` retiré
- `automations.yaml:2587` — `extra_conditions` sun vidé

`git log -S` : les trois viennent **exclusivement** de `dae48d0
"Update config"`, le même commit qui change aussi les seuils d'humidité, la
consigne du mode été, ajoute des `note:` et supprime une vieille automation
« Motion ». C'est un dump de l'instance HA, pas du travail escape room. Ce sont
donc des changements volontaires faits dans l'interface — à confirmer d'un coup
d'œil, mais rien à « corriger » ici.

### E6, E7. Doc désynchronisée du code — **corrigé**
T4.1 (mur CCTV et non écran de saisie) et le garde-fou buanderie retiré :
`design.md`, `dialogues.md` et `manual-before-first-test.md` ont été remis à
jour dans la passe d'élagage des docs.
