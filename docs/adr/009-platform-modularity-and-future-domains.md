# ADR 009 - Modularidad de la plataforma y dominios futuros

Estado: Accepted

Fecha: 2026-07-24

## Contexto

AGROSBO crecerá desde operaciones de granja hacia comercio/servicios agrícolas y
un copiloto conversacional. Se necesita una postura arquitectónica que permita
esa evolución sin comprometer la entrega del core ni introducir complejidad
prematura.

## Decisión

- Mantener un **modular monolith** (un backend Express desplegable como una
  unidad), organizado por **módulos de dominio**.
- **No** adoptar microservicios en el MVP ni en el hackathon.
- Evolucionar por dominios, cada uno con su Spec: operaciones (actual) →
  infraestructura → diferenciadores → comercio/servicios → mensajería/asistente.
- Separar conceptualmente los dominios futuros:
  - **Operaciones** (actual): datos internos de la granja.
  - **Comercio**: listings, ofertas, órdenes (referencian inventario, no lo
    reemplazan).
  - **Servicios**: solicitudes, cotizaciones, órdenes de trabajo, agenda.
  - **Mensajería**: comunicación asociada a solicitudes/órdenes (no sustituye a
    las entidades estructuradas).
  - **Asistente**: capa de solo lectura sobre herramientas autorizadas.

## Alternativas

- Microservicios por dominio: descartada por sobre-ingeniería para el volumen y
  el equipo actuales; multiplica operación, despliegue y observabilidad.
- Monolito no modular: descartada; dificulta aislar dominios futuros y su
  seguridad.

## Consecuencias

- El core se entrega como un monolito modular desplegado en Lambda (ADR 007).
- Los dominios futuros se incorporan como módulos, no como servicios separados,
  hasta que una necesidad real (escala, aislamiento, equipo) justifique dividir.
- Multi-tenancy y aislamiento por organización se planifican como capa
  transversal (`docs/architecture/multi-tenancy-plan.md`), no por dominio.
