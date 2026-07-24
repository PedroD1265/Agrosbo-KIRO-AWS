# ADR 006 - Giro a plataforma agrícola integral

Estado: Accepted

Fecha: 2026-07-24

## Contexto

El proyecto inició como un MVP de **trazabilidad de café** para una cooperativa
(cadena productor → parcela → cosecha → lote → transformación → embarque →
snapshot → paquete), documentado en ADRs 001-005, el Steering original y la Spec
`project-foundation-and-risk-spikes` (Checkpoint 0 y Spike A completados).

Durante el desarrollo, el trabajo evolucionó hacia una **plataforma de gestión
agrícola integral**. El working tree actual implementa una aplicación distinta y
más amplia (bloques, invernaderos, campañas, tareas, observaciones, aplicaciones,
inventario, riego, clima, alertas, cosecha, gastos/mano de obra, reportes,
apicultura, mapa) que contradice el Steering previo (que prohibía apicultura,
riego, contabilidad, multicultivo).

## Producto anterior

Trazabilidad de café sobre AWS serverless con Cognito y Textract, orientado a un
único tipo de usuario (cooperativa) y a producir un paquete de evidencia sellado.

## Motivo del giro

- Mayor utilidad y mercado: gestión operativa integral de la granja.
- El código ya construido cubre operaciones de granja, no la cadena cafetera.
- La capacidad offline-first (validada en el Spike A) es transversal y sigue
  siendo el diferenciador técnico central.

## Nuevo producto

Plataforma web offline-first de gestión de operaciones agrícolas, con visión de
evolucionar hacia comercio/servicios agrícolas y un copiloto conversacional de
datos (ambos NO implementados). Definición oficial en
`.kiro/steering/product.md`.

## Capacidades preservadas

- Protocolo de sincronización offline (idempotencia, orden por dependencias,
  reconciliación temp→real, no fusión automática, archivos separados) — ADR 002.
- PostgreSQL como fuente de verdad + RDS Data API — ADR 001.
- AWS como eje de infraestructura; Kiro como eje del proceso.

## Consecuencias

- ADRs 001-005, Steering, README, Spec map y `.env.example` se realinean al
  nuevo producto (esta fase de estabilización).
- La trazabilidad de lotes/transformaciones/embarques/snapshots (ADRs 003, 004)
  pasa a **visión futura diferida**, no a regla activa.
- Cognito (ADR de seguridad previo) y Textract (ADR 005) quedan **diferidos**.
- Se define un nuevo mapa de Specs por dominio real (`docs/spec-map.md`).

## Riesgos y mitigación

- **Riesgo**: sobre-alcance (marketplace, mensajería, asistente) que impida
  terminar. **Mitigación**: core operativo primero; diferenciadores solo tras
  estabilizar; visión futura claramente marcada como no implementada.
- **Riesgo**: comunicación engañosa de capacidades. **Mitigación**: etiquetado
  obligatorio implemented/stabilizing/target/planned/vision/deferred.
- **Riesgo**: pérdida del trabajo no versionado. **Mitigación**: respaldo
  externo previo al commit y plan de commits separados.
