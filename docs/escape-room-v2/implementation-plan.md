# Plan d'implémentation — Escape Room v2 « Meurtre au manoir connecté »

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire dans Home Assistant un jeu d'enquête « meurtre mystère »
piloté par la voix (téléphone/haut-parleurs), les capteurs et le robot
aspirateur, sans casser l'escape room v1.

**Architecture:** Un `input_select` pilote la phase du jeu ; des scripts jouent
chaque phase (intro police, briefing, dialogues des suspects, rappel autopsie,
accusation oui/non, dénouement) ; des automations réagissent aux capteurs
(portes, vibration) et au bouton Zigbee. Tout est préfixé `mystery_*` pour
cohabiter avec la v1.

**Tech Stack:** Home Assistant (scripts YAML, automations YAML, scenes YAML,
helpers config-flow), `assist_satellite` (téléphone), `tts.speak` (HA Cloud),
`media_player.play_media` (Sonos/Echo/Google Home/TV), `vacuum.send_command`.

## Global Constraints

- 🚫 **Ne jamais commander le `climate`** (thermostats / thermopompe) ni la
  **chambre** (`bedroom`) — hors-jeu absolu.
- 📢 **Voix simple** : le TTS *parle* ; la seule entrée vocale du joueur est
  **oui / non** via `assist_satellite.ask_question`. Aucune « phrase secrète ».
- 🏷️ Entités préfixées **`mystery_*`** ; **ne pas modifier ni supprimer** les
  scripts/automations/scènes v1 existants (`escape_room`, `Escape room - Part 2`,
  etc.).
- 🔊 Fichiers audio référencés par des **noms exacts** sous
  `media-source://media_source/local/` (voir `todo-physical-setup.md`).
- 🧩 **Solution du jeu (constante) : coupable = Majordome, arme = poison, lieu =
  salle à manger.**
- 🛠️ **Tout en code dans la branche** : on édite directement les fichiers YAML
  du worktree (`scripts.yaml`, `automations.yaml`, `scenes.yaml`,
  `configuration.yaml` pour les helpers). **Aucun push via l'API HA MCP.** Eric
  bascule ensuite son HA sur la branche et recharge/teste.

## Entités de référence (verbatim)

| Rôle | Entity ID |
|---|---|
| Inspecteur (voix bidirectionnelle) | `assist_satellite.192_168_0_160` |
| TTS | `tts.home_assistant_cloud` |
| Voix Jardinier (atelier) | `media_player.workshop_echo` |
| Voix Héritière + intro police (salon) | `media_player.sonos` |
| Voix Majordome (salle à manger) | `media_player.google_home_mini` |
| Écran final | `media_player.theatre_tv` |
| Gyrophares | `light.left_floor_lamp`, `light.right_floor_lamp` |
| Preuve arme (bouteille de vin) | `binary_sensor.vibration_sensor_vibration` |
| Déclencheur salle à manger | `binary_sensor.patio_door_contact` |
| Déclencheur atelier | `binary_sensor.door_sensor_contact` |
| Déclencheur salon (bouton Zigbee) | device MQTT `8317fbc3ea314ec40186f0d8ec39998d` |
| Robot | `vacuum.roborock_s5_7c79_robot_cleaner` |
| Volets final | `cover.theatre_middle_shade`, `cover.theatre_left_shade`, `cover.theatre_right_shade` |
| Coordonnées Roby salle à manger | `app_goto_target` → `[18500, 25500]` (à affiner) |

## Workflow de déploiement (décidé : tout en code)

**Convention pour TOUTES les tasks ci-dessous :**
- Là où une étape dit « **Pousser via MCP + reload** », cela signifie
  concrètement : **écrire le YAML dans le fichier indiqué du worktree**
  (`scripts.yaml`, `automations.yaml`, `configuration.yaml`…) et **committer**.
  Aucun appel `ha_config_set_*`.
- Le **déploiement** (Eric bascule son HA sur la branche), le **reload** et les
  **tests live** sont réalisés par **Eric**. Les étapes « **Checkpoint live
  (Eric)** » décrivent ce qu'il validera **après avoir switché son HA sur la
  branche** (en une fois à la fin, ou progressivement s'il le souhaite).
- **Validation pendant le dev (Claude)** : relecture de cohérence YAML +
  vérification que les templates Jinja sont bien formés. Le seul accès live
  utilisé est le **calibrage de Roby** (Task 7), via un appel direct
  `vacuum.send_command` au MCP (pilotage du robot, sans déployer de script).
- **Les helpers sont définis en YAML** (`configuration.yaml`, Task 1) pour être
  versionnés dans la branche — pas via config-flow (qui écrirait dans
  `.storage`, hors repo).

## Structure des fichiers

- **`configuration.yaml`** (helpers en YAML) : `input_select.mystery_phase`,
  `input_boolean.mystery_gardener_done`, `..._heiress_done`, `..._butler_done`.
- **`scripts.yaml`** (ajouts) : `mystery_start`, `mystery_reset`,
  `mystery_suspect_speak`, `mystery_roby_to_dining`, `mystery_police_callback`,
  `mystery_accusation`, `mystery_denouement`.
- **`automations.yaml`** (ajouts) : `Mystery - Suspect triggers`,
  `Mystery - Wine bottle evidence`, `Mystery - Auto autopsy`,
  `Mystery - Phone button`.
- **`scenes.yaml`** : réutilise `scene.reset_after_escape_room` (pas de nouvelle
  scène — le reset v2 est un script).

---

### Task 1 : Helpers d'état du jeu (YAML)

**Files:**
- Modify : `configuration.yaml` (ajouter les sections top-level `input_select:`
  et `input_boolean:` — elles n'existent pas encore ; ne pas toucher aux autres
  clés)

**Interfaces:**
- Produces : `input_select.mystery_phase` avec options exactement
  `["idle", "investigation", "autopsy_done", "accusation", "solved"]` ;
  `input_boolean.mystery_gardener_done`, `..._heiress_done`, `..._butler_done`
  (défaut `off`), suivant les suspects déjà interrogés.

- [ ] **Step 1 : Ajouter les helpers dans `configuration.yaml`**

Insérer (par ex. juste avant `automation: !include automations.yaml`) :
```yaml
input_select:
  mystery_phase:
    name: Mystery Phase
    icon: mdi:magnify-scan
    options:
      - idle
      - investigation
      - autopsy_done
      - accusation
      - solved
    initial: idle

input_boolean:
  mystery_gardener_done:
    name: Mystery Gardener Done
    icon: mdi:account-question
  mystery_heiress_done:
    name: Mystery Heiress Done
    icon: mdi:account-question
  mystery_butler_done:
    name: Mystery Butler Done
    icon: mdi:account-question
```

> Ces sections YAML fusionnent sans conflit avec les helpers existants créés via
> l'UI (`guest_mode`, `summer_mode`, qui vivent dans `.storage`).

- [ ] **Step 2 : Validation YAML (Claude)** — indentation correcte, une seule
  clé top-level `input_select:` et une seule `input_boolean:` dans le fichier.

- [ ] **Step 3 : Checkpoint live (Eric)** — après bascule sur la branche :
  `input_select.mystery_phase` existe (état `idle`) et les 3 `input_boolean`
  sont `off`. (Un helper YAML nécessite un **redémarrage HA**, pas un simple
  reload — à noter.)

- [ ] **Step 4 : Commit**

```bash
git commit -am "feat(mystery): helpers d'état du jeu (phase + suspects interrogés)"
```

---

### Task 2 : Script `mystery_reset` (réinitialisation)

Construit en premier pour pouvoir réinitialiser proprement entre chaque test.

**Files:**
- Modify : `scripts.yaml` (ajouter `mystery_reset`)

**Interfaces:**
- Consumes : helpers de Task 1.
- Produces : `script.mystery_reset` — remet le jeu à zéro (phase `idle`,
  booleans `off`, stoppe les médias, réactive les automations de mouvement,
  renvoie Roby au dock, rallume un éclairage neutre).

- [ ] **Step 1 : Écrire le script**

```yaml
mystery_reset:
  alias: "Mystery - Reset"
  mode: restart
  sequence:
    - action: media_player.media_stop
      target:
        entity_id:
          - media_player.sonos
          - media_player.workshop_echo
          - media_player.google_home_mini
      continue_on_error: true
    - action: media_player.turn_off
      target:
        entity_id: media_player.theatre_tv
      continue_on_error: true
    - action: input_select.select_option
      target:
        entity_id: input_select.mystery_phase
      data:
        option: idle
    - action: input_boolean.turn_off
      target:
        entity_id:
          - input_boolean.mystery_gardener_done
          - input_boolean.mystery_heiress_done
          - input_boolean.mystery_butler_done
    - action: automation.turn_on
      target:
        entity_id: "{{ label_entities('motions') }}"
    - action: vacuum.return_to_base
      target:
        entity_id: vacuum.roborock_s5_7c79_robot_cleaner
      continue_on_error: true
    - action: scene.turn_on
      target:
        entity_id: scene.reset_after_escape_room
      data:
        transition: 2
```

- [ ] **Step 2 : Pousser via MCP** (`ha_config_set_script`, object_id
  `mystery_reset`) puis `ha_reload_core` (ou reload scripts).

- [ ] **Step 3 : Valider** — `ha_get_logs` : aucune erreur de chargement ;
  `ha_get_state("script.mystery_reset")` existe.

- [ ] **Step 4 : Checkpoint live (Eric)** — exécuter `script.mystery_reset`,
  confirmer : médias stoppés, TV éteinte, `mystery_phase = idle`, booleans off,
  Roby repart au dock, lumières neutres.

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(mystery): script de reset du jeu"
```

---

### Task 3 : Script `mystery_start` — Phase 0 (police) + Phase 1 (briefing)

**Files:**
- Modify : `scripts.yaml` (ajouter `mystery_start`)

**Interfaces:**
- Consumes : `input_select.mystery_phase`, gyrophares, `media_player.sonos`,
  `assist_satellite.192_168_0_160`.
- Produces : `script.mystery_start` avec champ `start_delay` (secondes, défaut
  0). À la fin, `mystery_phase = investigation` et Roby part vers la salle à
  manger (appelle `script.mystery_roby_to_dining`, Task 7 — tolérer son absence
  via `continue_on_error`).

- [ ] **Step 1 : Écrire le script**

```yaml
mystery_start:
  alias: "Mystery - Start"
  mode: restart
  fields:
    start_delay:
      name: Initial delay (seconds)
      selector:
        number: { min: 0, max: 300, step: 1 }
      default: 0
  sequence:
    - delay: { seconds: "{{ start_delay | int }}" }
    # Désactiver l'éclairage automatique par mouvement pendant le jeu
    - action: automation.turn_off
      data: { stop_actions: true }
      target:
        entity_id: "{{ label_entities('motions') }}"
    - action: input_select.select_option
      target: { entity_id: input_select.mystery_phase }
      data: { option: idle }
    # --- PHASE 0 : la police arrive ---
    - action: light.turn_off
      target:
        entity_id: all
      data: { transition: 2 }
    - delay: { seconds: 2 }
    - action: media_player.volume_set
      target: { entity_id: media_player.sonos }
      data: { volume_level: 0.5 }
    - action: media_player.play_media
      target: { entity_id: media_player.sonos }
      data:
        media_content_type: audio/mpeg
        media_content_id: "media-source://media_source/local/Police Sirens.mp3"
    # Gyrophares bleu/rouge alternés (~15 s)
    - repeat:
        count: 15
        sequence:
          - action: light.turn_on
            target: { entity_id: light.left_floor_lamp }
            data: { rgb_color: [0, 0, 255], brightness_pct: 100 }
          - action: light.turn_on
            target: { entity_id: light.right_floor_lamp }
            data: { rgb_color: [255, 0, 0], brightness_pct: 100 }
          - delay: { milliseconds: 500 }
          - action: light.turn_on
            target: { entity_id: light.left_floor_lamp }
            data: { rgb_color: [255, 0, 0], brightness_pct: 100 }
          - action: light.turn_on
            target: { entity_id: light.right_floor_lamp }
            data: { rgb_color: [0, 0, 255], brightness_pct: 100 }
          - delay: { milliseconds: 500 }
    - action: media_player.play_media
      target: { entity_id: media_player.sonos }
      data:
        media_content_type: audio/mpeg
        media_content_id: "media-source://media_source/local/Police Radio Chatter.mp3"
    - delay: { seconds: 12 }
    - action: media_player.play_media
      target: { entity_id: media_player.sonos }
      data:
        media_content_type: audio/mpeg
        media_content_id: "media-source://media_source/local/Car Drive Away.mp3"
    - action: light.turn_off
      target: { entity_id: [light.left_floor_lamp, light.right_floor_lamp] }
      data: { transition: 2 }
    - delay: { seconds: 3 }
    # --- PHASE 0→1 : le téléphone sonne ---
    - action: media_player.play_media
      target: { entity_id: media_player.sonos }
      data:
        media_content_type: audio/mpeg
        media_content_id: "media-source://media_source/local/Phone Ringing.mp3"
    - delay: { seconds: 3 }
    # --- PHASE 1 : briefing de l'inspecteur (téléphone) ---
    - action: assist_satellite.announce
      target: { entity_id: assist_satellite.192_168_0_160 }
      data:
        preannounce: false
        message: >-
          Allô ? Ici l'inspecteur Lumière. Un meurtre a eu lieu chez vous ce
          soir, et votre maison a tout enregistré. J'ai besoin de vous comme
          détective. Trois choses à découvrir : QUI est le coupable, AVEC QUOI,
          et OÙ. Il y a trois suspects dans la maison : le Jardinier, l'Héritière
          et le Majordome. Allez les interroger : entrez dans une pièce et
          faites-les parler. Revenez me voir quand vous serez prêt à accuser.
          Bonne chance.
    - action: input_select.select_option
      target: { entity_id: input_select.mystery_phase }
      data: { option: investigation }
    - action: script.mystery_roby_to_dining
      continue_on_error: true
```

- [ ] **Step 2 : Pousser via MCP** + reload.

- [ ] **Step 3 : Valider** — `ha_get_logs` sans erreur ;
  `ha_eval_template("{{ label_entities('motions') }}")` retourne bien une liste
  d'automations (sinon corriger le label).

- [ ] **Step 4 : Checkpoint live (Eric)** — lancer `script.mystery_start` avec
  `start_delay: 0`. Confirmer la séquence : noir → gyrophares bleu/rouge +
  sirènes → chatter → voiture → sonnerie → l'inspecteur parle au téléphone →
  `mystery_phase = investigation`. (Roby : voir Task 7.) *Note : uploader
  d'abord les fichiers audio, sinon le son est ignoré.*

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(mystery): intro police + briefing inspecteur"
```

---

### Task 4 : Script `mystery_suspect_speak` (dialogues des suspects, paramétré)

**Files:**
- Modify : `scripts.yaml` (ajouter `mystery_suspect_speak`)

**Interfaces:**
- Consumes : helpers de Task 1, TTS, media players des pièces.
- Produces : `script.mystery_suspect_speak` avec champ `suspect`
  (`"gardener" | "heiress" | "butler"`). Joue le bon dialogue sur le bon
  haut-parleur et met le boolean correspondant à `on`. Rejoue une réplique
  courte si déjà interrogé.

- [ ] **Step 1 : Écrire le script**

```yaml
mystery_suspect_speak:
  alias: "Mystery - Suspect speaks"
  mode: queued
  max: 5
  fields:
    suspect:
      name: Suspect
      selector:
        select:
          options: ["gardener", "heiress", "butler"]
      required: true
  variables:
    speaker: >-
      {{ {'gardener': 'media_player.workshop_echo',
          'heiress': 'media_player.sonos',
          'butler': 'media_player.google_home_mini'}[suspect] }}
    done_flag: >-
      {{ {'gardener': 'input_boolean.mystery_gardener_done',
          'heiress': 'input_boolean.mystery_heiress_done',
          'butler': 'input_boolean.mystery_butler_done'}[suspect] }}
    first_line: >-
      {% if suspect == 'gardener' %}
      Ah, un détective... Moi, le Jardinier ? J'étais à l'atelier toute la
      soirée à affûter ma scie. Je n'ai rien vu. Mais si vous voulez mon avis,
      le Majordome n'arrêtait pas de rôder dans la salle à manger avec sa
      bouteille de vin.
      {% elif suspect == 'heiress' %}
      Moi, l'Héritière ? J'étais au salon, seule, à ne rien faire du tout.
      Certainement pas avec mon fusil. Le Jardinier, lui, semblait bien nerveux
      avec sa scie ce soir.
      {% else %}
      Je faisais mon devoir, Monsieur. Je servais le vin en salle à manger,
      comme toujours. Un service irréprochable. L'Héritière, en revanche,
      détestait la victime : une sordide histoire d'héritage.
      {% endif %}
    repeat_line: >-
      {% if suspect == 'gardener' %}
      Je vous l'ai dit, j'étais à l'atelier. Regardez plutôt du côté du vin.
      {% elif suspect == 'heiress' %}
      J'étais au salon, un point c'est tout. Mon fusil n'a jamais servi.
      {% else %}
      Le service, toujours le service. Le vin était... parfait.
      {% endif %}
  sequence:
    - action: media_player.volume_set
      target: { entity_id: "{{ speaker }}" }
      data: { volume_level: 0.6 }
    - if:
        - condition: template
          value_template: "{{ is_state(done_flag, 'off') }}"
      then:
        - action: tts.speak
          target: { entity_id: tts.home_assistant_cloud }
          data:
            cache: true
            language: fr-FR
            media_player_entity_id: "{{ speaker }}"
            message: "{{ first_line }}"
        - action: input_boolean.turn_on
          target: { entity_id: "{{ done_flag }}" }
      else:
        - action: tts.speak
          target: { entity_id: tts.home_assistant_cloud }
          data:
            cache: true
            language: fr-FR
            media_player_entity_id: "{{ speaker }}"
            message: "{{ repeat_line }}"
```

- [ ] **Step 2 : Pousser via MCP** + reload.

- [ ] **Step 3 : Valider les templates** — `ha_eval_template` sur l'expression
  `speaker` avec `suspect='butler'` → `media_player.google_home_mini`.

- [ ] **Step 4 : Checkpoint live (Eric)** — appeler le script avec
  `suspect: gardener` (son sur l'Echo atelier + boolean à on), puis à nouveau
  (réplique courte). Idem `heiress` (Sonos) et `butler` (Google Home).

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(mystery): dialogues des trois suspects (TTS localisé)"
```

---

### Task 5 : Automation `Mystery - Suspect triggers`

**Files:**
- Modify : `automations.yaml` (ajouter l'automation)

**Interfaces:**
- Consumes : `script.mystery_suspect_speak`, `input_select.mystery_phase`.
- Produces : automation qui, pendant la phase `investigation`, fait parler le
  bon suspect quand on ouvre la porte de l'atelier, la porte-patio de la salle à
  manger, ou qu'on appuie sur le bouton Zigbee du salon.

- [ ] **Step 1 : Écrire l'automation**

```yaml
- id: mystery_suspect_triggers
  alias: "Mystery - Suspect triggers"
  mode: queued
  max: 5
  triggers:
    - trigger: state
      entity_id: binary_sensor.door_sensor_contact
      to: "on"
      id: gardener
    - trigger: state
      entity_id: binary_sensor.patio_door_contact
      to: "on"
      id: butler
    - trigger: device
      domain: mqtt
      device_id: 8317fbc3ea314ec40186f0d8ec39998d
      type: action
      subtype: single
      id: heiress
  conditions:
    - condition: state
      entity_id: input_select.mystery_phase
      state: ["investigation"]
  actions:
    - action: script.mystery_suspect_speak
      data:
        suspect: "{{ trigger.id }}"
```

- [ ] **Step 2 : Pousser via MCP** (`ha_config_set_automation`) + reload.

- [ ] **Step 3 : Valider** — `ha_get_logs` sans erreur ; l'automation est `on`.

- [ ] **Step 4 : Checkpoint live (Eric)** — mettre `mystery_phase =
  investigation`, puis : ouvrir la porte atelier → Jardinier parle ; ouvrir la
  porte-patio → Majordome parle ; presser le bouton salon → Héritière parle.

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(mystery): déclencheurs des suspects (portes + bouton salon)"
```

---

### Task 6 : Automation `Mystery - Wine bottle evidence` (preuve arme)

**Files:**
- Modify : `automations.yaml`

**Interfaces:**
- Consumes : `binary_sensor.vibration_sensor_vibration`,
  `media_player.google_home_mini`, TTS, `input_select.mystery_phase`.
- Produces : quand on manipule la bouteille de vin pendant l'enquête, la voix de
  la salle à manger révèle la présence de poison.

- [ ] **Step 1 : Écrire l'automation**

```yaml
- id: mystery_wine_evidence
  alias: "Mystery - Wine bottle evidence"
  mode: single
  triggers:
    - trigger: state
      entity_id: binary_sensor.vibration_sensor_vibration
      to: "on"
  conditions:
    - condition: state
      entity_id: input_select.mystery_phase
      state: ["investigation", "autopsy_done"]
  actions:
    - action: media_player.volume_set
      target: { entity_id: media_player.google_home_mini }
      data: { volume_level: 0.6 }
    - action: tts.speak
      target: { entity_id: tts.home_assistant_cloud }
      data:
        cache: true
        language: fr-FR
        media_player_entity_id: media_player.google_home_mini
        message: >-
          Attention... cette bouteille de vin. L'analyse révèle des traces de
          poison. Quelqu'un a versé une substance mortelle dans le vin de la
          victime.
```

- [ ] **Step 2 : Pousser via MCP** + reload.

- [ ] **Step 3 : Valider** — `ha_get_logs` sans erreur.

- [ ] **Step 4 : Checkpoint live (Eric)** — phase `investigation`, secouer la
  bouteille (capteur vibration) → la voix salle à manger annonce le poison.

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(mystery): preuve du vin empoisonné (vibration)"
```

---

### Task 7 : Script `mystery_roby_to_dining` (le robot mène l'enquête)

**Files:**
- Modify : `scripts.yaml`

**Interfaces:**
- Consumes : `vacuum.roborock_s5_7c79_robot_cleaner`.
- Produces : `script.mystery_roby_to_dining` — envoie Roby vers la salle à
  manger via `app_goto_target`. Coordonnée à calibrer.

- [ ] **Step 1 : Écrire le script**

```yaml
mystery_roby_to_dining:
  alias: "Mystery - Roby goes to dining room"
  mode: single
  sequence:
    - action: vacuum.send_command
      target:
        entity_id: vacuum.roborock_s5_7c79_robot_cleaner
      data:
        command: app_goto_target
        params: [18500, 25500]
```

- [ ] **Step 2 : Pousser via MCP** + reload.

- [ ] **Step 3 : Calibrage live (Claude + Eric)** — exécuter le script ; Eric
  observe où Roby s'arrête. Si ce n'est pas la salle à manger, ajuster les
  `params` (X décroissant = s'éloigner du dock dans la direction fournie) et
  répéter jusqu'à obtenir la bonne position. Mettre à jour la coordonnée dans le
  script **et** dans `design.md`.

- [ ] **Step 4 : Commit**

```bash
git commit -am "feat(mystery): Roby se rend en salle à manger (coord calibrée)"
```

---

### Task 8 : Rappel de la police (phase 3, autopsie)

**Files:**
- Modify : `scripts.yaml` (ajouter `mystery_police_callback`)
- Modify : `automations.yaml` (ajouter `Mystery - Auto autopsy`)

**Interfaces:**
- Consumes : les trois `input_boolean` de suspects, `assist_satellite`,
  `media_player.sonos`, `input_select.mystery_phase`.
- Produces : `script.mystery_police_callback` (annonce le rapport d'autopsie →
  empoisonnement, passe la phase à `autopsy_done`) ; une automation qui le
  déclenche automatiquement quand les trois suspects ont été interrogés.

- [ ] **Step 1 : Écrire le script**

```yaml
mystery_police_callback:
  alias: "Mystery - Police callback (autopsy)"
  mode: single
  sequence:
    - action: media_player.play_media
      target: { entity_id: media_player.sonos }
      data:
        media_content_type: audio/mpeg
        media_content_id: "media-source://media_source/local/Phone Ringing.mp3"
    - delay: { seconds: 3 }
    - action: assist_satellite.announce
      target: { entity_id: assist_satellite.192_168_0_160 }
      data:
        preannounce: false
        message: >-
          Inspecteur Lumière à nouveau. Le rapport du légiste vient d'arriver :
          aucune blessure par balle, aucune trace de lame. La victime a été
          EMPOISONNÉE. Oubliez le fusil et la scie, ce sont des diversions.
          Cherchez ce que la victime a bu ou mangé. Quand vous aurez tout
          rassemblé, revenez me voir pour l'accusation.
    - action: input_select.select_option
      target: { entity_id: input_select.mystery_phase }
      data: { option: autopsy_done }
```

- [ ] **Step 2 : Écrire l'automation de déclenchement auto**

```yaml
- id: mystery_auto_autopsy
  alias: "Mystery - Auto autopsy"
  mode: single
  triggers:
    - trigger: state
      entity_id:
        - input_boolean.mystery_gardener_done
        - input_boolean.mystery_heiress_done
        - input_boolean.mystery_butler_done
      to: "on"
  conditions:
    - condition: state
      entity_id: input_select.mystery_phase
      state: investigation
    - condition: state
      entity_id: input_boolean.mystery_gardener_done
      state: "on"
    - condition: state
      entity_id: input_boolean.mystery_heiress_done
      state: "on"
    - condition: state
      entity_id: input_boolean.mystery_butler_done
      state: "on"
  actions:
    - delay: { seconds: 5 }
    - action: script.mystery_police_callback
```

- [ ] **Step 3 : Pousser via MCP** (script + automation) + reload.

- [ ] **Step 4 : Valider** — `ha_get_logs` sans erreur ; automation `on`.

- [ ] **Step 5 : Checkpoint live (Eric)** — phase `investigation`, interroger
  les trois suspects → ~5 s après le 3ᵉ, la police rappelle et
  `mystery_phase = autopsy_done`.

- [ ] **Step 6 : Commit**

```bash
git commit -am "feat(mystery): rappel police + rapport d'autopsie"
```

---

### Task 9 : Script `mystery_accusation` (phase 4, oui/non)

**Files:**
- Modify : `scripts.yaml`

**Interfaces:**
- Consumes : `assist_satellite.192_168_0_160`, `input_select.mystery_phase`.
- Produces : `script.mystery_accusation` — pose une cascade de questions
  oui/non (suspect, puis arme, puis lieu), compare à la solution
  (Majordome / poison / salle à manger) et appelle `script.mystery_denouement`
  avec `success: true|false` (Task 10 ; tolérer son absence via
  `continue_on_error`).

Pattern `ask_question` repris de l'automation v1 « Phone call »
(`response_variable` + `answers` avec `sentences: [oui, non]`).

- [ ] **Step 1 : Écrire le script**

```yaml
mystery_accusation:
  alias: "Mystery - Accusation"
  mode: single
  variables:
    yesno:
      - id: "yes"
        sentences: ["oui", "yes"]
      - id: "no"
        sentences: ["non", "no"]
  sequence:
    - action: input_select.select_option
      target: { entity_id: input_select.mystery_phase }
      data: { option: accusation }
    # --- QUI ---
    - action: assist_satellite.ask_question
      target: { entity_id: assist_satellite.192_168_0_160 }
      data:
        preannounce: false
        question: "Passons à l'accusation. Le coupable est-il le Jardinier ? Répondez oui ou non."
        answers: "{{ yesno }}"
      response_variable: a_gardener
    - if: "{{ a_gardener.id == 'yes' }}"
      then:
        - variables: { culprit: gardener }
      else:
        - action: assist_satellite.ask_question
          target: { entity_id: assist_satellite.192_168_0_160 }
          data:
            preannounce: false
            question: "Est-ce l'Héritière ? Oui ou non."
            answers: "{{ yesno }}"
          response_variable: a_heiress
        - if: "{{ a_heiress.id == 'yes' }}"
          then:
            - variables: { culprit: heiress }
          else:
            - variables: { culprit: butler }
    # --- AVEC QUOI ---
    - action: assist_satellite.ask_question
      target: { entity_id: assist_satellite.192_168_0_160 }
      data:
        preannounce: false
        question: "L'arme du crime est-elle le poison ? Oui ou non."
        answers: "{{ yesno }}"
      response_variable: a_poison
    # --- OÙ ---
    - action: assist_satellite.ask_question
      target: { entity_id: assist_satellite.192_168_0_160 }
      data:
        preannounce: false
        question: "Et le crime a-t-il eu lieu dans la salle à manger ? Oui ou non."
        answers: "{{ yesno }}"
      response_variable: a_dining
    - variables:
        solved: >-
          {{ culprit == 'butler' and a_poison.id == 'yes' and a_dining.id == 'yes' }}
    - action: script.mystery_denouement
      continue_on_error: true
      data:
        success: "{{ solved }}"
```

- [ ] **Step 2 : Pousser via MCP** + reload.

- [ ] **Step 3 : Valider** — `ha_get_logs` sans erreur.

- [ ] **Step 4 : Checkpoint live (Eric)** — lancer `script.mystery_accusation`,
  répondre au téléphone. Vérifier deux parcours : bonne combinaison (Majordome
  → non, non, oui ; poison oui ; salle à manger oui) → `success=true` ; mauvaise
  → `success=false`. (Le dénouement vient en Task 10.)

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(mystery): accusation finale en oui/non"
```

---

### Task 10 : Script `mystery_denouement` (phase 5, final)

**Files:**
- Modify : `scripts.yaml`

**Interfaces:**
- Consumes : `assist_satellite`, `media_player.theatre_tv`, `media_player.sonos`,
  lumières, volets théâtre, `input_select.mystery_phase`.
- Produces : `script.mystery_denouement` avec champ `success` (bool). Succès →
  révélation + musique de victoire + théâtre ; échec → l'inspecteur recadre et
  laisse retenter (repasse en `autopsy_done`).

- [ ] **Step 1 : Écrire le script**

```yaml
mystery_denouement:
  alias: "Mystery - Denouement"
  mode: single
  fields:
    success:
      name: Success
      selector: { boolean: {} }
      default: false
  sequence:
    - if: "{{ success }}"
      then:
        - action: input_select.select_option
          target: { entity_id: input_select.mystery_phase }
          data: { option: solved }
        - action: assist_satellite.announce
          target: { entity_id: assist_satellite.192_168_0_160 }
          data:
            preannounce: false
            message: >-
              Bravo, détective ! C'est exact : le Majordome a empoisonné le vin
              dans la salle à manger. Affaire classée. La maison vous doit une
              fière chandelle.
        - action: media_player.play_media
          target: { entity_id: media_player.sonos }
          data:
            media_content_type: audio/mpeg
            media_content_id: "media-source://media_source/local/Dramatic Reveal.mp3"
        - delay: { seconds: 4 }
        - action: media_player.play_media
          target: { entity_id: media_player.sonos }
          data:
            media_content_type: audio/mpeg
            media_content_id: "media-source://media_source/local/Victory Theme.mp3"
        - action: light.turn_on
          target:
            entity_id: [light.left_floor_lamp, light.right_floor_lamp]
          data: { rgb_color: [0, 255, 0], brightness_pct: 100, transition: 2 }
        - action: cover.open_cover
          target:
            entity_id:
              - cover.theatre_middle_shade
              - cover.theatre_left_shade
              - cover.theatre_right_shade
          continue_on_error: true
      else:
        - action: input_select.select_option
          target: { entity_id: input_select.mystery_phase }
          data: { option: autopsy_done }
        - action: media_player.play_media
          target: { entity_id: media_player.sonos }
          data:
            media_content_type: audio/mpeg
            media_content_id: "media-source://media_source/local/Wrong Answer Sting.mp3"
        - delay: { seconds: 2 }
        - action: assist_satellite.announce
          target: { entity_id: assist_satellite.192_168_0_160 }
          data:
            preannounce: false
            message: >-
              Hmm... ça ne colle pas, détective. Reprenez les indices : le vin,
              le rapport d'autopsie, les alibis. Revenez me voir quand vous
              serez sûr.
```

- [ ] **Step 2 : Pousser via MCP** + reload.

- [ ] **Step 3 : Valider** — `ha_get_logs` sans erreur.

- [ ] **Step 4 : Checkpoint live (Eric)** — appeler avec `success: true`
  (révélation + victoire + lumières vertes + volets) puis `success: false`
  (sting + recadrage, phase revient à `autopsy_done`).

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(mystery): dénouement succès/échec"
```

---

### Task 11 : Automation `Mystery - Phone button` (déclencher l'accusation)

**Files:**
- Modify : `automations.yaml`

**Interfaces:**
- Consumes : device bouton téléphone `8317fbc3ea314ec40186f0d8ec39998d`,
  `input_select.mystery_phase`, `script.mystery_accusation`,
  `script.mystery_police_callback`.
- Produces : pendant `autopsy_done`, le bouton du téléphone lance l'accusation ;
  pendant `investigation`, il sert d'indice (rappel du briefing / relance).

> Le device `8317fbc3ea314ec40186f0d8ec39998d` sert **à la fois** de déclencheur
> salon (Task 5, subtype `single` pendant l'investigation) et de bouton
> d'accusation. Pour éviter le conflit, ce bouton est **près du Sonos au salon**
> et l'automation route selon la phase. La Task 5 reste sur `investigation`
> (Héritière), celle-ci agit en `autopsy_done`. Si Eric constate un conflit
> gênant, on dédiera un second bouton — **à valider au checkpoint**.

- [ ] **Step 1 : Écrire l'automation**

```yaml
- id: mystery_phone_button
  alias: "Mystery - Phone button"
  mode: single
  triggers:
    - trigger: device
      domain: mqtt
      device_id: 8317fbc3ea314ec40186f0d8ec39998d
      type: action
      subtype: single
  conditions:
    - condition: state
      entity_id: input_select.mystery_phase
      state: ["autopsy_done", "accusation"]
  actions:
    - action: script.mystery_accusation
```

- [ ] **Step 2 : Pousser via MCP** + reload.

- [ ] **Step 3 : Valider** — `ha_get_logs` sans erreur.

- [ ] **Step 4 : Checkpoint live (Eric)** — vérifier la cohabitation :
  en `investigation`, le bouton fait parler l'Héritière (Task 5) ; en
  `autopsy_done`, le même bouton lance l'accusation (Task 9). Confirmer qu'il
  n'y a pas de double-déclenchement gênant.

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(mystery): bouton téléphone lance l'accusation"
```

---

### Task 12 : Intégration et partie complète

**Files:**
- Modify : `docs/escape-room-v2/todo-physical-setup.md` (cocher ce qui est fait)

**Interfaces:**
- Consumes : tout ce qui précède.
- Produces : une partie complète jouable de bout en bout.

> **La v1 est intégralement conservée et n'est PAS désactivée.** v1 et v2
> coexistent et restent toutes deux jouables. La cohabitation des éléments
> physiques partagés (bouton Zigbee, capteur de vibration) est gérée
> **manuellement par Eric** (il déplace le capteur / n'active qu'un jeu à la
> fois) — **aucun code de cohabitation n'est requis**.

- [ ] **Step 1 : Partie complète (Eric)** — `script.mystery_reset`, puis
  `script.mystery_start` (delay 0). Jouer : intro police → interroger les 3
  suspects (Echo/Sonos/Google Home) → trouver le vin empoisonné → rappel
  autopsie → bouton téléphone → accusation Majordome/poison/salle à manger →
  dénouement victoire. Vérifier Roby en cours de route.

- [ ] **Step 2 : Calibrer Roby** — Claude pilote Roby via le MCP
  (`vacuum.send_command` / `app_goto_target`), Eric observe où il s'arrête, on
  affine `COORD_DINING` (départ `[18500, 25500]`). Mettre à jour le script
  `mystery_roby_to_dining` et `design.md`.

- [ ] **Step 3 : Vérifier le reset** — `script.mystery_reset` remet tout à zéro
  (phase idle, booleans off, médias stop, motion automations on, Roby au dock).

- [ ] **Step 4 : Mettre à jour la todo** — cocher les éléments réalisés,
  consigner la coordonnée Roby calibrée.

- [ ] **Step 5 : Commit** (uniquement les docs mis à jour)

```bash
git commit -am "docs(mystery): cocher la todo + coordonnée Roby calibrée"
```

---

### Task 13 : Fausse piste du tiroir à couteaux (Majordome)

**Files:**
- Modify : `automations.yaml`

**Interfaces:**
- Consumes : `binary_sensor.closed_closet_sensor_contact` (capteur du closet de la
  chambre, **déplacé physiquement par Eric sur le tiroir à couteaux de la
  cuisine**), `media_player.google_home_mini`, TTS, `input_select.mystery_phase`.
- Produces : quand on ouvre le tiroir à couteaux pendant l'enquête, la voix du
  Majordome (Google Home) feint l'innocence — fausse piste vers le couteau.

- [ ] **Step 1 : Écrire l'automation**

```yaml
- id: mystery_knife_drawer
  alias: "Mystery - Knife drawer red herring"
  mode: single
  triggers:
    - trigger: state
      entity_id: binary_sensor.closed_closet_sensor_contact
      to: "on"
  conditions:
    - condition: state
      entity_id: input_select.mystery_phase
      state: ["investigation"]
  actions:
    - action: media_player.volume_set
      target: { entity_id: media_player.google_home_mini }
      data: { volume_level: 0.6 }
    - action: tts.speak
      target: { entity_id: tts.home_assistant_cloud }
      data:
        cache: true
        language: fr-FR
        media_player_entity_id: media_player.google_home_mini
        message: >-
          Un couteau manquant dans ce tiroir ? Mon Dieu... Je n'y toucherais
          jamais, voyons. Le service, uniquement le service. C'est le Jardinier
          qui passe son temps dans cette cuisine, pas moi.
```

- [ ] **Step 2 : Valider** — `python3 -c "import yaml; yaml.safe_load(open('automations.yaml'))"` sans erreur.

- [ ] **Step 3 : Checkpoint live (Eric)** — phase `investigation`, ouvrir le
  tiroir à couteaux (capteur closet déplacé) → le Majordome feint l'innocence.

- [ ] **Step 4 : Commit**

```bash
git commit -am "feat(mystery): fausse piste du tiroir à couteaux (Majordome)"
```

---

### Task 14 : Cohabitation v1 ↔ v2 (garde par input_boolean)

Empêche que le bouton Zigbee et le capteur de vibration, **partagés** entre la
v1 et la v2, déclenchent la v1 pendant une partie v2. **La v1 n'est ni
supprimée ni désactivée** : on lui ajoute seulement une *condition de garde*.

**Files:**
- Modify : `configuration.yaml` (ajouter `input_boolean.escape_v2_active`)
- Modify : `scripts.yaml` (`mystery_start` allume le flag, `mystery_reset`
  l'éteint)
- Modify : `automations.yaml` (ajouter une condition de garde aux 2 automations
  v1 qui partagent le bouton/vibration)

**Interfaces:**
- Produces : `input_boolean.escape_v2_active` — `on` pendant une partie v2, `off`
  sinon. Les automations v1 `Escape room - Part 2` et `Phone call` ne se
  déclenchent que lorsque le flag est `off`.
- Note : la v2 est déjà isolée dans l'autre sens par sa garde de phase
  (`mystery_phase` doit valoir `investigation`/`autopsy_done`/`accusation`), donc
  une partie v1 (phase `idle`) ne déclenche jamais la v2. Le flag couvre le sens
  v2 → bloque v1.

- [ ] **Step 1 : Ajouter le helper** dans `configuration.yaml`, dans la section
  `input_boolean:` existante :

```yaml
  escape_v2_active:
    name: Escape v2 Active
    icon: mdi:incognito
```

- [ ] **Step 2 : `mystery_start` allume le flag** — insérer tout au début du
  `sequence:` de `mystery_start` (avant le `delay`) :

```yaml
    - action: input_boolean.turn_on
      target: { entity_id: input_boolean.escape_v2_active }
```

- [ ] **Step 3 : `mystery_reset` éteint le flag** — ajouter dans la séquence de
  `mystery_reset` (par ex. juste après la remise de phase à `idle`) :

```yaml
    - action: input_boolean.turn_off
      target: { entity_id: input_boolean.escape_v2_active }
```

- [ ] **Step 4 : Garde sur les automations v1** — dans `automations.yaml`, aux
  automations `Escape room - Part 2` (id `1768618057000`) et `Phone call`
  (id `1768185894945`), ajouter dans leur bloc `conditions:` (qui est
  actuellement `[]`) :

```yaml
  conditions:
    - condition: state
      entity_id: input_boolean.escape_v2_active
      state: "off"
```

  Ne modifier QUE le bloc `conditions:` de ces deux automations — ne toucher ni
  à leurs triggers, ni à leurs actions.

- [ ] **Step 5 : Valider** — `python3 -c "import yaml; yaml.safe_load(open('automations.yaml'))"` et
  `yaml.safe_load` du bloc ajouté à `configuration.yaml` ; `scripts.yaml` parse.

- [ ] **Step 6 : Checkpoint live (Eric)** — lancer une partie v2 : le bouton et
  la vibration ne déclenchent plus la v1. Après `mystery_reset`, la v1 redevient
  jouable normalement.

- [ ] **Step 7 : Commit**

```bash
git commit -am "feat(mystery): garde de cohabitation v1/v2 (input_boolean)"
```

---

### Task 15 : Musique d'ambiance d'enquête (Sonos, pause pour l'Héritière)

Ambiance de fond pendant la phase `investigation`. Comme l'Héritière parle sur
le **même** Sonos, on met l'ambiance en pause le temps de sa réplique puis on
reprend. Les autres suspects (Echo / Google Home) sont sur d'autres enceintes :
l'ambiance continue pendant qu'ils parlent.

**Files:**
- Modify : `scripts.yaml` (`mystery_start`, `mystery_suspect_speak`,
  `mystery_police_callback`)

**Interfaces:**
- Consumes : `media_player.sonos`, `input_select.mystery_phase`, fichier
  `Investigation Ambience.mp3`.
- Produces : ambiance lancée à l'entrée en `investigation`, mise en pause/reprise
  autour de la voix de l'Héritière, arrêtée quand l'autopsie démarre.

> ⚠️ La **reprise du Sonos après un TTS** (`media_play` sur une file en pause)
> dépend du comportement du Sonos. À valider en live (Step 4). Fallback si la
> reprise échoue : remplacer le `media_play` par un `play_media` du fichier
> d'ambiance.

- [ ] **Step 1 : `mystery_start`** — juste après le passage en phase
  `investigation` (avant l'appel à `mystery_roby_to_dining`), insérer :

```yaml
    - action: media_player.volume_set
      target: { entity_id: media_player.sonos }
      data: { volume_level: 0.25 }
    - action: media_player.play_media
      target: { entity_id: media_player.sonos }
      data:
        media_content_type: audio/mpeg
        media_content_id: "media-source://media_source/local/Investigation Ambience.mp3"
```

- [ ] **Step 2 : `mystery_suspect_speak`** — remplacer TOUT le bloc du script par
  cette version (ajoute `is_heiress` + `line`, pause/reprise Sonos pour
  l'Héritière) :

```yaml
mystery_suspect_speak:
  alias: "Mystery - Suspect speaks"
  mode: queued
  max: 5
  fields:
    suspect:
      name: Suspect
      selector:
        select:
          options: ["gardener", "heiress", "butler"]
      required: true
  variables:
    speaker: >-
      {{ {'gardener': 'media_player.workshop_echo',
          'heiress': 'media_player.sonos',
          'butler': 'media_player.google_home_mini'}[suspect] }}
    done_flag: >-
      {{ {'gardener': 'input_boolean.mystery_gardener_done',
          'heiress': 'input_boolean.mystery_heiress_done',
          'butler': 'input_boolean.mystery_butler_done'}[suspect] }}
    first_line: >-
      {% if suspect == 'gardener' %}
      Ah, un détective... Moi, le Jardinier ? J'étais à l'atelier toute la
      soirée à affûter ma scie. Je n'ai rien vu. Mais si vous voulez mon avis,
      le Majordome n'arrêtait pas de rôder dans la salle à manger avec sa
      bouteille de vin.
      {% elif suspect == 'heiress' %}
      Moi, l'Héritière ? J'étais au salon, seule, à ne rien faire du tout.
      Certainement pas avec mon fusil. Le Jardinier, lui, semblait bien nerveux
      avec sa scie ce soir.
      {% else %}
      Je faisais mon devoir, Monsieur. Je servais le vin en salle à manger,
      comme toujours. Un service irréprochable. L'Héritière, en revanche,
      détestait la victime : une sordide histoire d'héritage.
      {% endif %}
    repeat_line: >-
      {% if suspect == 'gardener' %}
      Je vous l'ai dit, j'étais à l'atelier. Regardez plutôt du côté du vin.
      {% elif suspect == 'heiress' %}
      J'étais au salon, un point c'est tout. Mon fusil n'a jamais servi.
      {% else %}
      Le service, toujours le service. Le vin était... parfait.
      {% endif %}
    is_heiress: "{{ suspect == 'heiress' }}"
    line: "{{ first_line if is_state(done_flag, 'off') else repeat_line }}"
  sequence:
    - if: "{{ is_heiress }}"
      then:
        - action: media_player.media_pause
          target: { entity_id: media_player.sonos }
          continue_on_error: true
        - delay: { milliseconds: 300 }
    - action: media_player.volume_set
      target: { entity_id: "{{ speaker }}" }
      data: { volume_level: 0.6 }
    - action: tts.speak
      target: { entity_id: tts.home_assistant_cloud }
      data:
        cache: true
        language: fr-FR
        media_player_entity_id: "{{ speaker }}"
        message: "{{ line }}"
    - if: "{{ is_state(done_flag, 'off') }}"
      then:
        - action: input_boolean.turn_on
          target: { entity_id: "{{ done_flag }}" }
    - if: "{{ is_heiress }}"
      then:
        - delay: { seconds: 1 }
        - wait_template: "{{ not is_state('media_player.sonos', 'playing') }}"
          timeout: "00:00:30"
          continue_on_timeout: true
        - if: "{{ is_state('input_select.mystery_phase', 'investigation') }}"
          then:
            - action: media_player.volume_set
              target: { entity_id: media_player.sonos }
              data: { volume_level: 0.25 }
            - action: media_player.media_play
              target: { entity_id: media_player.sonos }
              continue_on_error: true
```

- [ ] **Step 3 : `mystery_police_callback`** — remplacer TOUT le bloc par cette
  version (coupe l'ambiance et passe la phase à `autopsy_done` **au début**, pour
  éviter que la reprise de l'Héritière rallume l'ambiance pendant l'autopsie) :

```yaml
mystery_police_callback:
  alias: "Mystery - Police callback (autopsy)"
  mode: single
  sequence:
    - action: media_player.media_stop
      target: { entity_id: media_player.sonos }
      continue_on_error: true
    - action: input_select.select_option
      target: { entity_id: input_select.mystery_phase }
      data: { option: autopsy_done }
    - action: media_player.play_media
      target: { entity_id: media_player.sonos }
      data:
        media_content_type: audio/mpeg
        media_content_id: "media-source://media_source/local/Phone Ringing.mp3"
    - delay: { seconds: 3 }
    - action: assist_satellite.announce
      target: { entity_id: assist_satellite.192_168_0_160 }
      data:
        preannounce: false
        message: >-
          Inspecteur Lumière à nouveau. Le rapport du légiste vient d'arriver :
          aucune blessure par balle, aucune trace de lame. La victime a été
          EMPOISONNÉE. Oubliez le fusil et la scie, ce sont des diversions.
          Cherchez ce que la victime a bu ou mangé. Quand vous aurez tout
          rassemblé, revenez me voir pour l'accusation.
```

- [ ] **Step 4 : Valider** — `python3 -c "import yaml; yaml.safe_load(open('scripts.yaml'))"` sans erreur.

- [ ] **Step 5 : Checkpoint live (Eric)** — ambiance en fond pendant l'enquête ;
  quand l'Héritière parle, l'ambiance se coupe puis **reprend** (vérifier ce
  point précis) ; les autres suspects n'interrompent pas l'ambiance ; l'ambiance
  s'arrête au rappel de la police.

- [ ] **Step 6 : Commit**

```bash
git commit -am "feat(mystery): musique d'ambiance d'enquête (pause pour l'Héritière)"
```

---

## Auto-revue (couverture du design)

- Phase 0 (police) → Task 3 ✔ | Phase 1 (briefing) → Task 3 ✔
- Phase 2 (enquête : suspects, preuves, Roby) → Tasks 4, 5, 6, 7 ✔
- Phase 3 (rappel autopsie) → Task 8 ✔ | Phase 4 (accusation oui/non) → Tasks 9, 11 ✔
- Phase 5 (dénouement) → Task 10 ✔
- Reset propre → Task 2 ✔ | Cohabitation v1 → Task 12 ✔
- Contraintes : pas de climate/chambre (aucune action dessus) ; entrée vocale
  limitée à oui/non (Task 9) ; entités `mystery_*` ; v1 préservée (désactivée,
  non supprimée). ✔
- Fichiers audio : les 7 noms exacts sont référencés (Tasks 3, 8, 10) et listés
  dans la todo. ✔

## Dépendances entre tâches

`Task 1` → tout. `Task 7` appelé par `Task 3` (tolérant si absent).
`Task 10` appelé par `Task 9` (tolérant si absent). Ordre recommandé :
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12. Les Tasks 4/6/7 sont
indépendantes entre elles et parallélisables.
