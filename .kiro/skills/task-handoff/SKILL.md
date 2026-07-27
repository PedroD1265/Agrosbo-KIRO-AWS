---
name: task-handoff
description: Produces a structured handoff report at the end of a checkpoint, session pause, or ownership transfer. Activate when finalizing work or transferring context.
---

# Task Handoff

Produce a complete structured handoff using the standard template.

## Procedure

1. Use the template at [`docs/agents/handoff-template.md`](../../docs/agents/handoff-template.md).
2. Fill in all sections:
   - Agent/tool, date, workspace, branch, HEAD.
   - Objective of the completed work.
   - Canonical sources read.
   - Active allowlist.
   - Files actually created or modified.
   - Notable commands executed.
   - Quality gate results.
   - Decisions applied during the session.
   - Warnings or risks identified.
   - Contradictions detected (or "none").
   - Current `git status --short` output.
   - Next checkpoint or action.
3. Confirm no unauthorized actions:
   - No commit without authorization.
   - No push without authorization.
   - No merge without authorization.
   - No deploy.
4. End with **STOP REQUIRED** if human approval is needed for the next step.

## Rules

- The handoff must be complete — omitting sections is not acceptable.
- If the session was interrupted, mark status as "partial" and explain.
- Do not fabricate gate results — run them or mark as "not executed".
