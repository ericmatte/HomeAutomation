---
name: ha-create-skill
description: 🧰 Create or update a Home Assistant skill under .claude/skills/.
---

# ha-create-skill

## Overview

Create or update a Claude Code skill under `.claude/skills/<name>/SKILL.md`. Once committed, the skill is invokable as `/ha-<name>`. This skill enforces the repo's house conventions for every other `/ha-...` skill.

## House Conventions (hard rules)

- **Location:** `.claude/skills/<kebab-case-name>/SKILL.md` — one folder per skill.
- **Name prefix:** every skill name starts with `ha-`. Kebab-case, lowercase, letters/digits/hyphens only.
- **Frontmatter:** only `name` and `description`. Total ≤1024 chars.
- **Description format:** `<emoji> <imperative verb phrase>.` — describe what the skill **does**, not when to use it. One sentence, ≤~100 chars. **No `Use when ...` prefix.** **Never include a slash-command name** (e.g. `/ha-foo`, `/init`, `/...`) inside the description — the harness loader silently drops the description and falls back to the skill name. Describe the concept instead (e.g. "a Home Assistant skill", not "a /ha-... skill").
- **Body sections (in this order, skip what doesn't apply):**
  - `# <h1 matching the folder name>`
  - `## Overview` — 1–2 sentences on the core purpose
  - `## Hard Rules` / `## House Conventions` — bullets of non-negotiables
  - `## Procedure` — numbered steps
  - `## Style Reference` — code blocks for concrete examples (when useful)
  - `## Common Mistakes` — `| Mistake | Fix |` markdown table
- **Tone:** simple, efficient, scannable. Bullets and tables over paragraphs.
- **No Co-Authored-By trailer** anywhere — neither in this skill's commit nor in any commit instructions inside the skills you author.
- **No `pnpm` references** — this repo is Home Assistant YAML, not a JS project.

## Procedure

### 1. Detect mode — new vs update

Check the user's request:
- Mentions an existing skill by name / file / path / phrases like *"modifie"* / *"update"* / *"fix"* → **Update mode** (`Read` the file first).
- Otherwise → **New mode**.

When in doubt, ask: `Tu veux un nouveau skill ou modifier <closest match>?`

### 2. Clarify (only what's missing)

Settle these before writing:

- **Name** — must be `ha-<something>`, kebab-case.
- **Purpose in one verb phrase** — what does the skill *do*?
- **Emoji** — one that semantically matches the purpose (🚀 ship, 📘 blueprint, 🛠 build, 🧹 cleanup, 🔔 notify, …).
- **Hard rules** — anything the agent MUST or MUST NOT do?
- **Procedure** — the exact step-by-step flow.
- **Side effects** — does it touch git, push, edit files outside the skill folder?
- **Confirmation gates** — irreversible steps that need explicit user `oui` / `yes`?
- **Inputs the user must provide each invocation** — args, file paths, etc.

Ask only what can't be reasonably defaulted. Prefer `AskUserQuestion` with concrete options.

### 3. Written summary (bullets)

- **New** or **Update** + file path
- Proposed `name` and `description` (with emoji)
- Section outline of the body
- Any hard rules or confirmation gates being added

### 4. Write the file

- **New mode:** `Write` `.claude/skills/<name>/SKILL.md`.
- **Update mode:** `Edit` targeted sections (don't rewrite the whole file unless the change is sweeping).
- Re-scan the result against every house rule above before saving.

### 5. Make ONE commit

- Stage only the affected skill folder: `git add .claude/skills/<name>/`
- Commit message (HEREDOC, **no `Co-Authored-By`**):
  - **New skill** → `feat(skill): <concise description>`
  - **Bugfix** → `fix(skill): <concise description>`
  - **Refactor / cleanup** → `refactor(skill): <concise description>`
  - Title ≤72 chars. Body optional, only if non-obvious.
- **Do not push.** Squashing the branch is a separate step (see `/ha-squash-and-commit`).

## Style Reference

Frontmatter template:

```yaml
---
name: ha-<kebab-name>
description: <emoji> <Imperative verb phrase describing what the skill does>.
---
```

Examples of correct descriptions (from skills already in this repo):

- `🚀 Ship the current worktree as one clean commit on origin/main.`
- `📘 Create or update a Home Assistant automation blueprint.`
- `🧰 Create or update a Home Assistant skill under .claude/skills/.`

Body skeleton:

```markdown
# ha-<name>

## Overview

<1–2 sentences on what this skill does and why.>

## Hard Rules

- **NEVER** <forbidden action>.
- **<Other non-negotiable>**.

## Procedure

1. **<Step title>**
   - <action>
   - <action>

2. **<Next step>**
   - …

## Common Mistakes

| Mistake | Fix |
|---|---|
| <Typical failure mode> | <How to recover> |
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Description starts with `Use when ...` | Strip the prefix. Format: `<emoji> <verb phrase>.` — what the skill DOES. |
| Description is multiple sentences or > ~100 chars | Cut to one tight sentence. |
| Missing emoji in description | Add one that matches the purpose semantically. |
| Skill name without `ha-` prefix | Rename. Every skill in this repo is `ha-*`. |
| Skill name has uppercase or underscores | Kebab-case, lowercase only. |
| Frontmatter has fields other than `name` / `description` | Remove them. Only these two are supported. |
| `Co-Authored-By` trailer in any commit (or in commit examples in the skill body) | Strip it. Hard repo rule — no AI watermark. |
| Created a new file when the user meant to update an existing skill | Always run the Detect-mode step. Ask when ambiguous. |
| Update-mode: rewrote the whole file instead of editing | Use `Edit` for targeted changes; only rewrite if the change is sweeping. |
| Multiple commits for one skill change | One commit per skill change. |
| Pushed after committing | Don't push — pushing is a separate manual step. |
| Wrote a long workflow summary in the description | The description is *what*, the body is *how*. |
| Description references a slash-command name (`/ha-foo`, `/...`, `/init`) | Rephrase to the concept ("a Home Assistant skill"). The harness silently drops the description otherwise and the menu shows only the skill name. |
