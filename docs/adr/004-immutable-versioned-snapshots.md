# ADR 004 - Snapshots inmutables y versionados

Estado: Aceptado

## Contexto

El expediente de trazabilidad de un embarque debe ser verificable y estable en
el tiempo, aunque los datos operativos cambien después. Una corrección posterior
no puede alterar silenciosamente un expediente ya sellado. El paquete descargable
debe reflejar exactamente el estado sellado, no el estado vivo.

## Decisión

- Representar cada sello con `shipment_snapshot`, entidad inmutable.
- Campos: shipment_id, version_number, replaces_snapshot_id (opcional),
  snapshot_json, snapshot_sha256, package_s3_key, package_sha256, sealed_by,
  sealed_at.
- Generar el snapshot solo tras una revisión (`review_run`) aprobada.
- Congelar en el snapshot la vigencia documental evaluada en el momento del
  sello.
- Generar el paquete desde el snapshot, no desde datos vivos.
- Una corrección produce una versión nueva con `replaces_snapshot_id`; la
  versión anterior permanece disponible.
- Nunca sobrescribir una versión anterior.

## Alternativas

- Expediente mutable con historial de cambios: descartada; no garantiza que el
  paquete entregado sea reproducible ni estable.
- Firma electrónica legal / integración con autoridades: fuera de alcance del
  MVP; el objetivo es un paquete interno para revisión humana.

## Consecuencias

- Los lotes incluidos en un embarque sellado quedan bloqueados frente a cambios
  de composición; una modificación exige una nueva versión.
- La integridad del snapshot y del paquete se verifica por hash (snapshot_sha256
  y package_sha256).
- La cadena de versiones (replaces_snapshot_id) permite auditar reemplazos sin
  perder versiones previas.
