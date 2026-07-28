# Spike S1 Results — Bedrock Tool Calling

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T10 |
| Spike | S1 — Bedrock Tool Calling |
| Commit base | 156036a |
| Fecha UTC | 2026-07-28 |
| Region | us-east-1 |
| Perfil AWS | agrosbo-role (assumed-role/AgrosboDeveloperRole/agrosbo-local) |
| Modelo primario | amazon.nova-lite-v1:0 |
| Modelo fallback | amazon.nova-micro-v1:0 |
| Presupuesto aprobado | USD 2.00 |
| Presupuesto consumido | UNKNOWN — invocacion funcional no completada |
| Recursos AWS creados | 0 |
| STATUS | **BLOCKED_EXTERNAL_QUOTA** |

---

## Intentos de ejecucion

### Intento 1 — Nova Lite

| Campo | Valor |
|---|---|
| Modelo | amazon.nova-lite-v1:0 |
| Success | false |
| Iterations | 1 |
| Tool calls | 0 |
| Stop reason | error |
| Error | ThrottlingException: Too many tokens per day, please wait before trying again. |
| Exit code | 1 |

### Intento 2 — Nova Micro (fallback aprobado)

| Campo | Valor |
|---|---|
| Modelo | amazon.nova-micro-v1:0 |
| Success | false |
| Iterations | 1 |
| Tool calls | 0 |
| Stop reason | error |
| Error | ThrottlingException: Too many tokens per day, please wait before trying again. |
| Exit code | 1 |

---

## Desglose por etapa

| Etapa | Resultado | Evidencia |
|---|---|---|
| Autenticacion AWS | **PASS** | Credenciales temporales exportadas desde agrosbo-role resolvieron correctamente. No hubo error MFA ni AccessDenied. |
| IAM (permisos) | **PASS** | AgrosboSpikeS1BedrockPolicy v2 adjunta a AgrosboDeveloperRole. Autoriza ambos modelos. El request alcanzo el endpoint (no hubo AccessDenied). |
| Modelo y endpoint alcanzados | **PASS** | El servicio respondio con ThrottlingException (no con ModelNotFound ni AccessDenied), confirmando que el request llego al endpoint Converse. |
| Invocacion funcional completada | **BLOCKED** | Ambos modelos rechazados por cuota diaria antes de generar respuesta. |
| Tool use emitido por modelo | **NOT EVALUATED** | No hubo respuesta del modelo. |
| Tool result enviado | **NOT EVALUATED** | No aplica (no hubo tool_use). |
| Composicion final | **NOT EVALUATED** | No aplica. |

---

## IAM verificado

| Campo | Valor |
|---|---|
| Policy | AgrosboSpikeS1BedrockPolicy |
| Version activa | v2 |
| Action | bedrock:InvokeModel |
| Resources | amazon.nova-lite-v1:0, amazon.nova-micro-v1:0 |
| Region condition | us-east-1 |
| Date condition | antes de 2026-08-01T23:59:59Z |

---

## Tokens y costo

| Campo | Valor |
|---|---|
| Tokens de entrada | UNKNOWN (request rechazado antes de procesamiento) |
| Tokens de salida | UNKNOWN |
| Latencia funcional | N/A (error inmediato) |
| Costo facturado | UNKNOWN — verificar en AWS Billing Console |

---

## Criterios PASS/FAIL

| Criterio | Resultado | Evidencia |
|---|---|---|
| Invocacion de modelo — respuesta valida | **BLOCKED** | ThrottlingException en ambos modelos |
| Tool use — modelo emite tool_use | **NOT EVALUATED** | 0 tool calls |
| Composicion — modelo integra tool_result | **NOT EVALUATED** | No hubo respuesta |
| Latencia < 30s | **NOT EVALUATED** | Error inmediato |
| Costo dentro de USD 2.00 | **UNKNOWN** | Verificar billing |

---

## Cleanup S1

```
[x] Bedrock: sin recursos persistentes — confirmado
[x] Sin log groups creados
[x] Sin endpoints custom
```

---

## Veredicto

**BLOCKED_EXTERNAL_QUOTA**

Auth (PASS), IAM (PASS), endpoint (PASS). Invocacion funcional no completada
en ninguno de los dos modelos autorizados. Tool calling no evaluado.

---

## Decisión de cierre

Por decisión humana del 2026-07-28, S1 se cierra como
**BLOCKED_EXTERNAL_QUOTA**. No es PASS ni fallo de código. No se realizan nuevas
invocaciones Bedrock en Spec 17. La validación funcional de tool calling,
`tool_use`, `tool_result`, composición y latencia se difiere a Spec 21.

El costo final permanece **PENDING_HUMAN_BILLING_CONFIRMATION**. Un waiver
humano explícito permite cerrar Spec 17 sin interpretar el costo pendiente como
USD 0.00.
