---
name: repo-preflight
description: Verifies workspace, branch, HEAD, working tree state, and baseline before starting any task or checkpoint. Activate at the beginning of sessions, checkpoints, branch switches, or worktree operations.
---

# Repo Preflight

Verify the repository state is correct and safe before proceeding with writes.

## Procedure

1. Confirm workspace path matches expected working tree.
2. Verify Git root (`git rev-parse --show-toplevel`).
3. Check current branch (`git branch --show-current`).
4. Verify HEAD matches the expected baseline.
5. Check working tree is clean (`git status --short`).
6. Review recent history (`git log -5 --oneline --decorate`).
7. Check remote (`git remote -v`).
8. List worktrees (`git worktree list`) — confirm audit worktree is separate.
9. Check for whitespace errors (`git diff --check`).
10. Verify the expected baseline commit hash.

## Output

Produce one of:
- **PASS** — all checks confirmed, safe to proceed.
- **STOP REQUIRED** — with explanation of which check failed.

## Rules

- This skill does **not** modify any files.
- If branch is unexpected → STOP REQUIRED.
- If HEAD does not match baseline → STOP REQUIRED.
- If unrecognized files appear in working tree → STOP REQUIRED.
- If whitespace errors exist → STOP REQUIRED (unless correctable within allowlist).
