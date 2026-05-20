---
name: ha-plan-updates
description: 🗺 Audit breaking changes across intermediate HA versions and produce an ordered update plan.
---

# ha-plan-updates

## Overview

Given a list of Home Assistant components (Core, OS, Supervisor, add-ons, HACS / custom components) with their current and target versions, walk **every** intermediate release for breaking changes, then produce a dependency-aware update plan. Ships a helper script `list-pending-updates.sh` that pulls the inventory directly from a running HA instance.

## Hard Rules

- **Walk EVERY intermediate version** between current and target. Breaking changes can land in any minor release.
- **NEVER skip a component** the user listed. Report it even when no breaking changes are found ("no breaking changes across N releases").
- **Cite sources** — every breaking-change line links to the release notes (HA blog post, GitHub release, etc.).
- **Plan only.** This skill never edits config, runs upgrades, or touches the HA instance. The user executes the plan manually.
- **Backup is step 1.** Every plan starts with a snapshot. No exceptions.

## Procedure

### 1. Collect the inventory

Two paths:

- **Preferred** — Ask the user to run the sibling helper `list-pending-updates.sh` on their HA host (SSH & Web Terminal add-on), and paste the output back. It covers Core / OS / Supervisor / Add-ons via the `ha` CLI, and `update.*` entities (HACS + integrations) via the REST API when a token is provided.
- **Fallback** — Ask the user to list each item as `name: current → target`.

Parse out for each item: `name` (e.g. `ha-core`, `ha-os`, `ha-supervisor`, `addon:<slug>`, `hacs:<repo>`), `current_version`, `target_version`, and optional `source_url`. If anything is ambiguous, ask before fetching.

### 2. Resolve sources

| Type | Source |
|---|---|
| HA Core | https://www.home-assistant.io/blog/categories/core/ (one post per minor release) |
| HA OS | https://github.com/home-assistant/operating-system/releases |
| HA Supervisor | https://github.com/home-assistant/supervisor/releases |
| Official add-on | the add-on's GitHub repo `/releases` (often under `home-assistant/addons`) |
| HACS / custom | the component's GitHub repo `/releases` — ask the user for the repo if unknown |

### 3. Enumerate intermediate versions

For each component, list every released version strictly between `current_version` (exclusive) and `target_version` (inclusive). For HA Core, walk each monthly release (`YYYY.M`); condense patches within a minor into "all patches of YYYY.M" **unless** one of them introduced a breaking change — then call it out by patch number.

### 4. Fetch and scan release notes

Use `WebFetch` for each release. Extract:

- **Breaking changes** / Backward-incompatible changes
- **Deprecations** and required user action
- **Integration-specific impacts**

Batch independent fetches in parallel. For long lists, dispatch one `general-purpose` agent per component to keep the main context lean.

### 5. Cross-reference the user's setup

If the user shared their `configuration.yaml`, integration list, or blueprint inventory, flag which breaking changes actually apply to them. Otherwise mark each as "**potential impact** — verify integration in use".

### 6. Produce the plan

Output, in this exact order:

1. **Summary table** — every component with `current → target`, releases checked, breaking-change count.
2. **Breaking changes by component** — grouped, each line: `**<version>** — <impact>. *Remediation:* …  ([source](…))`.
3. **Recommended order** — default sequence, justified from the dependencies actually found:
   1. **Full backup / snapshot.**
   2. HA OS (if it gates the Core target).
   3. HA Supervisor.
   4. HA Core.
   5. Official add-ons.
   6. HACS / custom components (in dependency order — Core API consumers last).
4. **Pre-flight checks** — config edits or actions required BEFORE each step.
5. **Rollback notes** — how to revert each layer if something breaks.

### 7. Do NOT touch the instance

The skill produces the plan in chat. The user runs the updates and reports back if needed.

## Style Reference

Output skeleton:

```markdown
## HA update plan — 2026-05-20

### Summary
| Component | Current | Target | Releases checked | Breaking changes |
|---|---|---|---|---|
| ha-core | 2025.2.4 | 2025.5.3 | 2025.3, 2025.4, 2025.5 | 7 |
| ha-os   | 14.0     | 15.0     | 14.1, 14.2, 15.0       | 2 |

### Breaking changes
#### ha-core
- **2025.3** — `mqtt`: discovery topic renamed. *Remediation:* update broker config. ([blog](…))
- **2025.4** — …

### Recommended order
1. Snapshot backup.
2. ha-os 14.0 → 15.0 (gates ha-core 2025.5+).
3. ha-core 2025.2.4 → 2025.5.3.
4. HACS components.
```

Helper-script invocation:

```bash
# On the HA host, via the SSH & Web Terminal add-on:
HA_TOKEN=<long-lived-access-token> ./list-pending-updates.sh
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Only checked the target version's release notes | Walk EVERY intermediate minor release. |
| Skipped a component because "probably no impact" | Always report it — at minimum "no breaking changes across N releases". |
| Listed breaking changes without source links | Include a per-version link to the release notes. |
| Suggested an order without justifying it | Tie the order to dependencies found in the release notes. |
| Started editing config files or running upgrades | Plan only. The user runs the updates. |
| Forgot HA OS even when Core was the focus | If listed, include it — OS often gates Core compatibility. |
| No backup step | Step 1 is always a snapshot. Non-negotiable. |
