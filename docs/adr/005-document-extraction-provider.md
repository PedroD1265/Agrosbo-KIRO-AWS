# ADR 005 - Proveedor de extracción documental

Estado: Deferred (antes "Propuesto"; ver Estado de supersesión al final)

## Contexto

El MVP maneja tres categorías de documento de una sola página: evidencia de
productor o parcela, constancia de peso y certificado del producto. La persona
selecciona la categoría; no hay clasificación automática. Se necesita extraer
campos y un nivel de confianza para señalar baja confianza a revisión humana.
Disponemos de créditos de AWS y de Azure, pero no debemos elegir por
disponibilidad de créditos ni mantener dos pipelines.

## Decisión

- Amazon Textract es el proveedor por defecto del MVP.
- Se ejecuta un spike comparativo (Spike C) sobre los mismos documentos de
  prueba, midiendo campos esperados encontrados, campos correctos, errores,
  confianza, latencia, esfuerzo de integración, costo estimado y facilidad de
  revisión humana.
- Los resultados MUST registrarse por campo, no solo como confianza promedio.
- Azure Document Intelligence solo reemplaza a Textract si el spike demuestra
  una ventaja clara.
- Si Azure no está disponible durante el spike, Textract continúa como
  proveedor por defecto.
- Se selecciona un único proveedor para el MVP.

## Umbral de confianza

- El umbral es configurable; valor inicial de laboratorio: 0.85.
- El umbral no se presenta como estándar universal.
- Cualquier campo obligatorio ausente o bajo el umbral requiere revisión humana.
- El spike puede recomendar un valor diferente basado en evidencia medida.

## Alternativas

- Azure Document Intelligence desde el inicio: descartada como decisión previa;
  no se elige por créditos sino por resultado medido.
- Clasificación automática de documentos: fuera de alcance del MVP.
- Documentos multipágina: fuera de alcance del MVP.

## Consecuencias

- Nunca se mantienen dos pipelines documentales activos en producción.
- El resultado del Spike C convierte este ADR de Propuesto a Aceptado con el
  proveedor elegido.
- La integración documental se aísla detrás de una interfaz para poder cambiar
  de proveedor sin afectar el resto del backend.

## Estado de supersesión

- Estado: **Deferred** (antes "Propuesto"; el Spike C no se ejecutó).
- La extracción documental (Textract / Azure Document Intelligence) era parte de
  la trazabilidad de café. Tras el giro (ADR 006) queda **diferida**: no forma
  parte del MVP agrícola ni del alcance del hackathon.
- **Textract y Azure NO están implementados** ni referenciados por el código de
  la aplicación (solo aparecían como variables de laboratorio del Spike C, ahora
  retiradas de `.env.example` y documentadas aquí como integración experimental
  diferida).
- Reactivación: requiere una Spec futura que justifique la extracción documental
  (p. ej. digitalización de facturas de insumos o certificados).
