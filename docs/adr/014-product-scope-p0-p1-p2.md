# ADR 014 — Alcance de producto P0, P1 y P2

- **Estado**: Accepted.
- **Fecha**: julio 2026.
- **Relación con ADR 006**: complementa y actualiza parcialmente ADR 006.
  Preserva el giro a plataforma agrícola integral y el principio offline-first.
  Reemplaza únicamente la priorización anterior que trataba el agente y las
  capacidades comerciales como futuro diferido. No invalida todo ADR 006.

## Contexto

AGROSBO evolucionó de un prototipo de trazabilidad de café (ADR 006) hacia una
plataforma agrícola offline-first. La nueva dirección incorpora un agente
operacional multimodal como interfaz central, comunicaciones externas y una
tienda pública de finca en un horizonte posterior.

Se requiere una definición clara de qué es obligatorio (P0), qué es posterior
obligatorio (P1) y qué queda fuera del alcance (P2), para evitar scope creep y
guiar toda la documentación y desarrollo.

## Decisión

### P0 — Obligatorio para la entrega del hackathon

- Despliegue AWS del core existente (S3+CF+OAC, Lambda, Aurora, Data API).
- Agente operacional con herramientas controladas (REST, Bedrock tool calling).
- Consultas por texto y entrada por voz (Transcribe/Polly).
- Navegación visible dentro de la UI.
- Borradores y confirmación explícita antes de mutaciones.
- Creación y modificación de tareas con confirmación.
- Colaboradores internos con cuenta y rol.
- Colaboradores externos sin cuenta (token opaco, hash, TTL, revocación).
- Amazon SES para notificaciones y enlaces seguros.
- Seguimiento de eventos (sent/delivered/opened_link/responded/completed).
- Evaluación visual preliminar de fotografías (Bedrock multimodal).
- IrrigationDelayScenario (motor determinista separado).
- Golden path reproducible con datos sintéticos.
- Seguridad, observabilidad y límites de costo.
- Documentación y trazabilidad Kiro.

### P1 — Posterior obligatorio (single-organization)

- Tienda pública de una sola finca (URL, QR, catálogo).
- Solicitudes de compra sin registro.
- Comparación explicada de interesados (decisión humana).
- WhatsApp vía wa.me prellenado (envío siempre humano).
- Notas de voz capturadas offline para procesamiento posterior.
- Resumen hablado del día.

### P2 — Fuera del alcance obligatorio

Marketplace multi-organización, pagos, reputación, logística, mensajería en
tiempo real, WhatsApp Cloud API, multi-tenancy completo, conflictos complejos
entre dispositivos, diagnóstico agronómico especializado, automatización
financiera/contractual, aceptación automática de compradores.

### Single-organization

P0 y P1 operan como single-organization honesto. Multi-tenancy completo es P2.

## Alternativas consideradas

1. **Solo core offline + despliegue AWS (sin agente)**: menor riesgo pero menor
   diferenciación; descartada por no alinearse con la visión de producto.
2. **Marketplace completo en P1**: demasiado alcance; se difirió a P2 para no
   bloquear la entrega.
3. **Agente de solo lectura (sin mutaciones)**: limitaría severamente la utilidad
   del agente; se optó por mutaciones con confirmación explícita.

## Consecuencias positivas

- Alcance P0 terminable y demostrable.
- P1 definido sin bloquear P0.
- P2 documenta visión sin generar trabajo prematuro.
- Claridad para todas las Specs y documentos derivados.

## Consecuencias negativas

- P0 es ambicioso para un hackathon.
- Requiere múltiples servicios AWS funcionando juntos.

## Riesgos

- Complejidad de integración de servicios AWS en el tiempo disponible.
- SES en sandbox limita las demostraciones con destinatarios reales.
- Single-organization puede generar deuda técnica si P2 llega rápido.

## Referencias

- [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §6, §7, §8.
- [`./006-pivot-to-integrated-agricultural-platform.md`](./006-pivot-to-integrated-agricultural-platform.md).
