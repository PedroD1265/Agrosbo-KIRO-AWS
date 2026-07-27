# Cleanup Plan — Fase 3 Spikes

## Propósito

Define el orden exacto de eliminación de todos los recursos AWS creados durante
los spikes S1–S3. Se ejecuta durante T16 y se verifica en T17.

**No ejecutar ahora.** Este plan se activa después de completar T10–T12.

Fuente: requirements.md REQ-CLN-01–05, design.md §10, runbook §6.

> Convenciones:
> - `<REGIÓN>` = región seleccionada en T04 (rellenar antes de ejecutar)
> - `<PERFIL>` = agrosbo-role (o nombre exacto del perfil con spike permissions)
> - `<TS>` = timestamp usado al crear el recurso (registrar durante T10–T12)
> - Todos los comandos son **propuestos** — el humano los ejecuta; el agente no ejecuta AWS CLI write.

---

## ORDEN DE EJECUCIÓN

```
S2 (bucket S3 temporal) → S3 (SQS + EventBridge + SES) → S1 (Bedrock: sin recursos) → IAM
```

Bedrock no crea recursos persistentes (solo invocación de modelo). S2 y S3 crean
recursos que generan costo por tiempo. IAM se elimina al final para que el operador
retenga permisos durante el cleanup.

---

## SECCIÓN 1 — S1: Bedrock

**HECHO**: Amazon Bedrock (Converse API / InvokeModel) no crea recursos persistentes.
No hay modelos custom, endpoints, ni configuraciones que persistan tras las llamadas.

```
[ ] 1-01  Confirmar que no se crearon recursos Bedrock inesperados:
          aws bedrock list-foundation-models --region us-east-1 --profile agrosbo-role
          (solo lectura — confirmar que no hay modelos custom ni endpoints custom)

[ ] 1-02  S1 CLEANUP CONFIRMADO: sin recursos residuales de Bedrock
```

---

## SECCIÓN 2 — S2: Transcribe (jobs + objetos + bucket + custom vocabulary)

### 2-A: Transcription jobs

```
[ ] 2-01  Listar jobs del spike:
          aws transcribe list-transcription-jobs \
            --status-equals COMPLETED \
            --region <REGIÓN> --profile <PERFIL> \
            --query "TranscriptionJobSummaries[?contains(TranscriptionJobName,'agrosbo-spike')]"

          También verificar jobs en otros estados (IN_PROGRESS, FAILED):
          aws transcribe list-transcription-jobs \
            --region <REGIÓN> --profile <PERFIL> \
            --query "TranscriptionJobSummaries[?contains(TranscriptionJobName,'agrosbo-spike')]"

[ ] 2-02  Eliminar cada job listado:
          aws transcribe delete-transcription-job \
            --transcription-job-name agrosbo-spike-<nombre-job> \
            --region <REGIÓN> --profile <PERFIL>
          Resultado esperado: exit 0
          Nota: AWS retiene metadata de jobs completados por un período; la eliminación
          es correcta aunque el job ya haya terminado.

[ ] 2-03  Verificar eliminación:
          aws transcribe list-transcription-jobs \
            --region <REGIÓN> --profile <PERFIL> \
            --query "TranscriptionJobSummaries[?contains(TranscriptionJobName,'agrosbo-spike')]"
          Resultado esperado: lista vacía
          Si NotFound: aceptable (ya eliminado o nunca existió).
```

### 2-B: Objetos S3 (audio + resultado Transcribe)

```
[ ] 2-04  Listar objetos en el bucket temporal:
          aws s3 ls s3://agrosbo-spike-audio-<TS>/ \
            --profile <PERFIL>
          Registrar todos los objetos listados.

[ ] 2-05  Eliminar todos los objetos del bucket:
          aws s3 rm s3://agrosbo-spike-audio-<TS>/ --recursive \
            --profile <PERFIL>
          Resultado esperado: "delete: s3://..." por cada objeto
          Verificación: aws s3 ls s3://agrosbo-spike-audio-<TS>/ → vacío
          Si bucket no existe: aceptable (NotFound) → pasar a 2-06 igualmente.

[ ] 2-06  Verificar que los resultados de Transcribe (output JSON) también fueron eliminados:
          aws s3 ls s3://agrosbo-spike-audio-<TS>/ → vacío o no existe
```

### 2-C: Bucket S3 temporal

```
[ ] 2-07  Eliminar el bucket (debe estar vacío):
          aws s3 rb s3://agrosbo-spike-audio-<TS> --force \
            --profile <PERFIL>
          Resultado esperado: "remove_bucket: s3://agrosbo-spike-audio-<TS>"
          Precondición: 2-05 completado (bucket vacío)
          STOP condition: si "--force" falla con BucketNotEmpty → re-ejecutar 2-05

[ ] 2-08  Verificar eliminación del bucket:
          aws s3 ls | grep agrosbo-spike
          Resultado esperado: sin output
          Si NotFound en 2-07: aceptable → confirmar 2-08 igual.
```

### 2-D: Custom vocabulary (solo si se creó)

```
[ ] 2-09  Verificar si se creó un custom vocabulary durante T11:
          aws transcribe list-vocabularies \
            --name-contains agrosbo-spike \
            --region <REGIÓN> --profile <PERFIL>
          Si la lista está vacía: pasar a sección 3.

[ ] 2-10  Eliminar custom vocabulary (solo si existe):
          aws transcribe delete-vocabulary \
            --vocabulary-name agrosbo-spike-vocab-<TS> \
            --region <REGIÓN> --profile <PERFIL>
          Resultado esperado: exit 0
          Nota: puede tardar unos segundos en desaparecer de la lista.

[ ] 2-11  Verificar eliminación:
          aws transcribe list-vocabularies --name-contains agrosbo-spike \
            --region <REGIÓN> --profile <PERFIL>
          Resultado esperado: lista vacía
```

**S2 CHECKPOINT**: todos los ítems 2-01 a 2-11 marcados → S2 cleanup completo.

---

## SECCIÓN 3 — S3: SES / EventBridge / SQS

**Orden**: eliminar EventBridge targets → eliminar
EventBridge rule → eliminar SES event destination → eliminar SES configuration set
→ eliminar SQS queue → eliminar identidad SES temporal (si corresponde).

### 3-A: EventBridge targets

```
[ ] 3-01  Listar targets de la regla del spike:
          aws events list-targets-by-rule \
            --rule agrosbo-spike-ses-rule-<TS> \
            --region <REGIÓN> --profile <PERFIL>
          Registrar los IDs de targets.

[ ] 3-04  Eliminar todos los targets de la regla:
          aws events remove-targets \
            --rule agrosbo-spike-ses-rule-<TS> \
            --ids <id-del-target> \
            --region <REGIÓN> --profile <PERFIL>
          Resultado esperado: FailedEntryCount=0
          STOP condition: si FailedEntryCount > 0 → reportar al humano antes de continuar.
          Si la regla no existe (NotFound): aceptable → pasar a 3-05.
```

### 3-B: EventBridge rule

```
[ ] 3-05  Eliminar la regla EventBridge:
          aws events delete-rule \
            --name agrosbo-spike-ses-rule-<TS> \
            --region <REGIÓN> --profile <PERFIL>
          Precondición: 3-04 completado (targets eliminados; la regla no puede
          eliminarse con targets activos)
          Resultado esperado: exit 0
          Si NotFound: aceptable.

[ ] 3-06  Verificar eliminación:
          aws events list-rules \
            --name-prefix agrosbo-spike \
            --region <REGIÓN> --profile <PERFIL>
          Resultado esperado: lista vacía
```

### 3-C: SES event destination

```
[ ] 3-07  Eliminar el event destination del configuration set:
          aws sesv2 delete-configuration-set-event-destination \
            --configuration-set-name agrosbo-spike-ses-config-20260727 \
            --event-destination-name agrosbo-spike-eb-dest \
            --region us-east-1 --profile agrosbo-role
          Resultado esperado: exit 0
          Si NotFound: aceptable.
```

### 3-D: SES configuration set

```
[ ] 3-08  Eliminar el configuration set:
          aws sesv2 delete-configuration-set \
            --configuration-set-name agrosbo-spike-ses-config-20260727 \
            --region us-east-1 --profile agrosbo-role
          Resultado esperado: exit 0
          Si NotFound: aceptable.

[ ] 3-09  Verificar eliminación:
          aws sesv2 list-configuration-sets --region <REGIÓN> --profile <PERFIL>
          Resultado esperado: agrosbo-spike-config-<TS> no aparece en la lista
```

### 3-E: SQS queue

```
[ ] 3-10  Eliminar la cola SQS:
          aws sqs delete-queue \
            --queue-url <QueueUrl-de-3-01> \
            --region <REGIÓN> --profile <PERFIL>
          Resultado esperado: exit 0
          Nota: la cola puede tardar hasta 60s en desaparecer de list-queues.
          Si NotFound: aceptable.

[ ] 3-11  Verificar eliminación:
          aws sqs list-queues \
            --queue-name-prefix agrosbo-spike \
            --region <REGIÓN> --profile <PERFIL>
          Resultado esperado: sin URLs con prefijo agrosbo-spike
```

### 3-F: Identidad SES temporal (solo si se creó una exclusivamente para el spike)

```
[ ] 3-12  Verificar si se creó una identidad SES exclusivamente para el spike:
          La identidad del operador (correo personal/dominio) NO debe eliminarse.
          Solo eliminar si se creó una identidad desechable específicamente para el spike.

[ ] 3-13  Eliminar identidad temporal del spike (SOLO si aplica, con confirmación humana):
          aws sesv2 delete-email-identity \
            --email-identity spike-<TS>@<dominio-temporal> \
            --region <REGIÓN> --profile <PERFIL>
          CONFIRMACIÓN HUMANA REQUERIDA antes de ejecutar este paso.
          Resultado esperado: exit 0
```

**S3 CHECKPOINT**: todos los ítems 3-01 a 3-13 (o N/A donde corresponda) marcados
→ S3 cleanup completo.

---

## SECCIÓN 4 — IAM

**Orden**: detach de la política → delete de la política.
Ejecutar **al final**, después de que S2 y S3 cleanup estén completos.

```
[ ] 4-01  Detach AgrosboSpikeTemporaryPolicy del role:
          aws iam detach-role-policy \
            --role-name <spike-role-name> \
            --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/AgrosboSpikeTemporaryPolicy \
            --profile agrosbo (o login — requiere permisos IAM)
          Resultado esperado: exit 0
          Precondición: cleanup S2 y S3 completos (no se necesitan más permisos de spike)
          STOP condition: si hay recursos de spike sin eliminar → completar cleanup antes de detach

[ ] 4-02  Verificar que la política está desconectada:
          aws iam list-attached-role-policies \
            --role-name <spike-role-name>
          Resultado esperado: AgrosboSpikeTemporaryPolicy no aparece

[ ] 4-03  Eliminar la política:
          aws iam delete-policy \
            --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/AgrosboSpikeTemporaryPolicy
          Precondición: 4-01 completado (política no puede eliminarse si está adjunta)
          Resultado esperado: exit 0

[ ] 4-04  Verificar eliminación:
          aws iam list-policies \
            --query "Policies[?contains(PolicyName,'AgrosbоSpike')]"
          Resultado esperado: lista vacía
```

---

## SECCIÓN 5 — Verificación final (T17)

```
[ ] 5-01  Zero buckets S3 con prefijo agrosbo-spike:
          aws s3 ls | grep agrosbo-spike  →  sin output

[ ] 5-02  Zero SQS queues con prefijo agrosbo-spike:
          aws sqs list-queues --queue-name-prefix agrosbo-spike  →  vacío

[ ] 5-03  Zero EventBridge rules con prefijo agrosbo-spike:
          aws events list-rules --name-prefix agrosbo-spike  →  vacío

[ ] 5-04  Zero SES configuration sets con prefijo agrosbo-spike:
          aws sesv2 list-configuration-sets  →  ninguno con agrosbo-spike

[ ] 5-05  Zero Transcribe jobs con prefijo agrosbo-spike:
          aws transcribe list-transcription-jobs --query "..." | grep agrosbo-spike  →  vacío

[ ] 5-06  Zero IAM policies con nombre AgrosboSpikeTemporaryPolicy:
          aws iam list-policies | grep AgrosboSpikeTemporaryPolicy  →  vacío

[ ] 5-07  Costo final verificado en Billing Console:
          Total USD: _______  (≤ USD 3.50)
          Confirmación humana: _______________

[ ] 5-08  CloudWatch log groups del spike eliminados (si existieron):
          aws logs describe-log-groups --log-group-name-prefix "/aws/bedrock"  →  vacío de spike
          aws logs describe-log-groups --log-group-name-prefix "/aws/transcribe"  →  vacío de spike

[ ] 5-09  Zero recursos con tag spike en Resource Groups (verificación complementaria):
          aws resourcegroupstaggingapi get-resources \
            --tag-filters Key=spike,Values=s1,s2,s3 \
            --region <REGIÓN>
          Resultado esperado: ResourceTagMappingList vacío
```

**CLEANUP COMPLETO**: todos los ítems 5-01 a 5-09 confirmados → T17 PASS.

---

## Registro de cleanup

| Recurso | Creado en | Eliminado en | Confirmación |
|---|---|---|---|
| Bucket `agrosbo-spike-audio-<TS>` | T11 | PENDING | — |
| Transcription jobs (batch) | T11 | PENDING | — |
| Custom vocabulary (si aplica) | T11 | PENDING | — |
| SQS queue `agrosbo-spike-ses-events-<TS>` | T12 | PENDING | — |
| EventBridge rule `agrosbo-spike-ses-rule-<TS>` | T12 | PENDING | — |
| SES configuration set `agrosbo-spike-config-<TS>` | T12 | PENDING | — |
| SES event destination | T12 | PENDING | — |
| AgrosboSpikeTemporaryPolicy | T05 | PENDING | — |
