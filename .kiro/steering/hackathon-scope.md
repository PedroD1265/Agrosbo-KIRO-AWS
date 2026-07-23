# AGROSBO - Alcance del hackathon

Responsabilidad: frontera de alcance, foco de demo, métricas y uso de Kiro.

## Foco de la demo

Momento clave: se abre un embarque con procedencias múltiples; la revisión
detecta kilos no trazables y una evidencia faltante o vencida; se corrige un
bloqueador; se re-ejecuta la revisión; el embarque queda listo; se sella una
versión; se descarga y abre el paquete; se muestra la procedencia completa hasta
productores y parcelas.

## Métricas verificables (dataset de demostración)

- Porcentaje del peso del embarque con procedencia completa.
- Kilogramos no trazables.
- Bloqueadores detectados.
- Documentos obligatorios presentes.
- Reintentos offline sin duplicados.
- Transformaciones que conservan el balance.
- Tiempo medido sobre el dataset de demostración.
- Capacidad de reconstruir todos los orígenes de un embarque.
- Versiones selladas conservadas.

- MUST NOT usar cifras inventadas sobre operaciones reales.

## Uso demostrable de Kiro

- MUST usar Steering, Requirements, Design, Tasks, Specs, Hooks, criterios EARS,
  validación automática, revisión incremental e IaC.
- MUST NOT usar Kiro solo como generador de código.

## Fuera de alcance (MUST NOT)

blockchain, marketplace, pagos, IoT/sensores, riego, ERP agrícola, apicultura,
contabilidad avanzada, logística internacional completa, integración con
autoridades, certificación legal automática, modelos satelitales propios,
multi-tenancy empresarial complejo, app móvil nativa, soporte para todos los
cultivos, recomendador agrícola, chatbot agrícola, dashboards sin acciones,
seguimiento completo del transporte internacional.
