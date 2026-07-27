# shared/ — Local Agent Rules

> Inherits all rules from [`../AGENTS.md`](../AGENTS.md). This file adds only
> area-specific constraints for the `shared/` package.

## Architecture

- Code here must be **isomorphic** — no Node-only or DOM-only APIs unless
  explicitly decided and documented.
- `schema.ts` defines Zod validators and Drizzle table definitions used by both
  `api/` and `web/`.
- `spatial.ts` and `cropCatalog.ts` are pure-logic modules shared across
  packages.

## High-impact nature

Any change in `shared/` has **transversal impact**:
- API routes (validation, DB columns).
- Web components (form fields, types).
- Migrations (DDL derived from schema).

Always require cross-package analysis before closing a task that touches
`shared/`.

## Schema changes

Modifications to `schema.ts` require:
- An explicitly authorized DB task.
- Corresponding migration in `api/migrations/`.
- Verification of downstream consumers (`api/`, `web/`).

## Quality gates

```text
npm run typecheck   # validates shared types across all packages
npm run build       # ensures no compile errors
npm run test        # unit tests depending on shared contracts
```
