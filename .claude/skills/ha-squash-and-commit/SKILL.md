---
name: ha-squash-and-commit
description: 🧹 Collapse the current branch (committed + uncommitted) into one clean local commit.
---

# ha-squash-and-commit

## Overview

Collapse everything on the current branch (committed + uncommitted) into **one clean commit**, in place. Local-only: no push, no rebase, no interaction with any other branch.

## Hard Rules

- **NEVER** push. This skill is local-only.
- **NEVER** add a `Co-Authored-By` trailer. No watermark in the commit message.
- **NEVER** use `--no-verify` or skip hooks. If a hook fails, fix the underlying issue and re-commit.
- **ALWAYS** sweep up everything in the worktree (modified + untracked) without asking. Calling this skill means "collapse the whole branch" — `.gitignore` is the user's filter, not a prompt. The only exclusion is `docs/plans/**` (see next rule).
- **NEVER** include `docs/plans/**` files in the squashed commit. These are local planning artefacts. Exclude them by default — only include them if the user *explicitly* asks for it in the current conversation.
- If there's nothing to squash (no uncommitted changes AND only one commit since divergence), stop and report — there's nothing to do.

## Procedure

1. **Verify state**
   - `git rev-parse --abbrev-ref HEAD` — record the current branch name.
   - `git status --short` — quick snapshot of what's about to be swept up (info only, no prompt).
   - Determine the squash base: `BASE=$(git merge-base HEAD origin/HEAD)` — the divergence point from the remote's default branch. If `origin/HEAD` is not set, ask the user for a base ref before continuing.
   - `git diff "$BASE"...HEAD --stat` — sanity check there's actually work to squash.

2. **Capture uncommitted changes** (only if `git status` is dirty)
   - No prompt. Everything modified + untracked goes in. `.gitignore` is the user's exclusion mechanism — trust it.
   - `git add -A`
   - `git commit -m "wip"` — this commit will be squashed away in step 3. (If something goes wrong, this commit is recoverable via `git reflog` — see Recovery section.)

3. **Squash into one commit**
   - `git reset --soft "$BASE"` — all branch work is now staged as a single change relative to the squash base.
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

4. **Summarize for the user**
   - Show: commit title + body, and `git show --stat HEAD`.
   - State: `Branche écrasée en un seul commit local. Rien n'a été poussé.`

## Common Mistakes

| Mistake | Fix |
|---|---|
| Added `Co-Authored-By` trailer | Amend the message and strip it. |
| Pushed after committing | Don't. This skill is local-only; pushing is a separate manual step. |
| Asked the user whether to include untracked files | Don't. The skill sweeps everything; `.gitignore` is the filter. The only auto-exclusion is `docs/plans/**`. |
| Committed with `--no-verify` because a hook failed | Fix the underlying issue, then re-commit normally. |
| Included `docs/plans/**` files in the commit | Always unstage them in step 3. They're local planning artefacts; only commit them when the user explicitly says so this session. |
| Hard-coded a branch name (e.g. `origin/main`) as the squash base | Use `origin/HEAD` so the skill stays branch-agnostic. |

## Recovery

No `git stash` is used — the temporary `wip` commit from step 2 *is* the safety net. If something goes wrong between steps 2 and 3 (failed reset, etc.), nothing is lost:

- `git reflog` — shows every recent HEAD position, including the `wip` commit.
- `git reset --hard <wip-sha>` — restores the worktree to exactly the moment after step 2 (modifications + untracked-files-that-were-staged all back in the index/working tree).
- `git cherry-pick <wip-sha>` — pulls the changes back onto a different branch if needed.

Tell the user about this if a step fails — don't try to silently recover.
