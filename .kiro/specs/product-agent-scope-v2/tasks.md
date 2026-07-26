# Tasks — product-agent-scope-v2

Ejecución por checkpoints del runbook. No se implementa código funcional.
No se crean recursos AWS. No se realizan commits sin autorización.

## Tareas completadas

### T-01: Contrato canónico

- **Estado**: Completado.
- **Checkpoint**: 0.2/0.2B.
- **Dependencias**: Auditoría de solo lectura aprobada.
- **Requirement IDs**: REQ-A01–A06, REQ-L01.
- **Design**: §5.1 Canónicos.
- **Archivos**: `docs/product/product-scope-v2.md`.
- **Evidencia**: Archivo existe; prettier PASS; encoding PASS; aprobación humana explícita.

### T-02: Auditoría persistida

- **Estado**: Completado.
- **Checkpoint**: 0.3.
- **Dependencias**: T-01.
- **Requirement IDs**: REQ-A05, REQ-L06.
- **Design**: §5.1 Canónicos; §8 Trazabilidad.
- **Archivos**: `docs/reviews/current-capability-audit-v2.md`.
- **Evidencia**: Archivo existe; 165 tests documentados; CURRENT vs PLANNED separados.

### T-03: Documentos derivados de producto

- **Estado**: Completado.
- **Checkpoint**: 0.4.
- **Dependencias**: T-01, T-02.
- **Requirement IDs**: REQ-A03, REQ-K01–K03, REQ-L06.
- **Design**: §5.3 Derivados.
- **Archivos**: `docs/product/capability-status-matrix.md`, `docs/product/personas-and-permissions.md`, `docs/product/golden-paths-p0-p1.md`, `docs/roadmap/delivery-roadmap-v2.md`.
- **Evidencia**: 4 archivos existen; prettier PASS; aprobación humana tras correcciones.

### T-04: ADRs 014–018

- **Estado**: Completado.
- **Checkpoint**: 0.5.
- **Dependencias**: T-01, T-02, T-03.
- **Requirement IDs**: REQ-B01, REQ-C01–C08, REQ-D01–D06, REQ-E01–E12, REQ-G01–G07, REQ-H01–H04, REQ-I01–I09, REQ-J01–J06.
- **Design**: §5.1 Canónicos; §11 Límites decididos.
- **Archivos**: `docs/adr/014-product-scope-p0-p1-p2.md` through `docs/adr/018-agricultural-intelligence-boundaries.md`.
- **Evidencia**: 5 ADRs Accepted; prettier PASS; revisión cruzada; aprobación humana.

### T-05: Arquitectura especializada

- **Estado**: Completado.
- **Checkpoint**: 0.6.
- **Dependencias**: T-04.
- **Requirement IDs**: REQ-B01–B06, REQ-C01–C08, REQ-D01–D06, REQ-E01–E12, REQ-F01–F07, REQ-G01–G07, REQ-H01–H04, REQ-J01–J06.
- **Design**: §5.2 Técnicos; §10 Supersesión.
- **Archivos**: `docs/architecture/operational-agent-plan.md`, `docs/architecture/collaboration-model.md`, `docs/architecture/farm-assistant-plan.md` (superseded).
- **Evidencia**: 2 nuevos + 1 superseded; prettier PASS; aprobación humana.

### T-06: Alineación de documentos activos

- **Estado**: Completado.
- **Checkpoint**: 0.7.
- **Dependencias**: T-04, T-05.
- **Requirement IDs**: REQ-A02–A05, REQ-I06, REQ-I09, REQ-K01–K03, REQ-NEG01–NEG04.
- **Design**: §5.5 Comunicación; §14 Validación.
- **Archivos**: README.md, docs/spec-map.md, docs/architecture/current-and-target.md, docs/architecture/aws-service-plan.md, docs/architecture/platform-evolution.md, docs/product/vision-and-scope.md, docs/product/hackathon-demo-story.md, docs/kiro/development-process.md.
- **Evidencia**: 8 archivos alineados; prettier PASS; búsquedas cruzadas; aprobación humana.

### T-07: Steering

- **Estado**: Completado.
- **Checkpoint**: 0.8.
- **Dependencias**: T-06.
- **Requirement IDs**: REQ-A01–A06, REQ-B01, REQ-C08, REQ-J06, REQ-NEG01–NEG04.
- **Design**: §5.4 Reglas operativas.
- **Archivos**: 5 steering files.
- **Evidencia**: 5 archivos alineados; prettier PASS; aprobación humana.

### T-08: Requirements

- **Estado**: Completado.
- **Checkpoint**: 0.9.
- **Dependencias**: T-01–T-07.
- **Requirement IDs**: REQ-L02, REQ-L07.
- **Design**: §7 Flujo.
- **Archivos**: `.kiro/specs/product-agent-scope-v2/requirements.md`.
- **Evidencia**: Archivo existe; 85 requirements con IDs únicos (81 A–L + 4 NEG); EARS ubicuo y event-driven según corresponda; fuentes declaradas; prettier PASS.

### T-09: Design

- **Estado**: Completado.
- **Checkpoint**: 0.10.
- **Dependencias**: T-08.
- **Requirement IDs**: REQ-L02.
- **Design**: §7 Flujo.
- **Archivos**: `.kiro/specs/product-agent-scope-v2/design.md`.
- **Evidencia**: Archivo existe; matriz completa; prettier PASS.

### T-10: Tasks

- **Estado**: Completado.
- **Checkpoint**: 0.11.
- **Dependencias**: T-08, T-09.
- **Requirement IDs**: REQ-L02, REQ-L04, REQ-L07.
- **Design**: §7 Flujo.
- **Archivos**: `.kiro/specs/product-agent-scope-v2/tasks.md`.
- **Evidencia**: tasks.md existe; 14 tareas; dependencias acíclicas; mappings a Requirements y Design revisados; prettier PASS.

## Tareas pendientes de Fase 0

### T-11: Auditoría de consistencia

- **Estado**: Pendiente.
- **Checkpoint**: 0.12.
- **Dependencias**: T-10.
- **Requirement IDs**: REQ-A01–A06, REQ-B01–B06, REQ-C01–C08, REQ-D01–D06, REQ-E01–E12, REQ-F01–F07, REQ-G01–G07, REQ-H01–H04, REQ-I01–I09, REQ-J01–J06, REQ-K01–K03, REQ-L01–L07, REQ-NEG01–NEG04.
- **Design**: §14 Validación; §15 Contradicciones.
- **Archivos permitidos**: Solo archivos ya modificados en Fase 0 (excluye contrato y ADRs salvo autorización).
- **Cambio esperado**: Correcciones mecánicas derivadas si se detectan contradicciones.
- **Validaciones**: Búsquedas cruzadas de términos clave; enlaces; estados.
- **Criterio de terminado**: Auditoría limpia o STOP REQUIRED.
- **Puerta humana**: No (hito interno); STOP solo si contradicción de alcance/ADR.

### T-12: Gates finales

- **Estado**: Pendiente.
- **Checkpoint**: 0.13.
- **Dependencias**: T-11 limpia.
- **Requirement IDs**: REQ-L06.
- **Design**: §14.3 Quality gates.
- **Archivos permitidos**: Ninguno.
- **Cambio esperado**: Ninguno (solo ejecución de gates).
- **Validaciones**: format, encoding, lint, typecheck, test, test:memstorage, build, db:check, test:integration.
- **Criterio de terminado**: Todos los gates PASS.
- **Puerta humana**: No (hito interno); STOP ante primer fallo.

### T-13: Plan de commits

- **Estado**: Pendiente.
- **Checkpoint**: 0.14.
- **Dependencias**: T-12.
- **Requirement IDs**: REQ-L05.
- **Design**: §7 Flujo.
- **Archivos permitidos**: Ninguno.
- **Cambio esperado**: Propuesta textual de agrupación, mensajes y orden.
- **Validaciones**: Git de solo lectura.
- **Criterio de terminado**: Plan explícito sin staging ni commit ejecutado.
- **Puerta humana**: No (hito interno).

### T-14: PR y cierre

- **Estado**: Pendiente.
- **Checkpoint**: 0.15.
- **Dependencias**: T-13.
- **Requirement IDs**: REQ-L05.
- **Design**: §7 Flujo.
- **Archivos permitidos**: Ninguno (salvo autorización expresa).
- **Cambio esperado**: Título, cuerpo, evidencia, riesgos y checklist del PR preparados.
- **Validaciones**: Git de solo lectura.
- **Criterio de terminado**: PR listo para copiar; sin push, creación de PR, Ready ni merge.
- **Puerta humana**: Sí (fin del Bloque 5 y de Fase 0).

## Handoff a Specs posteriores

Las siguientes Specs ejecutan la implementación funcional derivada de los
requirements de esta Spec. No son tareas de Fase 0:

| Spec | Implementa | Requirements | Prerequisito |
| --- | --- | --- | --- |
| 16 | Multi-agent workflow (posterior a Fase 0) | Governance | Spec 15 aprobada |
| 17 | Cloud spikes | REQ-I01–I09, REQ-F01–F06, REQ-E01–E12, REQ-G01–G07 | Spec 15 aprobada |
| 18–20 | AWS infrastructure | REQ-I01–I09 | Spec 17 |
| 21 | Agente operacional base | REQ-B01–B06 | Specs 19–20 |
| 22 | Acciones y confirmaciones | REQ-C01–C08 | Spec 21 |
| 23 | Voz | REQ-F01–F06 | Spec 21 |
| 24 | Colaboradores y SES | REQ-D01–D06, REQ-E01–E12 | Spec 22 |
| 25 | Evaluación visual | REQ-G01–G07 | Spec 21 |
| 26 | Escenarios | REQ-H01–H04 | Spec 21 |
| 29 | UI/accessibility polish | Presentación de interacciones | Specs 22–26 |
| 30 | Security-cost-reliability | REQ-J01–J06 | Spec 29 |
| 31 | Demo y cierre P0 | Golden path completo | Spec 30 |
| 27 | Tienda pública P1 | REQ-K01 | Spec 31 (P0 cerrado) |
| 28 | Comunicación y voz offline P1 | REQ-F07, REQ-K01 | Specs 23, 27 |

> La numeración estable (15–31) no determina orden de ejecución. Specs 27–28
> solo comienzan después de cerrar P0 con Spec 31. P2 no tiene Specs asignadas.

P2 no tiene Specs asignadas.

## Dependencias (acíclico)

```text
T-01 → T-02 → T-03 → T-04 → T-05 → T-06 → T-07 → T-08 → T-09 → T-10
T-10 → T-11 → T-12 → T-13 → T-14
```

Lineal y acíclico.
