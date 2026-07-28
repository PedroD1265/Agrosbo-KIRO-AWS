# Microvalidación M2 — Aurora PostgreSQL Serverless v2 + Data API

## Estado

| Campo | Valor |
|---|---|
| Tarea | T15 |
| Tipo | Documental; no se creó clúster |
| Cierre | 2026-07-28 |
| Regiones revisadas | `us-east-1`, `sa-east-1` |
| Resultado | **COMPLETED — VERIFIED_BY_DOCUMENTATION; NOT_IMPLEMENTED** |
| Decisión final | Diferida a Spec 18 |

Fuentes oficiales:

- [Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [Regiones y versiones de Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.Data_API.html)
- [Uso de Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html)
- [Limitaciones de Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.limitations.html)
- [Timeouts de Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api-timeouts.html)
- [Troubleshooting de Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.troubleshooting.html)

## Disponibilidad documentada

La tabla oficial vigente documenta Data API para Aurora PostgreSQL serverless
y provisioned en ambas regiones:

| Región | PG 17 | PG 16 | PG 15 | PG 14 | PG 13 |
|---|---|---|---|---|---|
| `us-east-1` | 17.4+ | 16.1+ | 15.3+ | 14.8+ | 13.11+ |
| `sa-east-1` | 17.4+ | 16.1+ | 15.3+ | 14.8+ | 13.11+ |

Esto corrige la inferencia anterior de que `sa-east-1` quizá no soportaba Data
API. La región de producción y el patch exacto siguen siendo decisiones de
Spec 18.

## Modelo de acceso

Data API expone un endpoint HTTPS y evita conexiones persistentes al clúster.
Usa credenciales de base de datos almacenadas en Secrets Manager y permisos
IAM para Data API y el secret. Debe habilitarse explícitamente en el clúster.

No se creó un clúster ni se probó el path cloud de AGROSBO en Spec 17.

## Límites oficiales relevantes

| Límite o restricción | Valor / comportamiento |
|---|---|
| Instancia que procesa queries | Solo writer; acepta lecturas y escrituras |
| Global secondary sin writer | No procesa Data API hasta ser promovido |
| Clases T | No soportadas |
| Aurora PostgreSQL 14+ | Solo `scram-sha-256` para password encryption |
| Result set binario | Máximo 1 MiB |
| Fila individual | Máximo 64 KB |
| Respuesta con `formatRecordsAs=JSON` | Máximo 10 MB |
| Request body HTTP | Máximo 4 MB |
| Statement sin `continueAfterTimeout` | Timeout por defecto a 45 segundos |
| Transacción inactiva | Rollback automático tras 3 minutos sin llamadas |
| SQL por `ExecuteStatement` | Máximo 65,536 caracteres |

Se eliminan del cierre las afirmaciones previas de “100 columnas”, “30
transacciones concurrentes” y “1,000 campos”, porque no quedaron respaldadas
por la documentación vigente aplicable a Aurora Serverless v2.

## Impacto en el dual-path

La matriz de capacidades registra:

- path local `pg`: funcional y probado localmente;
- path Data API: código parcial, no validado contra Aurora real.

Data API reduce complejidad de conexiones desde Lambda, pero añade límites de
tamaño, timeout y manejo explícito de transacciones. El patrón S4 con
`SELECT FOR UPDATE` se verificó solo en PostgreSQL directo; su comportamiento
mediante Data API requiere prueba real en Spec 18.

Si la validación cloud falla, el path `pg` directo dentro de VPC sigue siendo
una alternativa arquitectónica, no una decisión tomada por esta
microvalidación.

## Precios

Precios de ACU, storage, I/O, backup y configuración mínima:
**NEEDS_OFFICIAL_VERIFICATION** al diseñar Spec 18. Spec 17 no creó Aurora y no
aporta costo ejecutado de este servicio.

## Decisión

Aurora PostgreSQL Serverless v2 + Data API es viable documentalmente en
`us-east-1` y `sa-east-1`, pero permanece **NOT_IMPLEMENTED** y no probado con
AGROSBO. Spec 18 decidirá región, engine/patch, ACU, networking, Secrets
Manager, Data API versus `pg`, migraciones, health checks y límites operativos.
