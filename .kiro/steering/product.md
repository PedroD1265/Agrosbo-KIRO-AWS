# AGROSBO - Producto

Responsabilidad: definir qué es y qué NO es el producto. Fuente única de la
intención de producto.

## Qué es

- Aplicación web offline-first para una cooperativa cafetera.
- Núcleo: conservar procedencia, cantidades, documentos y versiones selladas.
- El valor central es reconstruir el origen de cada kilogramo de un embarque.

## Cadena principal

Productor -> Parcela -> Cosecha -> Lote de origen -> Transformación (split /
merge / process) -> Lote resultante -> Embarque -> Revisión de completitud ->
Snapshot versionado -> Paquete de trazabilidad.

## Roles (MVP)

- Capturista (móvil, offline): alimenta datos de origen (productor, parcela,
  cosecha, GPS, fotos, documentos pendientes).
- Trazador (escritorio, online): lotes, asignaciones, transformaciones,
  embarques, revisión, sellado y paquete.
- El productor es una entidad registrada, NO un usuario del MVP.

## MUST

- MUST resolver un flujo completo de campo hasta paquete sellado.
- MUST permitir recorrer la procedencia completa de un embarque hasta productor
  y parcela.
- MUST mostrar acciones concretas (bloqueadores accionables), no solo
  porcentajes.

## SHOULD

- SHOULD priorizar el momento de demostración: revisión de un embarque con
  procedencias múltiples que detecta kilos no trazables y evidencia
  faltante o vencida.

## MUST NOT

- MUST NOT ser ERP, chatbot, certificadora, sistema oficial ni dashboard pasivo.
- MUST NOT afirmar que garantiza cumplimiento normativo ni emitir declaración
  legal.
- MUST NOT sustituir sistemas oficiales ni presentar ante autoridades.
- MUST NOT introducir funciones fuera de la cadena principal.
