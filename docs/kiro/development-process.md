# AGROSBO - Proceso de desarrollo con Kiro

Documenta cómo Kiro guía la ingeniería de AGROSBO. Solo se describen usos reales
o aprobados. No se inventan estadísticas de productividad.

## Steering (`.kiro/steering/`)

Ocho documentos que fijan intención y reglas: `product`, `tech`, `structure`,
`domain-rules`, `offline-first`, `data-integrity`, `security`, `hackathon-scope`.
Son la fuente de verdad de "qué construimos y bajo qué reglas", y se realinearon
al producto real durante la estabilización.

## Specs (`.kiro/specs/`)

Cada unidad de trabajo se formaliza como Spec con:
- **Requirements** en notación **EARS** (SHALL / WHEN / IF-THEN).
- **Design** (proceso, límites, criterios de validación).
- **Tasks** (checkpoints, dependencias, paralelización).

Specs existentes:
- `project-foundation-and-risk-spikes` (fundación + Spike A, histórica).
- `platform-stabilization-and-governance` (esta fase).
Mapa completo en `docs/spec-map.md`.

## ADRs (`docs/adr/`)

Decisiones arquitectónicas registradas y versionadas: 001-005 (histórico, con
estado de supersesión) y 006-009 (giro, serverless, auth, modularidad). Cada
decisión relevante queda trazable.

## Hooks (`.kiro/hooks/`)

Quality gates deterministas, sin IA ni despliegue:
- `format-check`, `lint-check`, `typecheck` (PostFileSave).
- `compile-check`, `unit-tests` (Stop).
- `secret-scan` (PreToolUse; bloquea commit/push con secretos staged).

## Checkpoints

El trabajo avanza por checkpoints con autorización explícita; no se salta de una
Spec a la siguiente automáticamente. La estabilización se detiene antes del
commit para revisión humana.

## Auditoría arquitectónica

Se realizó una auditoría completa del working tree (arquitectura real, gaps,
estado/memoria, offline, espacial, servicios AWS) que fundamenta el giro (ADR
006) y esta estabilización.

## Revisión incremental

Cambios acotados y revisables; documentación separada del código; plan de
commits por tema (baseline, gobernanza, tests, metadata).

## Trazabilidad

Requerimiento (EARS) → Design → Task → cambio en código/documentación, con ADRs
como decisiones y Steering como marco. El Spec map conecta cada dominio con sus
servicios AWS y las funcionalidades de Kiro que se usarán.

## Evidencia conservada para la presentación

- Steering, Specs (EARS/Design/Tasks), ADRs y Spec map versionados.
- Informe de auditoría y de estabilización.
- Resultados de quality gates (format/lint/typecheck/test/build).
- Hooks deterministas y respaldo previo del working tree.
