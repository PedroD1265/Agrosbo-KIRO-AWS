# docs/agents/ — Operational Governance Documentation

## Purpose

This directory contains canonical operational documentation for multi-agent
collaboration on AGROSBO. It complements — but does not duplicate — the product
contract, ADRs, Steering, or Spec 16.

## Canonical sources (do not duplicate here)

| Subject | Location |
| --- | --- |
| Product scope | [`../product/product-scope-v2.md`](../product/product-scope-v2.md) |
| Architecture decisions | [`../adr/`](../adr/) |
| Spec 16 (formal requirements) | [`../../.kiro/specs/multi-agent-workflow/`](../../.kiro/specs/multi-agent-workflow/) |
| Phase 2 Runbook | [`../roadmap/phase-2-execution-runbook.md`](../roadmap/phase-2-execution-runbook.md) |
| Root governance | [`../../AGENTS.md`](../../AGENTS.md) |
| Steering rules | [`../../.kiro/steering/`](../../.kiro/steering/) |

## Documents in this directory

| Document | Purpose | When to consult |
| --- | --- | --- |
| [roles-and-responsibilities.md](./roles-and-responsibilities.md) | Who does what, capabilities and limits per tool | Onboarding a new tool; clarifying authority |
| [command-policy.md](./command-policy.md) | Full command classification matrix | Before running an unfamiliar command |
| [handoff-template.md](./handoff-template.md) | Structured template for session handoffs | End of every session or task block |

## Relationship with AGENTS.md

- `AGENTS.md` (root) provides concise operational rules for all tools.
- Local `AGENTS.md` files add area-specific constraints.
- This directory provides **extended explanation and templates** referenced from
  AGENTS.md. It is not a competing source of authority.

## Rules

- Do not duplicate the product contract, ADRs, or Steering content here.
- Keep documents focused on operational procedure, not product definition.
- Use relative links to canonical sources.
