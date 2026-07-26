# AGROSBO — Delivery Roadmap v2

> Fuente canónica:
> [`../product/product-scope-v2.md`](../product/product-scope-v2.md).
>
> Última actualización: julio 2026 (Fase 0, revisión final del PR #3).
>
> Este documento ordena las fases y Specs sin crear carpetas de Specs futuras.
> La numeración de Specs (15–31) es un identificador estable; no equivale
> automáticamente a orden de ejecución. El orden obligatorio se define en la
> sección de dependencias.

## Fases de alto nivel

| Fase | Objetivo | Horizonte | Estado |
| --- | --- | --- | --- |
| 0 | Gobierno documental y técnico (incluye Spec 15) | P0 | COMPLETADA (PR #3 pendiente de merge) |
| 1 | Spikes críticos y baseline AWS | P0 | PLANNED |
| 2 | Despliegue AWS del core existente | P0 | PLANNED |
| 3 | Agente operacional | P0 | PLANNED |
| 4 | Colaboradores y notificaciones | P0 | PLANNED |
| 5 | Inteligencia agrícola (voz, visión, escenarios) | P0 | PLANNED |
| 6 | Calidad, seguridad y demo P0 | P0 | PLANNED |
| 7 | Tienda pública y comunicación P1 | P1 | PLANNED |

## Dependencias entre fases

```text
Fase 0 (docs, Spec 15) → Fase 1 (spikes)
Fase 1 → Fase 2 (AWS deploy)
Fase 2 → Fase 3 (agente) → Fase 4 (colaboradores)
Fase 3 → Fase 5 (inteligencia)
Fases 2–5 → Fase 6 (calidad, seguridad, demo P0)
Fase 6 (P0 cerrado) → Fase 7 (P1)
```

Spec 16 (multi-agent-workflow) es un habilitador posterior a Fase 0. Puede
comenzar después de aprobar Spec 15 y antes del desarrollo intensivo. Puede
ejecutarse en paralelo con spikes independientes si usa rama, worktree y
ownership de archivos controlados. No es un entregable del runbook actual de
Fase 0.

P0 debe completarse (incluyendo Spec 31) antes de iniciar P1. P2 no bloquea.

## Secuencia de Specs

| # | Spec | Horizonte | Dependencia | Objetivo | Criterio de entrada | Criterio de salida | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | product-agent-scope-v2 | P0 | Contrato canónico aprobado; auditoría y documentos derivados aprobados; ADRs y arquitectura aprobados; documentación y Steering alineados (Checkpoints 0.2–0.8) | Formalizar requirements, design y tasks de la nueva dirección de producto | Checkpoints 0.2–0.8 aprobados | requirements.md + design.md + tasks.md coherentes, trazables y aprobados | COMPLETADA (PR #3 pendiente de merge) |
| 16 | multi-agent-workflow | P0 | Spec 15 aprobada | Definir colaboración segura entre agentes de desarrollo (Kiro, Codex, Antigravity, Lovable, otros): ownership de archivos, handoffs, checkpoints, reglas Git, un solo escritor por working tree, worktrees/ramas separadas para paralelismo, prohibición de merge/push/deploy autónomos | Spec 15 aprobada | Reglas de colaboración multi-agente documentadas y operativas | PLANNED |
| 17 | critical-cloud-spikes | P0 | Spec 15 aprobada | Validar viabilidad técnica: Bedrock tool calling, Transcribe streaming, SES delivery events, token hash flow | Spec 15 aprobada | Spike report con resultados verificados por servicio | PLANNED |
| 18 | aws-infrastructure-baseline | P0 | Spec 17 | CDK stack mínimo: VPC, Aurora, S3, Secrets Manager, CloudWatch | Spikes validados | Stack desplegable; db:migrate exitoso contra Aurora | PLANNED |
| 19 | aws-core-deployment | P0 | Spec 18 | Desplegar core existente: Lambda, API GW, CF+OAC, Cognito | Infra baseline desplegada | App accesible; health checks verdes; seed exitoso | PLANNED |
| 20 | cloud-auth-and-attachments | P0 | Spec 19 | Cognito JWT provider + S3 attachment provider funcionales | Core desplegado | Login vía Cognito; adjuntos en S3 con presigned URLs | PLANNED |
| 21 | farm-operational-agent | P0 | Specs 19, 20 | Endpoint REST del agente con herramientas de lectura; tool registry; prompt engineering; context management | Auth y storage cloud funcionales | Agente responde consultas con datos reales; RBAC aplicado | PLANNED |
| 22 | agent-actions-and-confirmations | P0 | Spec 21 | Herramientas de escritura: borrador → confirmación → cola offline → idempotencia | Agente de lectura funcional | Mutaciones confirmadas end-to-end sin duplicados | PLANNED |
| 23 | voice-assistant | P0 | Spec 21 | Transcribe STT + Polly TTS integrados con el agente | Agente funcional | Push-to-talk → transcripción editable → respuesta hablada | PLANNED |
| 24 | collaborators-and-notifications | P0 | Spec 22 | Token opaco, SES, enlace seguro, estados honestos | Agente con acciones funcional | SES acepta solicitud y message ID almacenado; delivered registrado únicamente cuando SES emite evento; enlace seguro funcional; respuesta estructurada registrada | PLANNED |
| 25 | crop-image-assessment | P0 | Spec 21 | Evaluación visual vía Bedrock multimodal | Agente funcional | Foto → evaluación estructurada → borrador de observación | PLANNED |
| 26 | farm-scenario-engines | P0 | Spec 21 | IrrigationDelayScenario (módulo determinista separado) | Agente funcional | Escenario calculado con todos los campos obligatorios | PLANNED |
| 27 | public-farm-storefront | P1 | Spec 31 completada; componentes P0 relevantes (Specs 22, 24) | Tienda pública, URL, QR, solicitudes sin registro | P0 cerrado (Spec 31 aprobada) | Visitante puede enviar solicitud; productor compara | PLANNED |
| 28 | p1-communication-and-offline-voice | P1 | Specs 23, 27; P0 cerrado | WhatsApp wa.me, notas de voz offline, resumen hablado | Tienda P1 funcional + voz P0 funcional + P0 cerrado | Notas offline procesadas; resumen audible | PLANNED |
| 29 | ui-accessibility-polish | P0 | Specs 22–26 | Accesibilidad WCAG básica; responsive; performance | Funcionalidades P0 integradas | Lighthouse >= 80; navegación con teclado | PLANNED |
| 30 | security-cost-reliability-hardening | P0 | Spec 29 | Rate limiting; alarmas; límites de uso; revisión de IAM; logs; seguridad de endpoints públicos; evaluación de WAF únicamente si existe riesgo y presupuesto que lo justifique | UI pulida | Sin vulnerabilidades críticas; costos bajo control; endpoints públicos protegidos | PLANNED |
| 31 | demo-hardening-and-submission-v2 | P0 | Spec 30 | Dataset sintético, golden path automatizado, evidencia, presentación | Todo P0 funcional y seguro | Demo reproducible; métricas verificadas; submission lista | PLANNED |

## Orden obligatorio de ejecución

### P0

```text
15 → 17 → 18 → 19 → 20 → 21
21 → 22, 23, 25, 26 (paralelas tras 21)
22 → 24
22–26 → 29 → 30 → 31
```

Spec 16 es un habilitador posterior a Fase 0. Puede comenzar después de aprobar
Spec 15 y antes del desarrollo intensivo, sin bloquear spikes que sean
independientes de ella. Puede ejecutarse en paralelo con spikes si usa rama,
worktree y ownership de archivos separados. Su orden exacto relativo a 17 se
determinará en su Design. No es un entregable del runbook de Fase 0.

### P1 (solo después de cerrar P0)

```text
31 → 27
27 + 23 + P0 cerrado → 28
```

### Nota sobre Fase 0 y Spec 15

La Spec 15 es la única Spec incluida en la Fase 0. La Fase 0 termina después de
los checkpoints 0.12–0.15:

- Checkpoint 0.12: auditoría de consistencia.
- Checkpoint 0.13: gates finales.
- Checkpoint 0.14: plan de commits.
- Checkpoint 0.15: PR y cierre.

Spec 15 no depende de "Fase 0 completa"; depende de los Checkpoints 0.2–0.8
(Bloques 1–3) que la preceden dentro de la misma Fase 0.

## Grafo de dependencias de Specs

```text
15 product-agent-scope-v2 (Fase 0, Checkpoints 0.9–0.11)
├── 16 multi-agent-workflow (habilitador posterior a Fase 0)
├── 17 critical-cloud-spikes
│   └── 18 aws-infrastructure-baseline
│       └── 19 aws-core-deployment
│           └── 20 cloud-auth-and-attachments
│               └── 21 farm-operational-agent
│                   ├── 22 agent-actions-and-confirmations
│                   │   └── 24 collaborators-and-notifications
│                   ├── 23 voice-assistant
│                   ├── 25 crop-image-assessment
│                   └── 26 farm-scenario-engines
├── 29 ui-accessibility-polish (después de 22–26)
│   └── 30 security-cost-reliability-hardening
│       └── 31 demo-hardening-and-submission-v2 (cierra P0)
│
└── P1 (solo después de Spec 31):
    ├── 27 public-farm-storefront
    └── 28 p1-communication-and-offline-voice (después de 23 + 27)
```

## Notas

- Las Specs no crean carpetas por adelantado; cada una se formaliza cuando se
  autorice.
- Cada Spec requiere Requirements/Design/Tasks propios.
- P2 no tiene Spec asignada; se documenta como visión futura.
- Single-organization en todas las Specs P0 y P1.
- La numeración continúa desde la secuencia existente en `docs/spec-map.md`
  (Specs 1–14 ya definidas).
- WAF de pago no es requisito automático; solo se evalúa si existe riesgo
  demostrado y presupuesto que lo justifique.
- Endpoints espaciales faltantes son deuda técnica para una Spec técnica futura;
  no forman parte del golden path P0 ni bloquean ninguna Spec listada aquí.
