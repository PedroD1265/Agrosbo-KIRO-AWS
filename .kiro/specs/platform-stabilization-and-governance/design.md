# Design - platform-stabilization-and-governance

## Objetivo del diseño

Definir cómo estabilizar y normalizar AGROSBO sin desplegar ni añadir dominios,
dejando el repositorio listo para un commit controlado del pivote.

## Proceso de estabilización

1. **Respaldo e inventario** (S0): respaldo externo del working tree; inspección
   git; escaneo de secretos.
2. **Normalización documental** (S1-S5): README, Steering (8), ADRs (006-009 +
   supersesión de 001-005), Spec map, y documentos de producto/arquitectura/
   Kiro/hackathon.
3. **Normalización técnica mínima** (S6-S7): `.env.example`, metadata de
   paquetes, hooks; corrección de aliases para los tests RBAC.
4. **Validación** (S8): quality gates + inspección git; informe y plan de
   commits.

## Documentos afectados

- `README.md`.
- `.kiro/steering/*.md` (8 archivos).
- `docs/adr/006..009` (nuevos) y `docs/adr/001..005` (estado de supersesión).
- `docs/spec-map.md`.
- `docs/product/*`, `docs/architecture/*`, `docs/kiro/*`, `docs/hackathon/*`.
- `.env.example`, `package.json` (raíz/metadata), `.kiro/hooks/*` (si desalineados).
- `web/src/test/*` y config de test (solo aliases RBAC).

## Límites

- Sin despliegue, sin recursos AWS, sin migraciones.
- Sin implementar endpoints espaciales, tenancy, marketplace, servicios,
  mensajería, Bedrock ni Cognito.
- Sin refactor masivo. Única corrección funcional: resolución de aliases de test.

## Criterios de validación

- `npm run format`, `lint`, `typecheck`, `test`, `build` en verde.
- Sin tests skipped nuevos; cobertura no reducida.
- Sin secretos ni artefactos versionados.
- Documentación consistente con el código auditado.

## Estrategia de aliases (corrección RBAC)

- Producción usa `@` → `web/src` y `@shared` → `shared` (Vite + tsconfig).
- Vitest raíz (entorno node) no resuelve `@/lib/auth` importado por
  `web/src/lib/permissions.ts`.
- Diseño: definir en la configuración de Vitest los mismos aliases que
  producción (`@` y `@shared`), de modo que los aliases compartidos resuelvan
  también en tests. No usar rutas relativas frágiles ni tocar el código de
  producción.
- Añadir una verificación mínima que asegure que un alias compartido
  (`@/lib/auth`) resuelve en el entorno de test.

## Estrategia de commits (propuesta, no ejecutada)

- **A** baseline del pivote (código recibido, sin correcciones posteriores).
- **B** gobernanza (README, Steering, ADRs, Specs, docs).
- **C** tooling y tests (aliases + RBAC).
- **D** metadata (package.json/.env.example).
- Se documenta si el baseline se puede separar limpiamente (ver informe S8).

## Reversibilidad

- Respaldo externo previo permite restaurar el estado exacto.
- Todos los cambios de esta fase son documentales o de configuración de test,
  fácilmente revertibles.

## Matriz de servicios

Se mantiene en `docs/architecture/aws-service-plan.md` (fuente única del plan
AWS por servicio, fase y justificación).

## Relación con Kiro

- Steering como fuente de intención; ADRs como decisiones; esta Spec
  (Requirements EARS + Design + Tasks) como unidad de trabajo; Hooks como quality
  gates deterministas; checkpoints con autorización explícita.
