---
name: ha-create-blueprint
description: 📘 Create or update a Home Assistant automation blueprint.
---

# ha-create-blueprint

## Overview

Create OR update a Home Assistant **automation** blueprint under `blueprints/automation/ericmatte/`. The user gives an idea (or points at an existing blueprint to change). You detect the mode, clarify inputs and edge cases, summarize the design, dispatch the **Plan** subagent, execute the plan, and make ONE clean commit.

## House Conventions (hard rules)

- **Location:** `blueprints/automation/ericmatte/<snake_case_name>.yaml`
- **`domain: automation`** — this skill is for automation blueprints only.
- **Inputs > hardcoded IDs.** Anything that could vary (entity, device, area, threshold, message text, notification target, duration) becomes a blueprint input. Never hardcode `entity_id`s in `trigger` / `action`.
- **Blueprint `name:` starts with a relevant emoji** (e.g. `🌱 Alerte plante assoiffée`). One emoji that captures the blueprint's purpose.
- **Input `name:` starts with a relevant emoji** (e.g. `🌱 Capteur d'humidité du sol`).
- **Blueprint `description:` describes the *behavior* of the blueprint** — what it does end-to-end, in 1–3 sentences. **Do not repeat what individual inputs do** (each input has its own `description:` for that). Focus on the trigger → condition → action flow at a high level.
- **All HA-user-facing text in French:** `blueprint.name`, `blueprint.description`, every input's `name` / `description`, and any notification `title` / `message` in actions. YAML keys, service names, Jinja code, and entity domains stay in English.
- **Mode:** default to `mode: single`. If you deviate, justify it in the summary.
- **Readable YAML:** logical grouping, blank lines between sections, `#` comments only when the *why* isn't obvious from the *what*. Use block scalars (`>` for descriptions, `>-` / `|` for messages) for multi-line text.

## Procedure

### 1. Detect mode — new vs update

Check the user's request for any reference to an existing blueprint:
- A filename or path (e.g. `humidity_high_alert.yaml`, `blueprints/automation/ericmatte/...`)
- A blueprint `name:` already in the folder
- Phrases like *"update"*, *"fix"*, *"change"*, *"modifie"*, *"ajoute à"*, *"dans le blueprint X"*

If you find one → **Update mode** (`Read` the existing file first, work from there).
Otherwise → **New mode** (create from scratch).

When in doubt, ask: "Tu veux que je crée un nouveau blueprint ou que je modifie `<closest match>`?"

### 2. Clarify inputs and edge cases (only what's missing)

List the variable concepts in the user's idea (entities, thresholds, devices, areas, messages, durations…). Promote each to an input.

Then run through this **edge-case checklist** and ask only about the ones that aren't already settled:

- **Cardinality** — single entity or multiple? (`selector: entity: multiple: true`?)
- **Trigger direction** — `above` / `below` / `to: 'on'` / `to: 'off'` / state change?
- **Cooldown / debounce** — does the user need a min interval between firings to avoid spam? If yes, expose as an input (duration selector).
- **Conditions** — only when home, only during certain hours, only if another entity is in a given state?
- **Mode** — `single` enough? Or does it need `restart` / `queued` / `parallel`?
- **Notification channel(s)** — push to a specific phone, `notify.notify`, persistent notification, TTS? Multiple targets?
- **Defaults** — sensible default for every threshold/duration/text input.
- **Re-arming** — does the alert need to re-trigger only after the value returns to "normal"?
- **Update-mode extras** — what specifically is changing (new input, new trigger, bugfix, convention update)? What stays the same?

**Ask the user about anything you can't reasonably default.** Prefer `AskUserQuestion` with concrete options. Do not invent inputs the user didn't imply.

### 3. Give a written summary (bullets, not paragraphs)

- File path (and **New** or **Update** label)
- Triggers, in plain French
- Conditions, if any
- Actions
- Inputs — for each: emoji + French label, selector type, default (if any)
- The chosen `mode:` (and why if not `single`)
- For Update mode: a **diff-style summary** — what changes, what stays untouched

### 4. Dispatch the Plan subagent

- Tool: `Agent` with `subagent_type: "Plan"`.
- Prompt must contain: the summary above, the target file path, the house conventions from this skill, and (for Update mode) the current file contents.
- Ask for a concrete YAML design (structure, selectors, defaults, Jinja templates). For Update mode, ask for the **minimal diff** plus the rationale.
- The Plan subagent **designs only** — it must not write the file.

### 5. Execute the plan

- **New mode:** `Write` the file at the path from step 3.
- **Update mode:** `Edit` the existing file (targeted edits, not full rewrites unless the change is sweeping).
- Skim one or two existing files in `blueprints/automation/ericmatte/` for stylistic consistency.
- Before saving, scan against every house rule.

### 6. Make ONE commit

- Stage only the affected blueprint file: `git add blueprints/automation/ericmatte/<file>.yaml`
- Commit message (HEREDOC, **no `Co-Authored-By`**, no watermark):
  - **New blueprint** → `feat(blueprint): <concise description>`
  - **Bugfix in existing** → `fix(blueprint): <concise description>`
  - **Refactor / convention update** → `refactor(blueprint): <concise description>`
  - **New input or trigger added** → `feat(blueprint): <concise description>`
  - Title ≤72 chars. Body optional, only if non-obvious.
- **Do not push.** Pushing is a separate step (see `/ha-squash-and-commit-to-main`).

## Style Reference

Top-level blueprint header — emoji-prefixed name, description focused on the *behavior*:

```yaml
blueprint:
  name: 🌱 Alerte plante assoiffée
  description: >
    Surveille un capteur d'humidité du sol et envoie une notification push
    quand la valeur descend sous le seuil choisi. Un délai de re-déclenchement
    évite le spam tant que la plante n'est pas arrosée.
  domain: automation
```

Inputs and notification text should look like this:

```yaml
input:
  moisture_sensor:
    name: 🌱 Capteur d'humidité du sol
    description: Le capteur qui mesure l'humidité de la plante (en %).
    selector:
      entity:
        domain: sensor

  threshold:
    name: 💧 Seuil d'humidité (%)
    description: Déclenche la notification quand le capteur descend SOUS ce pourcentage.
    default: 30
    selector:
      number:
        min: 0
        max: 100
        step: 1
        unit_of_measurement: "%"
        mode: slider

  notify_target:
    name: 📱 Appareil à notifier
    description: L'appareil mobile qui reçoit la notification push.
    selector:
      device:
        integration: mobile_app
```

Notification action:

```yaml
action:
  - domain: mobile_app
    type: notify
    device_id: !input notify_target
    title: "🌱 Plante assoiffée"
    message: >-
      💧 {{ state_attr(trigger.entity_id, 'friendly_name') }}
      est à {{ states(trigger.entity_id) }}% — il faut l'arroser !
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Created a new file when the user meant to update an existing one | Always run the Detect-mode step. When in doubt, ask. |
| Hardcoded an `entity_id` in trigger/action | Promote it to an input with the correct selector. |
| Blueprint `name` without emoji prefix | Add one emoji that captures the blueprint's purpose. |
| Blueprint `description` repeats what inputs do | Describe the blueprint's overall behavior (trigger → action flow). Let each input's own `description` cover the input. |
| Input `name` without emoji prefix | Add a relevant emoji. |
| English `name` / `description` / notification text | Translate to French. Keys and Jinja stay English. |
| Skipped the edge-case checklist | Run it for every blueprint — cooldown / mode / cardinality are easy to miss. |
| Skipped the user-facing summary | Always summarize before dispatching Plan. |
| Plan subagent wrote the file itself | Plan designs only. The main thread writes the file. |
| Update-mode: rewrote the whole file instead of editing | Use `Edit` for targeted changes; only rewrite if the change is sweeping. |
| Wrong commit verb (`feat` for a bugfix) | Match the verb to the change — `feat` / `fix` / `refactor`. |
| Committed with `Co-Authored-By` trailer | Strip it. House rule — no watermark. |
| Multiple commits for one blueprint change | One commit per blueprint change. |
| Asked clarifying questions when intent was already clear | Only ask when an input or edge case is genuinely missing or ambiguous. |
