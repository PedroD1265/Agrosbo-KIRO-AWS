---
inclusion: auto
name: domain-rules
description: Reglas transversales de dominio (cantidades, costos, idempotencia, estados, alertas, agente, evaluacion visual, escenarios, trazabilidad). Cargar cuando se trabaje en logica de negocio, validaciones de dominio o reglas del agente operacional.
---

# AGROSBO — Reglas de dominio

Responsabilidad: reglas transversales de la plataforma.

## Cantidades y costos

- MUST tratar cantidades y costos de forma determinista.
- Inventario nunca negativo salvo evento explícito y registrado.
- MUST registrar cada movimiento con delta, motivo y costo cuando aplique.
- MUST asociar costos a una moneda explícita (por defecto BOB).

## Idempotencia y sincronización

- MUST tratar mutaciones como idempotentes por clave de cliente.
- MUST reconciliar IDs temporales con IDs reales.

## Estados explícitos

- MUST usar estados explícitos y enumerados.
- MUST NOT borrar silenciosamente historial.

## Alertas

- Derivadas y deterministas del estado actual.
- MUST ser accionables (entidad + motivo).

## Agente y datos

- Toda afirmación sobre el estado real de la finca MUST estar basada en
  herramientas y datos consultados.
- Explicaciones generales, ayuda de interfaz y aclaraciones pueden generarse sin
  herramientas cuando no afirmen hechos operativos.
- El agente MUST indicar cuando no consultó información real.
- MUST NOT inventar registros, mediciones, costos, fechas ni estados.

## Evaluación visual

- Evaluación preliminar; nunca diagnóstico definitivo.
- MUST NOT recomendar automáticamente pesticidas ni agroquímicos específicos.
- MUST incluir aviso de seguridad y nivel de confianza.
- AGROSBO no es sustituto de asesoría profesional.

## Motor de escenarios

- IrrigationDelayScenario es un módulo determinista separado.
- El LLM explica pero MUST NOT realizar el cálculo principal.
- MUST incluir supuestos, rango y confianza en toda salida.
- MUST NOT garantizar resultados.

## Acciones financieras y contractuales

- MUST NOT ejecutar acciones financieras o contractuales automáticas por IA.
- Toda acción requiere confirmación humana.

## Trazabilidad

- MUST mantener trazabilidad de acciones sensibles.
- MUST NOT usar IA para autorizar permisos, gastos, contratos ni aceptación.

## Colaboración P1 (tienda pública)

- MUST separar inventario interno de publicaciones (listings).
- MUST NOT aceptar compradores automáticamente.
- Decisión final siempre humana.
