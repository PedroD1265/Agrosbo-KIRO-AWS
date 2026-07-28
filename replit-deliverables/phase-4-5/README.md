# AGROSBO — paquete de fixtures de Fases 4–5

Baseline autorizado: `156036a` — Merge pull request #18 from PedroD1265/replit/spec-17-cloud-prep.

Fuente de rescate: `origin/replit/spec-18-readiness-plan`. Rama de trabajo: `feat/phase-4-5-fixtures-salvaged`.

Este directorio contiene únicamente los once artefactos permitidos. No incorpora commits de Replit, código productivo, dependencias, archivos internos de Replit ni ZIP.

## Contenido y conteos

| Artefacto | Conteo |
| --- | ---: |
| `route-catalog.json` | 88 rutas |
| `agent-read-conversations.es.json` | 48 casos |
| `agent-write-confirmation-scenarios.es.json` | 36 casos |
| `idempotency-replay-cases.json` | 24 casos |
| `deployment-and-provider-failure-cases.json` | 24 casos |
| `rbac-matrix.json` | 5 roles internos |

El catálogo se deriva de `api/src/routes.ts`, `api/src/health.ts` y del montaje/autenticación global de `api/src/app.ts`. La ausencia de `requireRole` no se interpreta como ruta pública. `DELETE /api/attachments/:id` no es idempotente porque usa `asyncHandler`, no el wrapper `idempotent`.

Los casos de fallos distinguen evidencia actual, pruebas propuestas, validación de runtime, decisiones abiertas y funciones no implementadas. Cognito JWT, S3 attachments e infraestructura CDK no se presentan como implementados; Aurora y despliegue real no fueron validados.

## Validación

El validador es read-only por defecto:

```bash
node replit-deliverables/phase-4-5/validate-pack.mjs
```

Solo `--write` actualiza `validation-report.md`:

```bash
node replit-deliverables/phase-4-5/validate-pack.mjs --write
```

El proceso retorna 0 si todo pasa y 1 ante cualquier error. No necesita instalar dependencias.

## Estado de promoción

- `requiresKiroReview: true`
- `requiresHumanPromotion: true`
- `productionReady: false`
- No existe ZIP dentro del repositorio.
