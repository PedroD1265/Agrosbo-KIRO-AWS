# Phase 3 Closeout Checklist — Spec 17

## Propósito

Checklist de cierre de la Fase 3 completa. Se completa durante los Checkpoints 3.5–3.7
(T14–T19). Cada ítem debe resolverse antes de aprobar el handoff final.

Fuente: tasks.md §8 Definition of Done, runbook §16.

---

## T14 — Resumen ejecutivo (Checkpoint 3.5)

```
[ ] T14-01  T10, T11, T12, T13 completados con manifests producidos
[ ] T14-02  summary.md creado en spikes/critical-cloud/results/
[ ] T14-03  summary.md no contradice los manifests individuales (manifest-s1..s4.md)
[ ] T14-04  Tabla de resultados S1–S4 completa (PASS/PARTIAL/FAIL por criterio)
[ ] T14-05  Región utilizada documentada (no fijada como producción)
[ ] T14-06  Modelo Bedrock documentado (no fijado para producción — REQ-NEG-02)
[ ] T14-07  WER documentado con locale recomendado y advertencia de sesgo TTS
[ ] T14-08  Costos reales documentados; total <= USD 3.50
[ ] T14-09  Decisiones diferidas para Specs 18–26 trazadas (no decididas)
[ ] T14-10  Capacidades clasificadas: VERIFIED_IN_SPIKE vs NOT_IMPLEMENTED (REQ-DIS-01..04)
[ ] T14-11  Ningún resultado cloud inventado — todos derivados de manifests
[ ] T14-12  summary.md sanitizado: sin account IDs, ARNs, credentials
```

**PUERTA T14**: T14-01 a T14-12 completados → proceder a T15.

---

## T15 — Microvalidaciones documentales (Checkpoint 3.5)

```
[ ] T15-01  microvalidation-polly.md existe en spikes/critical-cloud/results/
[ ] T15-02  microvalidation-aurora.md existe en spikes/critical-cloud/results/
[ ] T15-03  Polly: voces es-* documentadas con fuentes oficiales AWS
[ ] T15-04  Polly: formatos de audio documentados (pcm/mp3/ogg; sample rates)
[ ] T15-05  Polly: precios documentados o marcados NEEDS OFFICIAL VERIFICATION
[ ] T15-06  Polly: riesgo de sesgo TTS→STT documentado
[ ] T15-07  Polly: decisión de producción marcada como diferida a Spec 23
[ ] T15-08  Aurora: disponibilidad en us-east-1 documentada
[ ] T15-09  Aurora: Data API disponibilidad regional documentada o marcada NEEDS_SPIKE
[ ] T15-10  Aurora: límites de Data API documentados (1MB, 45s timeout, ACU)
[ ] T15-11  Aurora: impacto en dual-path AGROSBO documentado
[ ] T15-12  Aurora: decisión recomendada para Spec 18 marcada como NO vinculante
[ ] T15-13  Ningún valor se afirma como IMPLEMENTED en las microvalidaciones
[ ] T15-14  Fuentes oficiales AWS citadas en ambos documentos
[ ] T15-15  No se usaron blogs secundarios como fuente principal
```

**Estado actual T15**:
- microvalidation-polly.md: ✓ CREADO (2026-07-27)
- microvalidation-aurora.md: ✓ CREADO (2026-07-27)

---

## T16 — Cleanup de recursos AWS (Checkpoint 3.6)

```
[ ] T16-01  cleanup-plan.md disponible y completado con nombres reales de recursos
            (Timestamp <TS> reemplazado con los valores reales creados en T10–T12)
[ ] T16-02  S1 cleanup ejecutado: sin recursos Bedrock residuales
[ ] T16-03  S2 cleanup: transcription jobs eliminados
[ ] T16-04  S2 cleanup: objetos S3 eliminados
[ ] T16-05  S2 cleanup: bucket S3 eliminado
[ ] T16-06  S2 cleanup: custom vocabulary eliminado (si se creó)
[ ] T16-07  S3 cleanup: mensajes SQS purgados
[ ] T16-08  S3 cleanup: EventBridge targets eliminados
[ ] T16-09  S3 cleanup: EventBridge rule eliminada
[ ] T16-10  S3 cleanup: SES event destination eliminado
[ ] T16-11  S3 cleanup: SES configuration set eliminado
[ ] T16-12  S3 cleanup: SQS queue eliminada
[ ] T16-13  IAM: AgrosboSpikeTemporaryPolicy detached del spike role
[ ] T16-14  IAM: AgrosboSpikeTemporaryPolicy eliminada
[ ] T16-15  Cleanup ejecutado dentro de la ventana de expiración de la policy
```

---

## T17 — Verificar cleanup y confirmar cero recursos residuales (Checkpoint 3.6)

```
[ ] T17-01  Zero buckets S3 con prefijo agrosbo-spike (aws s3 ls)
[ ] T17-02  Zero SQS queues con prefijo agrosbo-spike
[ ] T17-03  Zero EventBridge rules con prefijo agrosbo-spike
[ ] T17-04  Zero SES configuration sets con prefijo agrosbo-spike
[ ] T17-05  Zero Transcribe jobs con prefijo agrosbo-spike
[ ] T17-06  Zero IAM policies AgrosboSpikeTemporaryPolicy
[ ] T17-07  Zero CloudWatch log groups del spike (si aplica)
[ ] T17-08  Costo final confirmado en Billing Console: USD _______ (<= USD 3.50)
            Confirmación humana: _______________  Fecha: _______________
[ ] T17-09  Cost Anomaly Detection: sin alertas activas del spike
```

**PUERTA T17**: T17-01 a T17-09 confirmados + aprobación humana → proceder a T18.

---

## T18 — Actualizar capability-status-matrix y spec-map (Checkpoint 3.7)

```
[ ] T18-01  docs/spec-map.md: Spec 17 marcada COMPLETADA
[ ] T18-02  docs/roadmap/delivery-roadmap-v2.md: Spec 17 marcada completada con fecha
[ ] T18-03  docs/roadmap/delivery-roadmap-v2.md: estados de T01–T19 actualizados
[ ] T18-04  Ninguna capacidad marcada IMPLEMENTED basándose en resultados de spike
            (REQ-DIS-04: solo se puede anotar VERIFIED_IN_SPIKE)
[ ] T18-05  Si algún resultado del spike invalida un ADR: STOP REQUIRED reportado
            Estado actual: sin contradicción detectada
[ ] T18-06  Alineación documental: referencias a SES→SNS (si existen) marcadas como drift
            Ver: documentation-drift-report.md para lista de drifts identificados
[ ] T18-07  git diff --check en archivos modificados de docs/ → sin errores de whitespace
[ ] T18-08  npm run check:encoding sobre archivos de docs/ modificados → exit 0
```

---

## T19 — Handoff final y quality gates (Checkpoint 3.7)

### Quality gates

```
[ ] T19-QG-01  npm run format → exit 0 (sobre archivos del monorepo modificados)
[ ] T19-QG-02  npm run check:encoding → exit 0
[ ] T19-QG-03  npm run lint → 0 errores
[ ] T19-QG-04  npm run typecheck → exit 0
[ ] T19-QG-05  npm test → todas las pruebas pasan (sin degradación)
[ ] T19-QG-06  npm run build → exit 0
[ ] T19-QG-07  git diff --check → sin errores de whitespace
```

> Nota (runbook §10): el código bajo `spikes/critical-cloud/` tiene su propio
> `tsconfig.json` y no está incluido en los workspaces del monorepo para quality gates.
> Los archivos de docs/ y results/ sí aplican para check:encoding y format.

### Auditoría de seguridad pre-commit

```
[ ] T19-SEC-01  git grep -E "(SECRET|KEY|PASSWORD|TOKEN|ARN|ACCOUNT_ID)" spikes/critical-cloud/results/ → vacío o solo placeholders
[ ] T19-SEC-02  git grep -E "@[a-zA-Z0-9.]+\.[a-zA-Z]+" spikes/critical-cloud/results/ → vacío o solo operator@example.com
[ ] T19-SEC-03  Sin credenciales AWS en ningún archivo staged
[ ] T19-SEC-04  Sin account IDs reales en ningún archivo staged
```

### Verificación de staging

```
[ ] T19-GIT-01  git status -sb → solo archivos esperados en spikes/critical-cloud/results/**
[ ] T19-GIT-02  git diff --name-status → confirmar allowlist completa
[ ] T19-GIT-03  git ls-files --others --exclude-standard → sin archivos no tracked inesperados
[ ] T19-GIT-04  package-lock.json sin cambios: git diff --name-only | grep package-lock.json → vacío
[ ] T19-GIT-05  git diff --cached --check → sin errores de whitespace en staged
```

### Commit

```
[ ] T19-CMT-01  Stage únicamente: spikes/critical-cloud/results/**
                git add spikes/critical-cloud/results/
[ ] T19-CMT-02  Commit con mensaje autorizado:
                git commit -m "docs(spike): prepare phase 3 cloud evidence package"
                REQUIERE AUTORIZACIÓN HUMANA ANTES DE EJECUTAR
[ ] T19-CMT-03  Push a replit/spec-17-cloud-prep:
                git push origin replit/spec-17-cloud-prep
                REQUIERE AUTORIZACIÓN HUMANA
[ ] T19-CMT-04  PR creado contra main (no merge):
                gh pr create --title "docs(spike): prepare phase 3 cloud evidence package" \
                  --body "[RELLENAR]" --base main
                REQUIERE AUTORIZACIÓN HUMANA
[ ] T19-CMT-05  NO hacer merge — humano aprueba y hace merge
```

### Handoff final

```
[ ] T19-HO-01  Handoff estructurado producido (según runbook §13)
[ ] T19-HO-02  Handoff incluye: branch, HEAD, archivos creados, recursos AWS = 0,
               decisiones tomadas, quality gates, costos, git status
[ ] T19-HO-03  Confirmación explícita: 0 recursos AWS residuales
[ ] T19-HO-04  Confirmación explícita: 0 commits sin auth
[ ] T19-HO-05  Confirmación explícita: 0 pushes sin auth
[ ] T19-HO-06  Confirmación explícita: 0 deployments
[ ] T19-HO-07  Plan de commits propuesto (listo para ejecutar con auth humana)
```

---

## Estado de la Fase 3 — resumen

| Tarea | Estado |
|---|---|
| T01–T03 (Kickoff documental) | COMPLETED (en origin/main) |
| T04 (Preflight cloud) | PASS (según estado autoritativo) |
| T05 (IAM policies) | PASS — 4 políticas creadas y adjuntas |
| T06 (Harness S4) | PASS (según estado autoritativo) |
| T07 (Harness S1) | COMPLETED (harness en origin/main) |
| T08 (Harness S2) | COMPLETED (harness en origin/main) |
| T09 (Harness S3) | IN PROGRESS (Kiro trabajando en paralelo) |
| T13 (Ejecutar S4) | PARTIAL (Part A: 18/18 PASS; Part B: NOT REPRODUCED en Replit) |
| T15 (Microvalidaciones M1+M2) | READY — documentos creados en este paquete |
| T10–T12 (Ejecución cloud) | PENDING — requiere autorización humana y credenciales |
| T14 (Resumen ejecutivo) | PENDING — requiere T10–T12 |
| T16–T17 (Cleanup) | PENDING — requiere T10–T12 |
| T18–T19 (Cierre) | PENDING |

---

## Definition of Done — Spec 17 (tasks.md §8)

```
[ ] Requirements, Design y Tasks coherentes y trazables ✓ (completado)
[ ] phase-3-execution-runbook completo ✓ (completado)
[ ] delivery-roadmap-v2 y spec-map actualizados ✓ (completado en PR anterior)
[ ] Preflight cloud completado con region y permisos documentados ✓ (T04 PASS)
[ ] Harnesses S1–S4 creados y ejecutables ✓ (completado)
[ ] S1 (Bedrock tool calling): PASS o FAIL documentado con evidencia — PENDING (T10)
[ ] S2 (Transcribe voz agrícola): PASS o FAIL documentado con evidencia — PENDING (T11)
[ ] S3 (SES eventos): PASS o FAIL documentado con evidencia — PENDING (T12)
[ ] S4 (Token seguro): PASS documentado con evidencia — PARTIAL (Part B pendiente)
[ ] Microvalidaciones M1 y M2 documentadas ✓ (completado en este paquete)
[ ] Resumen ejecutivo producido — PENDING (T14)
[ ] Cleanup completado y verificado (0 recursos residuales) — PENDING (T16–T17)
[ ] Costos finales dentro del presupuesto aprobado — PENDING
[ ] Quality gates del monorepo verdes — PENDING (verificar en T19)
[ ] Cero modificaciones a api/src, web/src, shared, infra/src ✓
[ ] Cero dependencias del monorepo modificadas ✓
[ ] Spike code no importado por producción ✓
[ ] Ningún commit/push/PR/merge/deploy sin autorización ✓
[ ] Handoff final producido — PENDING (T19)
```
