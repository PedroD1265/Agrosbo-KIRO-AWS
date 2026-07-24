# ADR 001 - PostgreSQL como fuente de verdad con RDS Data API

Estado: Accepted (vigente; ver Estado de supersesión al final)

## Contexto

AGROSBO debe conservar procedencia, cantidades, documentos y versiones con
integridad referencial, balances deterministas y consultas recursivas para
reconstruir el origen de cada kilogramo de un embarque. El backend es una Lambda
modular monolith detrás de API Gateway HTTP API. Necesitamos una base
relacional gestionada y un mecanismo de acceso compatible con cómputo efímero,
sin sobrecargar la infraestructura del MVP.

## Decisión

- Usar Aurora PostgreSQL Serverless v2 como única fuente de verdad.
- Acceder a la base mediante RDS Data API, incluyendo transacciones vía Data API.
- No usar RDS Proxy en el MVP.
- No usar DynamoDB como base principal.

## Alternativas

- DynamoDB como base principal: descartada; la procedencia es un grafo con
  balances e integridad referencial que encaja de forma natural en un modelo
  relacional con CTEs recursivas.
- Conexiones PostgreSQL directas desde Lambda + RDS Proxy: descartada para el
  MVP por añadir un componente de infraestructura y gestión de conexiones sin
  beneficio para la demostración.
- RDS PostgreSQL provisionado clásico: viable, pero Serverless v2 reduce costo
  en reposo y simplifica el escalado durante la demo.

## Consecuencias

- El acceso a datos se hace por llamadas Data API (sin pool de conexiones
  persistente), lo que simplifica el modelo de ejecución de Lambda.
- Las transacciones se coordinan con el ciclo transaction de Data API; el diseño
  debe mantener transacciones cortas y bien delimitadas.
- La disponibilidad se calcula desde asignaciones y consumos, no desde un campo
  materializado.
- Si en el futuro aparece un límite de rendimiento del Data API, se reevaluará
  RDS Proxy o conexiones directas en un ADR posterior.

## Estado de supersesión

- Estado: **Accepted** (vigente).
- El giro de producto (ADR 006) no altera esta decisión: PostgreSQL sigue siendo
  la fuente de verdad y RDS Data API el acceso preferido en Lambda.
- Reforzado por ADR 007 (Data API para evitar pools de conexión en Lambda).
- El contexto histórico menciona "trazabilidad de café"; esa parte del contexto
  quedó superada por ADR 006, pero la decisión técnica de base de datos se
  mantiene sin cambios.
