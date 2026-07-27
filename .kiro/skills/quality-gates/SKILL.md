---
name: quality-gates
description: Runs the appropriate quality gate commands to validate changes before handoff, commit, or PR. Activate after modifications or before closing a task block.
---

# Quality Gates

Run validation commands appropriate to the scope of changes made.

## Procedure

1. Read `package.json` to confirm available scripts.
2. Determine which gates apply based on the task scope:
   - Documentation-only tasks: `npm run check:encoding`, `npx prettier --check`,
     `git diff --check`.
   - Code tasks: all gates below.
3. Execute applicable gates:
   - `npm run format` (prettier check mode)
   - `npm run check:encoding`
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - `git diff --check`
4. Record each command, exit code, and any failure output.

## Output

A table of gate results:

| Gate | Command | Result |
| --- | --- | --- |
| ... | ... | PASS / FAIL |

## Rules

- Never install dependencies to make a gate pass.
- Never use `format:fix` or `lint:fix` without explicit authorization.
- Never disable, skip, or suppress a rule to pass a gate.
- Never hide warnings — report them alongside passes.
- If a gate fails and cannot be fixed within the active allowlist →
  **STOP REQUIRED**.
- Select gates based on scope — not every documentation task needs full
  build/test cycles. Consult the active runbook for guidance.
