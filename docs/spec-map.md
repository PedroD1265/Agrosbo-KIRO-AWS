# AGROSBO - Mapa de Specs

Reemplaza el mapa previo (trazabilidad de café). Ver ADR 006. Cada Spec indica
objetivo, estado, módulos existentes, trabajo restante, dependencias, criterio
de terminado, importancia (core/differentiator/future), servicios AWS y
funcionalidades de Kiro.

Clasificación:
- **Core**: 1-9 y 14.
- **Differentiators** (solo si el core queda estable): 11 y 13.
- **Future**: 10 y 12 (alcance completo).

## Secuencia

| # | Spec | Importancia |
|---|------|-------------|
| 1 | platform-stabilization-and-governance | core |
| 1b | cloud-services-readiness | core |
| 2 | authentication-tenancy-and-security | core |
| 3 | offline-farm-operations | core |
| 4 | spatial-farms-blocks-and-map | core |
| 5 | campaigns-tasks-and-observations | core |
| 6 | applications-inventory-and-safety | core |
| 7 | harvest-finance-and-operational-traceability | core |
| 8 | attachments-and-object-storage | core |
| 9 | aws-serverless-infrastructure | core |
| 10 | marketplace-listings-and-orders | future |
| 11 | service-requests-quotes-and-work-orders | differentiator |
| 12 | messaging-and-notifications | future |
| 13 | farm-data-assistant | differentiator |
| 14 | demo-hardening-and-submission | core |

---

## 1. platform-stabilization-and-governance — core
- **Objetivo**: baseline coherente y versionable; documentación alineada; tests
  verdes; sin pérdida de funcionalidad; sin despliegue.
- **Estado**: **completado** (PR #1 merged; CI verde; 60/60 tests).
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
- **Estado**: en curso.
- **Módulos**: provider interfaces, config, migrations, idempotency, health,
  API client, CI.
- **Restante**: implementar boundaries, migraciones, idempotencia, health,
  client prep, CI PostgreSQL.
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
- **Estado**: `infra/` placeholder; adaptador Lambda y Data API listos.
- **Módulos**: `infra/`, `api/src/handlers`, `api/src/db.ts`.
- **Restante**: CDK (S3, CloudFront, API GW, Lambda, Aurora SV2, Secrets Manager,
  CloudWatch); import dinámico de Vite; origen único.
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

## 13. farm-data-assistant — differentiator
- **Objetivo**: copiloto conversacional de solo lectura sobre herramientas.
- **Estado**: NO implementado.
- **Restante**: endpoint + herramientas de lectura; confirmación humana.
- **Dependencias**: 2, 5-7. **Terminado**: consulta de datos reales con RBAC.
- **AWS**: **Bedrock** (diferido, requiere Spec). **Kiro**: Design, ADR futuro.
- Ver `docs/architecture/farm-assistant-plan.md`.

## 14. demo-hardening-and-submission — core
- **Objetivo**: dataset sintético, golden path pulido, evidencia, presentación.
- **Estado**: pendiente. **Restante**: datos demo, guion, métricas verificables.
- **Dependencias**: 1-9. **Terminado**: demo estable reproducible.
- **AWS**: los del core. **Kiro**: Hooks, checkpoints, evidencia.

## Reglas

- Cada Spec se ejecuta por checkpoints con autorización explícita.
- No se avanza automáticamente de una Spec a la siguiente.
- Diferenciadores (11, 13) solo tras estabilizar el core.
- El marketplace (10) y la mensajería (12) no bloquean la entrega.
