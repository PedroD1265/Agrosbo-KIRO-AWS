# Handoff final — Fase 3 / Spec 17

## Identidad del bloque

| Campo | Valor |
|---|---|
| Rama | `feat/spec-17-final-closeout` |
| HEAD inicial | `ae118f81b4e9236f4b30e85ccf71c3848bc6d304` |
| Baseline remoto | `origin/main` en el mismo HEAD inicial |
| Fecha | 2026-07-28 |
| Alcance | T14–T19 |
| Commit autorizado | `docs(spec-17): close critical cloud spikes` |
| Merge | No autorizado; no ejecutar |

## Resultado S1–S4

| Spike | Estado | Nota |
|---|---|---|
| S1 Bedrock | **BLOCKED_EXTERNAL_QUOTA** | Auth, IAM, endpoint y Nova Lite/Micro alcanzados; tool calling no evaluado |
| S2 Transcribe | **PASS** | Streaming `es-US`; 3/3 live; WER promedio 18.1% |
| S3 SES/EventBridge/SQS | **PASS** | 6/6 live + 60/60 locales; correlación y cleanup PASS |
| S4 token seguro | **PASS** | 18/18 local + 3/3 PostgreSQL en manifest |

No se realizaron nuevos intentos Bedrock durante el cierre. La validación
funcional de S1 queda diferida a Spec 21.

## Archivos creados

- `spikes/critical-cloud/results/summary.md`
- `spikes/critical-cloud/results/handoff-spec-17-final-closeout.md`

## Archivos modificados

- `.kiro/specs/critical-cloud-spikes/tasks.md`
- `docs/spec-map.md`
- `docs/roadmap/delivery-roadmap-v2.md`
- `docs/roadmap/phase-3-execution-runbook.md`
- `docs/product/capability-status-matrix.md`
- `spikes/critical-cloud/results/cleanup-plan.md`
- `spikes/critical-cloud/results/cost-matrix.md`
- `spikes/critical-cloud/results/documentation-drift-report.md`
- `spikes/critical-cloud/results/manifest-s1.md`
- `spikes/critical-cloud/results/microvalidation-polly.md`
- `spikes/critical-cloud/results/microvalidation-aurora.md`
- `spikes/critical-cloud/results/phase-3-closeout-checklist.md`

## AWS ejecutado

Perfil temporal: `agrosbo-role`. Región: `us-east-1`. Identificadores sensibles
omitidos.

Consultas read-only:

```text
sts get-caller-identity
s3api list-buckets
sqs list-queues
events list-rules / list-targets-by-rule
sesv2 list-configuration-sets / get-configuration-set-event-destinations
transcribe list-transcription-jobs / list-vocabularies
logs describe-log-groups
iam list-policies
polly describe-voices
ce get-cost-and-usage
```

Invocaciones Bedrock: 0.

Comandos AWS de escritura/eliminación: 0. El inventario estaba vacío.

## Recursos encontrados y eliminados

| Tipo | Encontrados | Eliminados | Residuales |
|---|---:|---:|---:|
| S3 buckets/objects del spike | 0 | 0 | 0 |
| Transcribe jobs/vocabularies | 0 | 0 | 0 |
| SQS queues | 0 | 0 | 0 |
| EventBridge rules/targets | 0 | 0 | 0 |
| SES config sets/destinations | 0 | 0 | 0 |
| CloudWatch log groups del spike | 0 | 0 | 0 |
| `AgrosboSpikeTemporaryPolicy` | 0 | 0 | 0 |

Verificación final: `ZERO_RESIDUE_ALL=true`.

La identidad SES verificada y `AgrosboDeveloperRole` fueron preservados.

## Billing y waiver

Costo final: **PENDING_HUMAN_BILLING_CONFIRMATION**.

Cost Explorer respondió con períodos `Estimated=true`; no había cargos
publicados y atribuibles para todos los servicios del spike. No se inventó un
importe ni se interpretó el pendiente como USD 0.00.

Waiver humano explícito concedido el 2026-07-28 para cerrar Spec 17 con Billing
pendiente. Riesgo residual: confirmar el importe final cuando Billing se
actualice.

## Validaciones

| Gate | Resultado |
|---|---|
| Format | PASS |
| Encoding | PASS |
| Lint | PASS — 0 errores, 154 warnings |
| Typecheck | PASS |
| Unit tests | PASS final — 132/132 |
| Build | PASS |
| Diff check | PASS |
| Spike TypeScript | PASS |
| S1 dry-run | 12/12 PASS; cero AWS |
| S2 dry-run | 40/40 PASS; cero AWS |
| S3 dry-run | 60/60 PASS; cero AWS |
| S4 local | 18/18 PASS |

El primer test run coincidió con build y tuvo cinco timeouts; el rerun aislado
pasó 132/132 sin cambiar código ni timeouts. S1 dry-run imprimió 12/12 PASS,
pero retuvo un handle después del resultado; no hubo ejecución live.

## Auditoría y límites

- Cero cambios en `api/src`, `web/src`, `shared`, `infra/src`.
- Cero cambios de dependencias o lockfile.
- Cero credenciales, account IDs, ARNs reales, correos privados o rutas
  personales en el paquete final.
- Cero recursos AWS creados durante el cierre.
- Cero deploys, `cdk bootstrap`, `cdk deploy` o `cdk destroy`.
- Los resultados de spike no se presentan como `IMPLEMENTED`.
- La región de producción, el modelo Bedrock y las arquitecturas finales siguen
  diferidos.
- No se inicia Spec 18.
- No se hace merge.

## Estado Git para publicación

Todos los cambios pertenecen al allowlist autorizado. Se stagean por ruta
explícita, se crea un único commit autorizado, se hace push de la rama y se abre
un PR draft contra `main`. La URL y el SHA resultantes se reportan fuera de este
archivo al finalizar la publicación.
