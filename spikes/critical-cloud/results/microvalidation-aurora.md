# Microvalidación M2 — Aurora PostgreSQL Serverless v2 + Data API

## Metadata

| Campo | Valor |
|---|---|
| Tarea | T15 |
| Tipo | Documental — sin creación de clústeres ni consultas cloud |
| Fecha de verificación | 2026-07-27 |
| Región objetivo | us-east-1 (provisional; decisión de producción en Spec 18) |
| Fuente primaria | Documentación oficial AWS (enlaces citados inline) |

> Toda afirmación se etiqueta: **HECHO** (documentación oficial), **INFERENCIA**
> (razonamiento sobre documentación), **NEEDS_SPIKE** (requiere ejecución real para
> confirmarse), o **VERIFIED_BY_DOCUMENTATION** (verificable sin ejecutar). Ningún
> valor se marca como IMPLEMENTED.

---

## 1. Aurora PostgreSQL Serverless v2

**VERIFIED_BY_DOCUMENTATION**:
https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html

Aurora Serverless v2 es la versión actual de Aurora Serverless. Aurora Serverless v1
está en EOL. Este documento cubre Aurora Serverless v2 exclusivamente.

---

## 2. Disponibilidad en us-east-1

**VERIFIED_BY_DOCUMENTATION**: Aurora Serverless v2 está disponible en `us-east-1`.
`us-east-1` es la región de referencia con mayor disponibilidad de Aurora.

Referencia: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.RegionsAndAvailabilityZones.html

**NEEDS_SPIKE**: confirmar disponibilidad del engine PostgreSQL específico con:
```
aws rds describe-db-engine-versions \
  --engine aurora-postgresql \
  --query "DBEngineVersions[?SupportedEngineModes[?contains(@,'serverless')]]" \
  --region us-east-1
```

---

## 3. Versiones de PostgreSQL compatibles con Aurora Serverless v2

**VERIFIED_BY_DOCUMENTATION**:
https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html

Aurora Serverless v2 soporta las mismas versiones de engine que Aurora Provisioned:

| Versión engine | Compatible con SV2 | Notas |
|---|---|---|
| Aurora PostgreSQL 16 | Sí (desde versiones recientes) | Versión recomendada para nuevos proyectos |
| Aurora PostgreSQL 15 | Sí | Estable y ampliamente disponible |
| Aurora PostgreSQL 14 | Sí | Disponible; considera migración a 15/16 |
| Aurora PostgreSQL 13 | Sí (con limitaciones) | EOL aproximado; no recomendado para nuevos proyectos |

**INFERENCIA**: Para AGROSBO (nuevo proyecto), usar PostgreSQL 16 o 15. La elección
definitiva se documenta en la Spec 18 Design tras verificar versión exacta disponible en
la región seleccionada.

**NEEDS_SPIKE (decisión Spec 18)**: verificar versión mínima de patch disponible con el
comando anterior.

---

## 4. Data API

**VERIFIED_BY_DOCUMENTATION**:
https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html

El Data API de Aurora permite ejecutar consultas SQL via HTTP sin mantener conexiones
TCP persistentes. Es relevante para AGROSBO porque el código ya implementa una ruta
dual local/cloud (según capability-status-matrix.md: Data API path en estado PARTIAL).

### 4.1 Disponibilidad regional del Data API

**VERIFIED_BY_DOCUMENTATION**: el Data API está disponible en `us-east-1` para Aurora
Serverless v2 con PostgreSQL.

Lista de regiones soportadas: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html#data-api.regions

**INFERENCIA**: `sa-east-1` (São Paulo) puede no soportar Data API para Aurora SV2. Si
la región de producción es `sa-east-1`, se requiere verificación antes de Spec 18.

**NEEDS_SPIKE**: confirmar con:
```
aws rds describe-db-clusters --region <región-seleccionada> 2>&1 | grep -i "data-api"
# O desde consola: crear un clúster Aurora SV2 PostgreSQL y verificar si "Data API" está
# disponible como opción en la región.
```

---

## 5. Compatibilidad: Data API, engine version, y configuración

**VERIFIED_BY_DOCUMENTATION**:

Requisitos para usar Data API con Aurora Serverless v2 PostgreSQL:
1. El clúster debe estar en una región que soporte Data API.
2. El clúster debe tener Data API habilitado explícitamente al crear (`--enable-http-endpoint`).
3. Las credenciales se gestionan via AWS Secrets Manager (obligatorio — no hay usuario/contraseña inline).
4. Engine: Aurora PostgreSQL (no Aurora MySQL).

**HECHO**: Data API NO está disponible para Aurora Serverless v2 PostgreSQL en todas
las regiones. La disponibilidad varía. `us-east-1` está documentado como soportado.

---

## 6. Límites del Data API

**VERIFIED_BY_DOCUMENTATION**:
https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html#data-api.limits

| Límite | Valor | Impacto en AGROSBO |
|---|---|---|
| Tamaño máximo de request | 1 MB | Sin impacto para operaciones CRUD estándar |
| Tamaño máximo de response | 1 MB | Sin impacto para consultas típicas; riesgo en listados grandes sin paginación |
| Número de columnas por resultado | 100 | Sin impacto |
| Timeout de ejecución | 45 segundos | Sin impacto para queries típicas CRUD |
| Número de transacciones por segundo | ~30 concurrentes por clúster | **Impacto potencial**: bajo carga alta puede ser restrictivo; revisar en Spec 18 |
| Tiempo máximo de transacción | 300 segundos | Sin impacto para spikes; verificar en transacciones largas de producción |
| Campos máximos en transacción | 1,000 | Sin impacto |

**INFERENCIA — riesgo para AGROSBO**: el límite de 1MB de response puede ser un
problema si se implementan listados sin paginación en vistas de cosecha o inventario.
La implementación de producción (Spec 18+) debe aplicar paginación en todas las queries
que devuelvan colecciones.

---

## 7. Timeout

**VERIFIED_BY_DOCUMENTATION**: Data API tiene un timeout de 45 segundos por statement.
Las conexiones TCP directas (pg driver) no tienen este límite de statement fijo.

| Modo de conexión | Timeout statement | Conexión persistente |
|---|---|---|
| Data API | 45s | No (HTTP stateless) |
| VPC + pg driver | Configurable en app | Sí (pool de conexiones) |

---

## 8. Transacciones en Data API

**VERIFIED_BY_DOCUMENTATION**: el Data API soporta transacciones explícitas:
- `BeginTransaction` → obtiene `transactionId`
- `ExecuteStatement` (con `transactionId`)
- `CommitTransaction` / `RollbackTransaction`

**INFERENCIA — impacto en AGROSBO**: el patrón de concurrencia de S4
(`SELECT FOR UPDATE` + `UPDATE`) requiere transacciones. Con Data API, esto se
implementa via `BeginTransaction`/`CommitTransaction`. La lógica es más verbose que
con pg driver pero es soportada.

**NEEDS_SPIKE (M2 ejecutable en Spec 18)**: verificar que `SELECT FOR UPDATE` funciona
correctamente via Data API antes de depender de él en Spec 18.

---

## 9. Secrets Manager (requisito para Data API)

**VERIFIED_BY_DOCUMENTATION**: el Data API requiere que las credenciales del clúster
estén en AWS Secrets Manager. El ARN del secret se pasa en cada llamada.

IAM mínimo conceptual (no una política deployable — ver REQ-IAM-02):

```
Conceptual (NO copiar como política de producción):
- rds-data:ExecuteStatement
- rds-data:BeginTransaction
- rds-data:CommitTransaction
- rds-data:RollbackTransaction
- rds-data:BatchExecuteStatement
- secretsmanager:GetSecretValue (sobre el secret de credenciales de Aurora)
```

---

## 10. Costos de Aurora Serverless v2

**VERIFIED_BY_DOCUMENTATION**:
https://aws.amazon.com/rds/aurora/pricing/

**NEEDS OFFICIAL VERIFICATION de precios actuales** — verificar en la consola de AWS.

Estructura de costos (metodología conocida):

| Componente | Unidad | Notas |
|---|---|---|
| ACU-hora (Aurora Capacity Unit) | Por ACU-hora consumida | Se factura en incrementos de 0.5 ACU |
| Storage | Por GB-mes | ~$0.10/GB-mes (HECHO: escala automáticamente) |
| I/O | Por millón de solicitudes de I/O | Solo en modo "standard"; no en "I/O Optimized" |
| Data API requests | Sin costo adicional por request HTTP | El costo es solo el ACU-time |
| Backup storage | Por GB-mes | Retención por defecto: 1 día |

**Comportamiento de ACU**: el clúster escala entre el mínimo y máximo configurado.
Con ACU mínimo = 0: el clúster se "pausa" tras período de inactividad (tiempo de
cold start de decenas de segundos). Con ACU mínimo = 0.5: permanece "warm".

**Estimación para entorno de desarrollo** (INFERENCIA, verificar precios actuales):
- Dev activo 8h/día × 0.5 ACU × ~$0.12/ACU-hora ≈ USD 0.48/día.
- Dev inactivo el resto del tiempo (ACU = 0 si se configura así).
- **RECOMENDACIÓN**: ACU mínimo = 0.5 para dev (evita cold start en CI/health checks).

---

## 11. Capacidad mínima y máxima

| Parámetro | Rango | Notas |
|---|---|---|
| ACU mínimo | 0 (pausa automática) a 0.5 | Pausa automática solo disponible con ACU mínimo = 0 |
| ACU máximo | 0.5 a 128 | Para producción AGROSBO P0: 8–16 ACU es un punto de partida razonable |
| Incremento de escala | 0.5 ACU | Escala automáticamente en incrementos de 0.5 ACU |

**INFERENCIA**: Para el spike de Spec 18, usar ACU mínimo = 0.5, máximo = 4 para
contener costos durante la validación.

**NEEDS_SPIKE**: verificar si ACU mínimo = 0 con pausa automática está disponible para
Aurora SV2 PostgreSQL en la región seleccionada (la pausa automática tiene
disponibilidad regional variable).

---

## 12. Escalamiento

**VERIFIED_BY_DOCUMENTATION**: Aurora Serverless v2 escala en segundos (no minutos
como v1). El escalamiento es automático y no requiere intervención del operador.

Diferencia clave con Aurora Serverless v1:
- v1: escala en pasos discretos; tiempo de escala ~30–60s; pausa en inactividad.
- v2: escala continua; tiempo de escala ~segundos; pausa opcional solo si ACU_min = 0.

---

## 13. Cold start y latencia esperada

| Escenario | Latencia esperada | Fuente |
|---|---|---|
| Clúster AVAILABLE, warm (ACU_min > 0) | <10ms de overhead vs pg directo | INFERENCIA |
| Clúster pausado (ACU_min = 0), primer request | 20–60 segundos de cold start | VERIFIED_BY_DOCUMENTATION |
| Primera consulta via Data API (HTTP overhead) | +50–100ms vs pg driver en VPC | INFERENCIA (HTTP + TLS + validación Secrets Manager) |
| Consultas subsiguientes via Data API | +10–30ms vs pg driver en VPC | INFERENCIA |

**RECOMENDACIÓN para AGROSBO**: el health check `/health/ready` no tolerará 20–60s de
cold start. Configurar ACU mínimo = 0.5 para mantener el clúster warm en todos los
entornos donde el health check debe pasar.

**NEEDS_SPIKE**: medir cold start real en M2 ejecutable durante Spec 18 con un clúster
de prueba en `us-east-1`.

---

## 14. Conexiones directas vs Data API

| Criterio | Data API | VPC + pg driver directo |
|---|---|---|
| Complejidad de setup | Baja (no VPC para Lambda, solo IAM + Secrets Manager) | Alta (Lambda dentro de VPC, security groups, subnets) |
| Latencia de query | +50–150ms vs pg directo | Baseline |
| Escalabilidad de conexiones | No tiene límite de conexiones (HTTP stateless) | Limitada por `max_connections` de Aurora (~600 para 2 ACU) |
| Tamaño de response | Límite de 1MB | Sin límite de capa de aplicación |
| Transacciones | Soportadas vía API explícita | Nativo (BEGIN/COMMIT) |
| `SELECT FOR UPDATE` | Soportado vía transacciones API | Nativo |
| Streaming de resultados | No | Posible con cursors |
| Driver existente en AGROSBO | Implementado (Data API path PARTIAL) | Implementado (local pg driver) |

---

## 15. Impacto en el dual-path local/cloud de AGROSBO

**HECHO** (capability-status-matrix.md): el código de AGROSBO implementa un dual-path:
- Path local: `pg` driver directo (IMPLEMENTED).
- Path cloud/Data API: parcialmente implementado, no probado contra Aurora real (PARTIAL).

**VERIFIED_BY_DOCUMENTATION**: el Data API está disponible en us-east-1 con Aurora SV2
PostgreSQL.

**NEEDS_SPIKE**: el path Data API del código debe validarse contra un clúster Aurora
real en Spec 18 T10 equivalente (primer deployment de infra). No hay evidencia actual de
que el código de AGROSBO funciona correctamente con el Data API real.

---

## 16. Disponibilidad de Data API en sa-east-1 (São Paulo)

**INFERENCIA**: `sa-east-1` es una región secundaria. El Data API puede no estar
disponible o puede estar disponible con limitaciones.

Verificar antes de Spec 18 si la región seleccionada en T04 fue `sa-east-1`:
```
aws rds describe-db-clusters --region sa-east-1 \
  --query "DBClusters[?HttpEndpointEnabled]"
# (Si devuelve vacío para SV2 PostgreSQL, Data API no está disponible)
```

Si el Data API no está disponible en la región de producción:
- Opción A: usar VPC + pg driver directo (mayor complejidad de Lambda en VPC).
- Opción B: seleccionar región alternativa donde Data API sí esté disponible.
- Esta decisión es de Spec 18 Design.

---

## 17. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Data API no disponible en región de producción | Media (si es sa-east-1) | Requiere rediseño de conexión en Spec 18 | Verificar en T04 / preflight antes de Spec 18 |
| Cold start (ACU=0) rompe health check /ready | Alta si ACU_min=0 | Spec 19 no puede completarse sin health check verde | Configurar ACU_min=0.5 |
| Límite 1MB response en listados sin paginar | Media | Errores silenciosos en producción bajo carga | Implementar paginación desde Spec 18 |
| Overhead latencia Data API inaceptable para producción | Baja (50–150ms adicionales) | Latencia del API degradada | Medir en M2 ejecutable; fallback a pg driver si necesario |
| `SELECT FOR UPDATE` via Data API tiene comportamiento inesperado | Media | Pattern de concurrencia S4 no funciona en cloud | NEEDS_SPIKE: probar en M2 ejecutable |

---

## 18. Decisión recomendada para Spec 18

**RECOMENDACIÓN** (no vinculante — Kiro toma la decisión final):

1. Usar Aurora Serverless v2 PostgreSQL 15 o 16 en `us-east-1`.
2. Habilitar Data API (`--enable-http-endpoint`) en el clúster de Spec 18.
3. Configurar ACU mínimo = 0.5 para dev; máximo = 4 para dev.
4. Validar el path Data API del código AGROSBO contra el clúster real en Spec 18.
5. Si Data API muestra problemas de latencia o límites en validación de Spec 18,
   activar el path pg driver directo (ya implementado) como fallback.

---

## 19. Qué debe validarse en M2 ejecutable (Spec 18)

| Validación | Método |
|---|---|
| Aurora SV2 PostgreSQL disponible en región seleccionada | `aws rds describe-db-engine-versions` |
| Data API habilitado en el clúster | Crear clúster con `--enable-http-endpoint` |
| `db:migrate` funciona via Data API | Ejecutar Drizzle migrations contra Aurora SV2 real |
| Cold start real con ACU_min=0.5 | Medir latencia del primer query tras inactividad |
| `SELECT FOR UPDATE` via Data API | Probar transacción explícita con lock de fila |
| Límite 1MB en practice | Query con response grande |
| Health check /ready pasa en < 5s | Verificar en Spec 19 post-deploy |

---

## Conclusión

| Aspecto | Estado | Acción requerida |
|---|---|---|
| Aurora SV2 disponible en us-east-1 | VERIFIED_BY_DOCUMENTATION | Ninguna |
| Data API disponible en us-east-1 | VERIFIED_BY_DOCUMENTATION | Confirmar pre-Spec 18 |
| Data API disponible en región de producción | NEEDS_SPIKE | Verificar en T04/Spec 18 |
| Versión PG compatible | VERIFIED_BY_DOCUMENTATION (14–16) | Elegir versión en Spec 18 Design |
| Path Data API del código AGROSBO funciona en Aurora real | NEEDS_SPIKE | Validar en Spec 18 |
| Cold start con ACU_min=0.5 aceptable | NEEDS_SPIKE | Medir en Spec 18 |
| Límite 1MB sin impacto con paginación | INFERENCIA | Implementar paginación en Spec 18 |
