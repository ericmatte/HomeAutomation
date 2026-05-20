# Plant Soil Moisture Low Alert — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer un blueprint Home Assistant qui surveille un capteur d'humidité de sol de plante et envoie une notification téléphone (titre + message personnalisables avec emojis) quand l'humidité tombe SOUS un seuil configurable.

**Architecture:**
- Un nouveau fichier blueprint YAML dans `blueprints/automation/ericmatte/` qui suit le même patron que `humidity_high_alert.yaml` (même domaine, même structure `input → trigger → action`).
- Trigger `numeric_state` avec `below: !input threshold` — déclenche quand le capteur franchit le seuil vers le bas, pas en continu (HA gère le débouncing pour nous).
- Cible de notification via un selector `device:` filtré sur l'intégration `mobile_app`, ce qui permet à l'utilisateur de choisir le téléphone exact (ex: `mobile_app_eric_phone`). L'action utilise `domain: mobile_app, type: notify` — l'API standard de notification mobile de HA.
- Titre et message sont des inputs `text:` séparés avec des valeurs par défaut qui contiennent déjà des emojis, pour servir de gabarit.
- Une variable Jinja injecte le nom du capteur et la valeur courante dans le message si l'utilisateur garde le placeholder par défaut.

**Tech Stack:** Home Assistant Blueprints (YAML), Jinja templates, intégration `mobile_app` (notifications push iOS/Android).

---

## Décisions clés (à connaître avant d'exécuter)

1. **Un seul fichier blueprint, pas de modifications ailleurs.** L'utilisateur créera ses automations depuis l'UI HA en pointant sur le blueprint. Pas besoin de toucher `automations.yaml` dans ce plan — c'est une étape utilisateur ensuite.
2. **Selector `device` avec `integration: mobile_app`** plutôt que `entity: person:` ou `selector: action:`. Raison: c'est l'API la plus stable pour "envoyer à un téléphone spécifique" et c'est compatible avec le `domain/type: notify` côté action, sans avoir à formater dynamiquement un `notify.mobile_app_<name>`.
3. **Trigger `numeric_state` avec `below:`** — déclenche UNE FOIS quand on traverse le seuil descendant. Si l'humidité oscille autour du seuil, HA ne re-notifie pas tant qu'elle n'est pas remontée au-dessus puis redescendue. C'est le comportement souhaité.
4. **`device_class: moisture` n'existe pas** pour les capteurs de pourcentage d'humidité de sol — la plupart utilisent `device_class: humidity` ou aucune classe. Donc on ne filtre PAS sur `device_class` dans le selector, on accepte tout `sensor` (l'utilisateur saura quel sensor choisir).
5. **Defaults pour titre/message avec emojis** — on fournit des valeurs par défaut utilisables telles quelles, contenant des placeholders `{{ ... }}` pour le nom de la plante et la valeur. L'utilisateur peut tout réécrire dans l'UI.
6. **Mode `single`** — on ne veut pas que deux notifications partent en parallèle si HA re-déclenche pendant l'envoi. Identique au patron `humidity_high_alert`.
7. **Pas de tests unitaires** — HA n'a pas de framework de test pour les blueprints. Chaque tâche se termine par une validation manuelle (recharger, déclencher, observer Traces et téléphone).

---

## Task 1: Créer le squelette du blueprint (frontmatter + inputs)

**Files:**
- Create: `blueprints/automation/ericmatte/soil_moisture_low_alert.yaml`

**Step 1: Créer le fichier avec le frontmatter et les 4 inputs**

Écrire dans `blueprints/automation/ericmatte/soil_moisture_low_alert.yaml`:

```yaml
blueprint:
  name: Plant Soil Moisture Low Alert
  description: >
    Sends a phone notification when a plant soil moisture sensor drops below
    a configured percentage. Title and message are fully customizable (emojis
    welcome). Re-arms automatically once the sensor goes back above the
    threshold.
  domain: automation
  input:
    moisture_sensor:
      name: Plant Soil Moisture Sensor
      description: The sensor reporting the plant soil moisture (in %).
      selector:
        entity:
          domain: sensor

    threshold:
      name: Moisture Threshold (%)
      description: Notify when the sensor reading drops BELOW this percentage.
      default: 30
      selector:
        number:
          min: 0
          max: 100
          step: 1
          unit_of_measurement: "%"
          mode: slider

    notify_device:
      name: Phone to Notify
      description: The mobile device (phone) that will receive the push notification.
      selector:
        device:
          integration: mobile_app

    notification_title:
      name: Notification Title
      description: Title shown in the notification (emojis welcome).
      default: "🌱 Plant needs water"
      selector:
        text:

    notification_message:
      name: Notification Message
      description: >
        Body of the notification. Supports Jinja templates — the placeholders
        {{ sensor_name }} and {{ moisture }} are replaced with the sensor's
        friendly name and current value.
      default: "💧 {{ sensor_name }} is at {{ moisture }}% — time to water it!"
      selector:
        text:
          multiline: true
```

**Step 2: Recharger les blueprints dans HA et vérifier**

Dans HA: *Settings → Automations & Scenes → Blueprints → ⋮ menu → Reload blueprints* (ou *Developer Tools → YAML → Reload Blueprints*).

Vérifier qu'il apparaît dans la liste sous le nom **"Plant Soil Moisture Low Alert"** et qu'aucune erreur YAML n'est levée dans les logs (*Settings → System → Logs*).

**Step 3: Commit**

```bash
git add blueprints/automation/ericmatte/soil_moisture_low_alert.yaml
git commit -m "feat(blueprint): scaffold soil moisture low alert blueprint with inputs"
```

---

## Task 2: Ajouter le trigger `numeric_state`

**Files:**
- Modify: `blueprints/automation/ericmatte/soil_moisture_low_alert.yaml` (ajouter `variables:` et `trigger:` après le bloc `blueprint:`)

**Step 1: Ajouter `variables:` et `trigger:` à la fin du fichier**

Ajouter à la suite du bloc `blueprint:` (au niveau racine, PAS dans `blueprint.input`):

```yaml
variables:
  threshold_value: !input threshold

trigger:
  - platform: numeric_state
    entity_id: !input moisture_sensor
    below: !input threshold
```

**Step 2: Recharger et vérifier**

Recharger blueprints + automations dans HA. À ce stade, créer une **automation de test** depuis l'UI:

1. *Settings → Automations & Scenes → Create Automation → Use Blueprint → Plant Soil Moisture Low Alert*
2. Choisir n'importe quel sensor numérique existant comme `moisture_sensor` (ex: `sensor.outside_humidity` pour tester).
3. Mettre un threshold facile à franchir (ex: 99 si le sensor lit ~70).
4. Choisir un device mobile.
5. Sauvegarder.

Vérifier dans *Traces* que le trigger est armé. Pas besoin de notification fonctionnelle encore — on n'a pas d'`action:`.

**Step 3: Commit**

```bash
git add blueprints/automation/ericmatte/soil_moisture_low_alert.yaml
git commit -m "feat(blueprint): add numeric_state trigger on moisture threshold"
```

---

## Task 3: Ajouter l'action de notification

**Files:**
- Modify: `blueprints/automation/ericmatte/soil_moisture_low_alert.yaml` (ajouter `action:` et `mode:`)

**Step 1: Ajouter `action:` et `mode:` à la fin du fichier**

Ajouter à la suite du bloc `trigger:`:

```yaml
action:
  - variables:
      sensor_entity: "{{ trigger.entity_id }}"
      sensor_name: "{{ state_attr(sensor_entity, 'friendly_name') or sensor_entity }}"
      moisture: "{{ states(sensor_entity) }}"
  - domain: mobile_app
    type: notify
    device_id: !input notify_device
    title: !input notification_title
    message: !input notification_message

mode: single
```

> **Note Jinja:** les inputs `notification_title` et `notification_message` sont passés directement à l'action `mobile_app.notify`. HA évalue automatiquement les templates Jinja dans `title` et `message` au moment de l'envoi, donc les placeholders `{{ sensor_name }}` et `{{ moisture }}` (définis dans le bloc `variables` juste au-dessus) seront résolus correctement.

**Step 2: Validation manuelle — déclencher artificiellement**

1. Recharger automations.
2. Dans *Developer Tools → States*, sélectionner le `moisture_sensor` choisi en Task 2 et forcer sa valeur sous le seuil:
   - State: `25` (si threshold = 30)
   - Cliquer "Set State".
3. Vérifier dans *Settings → Automations & Scenes*, sur l'automation de test, ouvrir les *Traces* et confirmer que le trigger a feu et que l'action `mobile_app.notify` a été appelée.
4. **Vérifier le téléphone** : la notification doit apparaître avec le titre et le message (les placeholders doivent être substitués).

**Step 3: Validation manuelle — vérifier le ré-armement**

1. Forcer la valeur du sensor au-dessus du seuil (`State: 70` puis Set State).
2. Re-forcer en-dessous (`State: 25`).
3. Une **nouvelle** notification doit arriver — preuve que le trigger se ré-arme correctement après être repassé au-dessus.

**Step 4: Commit**

```bash
git add blueprints/automation/ericmatte/soil_moisture_low_alert.yaml
git commit -m "feat(blueprint): notify mobile device with templated title/message"
```

---

## Task 4: Documentation in-blueprint + nettoyage final

**Files:**
- Modify: `blueprints/automation/ericmatte/soil_moisture_low_alert.yaml` (description du blueprint)

**Step 1: Enrichir la description**

Remplacer le bloc `description:` du blueprint par:

```yaml
  description: >
    Sends a phone notification when a plant soil moisture sensor drops below
    a configured percentage.

    Inputs:
      - Plant soil moisture sensor (any % sensor)
      - Threshold % (notification fires when reading goes BELOW this)
      - Phone device to notify (any mobile_app device)
      - Notification title (emojis welcome)
      - Notification message (supports Jinja: {{ sensor_name }}, {{ moisture }})

    Re-arms automatically once the sensor goes back above the threshold,
    so you won't get spammed if the value oscillates around the threshold
    (Home Assistant's numeric_state trigger handles this for us).
```

**Step 2: Supprimer l'automation de test (optionnel)**

Si tu veux retirer l'automation de test créée en Task 2, le faire dans l'UI: *Settings → Automations & Scenes*, ouvrir l'automation de test, *⋮ → Delete*.

> **Note:** Pas de commit pour cette étape — c'est juste un nettoyage UI qui ne touche pas au repo.

**Step 3: Commit final**

```bash
git add blueprints/automation/ericmatte/soil_moisture_low_alert.yaml
git commit -m "docs(blueprint): expand soil-moisture-low-alert description"
```

---

## Task 5: Test end-to-end en conditions réelles

**Files:** aucun (validation manuelle).

**Step 1: Identifier un vrai capteur de plante**

Si tu as déjà un capteur d'humidité de sol (Xiaomi Mi Flora, ESPHome, Zigbee, etc.), récupérer son `entity_id` (ex: `sensor.monstera_moisture`). Sinon, garder le sensor de test de la Task 2.

**Step 2: Créer l'automation finale**

Dans HA: *Settings → Automations & Scenes → Create Automation → Use Blueprint → Plant Soil Moisture Low Alert*.

Remplir avec les vraies valeurs:
- `moisture_sensor`: ton capteur réel
- `threshold`: ex: 30
- `notify_device`: ton téléphone
- `notification_title`: par défaut ou personnalisé (avec emoji)
- `notification_message`: par défaut ou personnalisé

Sauvegarder.

**Step 3: Scénarios de validation**

| Scénario | Setup | Attendu |
|---|---|---|
| Plante sèche | Forcer le sensor sous le seuil | 1 notification reçue avec nom + valeur |
| Plante encore sèche | Re-déclencher le trigger sans repasser au-dessus | PAS de double notification |
| Réarmement | Passer au-dessus du seuil, puis redescendre | Nouvelle notification |
| Emojis | Titre/message contiennent des emojis | Emojis affichés correctement sur le téléphone |

**Step 4: Si bugs, commits de fix séparés**

```bash
git add blueprints/automation/ericmatte/soil_moisture_low_alert.yaml
git commit -m "fix(blueprint): <description du fix>"
```

---

## Notes d'implémentation et pièges connus

1. **`mobile_app` action vs `notify.notify` service** — On utilise `domain: mobile_app, type: notify` plutôt que `service: notify.mobile_app_<name>` parce que le selector `device:` retourne un `device_id`, pas un nom de service. Cette API est stable depuis HA 2022.4.
2. **Placeholders Jinja dans les inputs `text:`** — Quand un input `selector: text:` est passé à `title:` ou `message:`, HA évalue le Jinja au moment de l'exécution dans le contexte des `variables:` du blueprint. C'est pour ça que `{{ sensor_name }}` fonctionne sans guillemets spéciaux.
3. **Trigger `numeric_state` "edge-triggered"** — HA ne déclenche `below:` qu'une seule fois par traversée descendante du seuil. C'est documenté: <https://www.home-assistant.io/docs/automation/trigger/#numerical-state-trigger>.
4. **Si le capteur publie en `unknown` ou `unavailable`** — `numeric_state` ignore ces états (pas de trigger). C'est le comportement souhaité, donc aucune garde supplémentaire nécessaire.
5. **iOS vs Android notifications** — Le `domain: mobile_app, type: notify` est cross-platform. Les emojis Unicode passent sur les deux. Pas besoin de différencier.
6. **Réutilisation du blueprint pour plusieurs plantes** — L'utilisateur créera UNE automation par plante depuis l'UI, en réutilisant le même blueprint. Le `mode: single` est par automation, pas global — donc deux plantes peuvent notifier en parallèle sans problème.
