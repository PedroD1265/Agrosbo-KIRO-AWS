# Requirements - platform-stabilization-and-governance

## Introducción

Esta Spec convierte el working tree del pivote en una **baseline coherente,
documentada y versionable**, sin desplegar infraestructura ni añadir dominios
funcionales nuevos. Formaliza el giro (ADR 006) y deja el repositorio listo para
un commit controlado. Requisitos en notación EARS.

## R1 - Documentación alineada al producto real
1. THE SYSTEM SHALL describir en README, Steering, ADRs y Spec map la plataforma
   agrícola integral real, NO el producto previo de trazabilidad de café.
2. THE SYSTEM SHALL etiquetar cada capacidad como implemented / being-stabilized
   / hackathon-target / planned-next / long-term-vision / deferred.
3. THE SYSTEM SHALL NOT declarar implementada una capacidad por existir su
   nombre, pantalla, tipo o helper.

## R2 - Trazabilidad de decisiones
1. THE SYSTEM SHALL registrar el giro en ADR 006 (Accepted).
2. THE SYSTEM SHALL registrar despliegue serverless (007), auth (008) y
   modularidad/dominios futuros (009).
3. THE SYSTEM SHALL asignar a cada ADR 001-005 un estado de supersesión
   (Accepted / Partially Superseded / Deferred) sin alterar de forma engañosa su
   contenido histórico.

## R3 - Tests verdes
1. WHEN se ejecuta `npm test`, THE SYSTEM SHALL pasar todas las pruebas.
2. THE SYSTEM SHALL corregir la suite RBAC (`web/src/test/rbac.test.ts`)
   alineando la resolución de aliases entre Vite, TypeScript y Vitest.
3. THE SYSTEM SHALL NOT eliminar tests, añadir skips nuevos ni reducir cobertura
   para conseguir verde.

## R4 - Contratos API identificados
1. THE SYSTEM SHALL documentar los endpoints existentes y los consumidos por el
   cliente que NO existen en el servidor (gap espacial).
2. THE SYSTEM SHALL registrar el gap espacial en
   `docs/architecture/spatial-gap-register.md` sin implementar los endpoints en
   esta Spec.

## R5 - Variables de entorno correctas
1. THE SYSTEM SHALL reescribir `.env.example` para reflejar las variables reales
   usadas por el código (NODE_ENV, PORT, DATABASE_URL, USE_MEM_STORAGE,
   AUTH_ENFORCEMENT, SESSION_SECRET, SEED_ADMIN_PASSWORD, AWS_RDS_*, AWS_REGION).
2. THE SYSTEM SHALL marcar variables futuras (adjuntos S3) como no implementadas.
3. THE SYSTEM SHALL NOT presentar variables de Textract/Azure como actuales.
4. THE SYSTEM SHALL NOT incluir valores secretos reales.

## R6 - Modo memoria documentado
1. THE SYSTEM SHALL documentar que `MemStorage` cubre solo el subconjunto core
   del `IStorage` y que otros dominios requieren PostgreSQL.

## R7 - Arquitectura actual y objetivo separadas
1. THE SYSTEM SHALL documentar arquitectura current, hackathon-target y future de
   forma inequívoca, con diagramas.
2. THE SYSTEM SHALL justificar cada servicio AWS por una necesidad del código.

## R8 - Seguridad de desarrollo y producción
1. THE SYSTEM SHALL documentar la auth actual (cookie HMAC) y los requisitos de
   producción (AUTH_ENFORCEMENT=on, Secrets Manager, CSRF, cookies Secure).
2. THE SYSTEM SHALL documentar el aislamiento futuro por organización (tenancy)
   sin modificar el esquema en esta Spec.

## R9 - No pérdida de funcionalidad
1. THE SYSTEM SHALL preservar el comportamiento existente; la única corrección
   funcional autorizada es la resolución de aliases para los tests RBAC.
2. THE SYSTEM SHALL NOT implementar endpoints espaciales, infraestructura,
   marketplace, servicios, mensajería, Bedrock, Cognito ni tenancy en esta Spec.

## R10 - Sin despliegue
1. THE SYSTEM SHALL NOT desplegar ni crear recursos AWS en esta Spec.
2. THE SYSTEM SHALL NOT ejecutar migraciones de producción.

## R11 - Quality gates
1. WHEN se ejecutan format, lint, typecheck, test y build, THE SYSTEM SHALL
   completarlos sin errores.
2. THE SYSTEM SHALL NOT dejar artefactos generados ni secretos versionados.

## R12 - Evidencia y preparación de commits
1. THE SYSTEM SHALL producir un respaldo externo previo del working tree.
2. THE SYSTEM SHALL proponer commits separados (baseline, gobernanza, tests,
   metadata) sin ejecutarlos.
3. THE SYSTEM SHALL NOT ejecutar git add, commit, push, ni crear ramas en esta
   Spec.
