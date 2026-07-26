# AGROSBO - Mapa de Specs

## Registro histórico: Specs 1–14

> Las siguientes Specs documentan el mapa previo del proyecto. Algunas están
> completadas, otras fueron resecuenciadas en la nueva secuencia (Specs 15–31).
> Esta sección se conserva como registro histórico, no como clasificación activa.
> La secuencia activa está al final de este documento y en
> [`./roadmap/delivery-roadmap-v2.md`](./roadmap/delivery-roadmap-v2.md).

### Tabla histórica

| # | Spec | Estado actual |
|---|------|---------------|
| 1 | platform-stabilization-and-governance | Completada |
| 1b | cloud-services-readiness | Completada (PR #2) |
| 2 | authentication-tenancy-and-security | Parcial; cloud auth resecuenciada a Specs 19-20 |
| 3 | offline-farm-operations | Implementado |
| 4 | spatial-farms-blocks-and-map | Parcial; deuda técnica futura; fuera de Fase 0; no bloquea P0 |
| 5 | campaigns-tasks-and-observations | Implementado |
| 6 | applications-inventory-and-safety | Implementado (requiere PG) |
| 7 | harvest-finance-and-operational-traceability | Implementado (requiere PG) |
| 8 | attachments-and-object-storage | Local implementado; S3 resecuenciado a Spec 20 |
| 9 | aws-serverless-infrastructure | Lambda adapter en código (no verificado AWS); resecuenciado a Specs 17-20 |
| 10 | marketplace-listings-and-orders | Histórico; marketplace completo = P2 |
| 11 | service-requests-quotes-and-work-orders | Histórico; alcance completo no forma parte de P0/P1; requiere decisión futura/P2 |
| 12 | messaging-and-notifications | Histórico; realtime = P2; SES y colaboración externa = P0 (Spec 24) |
| 13 | farm-data-assistant | Superseded/reframed por Specs 15, 21, 22-26 |
| 14 | demo-hardening-and-submission | Histórico; evolución activa en Spec 31 |

---

## 1. platform-stabilization-and-governance — core
- **Objetivo**: baseline coherente y versionable; documentación alineada; tests
  verdes; sin pérdida de funcionalidad; sin despliegue.
- **Estado**: **completado** (PR #1 merged; CI verde; 60/60 tests en su momento;
  baseline actual 165 tras PR #2).
- **Módulos existentes**: todo el working tree del pivote integrado en main.
- **Restante**: ninguno (fase cerrada).
- **Dependencias**: ninguna.
- **Terminado**: format/lint/typecheck/test/build verdes; docs alineadas;
  commits integrados en main.
- **AWS**: ninguno. **Kiro**: Steering, ADRs, Spec, auditoría, checkpoints.

## 1b. cloud-services-readiness — core
- **Objetivo**: preparar la plataforma para servicios cloud administrados
  (provider boundaries, migraciones, idempotencia atómica, health checks,
  CI con PostgreSQL) sin crear recursos cloud.
- **Estado**: **completado** (PR #2 merged; CI verde; 165 pruebas: 132 unitarias
  + 7 MemStorage + 26 integración PostgreSQL).
- **Módulos**: provider interfaces, config, migrations, idempotency, health,
  API client, CI.
- **Restante**: ninguno (fase cerrada).
- **Dependencias**: 1 (completado).
- **Terminado**: providers intercambiables; DB lifecycle reproducible;
  idempotencia atómica con tests; health live/ready; CI con PostgreSQL.
- **AWS**: ninguno creado (preparación). **Kiro**: Requirements EARS, Design,
  Tasks, ADRs 010-013.

## 2. authentication-tenancy-and-security — core
- **Objetivo**: endurecer auth para producción y planificar tenancy.
- **Estado**: auth cookie + RBAC implementados; producción pendiente.
- **Módulos**: `api/src/auth.ts`, `users.ts`, `web/src/lib/permissions.ts`.
- **Restante**: `AUTH_ENFORCEMENT=on`, `SESSION_SECRET` en Secrets Manager, CSRF,
  cookies Secure; diseño de tenancy (sin implementar esquema aún).
- **Dependencias**: 1.
- **Terminado**: guía de producción aplicable; CSRF definido; plan de tenancy.
- **AWS**: Secrets Manager. **Kiro**: Requirements EARS, Design, ADR 008.

## 3. offline-farm-operations — core
- **Objetivo**: consolidar la sincronización offline y su cobertura real.
- **Estado**: implementado y validado (Spike A + engine actual).
- **Módulos**: `web/src/lib/sync`, `web/src/lib/db`, `api/src/idempotency.ts`.
- **Restante**: documentar y probar cobertura por dominio; unificar acceso a
  datos para paridad memoria/PostgreSQL.
- **Dependencias**: 1.
- **Terminado**: matriz operación↔endpoint verificada; sin duplicados en
  reintentos.
- **AWS**: (indirecto) Data API. **Kiro**: Tasks, Hooks de tests.

## 4. spatial-farms-blocks-and-map — core
- **Objetivo**: cerrar el gap espacial (agregado + edición de geometría).
- **Estado**: mapa SVG y métodos `DbStorage` presentes; **rutas ausentes**.
- **Módulos**: `web/src/components/map`, `shared/spatial.ts`,
  `dbStorage.ts` (métodos geometría).
- **Restante**: implementar `GET /api/spatial/features` y endpoints de geometría;
  añadir a `IStorage`/`MemStorage`; tests. Ver `docs/architecture/spatial-gap-register.md`.
- **Dependencias**: 1, 3.
- **Terminado**: mapa muestra polígonos; edición offline soportada.
- **AWS**: ninguno (sin PostGIS). **Kiro**: Design, Tasks.

## 5. campaigns-tasks-and-observations — core
- **Objetivo**: robustez de campañas, tareas y observaciones.
- **Estado**: implementado.
- **Módulos**: rutas `/api/campaigns|tasks|observations`, `campaignSummary.ts`.
- **Restante**: pulido de flujos y validaciones; cobertura de tests.
- **Dependencias**: 3. **Terminado**: flujos y resúmenes verificados.
- **AWS**: ninguno. **Kiro**: Tasks, revisión incremental.

## 6. applications-inventory-and-safety — core
- **Objetivo**: aplicaciones fitosanitarias, inventario y carencias.
- **Estado**: implementado (requiere PostgreSQL para aplicaciones).
- **Módulos**: `applications.ts`, `storage/dbStorage` (inventario), alertas de
  carencia.
- **Restante**: paridad en modo memoria o documentar dependencia de DB; tests.
- **Dependencias**: 3. **Terminado**: stock nunca negativo; carencia activa.
- **AWS**: ninguno. **Kiro**: domain-rules, Tasks.

## 7. harvest-finance-and-operational-traceability — core
- **Objetivo**: cosecha, costos y mano de obra con trazabilidad operativa.
- **Estado**: implementado (requiere PostgreSQL para finanzas).
- **Módulos**: `harvest`, `expenses.ts`, costos de campaña.
- **Restante**: consistencia de costos; reportes; tests.
- **Dependencias**: 6. **Terminado**: costos deterministas; reportes CSV.
- **AWS**: ninguno. **Kiro**: data-integrity, Tasks.

## 8. attachments-and-object-storage — core
- **Objetivo**: migrar adjuntos de disco local a S3 con URLs prefirmadas.
- **Estado**: disco local implementado; S3 pendiente.
- **Módulos**: `api/src/attachments.ts`, `web/src/components/AttachmentUploader`.
- **Restante**: driver S3 + presigned; subida separada de metadata; offline.
- **Dependencias**: 9 (S3). **Terminado**: adjuntos en S3; compatible con Lambda.
- **AWS**: **S3**. **Kiro**: ADR 007, Design, Tasks.

## 9. aws-serverless-infrastructure — core
- **Objetivo**: infraestructura AWS reproducible (CDK) y despliegue.
- **Estado**: `infra/` placeholder; Lambda adapter implementado en código (no
  verificado en AWS); Data API PARTIAL (no probado contra Aurora). Resecuenciado
  a Specs 17–20.
- **Módulos**: `infra/`, `api/src/handlers`, `api/src/db.ts`.
- **Restante**: CDK stack completo; validación contra AWS real.
- **Dependencias**: 1, 2, 8. **Terminado**: entorno desplegable reproducible.
- **AWS**: S3, CloudFront, API Gateway, Lambda, Aurora SV2, Data API, Secrets
  Manager, CloudWatch, CDK. **Kiro**: ADR 007, Tasks.

## 10. marketplace-listings-and-orders — future
- **Objetivo**: publicaciones, ofertas y órdenes.
- **Estado**: NO implementado.
- **Restante**: modelo listing/availability/offer/order + estados.
- **Dependencias**: 2 (tenancy), 5-7. **Terminado**: demo mínimo posterior.
- **AWS**: (según diseño). **Kiro**: Requirements, Design.
- Nota: NO debe bloquear la entrega del hackathon.

## 11. service-requests-quotes-and-work-orders — differentiator
- **Objetivo**: primer flujo de solicitud de servicio → cotización → orden.
- **Estado**: NO implementado.
- **Restante**: entidades solicitud/cotización/orden + impacto en Today.
- **Dependencias**: 2, 5. **Terminado**: un flujo end-to-end demostrable.
- **AWS**: ninguno nuevo. **Kiro**: Requirements EARS, Design, Tasks.

## 12. messaging-and-notifications — future
- **Objetivo**: mensajería y notificaciones.
- **Estado**: NO implementado.
- **Restante**: modelo de mensajes asociados a solicitudes/órdenes; canal.
- **Dependencias**: 11. **AWS**: candidatos WebSocket/SES/SQS (diferidos).
- **Kiro**: Design.

## 13. farm-data-assistant — superseded/reframed
- **Objetivo original**: copiloto conversacional de solo lectura sobre herramientas.
- **Estado**: **superseded** por la nueva dirección de producto. El alcance del
  agente operacional multimodal (con mutaciones confirmadas, voz, visión y
  escenarios) se ejecutará mediante Spec 15 (product-agent-scope-v2), Spec 21
  (farm-operational-agent) y Specs 22–26.
- **Documento activo**: [`./architecture/operational-agent-plan.md`](./architecture/operational-agent-plan.md).
- **Histórico**: [`./architecture/farm-assistant-plan.md`](./architecture/farm-assistant-plan.md) (SUPERSEDED).
- Esta Spec no debe mantenerse como una segunda implementación activa del agente.

## 14. demo-hardening-and-submission — core (histórico)
- **Objetivo**: dataset sintético, golden path pulido, evidencia, presentación.
- **Estado**: registro histórico. Su evolución v2 se ejecutará mediante Spec 31
  (demo-hardening-and-submission-v2).
- **Restante**: se resecuencia en Spec 31.
- **Dependencias**: P0 completo (Specs 15–30).
- **AWS**: los del core. **Kiro**: Hooks, checkpoints, evidencia.

---

## Secuencia aprobada: Specs 15–31

> Definida en [`./roadmap/delivery-roadmap-v2.md`](./roadmap/delivery-roadmap-v2.md).
> La numeración es estable; no equivale automáticamente al orden de ejecución.
> ADRs 014–018 registran las decisiones fundamentales.

| # | Spec | Horizonte | Estado |
|---|------|-----------|--------|
| 15 | product-agent-scope-v2 | P0 | EN CURSO (Fase 0) |
| 16 | multi-agent-workflow | P0 | PLANNED (habilitador posterior a Fase 0) |
| 17 | critical-cloud-spikes | P0 | PLANNED |
| 18 | aws-infrastructure-baseline | P0 | PLANNED |
| 19 | aws-core-deployment | P0 | PLANNED |
| 20 | cloud-auth-and-attachments | P0 | PLANNED |
| 21 | farm-operational-agent | P0 | PLANNED |
| 22 | agent-actions-and-confirmations | P0 | PLANNED |
| 23 | voice-assistant | P0 | PLANNED |
| 24 | collaborators-and-notifications | P0 | PLANNED |
| 25 | crop-image-assessment | P0 | PLANNED |
| 26 | farm-scenario-engines | P0 | PLANNED |
| 27 | public-farm-storefront | P1 | PLANNED |
| 28 | p1-communication-and-offline-voice | P1 | PLANNED |
| 29 | ui-accessibility-polish | P0 | PLANNED |
| 30 | security-cost-reliability-hardening | P0 | PLANNED |
| 31 | demo-hardening-and-submission-v2 | P0 | PLANNED |

> **Spec 15**: Fase 0 en curso. Su carpeta `.kiro/specs/product-agent-scope-v2/`
> y archivos Requirements/Design/Tasks todavía no existen; se crearán
> secuencialmente en Checkpoints 0.9–0.11.

### Notas de reconciliación con Specs 1–14

- Specs 1 y 1b: completadas.
- Spec 2 (auth-tenancy): trabajo cloud pendiente se resecuencia en Specs 19–20.
- Spec 3 (offline): implementado; consolidación futura si necesario.
- Spec 4 (espacial): deuda técnica futura; fuera de Fase 0; no bloquea P0 ni
  el golden path; sin número futuro inventado.
- Specs 5–7: implementados; estabilización incremental.
- Spec 8 (attachments): migración a S3 se resecuencia en Spec 20.
- Spec 9 (aws-serverless): se resecuencia en Specs 18–19.
- Spec 10 (marketplace): P2; no asignada a ninguna fase obligatoria.
- Spec 11 (service-requests): registro histórico; su alcance completo
  (service requests, quotes, work orders) no forma parte de P0/P1 aprobados y
  requiere decisión futura/P2. El flujo de colaboración externa P0 (Spec 24) es
  distinto de service requests/quotes/work orders.
- Spec 12 (messaging): la mensajería realtime completa es P2; SES y
  colaboración externa P0 se ejecutan en Spec 24.
- Spec 13: superseded/reframed (ver arriba).
- Spec 14: evolución v2 en Spec 31.
- Specs 27–28: P1; solo comienzan después de cerrar P0 con Spec 31.

## Reglas

- Cada Spec se ejecuta por checkpoints con autorización explícita.
- No se avanza automáticamente de una Spec a la siguiente.
- P0 debe cerrarse (Spec 31) antes de iniciar P1 (Specs 27–28).
- P2 no bloquea ninguna fase.
