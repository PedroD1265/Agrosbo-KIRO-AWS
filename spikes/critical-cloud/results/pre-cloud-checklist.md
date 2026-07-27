# Pre-Cloud Checklist — Fase 3 Ejecución

## Propósito

Este checklist se ejecuta paso a paso antes de T10 (primera ejecución cloud).
Cada ítem debe tener estado: `[ ]` = pendiente, `[x]` = confirmado, `[!]` = STOP REQUIRED.

Fuente: design.md §10.2, requirements.md §5–8, runbook §4–8.

---

## SECCIÓN A — IDENTIDAD

```
[ ] A-01  Sesión AWS activa: aws sts get-caller-identity (exit 0)
[ ] A-02  Campo "Account" en output de A-01 coincide con la cuenta aprobada
          Account ID esperado: [CONFIRMAR CON HUMANO — no hardcodear]
[ ] A-03  Campo "UserId" / "Arn" corresponde al perfil agrosbo-role
          Verificar: "Arn" contiene "assumed-role/AgrosboDeveloperRole"
[ ] A-04  Perfil correcto en uso:
          export AWS_PROFILE=agrosbo-role  (o equivalente según configuración local)
          aws configure list --profile agrosbo-role
[ ] A-05  MFA confirmado: PENDING HUMAN CONFIRMATION
          (El humano confirma que la sesión se obtuvo mediante aws login/MFA.
          SerialNumber en el ARN de get-caller-identity no es prueba suficiente de MFA.)
[ ] A-06  Región configurada correctamente:
          aws configure get region --profile agrosbo-role
          Debe coincidir con la región seleccionada en T04
[ ] A-07  AgrosboSpikeTemporaryPolicy adjunta a AgrosboDeveloperRole:
          aws iam list-attached-role-policies --role-name AgrosboDeveloperRole
          Debe aparecer AgrosboSpikeTemporaryPolicy (aditiva a ReadOnlyAccess)
```

**HARD STOP A**: Si A-01 falla o A-03 muestra perfil incorrecto
→ **STOP REQUIRED**: no continuar con ningún harness cloud.

---

## SECCIÓN B — IAM

```
[ ] B-01  AgrosboSpikeTemporaryPolicy existe:
          aws iam list-policies --query "Policies[?PolicyName=='AgrosboSpikeTemporaryPolicy']"
          PENDING HUMAN CONFIRMATION
[ ] B-02  Política está adjunta a AgrosboDeveloperRole:
          aws iam list-attached-role-policies --role-name AgrosboDeveloperRole
          Debe aparecer AgrosboSpikeTemporaryPolicy
          PENDING HUMAN CONFIRMATION
[ ] B-03  Expiry de la sesión RUN vigente:
          aws sts get-caller-identity → verificar que la sesión no expira durante la ejecución (~1h)
          Si expira en < 30 min → re-autenticar antes de iniciar T10
[ ] B-04  Expiración CLEANUP planificada: el humano confirma cuándo expira la policy temporal
          y que el cleanup se ejecutará antes de esa fecha
[ ] B-05  ReadOnlyAccess sigue intacta en AgrosboDeveloperRole (no modificada):
          aws iam list-attached-role-policies --role-name AgrosboDeveloperRole
          Debe aparecer ReadOnlyAccess Y AgrosboSpikeTemporaryPolicy
[ ] B-06  Trust policy de AgrosboDeveloperRole intacta (solo permite assume desde la cuenta correcta):
          aws iam get-role --role-name AgrosboDeveloperRole --query "Role.AssumeRolePolicyDocument"
[ ] B-07  Policy validada por humano (sin wildcards en Resource donde se puede scoping):
          aws iam get-policy-version --policy-arn <arn> --version-id v1
[ ] B-08  Plan de rollback preparado: el humano puede detach + delete la policy en < 5 min si
          se detecta uso anómalo
```

**HARD STOP B**: Si B-01 falla (política no existe), B-03 muestra sesión expirada, o B-07
muestra permisos más amplios que los aprobados → **STOP REQUIRED**.

---

## SECCIÓN C — PRESUPUESTO

```
[ ] C-01  Presupuesto total aprobado: <= USD 3.50 (confirmado por humano en T05)
          Registrar valor aprobado: USD _______
[ ] C-02  Límite S1 (Bedrock): <= USD 2.00
          PROPOSED ALLOCATION — PENDING HUMAN APPROVAL
[ ] C-03  Límite S2 (Transcribe): <= USD 1.00
          PROPOSED ALLOCATION — PENDING HUMAN APPROVAL
[ ] C-04  Límite S3 (SES/EventBridge/SQS): <= USD 0.50
          PROPOSED ALLOCATION — PENDING HUMAN APPROVAL
[ ] C-05  Budget Alert activo en AWS Billing:
          Consola AWS → Billing → Budgets → confirmar alerta activa para este ciclo de facturación
          CONFIRMACIÓN HUMANA REQUERIDA (no verificable via CLI sin permisos de billing)
[ ] C-06  Cost Anomaly Detection activo:
          Consola AWS → Billing → Cost Anomaly Detection → confirmar detector activo
          CONFIRMACIÓN HUMANA REQUERIDA
[ ] C-07  Costo acumulado actual del ciclo: USD _______ (verificar en Billing Console antes de T10)
          Confirmar que hay margen suficiente para USD 3.50 adicionales
[ ] C-08  Condición de parada documentada y entendida:
          Si el costo estimado de una operación supera el límite del spike, ABORT antes de ejecutar.
          Si el costo real post-ejecución supera el límite aprobado, STOP REQUIRED para T11/T12.
```

**HARD STOP C**: Si C-05 o C-06 no están activos → **STOP REQUIRED** antes de cualquier
ejecución cloud (ver REQ-COST-03).

---

## SECCIÓN D — BEDROCK (pre-T10)

```
[ ] D-01  Región us-east-1 (o región seleccionada en T04) confirmada para Bedrock:
          aws bedrock list-foundation-models --region <región> (exit 0)
[ ] D-02  Modelo candidato identificado en T04 y soporta tool calling:
          Modelo candidato: ____________________
          Verificar: aws bedrock list-foundation-models --query "modelSummaries[?contains(modelId,'<modelo>')]"
[ ] D-03  Model access aprobado (no requiere solicitud adicional en consola):
          Consola AWS → Bedrock → Model access → confirmar "Access granted" para el modelo
          CONFIRMACIÓN HUMANA REQUERIDA
[ ] D-04  Acuerdo de uso del modelo firmado (si aplica para el proveedor):
          CONFIRMACIÓN HUMANA REQUERIDA (algunos modelos requieren EULA adicional)
[ ] D-05  Model ID exacto documentado para el harness:
          BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
          (en .env local, no commitear)
[ ] D-06  Harness S1 pasa en dry-run (sin AWS):
          cd spikes/critical-cloud && npm run s1  →  exit 0
[ ] D-07  Fixtures de S1: no se requieren fixtures de archivo.
          El harness usa herramientas simuladas inline (tool-registry.ts).
```

**HARD STOP D**: Si D-03 muestra que el model access no está aprobado → **STOP REQUIRED**
(ver REQ-STP-01). El humano debe solicitar acceso en la consola antes de continuar.

---

## SECCIÓN E — TRANSCRIBE (pre-T11)

```
[ ] E-01  Harness S2 pasa en dry-run (sin AWS):
          cd spikes/critical-cloud && npm run s2  →  exit 0
[ ] E-02  Clips de audio: PENDING — preparation corresponds to T11.
          Polly TTS or manual recording TBD. No fixtures directory exists yet.
[ ] E-03  Clips sin PII (sin voz real del operador si se decide no commitar):
          Confirmar que los clips son sintéticos (Polly TTS o equivalente)
[ ] E-04  Formato compatible con Transcribe:
          WAV: PCM 16-bit LE, 16,000 Hz, mono (validado por harness S2 wav-parser)
[ ] E-05  Locales candidatos documentados:
          Candidatos: es-US, es-ES, es-MX (no se selecciona ganador en T08)
          Locale definitivo: se decide en T11
[ ] E-06  Baseline sin Custom Vocabulary planificado:
          Primera ejecución: sin custom vocabulary → registrar WER baseline
          Segunda ejecución (si presupuesto lo permite): con custom vocabulary → registrar mejora
[ ] E-07  Bucket S3 temporal para batch no existe todavía (cleanup previo confirmado):
          aws s3 ls | grep agrosbo-spike → sin resultados
[ ] E-08  Nombre del bucket temporal planificado:
          agrosbo-spike-audio-334856751415-20260727
[ ] E-09  Plan de cleanup de bucket documentado y listo para ejecutar después de T11
```

**HARD STOP E**: Si E-01 falla o E-02 muestra directorio vacío → **STOP REQUIRED** para
T11 hasta que los clips y el harness estén listos.

---

## SECCIÓN F — SES (pre-T12)

```
[ ] F-01  Modo sandbox confirmado:
          aws sesv2 get-account --query "SendingEnabled,ProductionAccessEnabled"
          SendingEnabled=true, ProductionAccessEnabled=false → sandbox OK
[ ] F-02  Identidad de remitente verificada en SES:
          aws sesv2 list-email-identities
          Debe aparecer al menos una identidad con VerificationStatus=SUCCESS
          Remitente (sanitizado): operator@<dominio-verificado>
[ ] F-03  Dirección de destinatario:
          success@simulator.amazonses.com (genera evento Delivery)
          No usar bounce@simulator.amazonses.com (fuera del alcance de S3)
[ ] F-04  Configuration set NO existe aún (confirmar nombre no colisiona):
          aws sesv2 list-configuration-sets | grep agrosbo-spike → sin resultados
          Si existe de una ejecución anterior: eliminarlo antes de continuar
[ ] F-05  Nombre de configuration set planificado:
          agrosbo-spike-ses-config-20260727
[ ] F-06  EventBridge rule NO existe aún:
          aws events list-rules --region <región> | grep agrosbo-spike → sin resultados
          Nombre planificado: agrosbo-spike-ses-rule-20260727
[ ] F-07  Cola SQS NO existe aún:
          aws sqs list-queues --queue-name-prefix agrosbo-spike → sin resultados
          Nombre planificado: agrosbo-spike-ses-events-20260727
[ ] F-08  Queue policy para EventBridge → SQS planificada y revisada por humano
          (ver design.md §6.2 paso 2e)
[ ] F-09  Cleanup ejecutable en < 10 min confirmado (humano tiene permisos para delete-queue,
          delete-rule, delete-configuration-set)
```

**HARD STOP F**: Si F-02 muestra que no hay identidad verificada → **STOP REQUIRED**
para T12. El humano debe verificar una dirección en la consola SES antes de continuar.

---

## SECCIÓN G — GIT

```
[ ] G-01  Rama activa: creada específicamente para la ejecución/evidencia
          git branch --show-current  →  CURRENT_EXECUTION_BRANCH=<registrar al ejecutar>
[ ] G-02  HEAD actualizado desde main:
          git log -1 --oneline  →  CURRENT_HEAD=<registrar al ejecutar>
          Confirmar: origin/main integrado en la historia
[ ] G-03  Working tree limpio (solo archivos esperados del paquete de Fase 3):
          git status -sb  →  solo archivos en spikes/critical-cloud/results/
[ ] G-04  Ningún archivo en stage sin intención:
          git diff --cached --name-only  →  vacío o solo archivos del paquete Fase 3
[ ] G-05  results/ no contiene secretos:
          git grep -E "(SECRET|KEY|PASSWORD|TOKEN|ARN|ACCOUNT_ID)" spikes/critical-cloud/results/ → vacío o solo placeholders
[ ] G-06  package-lock.json sin cambios accidentales:
          git diff --name-only | grep package-lock.json  →  sin output
[ ] G-07  Stash de hooks locales aislado (si el operador tiene hooks que podrían ejecutarse):
          Confirmar que los hooks de pre-commit no bloquean el staging de los archivos de results/
```

---

## SECCIÓN H — HARD STOPS

Cualquiera de las siguientes condiciones activa **STOP REQUIRED** inmediatamente:

```
[ ] H-01  AccessDenied en cualquier AWS CLI durante el preflight
[ ] H-02  Perfil incorrecto (no agrosbo-role o equivalente de spike)
[ ] H-03  Región incorrecta (diferente a la seleccionada en T04)
[ ] H-04  Policy expirada o no adjunta
[ ] H-05  Presupuesto ya excedido o Cost Anomaly Detection no activo
[ ] H-06  Identidad SES sin verificar (para T12)
[ ] H-07  Recurso preexistente conflictivo (bucket, queue, config set con nombre que colisiona)
[ ] H-08  Cleanup plan no disponible o incompleto
[ ] H-09  Secretos detectados en cualquier archivo del repo (git grep)
[ ] H-10  Working tree no limpio con archivos inesperados
```

---

## Estado del checklist

| Sección | Ítems | Completados | STOP activo |
|---|---|---|---|
| A — Identidad | 7 | 0 | — |
| B — IAM | 8 | 0 | — |
| C — Presupuesto | 8 | 0 | — |
| D — Bedrock | 7 | 0 | — |
| E — Transcribe | 9 | 0 | — |
| F — SES | 9 | 0 | — |
| G — Git | 7 | 0 | — |
| H — Hard stops | 10 | N/A | — |

**Condición para proceder a T10**: todas las secciones A–G sin ningún `[!]` activo.
