# Spike S4 Results — Token Externo Seguro

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T13 |
| Spike | S4 — Token Externo Seguro |
| Commit base | 44da638 |
| Fecha UTC | 2026-07-27T19:59:46Z |
| Entorno | Replit workspace — Node.js v22.22.0 (linux/x64) |
| Veredicto | **PARTIAL** — Part A: 18/18 PASS; Part B: NOT REPRODUCED |
| Recursos AWS creados | 0 |
| Costo AWS | USD 0.00 |

---

## Método de ejecución

`tsx` no está instalado en este entorno (sin `node_modules` del spike; `npm install`
requiere autorización humana según el runbook §6). El harness Part A utiliza
exclusivamente módulos built-in de Node.js (`node:crypto`, `node:perf_hooks`), por lo
que se ejecutó la misma lógica inline usando:

```
/nix/store/bl6iwirn83qj9r8wng43kfdqd5mfahj8-nodejs-22.22.0/bin/node --input-type=module
```

El código ejecutado es idéntico al de
`harnesses/s4-token-secure/{token-service.ts,index.ts}` — se inlineó el mismo
algoritmo sin modificaciones funcionales para evitar el problema de resolución de
extensiones `.js` de TypeScript en ESM. Toda afirmación de PASS corresponde a
ejecución real en este entorno.

**Part B (PostgreSQL concurrencia)**: requiere el contenedor Docker dedicado
`agrosbo-spike-token-db` en el puerto 54322. Docker no está disponible en el entorno
Replit. Marcado como NOT REPRODUCED.

---

## Casos ejecutados — Part A (Crypto + in-memory)

| # | Caso | Resultado | Detalle |
|---|---|---|---|
| 1 | Generation: 32 bytes, base64url | **PASS** | `length=32, format=bV67tery...` |
| 2 | Generation: 100 tokens all unique | **PASS** | `unique=100/100` |
| 3 | Hash: SHA-256 produces 64-char hex | **PASS** | `hash=18ab05af4c8a9cd5...` |
| 4 | Hash: deterministic (same input → same output) | **PASS** | hashes match |
| 5 | Hash: different tokens → different hashes | **PASS** | hashes differ |
| 6 | Validation: valid token accepted | **PASS** | `valid=true` |
| 7 | Validation: unknown token rejected | **PASS** | `reason=token_not_found` |
| 8 | TTL: expired token rejected | **PASS** | `reason=token_expired` |
| 9 | Revocation: transition succeeds | **PASS** | `success=true, newState=revoked` |
| 10 | Revocation: revoked token rejected | **PASS** | `reason=token_revoked` |
| 11 | Transition: sent → opened_link | **PASS** | `sent → opened_link` |
| 12 | Transition: opened_link → responded | **PASS** | `opened_link → responded` |
| 13 | Transition: responded → completed | **PASS** | `responded → completed` |
| 14 | Transition: illegal (sent → completed) rejected | **PASS** | `error=invalid_transition: sent -> completed` |
| 15 | Transition: reverse (responded → opened_link) rejected | **PASS** | `error=invalid_transition: responded -> opened_link` |
| 16 | Idempotency: repeated transition returns idempotent=true | **PASS** | `idempotent=true` |
| 17 | Idempotency: state unchanged after repeat | **PASS** | `state=opened_link` |
| 18 | Throughput: generate+hash > 1000 ops/sec | **PASS** | `163,592 ops/sec (10,000 iterations in 61ms)` |

**Part A total: 18/18 PASS**

---

## Casos — Part B (PostgreSQL concurrencia)

| # | Caso | Resultado | Bloqueo |
|---|---|---|---|
| PG-1 | Concurrency: 10 requests → exactly 1 transition | **NOT REPRODUCED** | Docker no disponible en Replit; contenedor `agrosbo-spike-token-db:54322` no puede iniciarse sin autorización humana |
| PG-2 | Replay: identical action is idempotent | **NOT REPRODUCED** | Mismo bloqueo |
| PG-3 | Contradictory: responded vs revoked → one wins, one conflicts | **NOT REPRODUCED** | Mismo bloqueo |

**Impacto en veredicto de T13**: el criterio "Concurrencia PG: 10 solicitudes
concurrentes producen una sola transición" (requirements.md §9) requiere PostgreSQL. No
habiendo evidencia reproducida en este entorno, el veredicto formal es **PARTIAL**.

El estado autoritativo del proyecto (`T06/S4: PASS`) corresponde a ejecución en el
worktree del operador (`D:\Pedro\AGROBO`) donde el contenedor sí estuvo disponible.

---

## Métricas

| Métrica | Valor |
|---|---|
| Tokens generados | 10,115 (test completo) |
| Entropía por token | 256 bits (32 bytes, `crypto.randomBytes`) |
| Hash algorithm | SHA-256 |
| Hash storage | solo el hash hex (raw token nunca persiste) |
| Comparación | `timingSafeEqual` (timing-safe) |
| Throughput generate+hash | 163,592 ops/seg |
| Latencia TTL expiry | 600ms espera → rechazo confirmado |
| Tasa de error Part A | 0/18 (0%) |
| Costo AWS | USD 0.00 |

---

## Criterios S4 vs requisitos (requirements.md §9)

| Criterio | Estado | Evidencia |
|---|---|---|
| Generación ≥ 32 bytes, base64url, entropía criptográfica | **PASS** | Caso 1: length=32, base64url, `crypto.randomBytes` |
| Hash SHA-256 coincide con persistido | **PASS** | Casos 3–5: determinista, hex 64 chars, differs por token |
| Token válido → acceso; token inválido → rechazo | **PASS** | Casos 6–7 |
| TTL: token expirado → rechazo | **PASS** | Caso 8: 500ms TTL, verificado a 600ms |
| Revocación → rechazo | **PASS** | Casos 9–10 |
| Idempotencia | **PASS** | Casos 16–17: repeated transition → `idempotent=true`, estado no avanza |
| Transición válida | **PASS** | Casos 11–13: sent→opened_link→responded→completed |
| Transición inválida | **PASS** | Casos 14–15: sent→completed y responded→opened_link rechazados |
| Concurrencia PG | **NOT REPRODUCED** | Ver Part B |
| Replay PG | **NOT REPRODUCED** | Ver Part B |
| Conflicto PG | **NOT REPRODUCED** | Ver Part B |

---

## Datos sanitizados

- Sin datos de usuarios reales.
- Sin credenciales AWS.
- Sin correos electrónicos.
- Fragmentos de tokens mostrados: prefijo de 8 chars únicamente.
- Fragmentos de hashes: primeros 16 chars únicamente.
- IDs de tarea: sintéticos (`task-100` … `task-106`).

---

## Decisiones para Spec 24 (informativas, no vinculantes)

- Token opaco con `crypto.randomBytes(32)` + base64url es viable y eficiente para
  producción (163k ops/sec confirma que el overhead criptográfico es despreciable).
- `timingSafeEqual` para comparación de hashes es correcto; mantener en implementación
  productiva.
- `SELECT FOR UPDATE` + conditional UPDATE es el patrón correcto para concurrencia en
  PostgreSQL (diseño validado en código; ejecución pendiente de confirmación humana).
- TTL de expiración y revocación son independientes y ambos deben permanecer en la
  máquina de estados final.

---

## Veredicto

**PARTIAL**

- Part A (18 criterios crypto + in-memory): **PASS**
- Part B (3 criterios PostgreSQL concurrencia): **NOT REPRODUCED** en este entorno.
- Estado autoritativo del operador: **PASS** (T06/S4 confirmado en prompt de sesión).
- Bloqueante para PARTIAL: Docker no disponible en Replit workspace sin autorización.
- Siguiente acción requerida: el humano ejecuta `npm run s4:db:up && npm run s4:pg` en
  el worktree local para confirmar Part B y actualizar este manifest con resultados.
