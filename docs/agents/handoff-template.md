# Handoff Template

> Use this template at the end of every session or task block.
> See [AGENTS.md §9](../../AGENTS.md) and
> [Spec 16 Design §7](../../.kiro/specs/multi-agent-workflow/design.md).

---

## Handoff Report — [Checkpoint ID]

- **Agent/Tool**: [name]
- **Date**: YYYY-MM-DD
- **Workspace**: [path]
- **Branch**: [branch name]
- **HEAD**: [short hash]
- **Objective**: [what was being accomplished]

### Sources read

- [list of canonical documents consulted]

### Allowlist

- [files authorized for create/modify]

### Files modified

- [list of files actually created or changed]

### Commands executed

- [notable commands beyond standard reads]

### Quality gates

| Gate | Result |
| --- | --- |
| format | PASS / FAIL |
| encoding | PASS / FAIL |
| lint | PASS / FAIL |
| typecheck | PASS / FAIL |
| test | PASS / FAIL |
| build | PASS / FAIL |
| diff --check | PASS / FAIL |

### Decisions applied

- [list of decisions made during this session]

### Warnings

- [anything unusual or requiring attention]

### Contradictions detected

- [list, or "none"]

### Git status

```text
[output of git status --short]
```

### Confirmation of unauthorized actions

- [ ] No commit without authorization
- [ ] No push without authorization
- [ ] No merge without authorization
- [ ] No deploy

### Next checkpoint

[identifier of the next task or checkpoint, or "awaiting human decision"]

### Condition

**STOP REQUIRED** — [reason, or "Continue to next checkpoint"]
