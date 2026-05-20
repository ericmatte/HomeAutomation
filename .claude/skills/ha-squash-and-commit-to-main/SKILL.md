---
name: ha-squash-and-commit-to-main
description: 🚀 Ship the current worktree as one clean commit on origin/main.
---

# ha-squash-and-commit-to-main

## Overview

Collapse everything in the current worktree (committed + uncommitted) into **one clean commit** rebased on the latest `origin/main`, confirm with the user, then push to `origin/main`. After a successful push the worktree's work is done.

## Hard Rules

- **NEVER** force push. Plain `git push origin HEAD:main` only.
- **NEVER** add a `Co-Authored-By` trailer. No watermark in the commit message.
- **NEVER** use `--no-verify` or skip hooks.
- **NEVER** push without an explicit user confirmation (`oui` / `yes`).
- **ALWAYS** sweep up everything in the worktree (modified + untracked) without asking. Calling this skill means "ship the whole branch" — `.gitignore` is the user's filter, not a prompt. The only exclusion is `docs/plans/**` (see next rule).
- **NEVER** ship `docs/plans/**` files on `main`. These are local planning artefacts. Exclude them from the squashed commit by default — only include them if the user *explicitly* asks for it in the current conversation.
- If the current branch IS `main`, stop and report — this skill is worktree-only.
- If a rebase conflict appears, stop and ask the user. Do not invent resolutions.

## Procedure

1. **Verify state**
   - `git rev-parse --abbrev-ref HEAD` — must not be `main`.
   - `git status --short` — quick snapshot of what's about to be swept up (info only, no prompt).
   - `git diff origin/main...HEAD --stat` (after step 2's fetch) — sanity check there's actually work to ship.

2. **Capture uncommitted changes** (only if `git status` is dirty)
   - No prompt. Everything modified + untracked goes in. `.gitignore` is the user's exclusion mechanism — trust it.
   - `git add -A`
   - `git commit -m "wip"` — this commit will be squashed away in step 4. (If something goes wrong between here and step 4, this commit is recoverable via `git reflog` — see Recovery section.)

3. **Fetch + rebase on latest main**
   - `git fetch origin main`
   - `git rebase origin/main`
   - On conflict: stop, show the conflict, ask the user how to proceed.

4. **Squash into one commit**
   - `git reset --soft origin/main` — all our work is now staged as a single change.
   - **Strip `docs/plans/**` from the staged index** (default behaviour, no prompt needed):
     - `git diff --cached --name-only -- 'docs/plans/**'` — list any plan files about to be committed.
     - If the list is non-empty AND the user has not explicitly asked to include them this session:
       - `git restore --staged -- 'docs/plans/**'` — unstage them (files stay in the worktree, untouched).
       - Tell the user which files were excluded so they know.
   - Inspect: `git diff --cached --stat` and skim `git diff --cached` to understand the work.
   - Write a concise message:
     - **Title:** imperative, ≤72 chars (e.g. `feat: add plant moisture low alert blueprint`)
     - **Body (optional):** 1–3 bullets focused on *why*, only if non-obvious.
     - **No `Co-Authored-By` line. No watermark.**
   - Commit via HEREDOC so formatting stays clean:
     ```bash
     git commit -m "$(cat <<'EOF'
     <title>

     - <optional bullet>
     EOF
     )"
     ```

5. **Summarize for the user**
   - Show: commit title + body, and `git show --stat HEAD`.
   - Ask exactly: `Push ce commit sur origin/main? (oui/non)`
   - Wait for the answer. Anything other than an explicit yes → stop here.

6. **Push** (only after explicit yes)
   - `git push origin HEAD:main`
   - Verify: `git log -1 origin/main --oneline`.

7. **Announce completion**
   - State: `Travail du worktree complété — commit poussé sur main.`

## Common Mistakes

| Mistake | Fix |
|---|---|
| Added `Co-Authored-By` trailer | Amend the message and strip it before the confirmation step. |
| Used `git push --force` after rebase | Don't. Plain push is fast-forward because we rebased on `origin/main`. |
| Skipped confirmation step | Always print the summary and wait for explicit yes. |
| Asked the user whether to include untracked files | Don't. The skill ships everything; `.gitignore` is the filter. The only auto-exclusion is `docs/plans/**`. |
| Auto-resolved rebase conflicts | Stop and ask. Conflicts are user decisions. |
| Ran on `main` directly | Refuse — this skill is for worktree branches only. |
| Committed with `--no-verify` because a hook failed | Fix the underlying issue, then re-commit normally. |
| Shipped `docs/plans/**` to `main` | Always unstage them in step 4. They're local planning artefacts; only ship them when the user explicitly says so this session. |

## Recovery

No `git stash` is used — the temporary `wip` commit from step 2 *is* the safety net. If something goes wrong between steps 2 and 4 (failed rebase, accidental reset, etc.), nothing is lost:

- `git reflog` — shows every recent HEAD position, including the `wip` commit.
- `git reset --hard <wip-sha>` — restores the worktree to exactly the moment after step 2 (modifications + untracked-files-that-were-staged all back in the index/working tree).
- `git cherry-pick <wip-sha>` — pulls the changes back onto a different branch if needed.

Tell the user about this if a step fails — don't try to silently recover.
