# Design - project-foundation-and-risk-spikes

## Objetivo del diseño

Definir la estructura inicial del repositorio y el diseño de tres spikes
descartables que reducen los mayores riesgos técnicos antes de abrir las Specs
de producción. Este diseño no implementa funcionalidad final.

## Arquitectura aprobada (referencia)

- Frontend: React + TypeScript + Vite, PWA, IndexedDB, Amplify Hosting.
- Auth: Cognito (grupos capturista, trazador) + API Gateway HTTP API con JWT
  authorizer.
- Backend: API Gateway HTTP API + una Lambda TypeScript modular monolith
  (handlers / services / domain). Lambda documental separada solo si hace falta.
- Datos: Aurora PostgreSQL Serverless v2 vía RDS Data API. Sin RDS Proxy. Sin
  DynamoDB como principal.
- Archivos: S3 con URLs prefirmadas; metadata en PostgreSQL.
- Extracción: Textract por defecto; Azure Document Intelligence solo si el
  benchmark lo justifica. Sin Step Functions, sin Bedrock.
- Observabilidad/IaC: CloudWatch + AWS CDK, infraestructura mínima.

Los detalles y motivos viven en los ADRs 001-005.

## Estructura inicial del repositorio

```
/web        PWA React (shell, cliente API, cola offline) - mínimo en esta Spec
/api        Lambda modular monolith: handlers/, services/, domain/
/infra      AWS CDK - infraestructura de laboratorio para spikes
/docs/adr   ADRs 001-005
/spikes     spike-a-offline-sync, spike-b-lineage, spike-c-extraction
.kiro       steering/, specs/, hooks/
```

- Configuración de calidad en la raíz: formato, lint, typecheck, build.
- `/spikes` contiene código desechable, aislado del código de producción.

## Infraestructura de laboratorio

Esta Spec crea únicamente recursos mínimos necesarios para ejecutar los spikes:

- Bucket S3 de laboratorio (`agrosbo-dev-spike-docs`) para el Spike C.
- Aurora PostgreSQL Serverless v2 + Data API (`agrosbo-dev-spike-db`) para
  Spikes A y B.
- Variables y secretos de laboratorio en un `.env.local` excluido de git.
- Comandos documentados de creación (`cdk deploy`) y destrucción (`cdk destroy`).
- Alarma de CloudWatch o límite de costo si aplica.
- Todos los recursos con prefijo `agrosbo-dev-spike`.

NO se crea infraestructura de producción; la Spec posterior
`production-infrastructure-and-deployment` cubrirá ambientes, despliegue
público, seguridad final, observabilidad, dominios y hardening.

## Límites de los spikes

- Los spikes NO producen UI final, endpoints de producción ni migraciones
  definitivas.
- Los spikes usan datos desechables y credenciales de un entorno de laboratorio.
- El resultado de cada spike es evidencia + una decisión de aceptación/descarte.
- El código de spike se descarta o se reimplementa deliberadamente en su Spec
  correspondiente; no se promueve automáticamente.

## Spike A - Offline sync

Contrato de prueba:

- Entrada: una cola local con tres operaciones dependientes:
  1. crear producer (temp_id P) 
  2. crear parcel (temp_id L, dependency = P)
  3. crear harvest (temp_id H, dependency = L)
- Endpoint de prueba `POST /sync-spike` que procesa un lote de operaciones.
- Comportamiento esperado:
  - Aplica en orden P -> L -> H.
  - Devuelve mapa {tempId: serverId}.
  - Reintento del mismo lote (mismos client_op_id) no crea duplicados.
  - Una operación marcada como fallida no revierte las confirmadas.
  - Una cuarta operación que duplica una cosecha (coinciden cooperative_id,
    producer_id, parcel_id, product_state, harvested_date y quantity_kg
    redondeada a 2 decimales) se marca como `possible_duplicate` para revisión
    humana. No se fusiona, elimina, sobrescribe, rechaza ni modifica
    silenciosamente otro registro.
  - La subida de archivos (simulada o real) está separada de la transacción
    PostgreSQL.
- Datos desechables: tabla(s) temporales o esquema `spike_a`.
- Regla de duplicados: provisional para el hackathon; puede cambiar tras datos
  reales.
- Evidencia: log de la corrida mostrando IDs reconciliados, ausencia de
  duplicados tras reintento y aislamiento de fallos.
- Aceptación: idempotencia y reconciliación funcionan; fallo aislado; duplicado
  marcado. Descarte: si la idempotencia o el orden de dependencias no se puede
  garantizar de forma simple con Data API.

## Spike B - Procedencia

Contrato de prueba:

- Datos mínimos en un esquema `spike_b`:
  - 2 producers, 2 parcels, 2 harvests.
  - 2 lotes iniciales creados desde harvest_allocation.
  - 1 merge (combinación) y 1 split (división), cada salida = lote nuevo.
  - 1 pérdida con loss_kg y loss_reason.
- Consulta recursiva que, dado un lote final, devuelve el árbol hasta
  transformaciones -> lotes iniciales -> cosechas -> parcelas -> productores.
- Verificación de balance: suma(inputs) = suma(outputs) + loss_kg.
- Evidencia: salida de la consulta recursiva mostrando el árbol completo y una
  comprobación de balance en verde.
- Aceptación: la consulta reconstruye toda la cadena y el grafo es acíclico.
  Descarte: si la reconstrucción recursiva no es viable o requiere una tabla
  materializada ya en el MVP.

## Spike C - Extracción documental

Contrato de prueba:

- Tres documentos de una página (sintéticos o públicos): evidencia de
  productor/parcela, constancia de peso, certificado del producto.
- Conjunto fijo de campos esperados por categoría (definido antes de correr).
- Ejecutar Textract; ejecutar Azure Document Intelligence si hay credenciales.
- Registrar POR CAMPO y por proveedor: campo esperado, campo detectado, valor
  correcto, confianza, error, latencia, revisión humana requerida.
- Registrar de forma global: esfuerzo de integración, costo estimado, facilidad
  de revisión humana.
- Umbral de confianza configurable, valor inicial de laboratorio: 0.85. No
  presentar como estándar universal.
- Cualquier campo obligatorio ausente o bajo el umbral requiere revisión humana.
- El spike puede recomendar otro umbral basado en evidencia.
- Salida: `docs/adr/005-document-extraction-provider.md` pasa de Propuesto a
  Aceptado con el proveedor elegido, más un informe de benchmark en `/spikes`.
- Aceptación: un proveedor seleccionado con evidencia por campo. Descarte
  parcial: si Azure no está disponible, Textract queda por defecto.

## Cómo se documentan los resultados

- Cada spike escribe su evidencia en `/spikes/<spike>/RESULTS.md`.
- La decisión final de cada spike se refleja en el ADR correspondiente o en una
  nota de decisión en `/docs`.

## Criterios de aceptación o descarte (global)

- Spike aceptado: cumple su contrato de prueba y deja evidencia reproducible.
- Spike descartado o ajustado: se documenta el motivo y el impacto en las Specs
  siguientes.
