# api/ — Local Agent Rules

> Inherits all rules from [`../AGENTS.md`](../AGENTS.md). This file adds only
> area-specific constraints for the `api/` package.

## Architecture

- Preserve the **modular monolith** pattern (Express 5, single `routes.ts`).
- Use **Zod** for request validation; contracts live in `shared/`.
- Respect authentication (cookie HMAC / Cognito JWT provider), RBAC (5 roles),
  and HTTP idempotency (`idempotency.ts`).
- Do not start listeners or side-effects at import time — the Lambda adapter
  requires a cold-start-safe module graph.

## Data layer

- Maintain separation: `IStorage` (interface) / `DbStorage` (Drizzle) /
  `MemStorage` (dev-only subset).
- Schema changes or migrations require an **explicitly authorized DB task** with
  its own allowlist including `shared/schema.ts` and `api/migrations/`.

## Sensitive areas

Files that require extra caution (cross-impact, security, or startup):
`auth.ts`, `env.ts`, `routes.ts`, `db.ts`, `handlers/index.ts`.

## Quality gates (API-specific)

```text
npm run typecheck          # includes api/tsconfig.json
npm run test               # unit tests covering api
npm run test:integration   # PostgreSQL integration tests
npm run build              # tsc -b api/tsconfig.json
```

## Cross-impact

Changes in `api/` may affect `shared/` (contracts) and `web/` (API consumers).
Evaluate transversal impact before closing a task.
