# AGROSBO - Estrategia interna de evaluación

Estrategia **interna** para maximizar la calidad de la propuesta. No asume
criterios oficiales del hackathon; es un marco propio para priorizar trabajo y
evidencia. Los criterios oficiales, si difieren, tienen prioridad.

| Eje | Cómo lo abordamos | Evidencia concreta |
|---|---|---|
| Originalidad | Gestión agrícola offline-first con evolución a comercio/servicios y copiloto | Visión y roadmap (`docs/product/vision-and-scope.md`) |
| Problema real | Datos dispersos + conectividad intermitente en campo | `product.md`, demo story |
| Ejecución | Baseline funcional (typecheck/build verdes; tests) | Quality gates, informe de estabilización |
| Web app | PWA instalable, offline, optimista, espacial | `sw.js`, Dexie, engine de sync, SpatialMap |
| Offline | Cola durable, idempotencia, reconciliación, backoff | `web/src/lib/sync`, `idempotency.ts` |
| AWS | Servicios justificados por el código | `docs/architecture/aws-service-plan.md` |
| Kiro | Steering, Specs EARS, ADRs, Hooks, checkpoints, auditoría | `docs/kiro/development-process.md` |
| Calidad | ESLint, Prettier, Vitest, tsc, hooks | quality gates |
| Seguridad | Auth + RBAC; plan de producción (CSRF, Secrets Manager) | `security.md`, ADR 008 |
| Demo | Golden path reproducible con datos sintéticos | `hackathon-demo-story.md` |
| Potencial | Camino claro a comercio/servicios/asistente | `platform-evolution.md`, Spec map |

## Principios

- Terminar el **core** antes que perseguir diferenciadores.
- Mostrar lo **real**; marcar lo futuro como futuro.
- Preferir **profundidad verificable** (offline sin duplicados, quality gates) a
  amplitud superficial.
- Justificar cada servicio AWS; no acumular logos.

## Riesgos para la evaluación y mitigación

- **Sobre-alcance** → core primero; diferenciadores condicionados.
- **Demo frágil** → dataset sintético estable y ensayo del golden path.
- **Claims inflados** → etiquetado de estado en toda la documentación.
- **Infra no lista** → arquitectura objetivo clara + fallback Fargate.
