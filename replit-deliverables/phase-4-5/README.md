# AGROSBO — Phase 4–5 Fixture & Test-Case Pack

**Baseline SHA:** `156036a` (origin/main — Merge PR #18 spec-17-cloud-prep)  
**Branch:** `replit/spec-18-readiness-plan`  
**Generated:** 2026-07-27T22:33:08Z  
**Purpose:** Synthetic fixture/test-case pack for Specs 18–21 (readiness, Cognito auth, S3/offline, agent tools). All facts derived from direct `git show origin/main` reads — nothing invented.

---

## Contents

| File | Records | Description |
|------|---------|-------------|
| `source-baseline.json` | — | Verified source facts: routes, env vars, ADRs, provider status |
| `route-catalog.json` | 73 routes | Full API catalog with auth/role/idempotency flags |
| `rbac-matrix.json` | 5 roles × N ops | Role-based access matrix with gap analysis |
| `agent-read-conversations.es.json` | 48 cases | Agent read-only conversation fixtures (ES) |
| `agent-write-confirmation-scenarios.es.json` | 36 cases | Agent write+confirmation flows per ADR-015 |
| `idempotency-replay-cases.json` | 24 cases | Idempotency middleware behavior cases |
| `deployment-and-provider-failure-cases.json` | 24 cases | Cold start, auth provider, DB, and offline failure cases |
| `validate-pack.mjs` | — | Node.js validator (no npm installs required) |
| `validation-report.md` | — | Validator output |
| `manifest.json` | — | Pack manifest with checksums |

---

## Key Facts (Verified)

### Architecture
- All routes mounted at `/api` prefix (`app.use('/api', apiRouter)`)
- `AUTH_PUBLIC` paths bypass auth: `/health/live`, `/health/ready`, `/crops`, `/auth/login`, `/auth/me`, `/auth/logout`
- Two storage backends: in-memory (dev) and PostgreSQL via Drizzle ORM
- Idempotency: `X-Idempotency-Key` header → 24h TTL → in-memory Map OR PostgreSQL `idempotency_keys` table
- `@vendia/serverless-express` adapter for Lambda

### Implementation Status (P0 Baseline)
| Feature | Status |
|---------|--------|
| `local-session` auth | ✅ Functional |
| `cognito-jwt` auth | ❌ NOT_IMPLEMENTED — throws |
| S3 attachments | ❌ NOT_IMPLEMENTED — throws |
| CDK infrastructure | ❌ Placeholder — 3-line file |
| Idempotency (mem) | ✅ Functional |
| Idempotency (PG) | ✅ Functional |

### Roles
`admin` | `tecnico` | `encargado` | `operario` | `finanzas`

> **PROHIBITED role names:** `owner`, `collaborator`, `colaborador`

### RBAC Gaps (No `requireRole` on write routes)
Routes for `blocks`, `greenhouses`, `campaigns`, `irrigation-events`, `tasks`, `observations`, and `attachments` have **no `requireRole`** — any authenticated user can mutate them. Intentional for `operario` field operations (marking tasks done, creating observations); open decision for others.

### ADR Constraints
- **ADR-015**: Agent-proposed mutations require visible draft → explicit PWA confirmation → offline queue (Dexie) → idempotent execution. Server cannot execute mutation on LLM decision alone.
- **ADR-018**: No recommendations of specific pesticides/fungicides. No definitive crop diagnoses. No financial/contractual automation. Projections must include uncertainty bounds.

---

## Running the Validator

```bash
node replit-deliverables/phase-4-5/validate-pack.mjs
```

Exits 0 on success. Exits 1 on any error. Output is written to `validation-report.md`.

---

## Case ID Reference

| Series | Coverage |
|--------|----------|
| RC-001 – RC-048 | Agent read conversations |
| WC-001 – WC-036 | Agent write + confirmation flows |
| IC-001 – IC-024 | Idempotency middleware |
| DC-001 – DC-024 | Deployment & provider failures |

---

## Open Decisions (from Expediente Analítico)

OD-01 through OD-20 documented in the analytical expediente. Key ones affecting this pack:

- **OD-05**: Should blocks/greenhouses/campaigns write routes get `requireRole` in Spec 18?
- **OD-06**: When does cognito-jwt get implemented (Spec 21)?
- **OD-07**: S3 attachments timeline (Spec 20)?
- **OD-12**: Should `seedDatabase()` run at cold start in Lambda production?
