# docs/ — Local Agent Rules

> Inherits all rules from [`../AGENTS.md`](../AGENTS.md). This file adds only
> area-specific constraints for the `docs/` directory.

## Document hierarchy

- `product/product-scope-v2.md` is the canonical product contract.
- `adr/` contains architectural decisions — preserve historical content even
  when superseded.
- `architecture/` describes technical design.
- `roadmap/` contains execution runbooks.
- `agents/` contains operational governance documentation.

## State honesty

- Clearly differentiate: **CURRENT**, **PLANNED**, **COMPLETED**, **SUPERSEDED**.
- Never declare as implemented something that is only documented or planned.
- Use `capability-status-matrix.md` as the reference for CURRENT state.

## ADRs

- ADRs are append-only records. Do not delete or rewrite historical decisions.
- Mark superseded ADRs with `Superseded by ADR NNN` and a link.
- New decisions require a new ADR number.

## Formatting and encoding

- All files must be UTF-8 without BOM.
- Use relative links between documents.
- Run `npm run check:encoding` after modifications.
- Run `npx prettier --check` on modified Markdown files.

## Canonical changes

Modifications to canonical sources (`product-scope-v2.md`, ADRs, `spec-map.md`)
require cross-repository review to ensure downstream documents remain consistent.
