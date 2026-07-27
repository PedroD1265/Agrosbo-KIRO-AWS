# AGROSBO — Claude Adapter

> This file is a **brief adapter**, not a source of truth.
> All canonical governance rules live in [`AGENTS.md`](AGENTS.md).
> Local rules are in the nearest `AGENTS.md` to the file being edited.

## Mandatory protocol

1. **Preflight**: verify branch, HEAD, and tree status before any write.
2. **Allowlist**: only create or modify files listed in the active task.
3. **Single writer**: one writing session per working tree at all times.
4. **Handoff**: produce a structured report at end of session
   (see [`docs/agents/handoff-template.md`](docs/agents/handoff-template.md)).
5. **STOP REQUIRED**: halt immediately on gate failure, contradiction,
   unexpected state, or need for human decision.
6. **No autonomous Git**: commit, push, PR, merge, and deploy require human
   authorization.

## References

- [AGENTS.md](AGENTS.md) — root governance
- [Spec 16](.kiro/specs/multi-agent-workflow/) — formal requirements and design
- [Phase 2 Runbook](docs/roadmap/phase-2-execution-runbook.md)
- [docs/agents/](docs/agents/) — roles, command policy, templates
