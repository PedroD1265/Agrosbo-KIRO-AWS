# ADR 013 - Evaluación de proveedores de extracción documental

Estado: Accepted

Fecha: 2026-07-24

## Contexto

AGROSBO necesitará extraer campos estructurados de documentos agrícolas
(facturas de insumos, recibos, constancias) para reducir captura manual. Existen
dos candidatos viables: **Amazon Textract** (ecosistema AWS) y **Azure AI
Document Intelligence** (especializado en facturas/recibos con modelos
preentrenados). La decisión debe basarse en evidencia medida, no en preferencia
de proveedor.

## Decisión

- **AWS Textract** es el candidato primario (alineado con el eje AWS).
- **Azure AI Document Intelligence** es el candidato comparativo (especializado
  en layout de facturas/recibos).
- Se realizará un **benchmark con documentos sintéticos** (facturas de insumos,
  recibos de jornales, constancias de peso) midiendo:
  - Exactitud por campo (campo esperado vs detectado vs correcto).
  - Confianza por campo (no solo promedio).
  - Latencia.
  - Costo estimado por documento.
  - Facilidad operativa (integración, revisión humana).
- La selección se basa en **evidencia medida** del benchmark.
- **Un único proveedor se activa** en producción (no pipeline dual).
- **Ninguna integración se activa todavía**: la interface
  `DocumentExtractionProvider` se define con un resultado canónico; las
  implementaciones `TextractProvider` y `AzureDocIntelligenceProvider` se
  crean en la Spec del benchmark.

## Resultado canónico

```typescript
interface DocumentExtractionResult {
  provider: 'textract' | 'azure-di' | 'none';
  documentType: string;
  fields: Array<{ name: string; value: string; confidence: number }>;
  lineItems: Array<{ description: string; quantity?: number; amount?: number; confidence: number }>;
  overallConfidence: number;
  rawReference?: string; // S3 key or blob ref of the raw response
  warnings: string[];
}
```

## Alternativas

- Solo Textract sin comparar: descartada; Azure DI tiene modelos de factura más
  maduros que vale la pena evaluar.
- Solo Azure DI: descartada; AWS es el eje principal y Textract es nativo.
- Ambos activos en producción: descartada; complejidad operativa sin beneficio.

## Consecuencias

- La interface `DocumentExtractionProvider` se define en esta fase de
  preparación.
- El benchmark se ejecuta en una Spec futura (post-infraestructura).
- Hasta entonces, `DOCUMENT_EXTRACTION_PROVIDER=none` y la app funciona sin
  extracción.
- La decisión final del proveedor actualiza este ADR de "ambos candidatos" a
  "proveedor elegido".
