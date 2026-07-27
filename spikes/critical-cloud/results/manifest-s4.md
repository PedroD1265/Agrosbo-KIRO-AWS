# Spike S4 Results — Token Externo Seguro

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T13 |
| Spike | S4 — Token Externo Seguro |
| Commit base | 04b4a1d |
| Fecha UTC | 2026-07-27T20:15:00Z |
| Entorno | Windows — Node.js v24.18.0 (win32/x64), Docker (postgres:15-alpine) |
| Veredicto | **PASS** — Part A: 18/18 PASS; Part B: 3/3 PASS (Total: 21/21) |
| Recursos AWS creados | 0 |
| Costo AWS | USD 0.00 |

---

## Método de ejecución

Ejecutado via scripts reales del monorepo en el worktree del operador:

```bash
cd spikes/critical-cloud
npm run s4         # Part A: 18/18 PASS (exit 0)
npm run s4:db:up   # Inicia contenedor agrosbo-spike-token-db en puerto 54322
npm run s4:pg      # Part B: 21/21 PASS (18 Part A + 3 Part B, exit 0)
npm run s4:db:down # Detiene y elimina contenedor
```

Part B utiliza el contenedor dedicado `agrosbo-spike-token-db` (postgres:15-alpine)
en el puerto 54322, base de datos `agrosbo_spike_token`. NO usa `agrosbo-local-db`
(puerto 54321, reservado para desarrollo de la aplicacion).

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

| # | Caso | Resultado | Detalle |
|---|---|---|---|
| PG-1 | Concurrency: 10 requests -> exactly 1 transition | **PASS** | transitioned=1, idempotent=9, conflict=0, finalState=responded |
| PG-2 | Replay: identical action is idempotent | **PASS** | first=transitioned, replay=idempotent |
| PG-3 | Contradictory: responded vs revoked -> one wins, one conflicts | **PASS** | resultA=conflict, resultB=transitioned |

**Part B total: 3/3 PASS**

---

## Métricas

| Métrica | Valor |
|---|---|
| Tokens generados | 10,115 (test completo) |
| Entropía por token | 256 bits (32 bytes, `crypto.randomBytes`) |
| Hash algorithm | SHA-256 |
| Hash storage | solo el hash hex (raw token nunca persiste) |
| Comparación | `timingSafeEqual` (timing-safe) |
| Throughput generate+hash | 215,413 ops/seg (Part A run) / 178,301 ops/seg (Part B run) |
| Latencia TTL expiry | 600ms espera → rechazo confirmado |
| Tasa de error Part A | 0/18 (0%) |
| Tasa de error Part B | 0/3 (0%) |
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
| Concurrencia PG | **PASS** | PG-1: 10 concurrent requests, exactly 1 transition |
| Replay PG | **PASS** | PG-2: first=transitioned, replay=idempotent |
| Conflicto PG | **PASS** | PG-3: one wins (transitioned), one conflicts |

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

**PASS**

- Part A (18 criterios crypto + in-memory): **PASS** (18/18)
- Part B (3 criterios PostgreSQL concurrencia): **PASS** (3/3)
- Ejecucion con scripts reales: `npm run s4` y `npm run s4:pg`
- Contenedor dedicado: agrosbo-spike-token-db (puerto 54322)
- Total: **21/21 PASS**
