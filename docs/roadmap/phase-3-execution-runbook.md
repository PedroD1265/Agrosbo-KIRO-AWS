# AGROSBO Phase 3 Execution Runbook

> **Estado: COMPLETADA — 2026-07-28.**
>
> Spec activa: `.kiro/specs/critical-cloud-spikes/` (Spec 17).
> Rama de cierre: `feat/spec-17-final-closeout`.

## Convenciones normativas

- **REQUISITO**: condicion obligatoria.
- **AUTORIZACION**: permiso humano explicito y limitado a un bloque.
- **PROHIBICION**: accion no permitida.
- **STOP REQUIRED**: detener toda escritura y devolver un informe.
- **HITO INTERNO**: checkpoint que el agente completa y valida sin detenerse.
- **PUERTA HUMANA**: limite de bloque donde el agente debe detenerse.
- **APROBADO**: solo existe cuando el prompt humano mas reciente lo declara.

## 1. Proposito

Este runbook dirige la Fase 3 de AGROSBO: validacion tecnica de servicios AWS
criticos mediante spikes aislados. El objetivo es obtener evidencia de viabilidad
antes de construir la infraestructura de produccion (Spec 18+).

## 2. Prerrequisitos

- Fase 0: COMPLETADA (PR #3 merged).
- Fase 1: COMPLETADA (PRs #4, #5 merged; workstation-readiness cerrado).
- Fase 2: COMPLETADA (PR #11 merged; Spec 16 cerrada; gobernanza operativa).
- Spec de referencia: `.kiro/specs/critical-cloud-spikes/`.
- Rama de kickoff: `docs/spec-17-kickoff`.
- Baseline: `bfedd57` (HEAD de main al iniciar Fase 3).
- Working tree principal: `<WORKTREE_PRIMARY>` (escritor único).
- Worktree de auditoria: `<WORKTREE_AUDIT>` (solo lectura).
- Codex: candidato para harnesses (worktree propio) despues de aprobar Design.

### Fuentes de gobernanza vigentes

Las siguientes fuentes rigen las politicas de comandos, cambios AWS y costos
para esta fase:
- `AGENTS.md` (raiz) — gobernanza general.
- `infra/AGENTS.md` — restricciones locales de infraestructura.
- `docs/agents/command-policy.md` — clasificacion de comandos.
- `docs/architecture/aws-service-plan.md` — servicios aprobados y justificados.
- Skill `aws-change-plan` — procedimiento para cambios AWS.

Nota: los archivos `docs/agents/aws-change-policy.md` y
`docs/agents/cloud-cost-policy.md` no existen en el repositorio. No deben
crearse como parte de esta Spec. Las fuentes listadas arriba son suficientes.

## 3. Topologia de agentes

| Agente | Working tree | Modo | Rol en Fase 3 |
|--------|-------------|------|---------------|
| Kiro | `<WORKTREE_PRIMARY>` | Escritor principal | Spec, runbook, harnesses, ejecucion, evaluacion |
| Antigravity | `<WORKTREE_AUDIT>` | Solo lectura | Auditoria de resultados y cleanup |
| Codex | `<WORKTREE_DELEGATED>` | Escritor delegado | Harnesses (solo si aprobado post-Design) |
| Humano | `<WORKTREE_PRIMARY>` | Autoridad final | IAM, presupuesto, commit, push, PR, merge |

### Responsabilidades especificas

- **Kiro**: responsable de la Spec. Planifica, implementa harnesses, ejecuta
  spikes, evalua resultados, produce handoffs.
- **Antigravity**: auditor de solo lectura. Revisa coherencia, sanitizacion,
  cleanup y PRs.
- **Codex**: candidato para implementar harnesses. Solo autorizado despues de
  aprobar Design (Checkpoint 3.1) y con worktree y rama propios. Su allowlist
  no se solapa con la de Kiro.
- **Humano**: crea roles IAM, aprueba presupuesto, ejecuta commits/push/merge,
  toma decisiones de region y modelo.

## 4. Preflight obligatorio

Antes de cualquier escritura:

```powershell
git branch --show-current
git status --short
git log -5 --oneline --decorate
git diff --check
git worktree list
```

### Condiciones de fallo

| Condicion | Accion |
|-----------|--------|
| Rama distinta a la autorizada | STOP REQUIRED |
| Archivos no reconocidos en working tree | STOP REQUIRED |
| HEAD no coincide con el esperado | STOP REQUIRED |
| Errores de whitespace | Corregir si en allowlist; STOP si fuera |

## 5. Checkpoints y puertas humanas

| Checkpoint | Objetivo | Puerta humana |
|-----------|----------|---------------|
| 3.1 | Kickoff documental | Aprobacion de Spec completa (R+D+T) |
| 3.2 | Preflight cloud | Aprobacion de region, permisos y presupuesto |
| 3.3 | Harnesses locales | Aprobacion de estructura y codigo antes de cloud |
| 3.4 | Ejecucion AWS | Resultados obtenidos; aprobacion para continuar |
| 3.5 | Evaluacion | Resumen y microvalidaciones aprobadas |
| 3.6 | Cleanup | Verificacion de 0 recursos residuales |
| 3.7 | Cierre | Handoff final; aprobacion para commit/push/PR |

## 6. Clasificacion de comandos (Fase 3)

### Automaticamente seguros

```text
git status, git log, git diff, git branch (list), git remote
git worktree list, git show, git rev-parse, git grep
npm run format (check), npm run lint, npm run typecheck
npm test, npm run build, npm run check:encoding
npm run db:check, git diff --check
Lectura de archivos, busquedas
```

### Seguros dentro de spikes/critical-cloud/ (sin auth adicional)

```text
npx tsx (solo dentro de spikes/critical-cloud/, solo para S4 local)
node (solo dentro de spikes/critical-cloud/, solo para S4 local)
npm run (scripts locales del spike que no invoquen AWS)
```

### Requieren autorizacion humana

```text
git commit, git push, git branch (crear), git tag
gh pr create
npm install (siempre, incluyendo dentro de spikes/critical-cloud/)
Ejecucion de harnesses que invocan AWS (npx tsx harnesses/s1|s2|s3)
AWS CLI write commands (create/delete/update/put) para recursos del spike
Creacion o eliminacion de IAM roles/policies
Cambios a package.json raiz o package-lock.json raiz
Archivos fuera de la allowlist del checkpoint activo
```

### Permitidos en Fase 3 (con tarea aprobada)

```text
aws sts get-caller-identity (preflight cloud)
aws bedrock list-foundation-models (preflight cloud)
aws sesv2 get-account (preflight cloud)
aws sesv2 list-email-identities (preflight cloud)
aws sesv2 get-email-identity (preflight cloud)
aws s3 ls (verificacion)
aws sqs list-queues (verificacion/cleanup)
aws events list-rules (verificacion/cleanup)
AWS CLI write commands para recursos del spike (con tarea aprobada):
  s3: create-bucket, put-object, delete-object, delete-bucket
  sqs: create-queue, delete-queue
  events: put-rule, put-targets, delete-rule, remove-targets
  ses: send-email (solo a sandbox-verified)
  sesv2: create-configuration-set, create-configuration-set-event-destination,
         delete-configuration-set, delete-configuration-set-event-destination
  transcribe: start-transcription-job
```

### Prohibidos sin excepcion

```text
git push --force, git reset --hard, git clean -fd, git branch -D
git rebase -i, git merge (por agente)
cdk deploy, cdk destroy, cdk bootstrap, cdk synth
AWS CLI write operations fuera del scope del spike
Creacion de VPC, Lambda, API Gateway, Aurora, CloudFront
Modificacion de .git/config
rm -rf en directorios del proyecto (excepto cleanup de spike artifacts)
Modificacion de api/src, web/src, shared, infra/src
Modificacion de package.json raiz
```

## 7. Gestion de credenciales

### Principios

- Solo credenciales temporales (STS session tokens).
- Rol de spike con permisos minimos (creado por humano).
- Variables de entorno, nunca archivos de credenciales en el repo.
- `.env` excluido por `.gitignore`.
- Al expirar: re-autenticacion manual.

### Flujo

```text
Humano → aws login (MFA) → assume spike role → exportar vars → harness usa
```

### Permisos propuestos (borrador sujeto a generacion y revision en Checkpoint 3.2)

| Spike | Acciones IAM (borrador) |
|-------|-------------|
| S1 | bedrock:InvokeModel (Converse), bedrock:InvokeModelWithResponseStream (ConverseStream, opcional), bedrock:ListFoundationModels (discovery) |
| S2 streaming (obligatorio) | transcribe:StartStreamTranscription |
| S2 batch (fallback) | transcribe:StartTranscriptionJob, transcribe:GetTranscriptionJob, s3:PutObject, s3:GetObject |
| S3 | ses:SendEmail, sesv2:CreateConfigurationSet, sesv2:CreateConfigurationSetEventDestination, sesv2:DeleteConfigurationSet, sesv2:DeleteConfigurationSetEventDestination, events:PutRule, events:PutTargets, events:DeleteRule, events:RemoveTargets, sqs:CreateQueue, sqs:ReceiveMessage, sqs:DeleteMessage, sqs:DeleteQueue, sqs:GetQueueAttributes, sqs:SetQueueAttributes |
| S4 | Ninguno (local; PostgreSQL local para concurrencia) |

> **Nota IAM Bedrock**: No existe `bedrock:Converse` como acción IAM.
> Converse API utiliza `bedrock:InvokeModel`; ConverseStream utiliza
> `bedrock:InvokeModelWithResponseStream`.

Esta tabla es un borrador preliminar. La politica IAM definitiva se genera y
revisa durante el Checkpoint 3.2 usando documentacion actual de AWS.

## 8. Gestion de costos

### Propuestas de presupuesto (sujetas a aprobacion humana)

| Spike | Presupuesto propuesto | Justificacion |
|-------|----------------------|---------------|
| S1 | <= USD 2.00 | ~5 invocaciones de modelo con tool calling |
| S2 | <= USD 1.00 | ~5 clips de 15s = ~75s de transcripcion |
| S3 | <= USD 0.50 | ~10 correos SES + EventBridge/SQS minimal |
| S4 | USD 0.00 | Ejecucion local |
| **Total** | **<= USD 3.50** | Ceiling propuesto |

### Controles

- **Soft stop**: el harness estima costo antes de cada operacion; aborta si
  proyecta exceder el budget.
- **Hard stop**: el humano revisa costos reales en la consola AWS tras la
  ejecucion; si excede el budget aprobado, se detiene la fase.
- **Budget alerts**: deben estar activas antes de ejecutar (confirmacion humana
  en T04/T05).
- **Cost Anomaly Detection**: debe estar activo (confirmacion humana).

### Registro de costos

Cada manifest registra:
- Presupuesto aprobado.
- Costo estimado previo.
- Costo real post-ejecucion (o mejor estimacion disponible).

## 9. Que se hace manualmente vs por CLI/SDK

| Accion | Metodo | Responsable |
|--------|--------|-------------|
| Crear rol/politica IAM de spike | AWS Console o CLI | Humano |
| Verificar model access en Bedrock | AWS Console | Humano |
| Solicitar model access (si necesario) | AWS Console | Humano |
| Verificar SES sandbox status | AWS CLI (read) o Console | Humano o Kiro (read-only) |
| Verificar direcciones SES verificadas | AWS CLI (read) o Console | Humano o Kiro (read-only) |
| Activar Budget alerts | AWS Console | Humano |
| Instalar dependencias del spike (`npm install`) | CLI | Humano |
| Escribir codigo de harnesses | Editor/IDE | Kiro/Codex |
| Ejecutar harnesses que invoquen AWS write | CLI (`npx tsx`) | Humano |
| Crear recursos temporales del spike | CLI/Console | Humano |
| Eliminar recursos post-spike | CLI/Console | Humano |
| Eliminar politica IAM | AWS Console o CLI | Humano |
| Aprobar presupuesto | Prompt humano | Humano |
| Analizar outputs sanitizados | Lectura | Kiro |
| Producir manifests de resultados | Editor | Kiro |
| Commit, push, PR | git CLI | Humano (Kiro propone, humano ejecuta) |

### Separacion de responsabilidades agente/humano

- **Kiro/Codex** preparan codigo, comandos propuestos y documentacion.
- **El humano** ejecuta: `npm install`, harnesses que invocan AWS write,
  creacion/eliminacion de recursos AWS, y toda operacion de escritura cloud.
- **Kiro/Codex NO ejecutan** AWS CLI write, creacion ni eliminacion de recursos.
- Los agentes analizan outputs sanitizados provistos por el humano.

## 10. Quality gates

| Gate | Comando | Criterio |
|------|---------|----------|
| Format | `npm run format` | Exit 0 |
| Encoding | `npm run check:encoding` | Exit 0 |
| Lint | `npm run lint` | 0 errores |
| Typecheck | `npm run typecheck` | Exit 0 |
| Unit tests | `npm test` | Todas pasan |
| Build | `npm run build` | Exit 0 |
| Whitespace | `git diff --check` | Sin errores |

### Nota sobre spike code

El spike bajo `spikes/critical-cloud/` tiene su propio `tsconfig.json` y no
esta incluido en los workspaces del monorepo. Los quality gates del monorepo
no evaluan el spike directamente. Sin embargo:
- Los archivos del monorepo creados/modificados (docs, spec-map, etc.) SI deben
  pasar todos los gates.
- El spike code debe compilar localmente sin errores.

## 11. STOP REQUIRED — Condiciones

El agente aplica STOP REQUIRED inmediatamente cuando:

- Un spike excede el presupuesto aprobado.
- Los permisos requeridos exceden lo propuesto.
- Un servicio critico no esta disponible en ninguna region accesible.
- Se detecta contradiccion con product-scope-v2 o un ADR.
- Se requiere modificar codigo de produccion.
- El cleanup no puede completarse (recursos residuales).
- Credenciales o secretos aparecen en output artifacts.
- El Bedrock model access requiere aprobacion que no ha sido concedida.
- Una decision humana es necesaria (region, modelo, presupuesto).
- Un quality gate del monorepo falla y no es corregible dentro de la allowlist.
- Se detecta un archivo fuera de la allowlist.
- Se necesita commit, push, PR, merge o deploy.

## 12. Politica Git (Fase 3)

| Accion | Politica |
|--------|----------|
| Commit | Solo con autorizacion humana; staging por nombre de archivo |
| Push | Solo a feature branch; nunca a main |
| Branch (crear) | Solo con autorizacion humana |
| PR | Solo con autorizacion; titulo < 70 chars |
| Merge | Solo humano |
| Convencion | `type(scope): description` (tipos: docs, chore, spike, feat) |

## 13. Handoff entre sesiones

Al final de cada bloque o sesion, producir handoff con:
- Branch, HEAD.
- Checkpoint activo.
- Archivos creados/modificados.
- Recursos AWS creados (y su estado).
- Decisiones tomadas.
- Quality gates.
- Costos incurridos.
- Git status.
- Confirmacion de: no commit sin auth, no push sin auth, no deploy.
- Condicion: STOP REQUIRED o continuar.

Al reanudar:
1. Leer este runbook.
2. Leer ultimo handoff.
3. Ejecutar preflight.
4. Verificar coherencia.
5. Continuar dentro del bloque autorizado.

## 14. Autorizaciones humanas requeridas

| Punto | Decision humana |
|-------|----------------|
| Post-T03 | Aprobar Spec 17 (Requirements + Design + Tasks) |
| Pre-T05 | Aprobar presupuesto y region |
| T05 | Crear/aprobar IAM role de spike |
| Pre-T10 | Aprobar inicio de ejecucion cloud |
| Post-T17 | Confirmar cleanup completo |
| Post-T19 | Autorizar commit y push |

## 15. Delegacion a Codex

### Condiciones para activar Codex

- Design aprobado (post-Checkpoint 3.1).
- Worktree creado: `<WORKTREE_DELEGATED>` con rama dedicada.
- Allowlist exclusiva: solo `spikes/critical-cloud/harnesses/<spike-asignado>/`.
- Sin solapamiento de archivos con Kiro.
- Human approval explicito por tarea delegada.

### Restricciones de Codex

- No modifica docs/, .kiro/, package.json raiz.
- No ejecuta AWS commands.
- No hace commit ni push.
- Entrega codigo via handoff; Kiro integra.

## 16. Definition of Done — Fase 3 (Spec 17)

- [x] Spec 17 (R+D+T) aprobada y coherente.
- [x] Runbook (este documento) aprobado.
- [x] Preflight cloud completado con region y permisos documentados.
- [x] Harnesses S1–S4 implementados y ejecutables.
- [x] S1 cerrado como BLOCKED_EXTERNAL_QUOTA; S2–S4 PASS.
- [x] Microvalidaciones M1 y M2 documentadas.
- [x] Resumen ejecutivo producido.
- [x] Cleanup verificado: 0 recursos AWS residuales.
- [x] Billing PENDING_HUMAN_BILLING_CONFIRMATION bajo waiver humano explícito.
- [x] Quality gates del monorepo verdes.
- [x] Cero modificaciones a api/src, web/src, shared, infra/src.
- [x] Cero dependencias del monorepo modificadas.
- [x] Spike code no importado por produccion.
- [x] Ningun commit/push/PR/merge/deploy sin autorizacion.
- [x] Handoff final producido.
- [x] Alineacion documental completada (spec-map, delivery-roadmap).

## 17. Siguiente fase

Al cerrar Spec 17:
- Los resultados informan decisiones de Spec 18 (aws-infrastructure-baseline).
- La region validada alimenta la decision de produccion (no la fija).
- El modelo Bedrock validado informa Spec 21 (no fija modelo definitivo).
- Los costos observados informan el presupuesto de produccion.
- El patron de token validado informa Spec 24.
- Los resultados SES informan Spec 24.

Spec 17 está cerrada. No se inicia Spec 18 sin una autorización humana nueva y
explícita.
