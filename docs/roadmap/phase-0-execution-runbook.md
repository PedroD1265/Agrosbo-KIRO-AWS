> **Estado: COMPLETADO / ARCHIVADO.**
>
> Checkpoints 0.2–0.15 completados. Cinco puertas humanas aprobadas. Spec 15
> materializada (85 IDs). Auditoría final y gates completados. Plan de commits
> y preparación de PR completados. Cuatro commits ejecutados con autorización
> separada. Draft PR #3 creado con autorización separada.
>
> Este runbook no debe reejecutarse. El siguiente trabajo se define en
> `docs/roadmap/delivery-roadmap-v2.md` y requiere nueva autorización.

# AGROSBO Phase 0 Execution Runbook

> Modo operativo: **paradas selectivas por riesgo**.
>
> Rama esperada: `docs/product-agent-scope-v2`.
>
> Último checkpoint completado: **0.15 — PR y cierre**.
>
> Todos los bloques fueron ejecutados y aprobados.
> Draft PR #3 creado. Pendiente de revisión final y merge.

## Convenciones normativas

- **REQUISITO**: condición obligatoria.
- **AUTORIZACIÓN**: permiso humano explícito y limitado a un bloque.
- **PROHIBICIÓN**: acción no permitida.
- **RECOMENDACIÓN**: opción preferida, ajustable con evidencia.
- **STOP REQUIRED**: detener toda escritura y devolver un informe.
- **HITO INTERNO**: checkpoint que Kiro completa y valida sin detenerse.
- **PUERTA HUMANA**: límite de bloque donde Kiro debe detenerse.
- **APROBADO**: solo existe cuando el prompt humano más reciente lo declara.

## 1. Propósito

Este runbook dirige la Fase 0 de AGROSBO con supervisión humana suficiente, pero
sin detener el trabajo después de cada documento.

Kiro ejecuta un **bloque autorizado**, completa sus checkpoints internos en
orden, valida cada hito y continúa automáticamente mientras no aparezca una
condición de alto riesgo.

El flujo obligatorio es:

```text
runbook maestro
→ autorización humana de un bloque
→ Kiro ejecuta checkpoints internos secuenciales
→ validaciones internas
→ parada únicamente ante riesgo o al final de la puerta humana
→ usuario comparte informe y archivos
→ ChatGPT revisa
→ corrección o aprobación
→ autorización del siguiente bloque
```

Este runbook no autoriza terminar toda la Fase 0 en una sola ejecución. Tampoco
autoriza commits, push, pull requests, merges ni despliegues.

## 2. Autoridad y fuentes de verdad

### 2.1 Fuente canónica de alcance

La fuente canónica de P0, P1 y P2 es:

[`../product/product-scope-v2.md`](../product/product-scope-v2.md)

El runbook organiza la ejecución, pero no reemplaza ni duplica ese contrato.

### 2.2 Jerarquía documental

1. `docs/product/product-scope-v2.md`.
2. ADRs aprobados.
3. Documentos técnicos de arquitectura.
4. Matriz de capacidades, personas y golden paths.
5. Roadmap y `docs/spec-map.md`.
6. Specs.
7. Steering.
8. README y demo.
9. Código y pruebas como evidencia del estado implementado.

Reglas de interpretación:

- Código, rutas, persistencia, pruebas y despliegue determinan qué está
  implementado.
- `product-scope-v2.md` determina el alcance aprobado.
- Los ADRs determinan decisiones técnicas aprobadas.
- Un documento derivado no cambia una decisión superior.
- Kiro no inventa reconciliaciones.
- Una contradicción que exige decidir alcance, arquitectura o seguridad activa
  **STOP REQUIRED**.

### 2.3 Autoridad del prompt humano

El prompt humano más reciente puede:

- autorizar un bloque;
- declarar una puerta aprobada;
- ordenar una corrección puntual;
- reducir la allowlist;
- suspender o modificar este runbook.

Una autorización de bloque no se extiende al bloque siguiente.

## 3. Estado inicial histórico

> Esta sección conserva el estado existente al iniciar la Fase 0. No representa
> el estado actual del repositorio ni autoriza reejecución.

### 3.1 Repositorio y Git

- Repositorio: `PedroD1265/agrosbo`.
- Working copy esperada: `D:\Pedro\AGROBO`.
- Rama: `docs/product-agent-scope-v2`.
- Base inicial de la rama: `8b9d7ba`.
- `cloud-services-readiness` fue fusionado mediante PR #2.
- Al inicio de la Fase 0 no existían commits, push, PR ni despliegue de esta
  fase. Posteriormente se crearon los commits autorizados y el Draft PR #3. No
  hubo deploy.

Al comenzar cada bloque:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git rev-parse --short HEAD
git status --short
git status --porcelain=v1 -uall
git log -5 --oneline --decorate
```

Antes del Bloque 1, los únicos cambios reconocidos son:

```text
docs/product/product-scope-v2.md
docs/roadmap/phase-0-execution-runbook.md
```

Cualquier otro cambio previo no reconocido activa **STOP REQUIRED**.

### 3.2 Baseline técnico verificado

- `npm run format`: PASS.
- `npm run check:encoding`: PASS.
- `npm run lint`: 0 errores y 154 warnings preexistentes.
- `npm run typecheck`: PASS.
- `npm test`: 132 pruebas.
- `npm run test:memstorage`: 7 pruebas.
- `npm run test:integration`: 26 pruebas PostgreSQL.
- Total: 165 pruebas.
- `npm run build`: PASS.
- `npm run db:check`: PASS.

Este baseline se vuelve a comprobar al final.

### 3.3 Estado de checkpoints al iniciar la Fase 0

- Auditoría de solo lectura: **APROBADA**.
- Checkpoint 0.2B: **APROBADO**.
- Checkpoints 0.3–0.15: pendientes al inicio de la Fase 0.

Estado final: Checkpoints 0.2–0.15 completados y puertas humanas aprobadas.

## 4. Alcance de la Fase 0

La Fase 0 es documental y de gobierno técnico. Debe:

- persistir la auditoría;
- crear documentos derivados de producto;
- registrar ADR 014–018;
- definir arquitectura especializada;
- alinear documentación y Steering;
- crear Requirements, Design y Tasks;
- auditar consistencia;
- ejecutar gates;
- preparar commits y PR sin ejecutarlos.

No implementa capacidades P0 o P1.

## 5. Trabajo expresamente excluido

Queda prohibido:

- modificar código funcional de `api/`, `web/`, `shared/` o `infra/`;
- modificar schema o migraciones;
- instalar o cambiar dependencias;
- desplegar o crear recursos cloud;
- implementar Cognito, S3, Bedrock, Transcribe, Polly o SES;
- implementar agente, voz, visión, colaboradores o tienda;
- corregir endpoints espaciales;
- corregir warnings de lint;
- realizar refactors;
- ejecutar acciones con terceros reales;
- activar trabajo P2.

Los gaps técnicos se documentan y derivan a una Spec posterior.

## 6. Política Git

Sin autorización explícita se prohíbe:

- commit;
- push;
- crear o modificar PR;
- merge;
- rebase;
- squash;
- amend;
- force push;
- cambiar o borrar ramas;
- reset, clean, restore o descarte;
- stash;
- tags y releases.

Reglas:

- no usar `git add .`;
- no resolver conflictos automáticamente;
- no borrar historia;
- no usar commits temporales;
- reportar el estado Git al final de cada bloque;
- un cambio desconocido siempre detiene la ejecución.

## 7. Política de herramientas y servicios

### 7.1 Prohibido

- AWS Console, AWS CLI y CDK deploy/destroy;
- Azure;
- Lovable;
- Replit;
- servicios externos;
- cambios de base de datos;
- seeds no autorizados;
- cambios de dependencias;
- cambios funcionales de código.

### 7.2 Permitido

- lectura local;
- búsquedas con `rg`, `git grep` o `Select-String`;
- edición de la allowlist del bloque;
- validaciones documentales;
- quality gates cuando el bloque los autorice;
- PostgreSQL local únicamente en el Bloque 5.

## 8. Reglas de modificación de archivos

1. Verificar Git antes de escribir.
2. Comparar cambios con la allowlist acumulada de Fase 0.
3. Detenerse ante cambios desconocidos.
4. Modificar solo archivos permitidos por el checkpoint actual.
5. No aplicar fixes globales.
6. No reformatear todo el repositorio.
7. Inspeccionar rutas equivalentes antes de crear documentos.
8. No crear duplicados.
9. Validar cada hito interno antes de avanzar.
10. Continuar al siguiente checkpoint del mismo bloque únicamente si:
    - las validaciones pasan;
    - no hay contradicción;
    - no se amplió el alcance;
    - no apareció un archivo no autorizado.
11. Detenerse al final de la puerta humana.

## 9. Detección del trabajo pendiente

Kiro debe:

1. leer este runbook;
2. leer `product-scope-v2.md`;
3. inspeccionar Git;
4. leer el prompt humano más reciente;
5. identificar el bloque autorizado;
6. comprobar qué hitos internos ya existen;
7. no tratar un archivo existente como aprobado;
8. reanudar desde el hito más temprano incompleto del bloque;
9. detenerse si el bloque autorizado no puede determinarse.

## 10. Política de paradas selectivas

### 10.1 No se detiene por rutina

Kiro **no debe detenerse**:

- después de crear cada archivo;
- después de cada checkpoint interno;
- solo porque una validación documental pasó;
- para pedir confirmación sobre decisiones ya fijadas;
- para reportar progreso parcial normal.

### 10.2 Paradas humanas planificadas

Solo existen cinco puertas humanas desde el estado actual:

| Bloque | Checkpoints | Motivo de la parada |
| --- | --- | --- |
| 1 | 0.3–0.4 | Congelar evidencia y documentos base antes de decisiones técnicas |
| 2 | 0.5–0.6 | Revisar ADRs y arquitectura antes de propagarlos a muchos documentos |
| 3 | 0.7–0.8 | Confirmar alineación masiva antes de crear la Spec |
| 4 | 0.9–0.11 | Revisar Requirements/Design/Tasks como cadena completa |
| 5 | 0.12–0.15 | Revisar consistencia, gates y preparación final |

### 10.3 Paradas por riesgo

Aplicar **STOP REQUIRED** inmediatamente cuando:

- falla una validación no corregible de forma documental y local;
- aparece un archivo no autorizado;
- existe un cambio Git desconocido;
- surge una contradicción de alcance, seguridad o arquitectura;
- falta una decisión humana real;
- se requiere código, schema o dependencias;
- se detecta un secreto;
- se necesita commit, push, PR, merge, cambio de rama o deploy;
- una afirmación no puede respaldarse con evidencia;
- una corrección cambiaría `product-scope-v2.md` o un ADR ya aprobado fuera de
  su bloque;
- el número o tipo de archivos excede la allowlist.

## 11. Política de manejo de errores

- No ocultar fallos.
- No aumentar timeouts sin investigar.
- No desactivar reglas.
- No usar fixes globales.
- No continuar después de un fallo grave.
- No cambiar código para reparar gates documentales.
- Reportar comando, salida relevante, impacto e hipótesis.

### 11.1 Autocorrecciones permitidas sin detenerse

Kiro puede corregir y repetir validaciones cuando el problema sea:

- formato Markdown;
- enlace relativo incorrecto;
- typo;
- tilde o encoding;
- inconsistencia puramente derivada;
- estado documental claramente contrario a una fuente superior;
- duplicación textual menor.

Condiciones:

- la corrección queda dentro de la allowlist del bloque;
- no cambia alcance ni ADR;
- no requiere tocar código;
- se documenta en el informe final;
- se vuelve a ejecutar la validación afectada.

### 11.2 Fallos que obligan a detenerse

- lint, typecheck, tests, build, db:check o integración fallan;
- la corrección requiere desactivar una regla;
- se necesita modificar un archivo fuera de la allowlist;
- se detecta una decisión no resuelta;
- un documento superior parece incorrecto;
- una ruta o arquitectura activa entra en conflicto con un ADR.

## 12. Política de documentación

- Español UTF-8 sin BOM.
- Tildes correctas.
- Markdown compatible con Prettier.
- Enlaces relativos.
- Sin exageraciones promocionales.
- Usar coherentemente:
  - `IMPLEMENTED`;
  - `PARTIAL`;
  - `PLACEHOLDER`;
  - `DOCUMENTED_ONLY`;
  - `MISSING`;
  - `PLANNED P0`;
  - `PLANNED P1`;
  - `OUT OF SCOPE/P2`.
- No convertir planes en implementación.
- No duplicar el contrato canónico.
- No borrar historia.
- Usar supersesión explícita.

## 13. Bloques operativos y puertas humanas

### Bloque 1 — Evidencia y producto derivado

Incluye:

- 0.3 Auditoría persistida.
- 0.4 Documentos de producto derivados.

Kiro valida 0.3 y continúa a 0.4 sin detenerse. La parada ocurre al final de 0.4.

### Bloque 2 — Decisiones y arquitectura

Incluye:

- 0.5 ADRs 014–018.
- 0.6 Arquitectura especializada.

La parada al final de 0.6 es obligatoria porque errores aquí se propagarían a
README, Steering y Specs.

### Bloque 3 — Alineación masiva

Incluye:

- 0.7 Documentos activos.
- 0.8 Steering.

Kiro valida 0.7 y continúa a 0.8. Se detiene antes de crear Requirements.

### Bloque 4 — Cadena de Spec

Incluye:

- 0.9 Requirements.
- 0.10 Design.
- 0.11 Tasks.

Se ejecutan estrictamente en orden. Kiro realiza una revisión interna de
trazabilidad entre cada hito, pero se detiene solo al final de 0.11, salvo riesgo.

### Bloque 5 — Cierre técnico y preparación

Incluye:

- 0.12 Auditoría de consistencia.
- correcciones documentales mecánicas permitidas;
- repetición de 0.12 hasta quedar limpia;
- 0.13 Gates finales;
- 0.14 Plan de commits;
- 0.15 PR y cierre.

Kiro se detiene al primer gate técnico fallido. Si todo pasa, se detiene al final
de 0.15 sin realizar acciones Git remotas.

## 14. Fichas de checkpoints

### Checkpoint 0.2 — Contrato canónico

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Completado y aprobado. |
| **Objetivo** | Conservar `product-scope-v2.md` como fuente canónica. |
| **Dependencias** | Auditoría de solo lectura aprobada. |
| **Lecturas obligatorias** | `docs/product/product-scope-v2.md`. |
| **Archivos permitidos** | Ninguno. |
| **Archivos prohibidos** | Todo el repositorio. |
| **Procedimiento** | No reejecutar ni modificar sin nueva autorización. |
| **Validaciones permitidas** | Lectura y Git de solo lectura. |
| **Criterio de terminado** | Marcado como aprobado. |
| **Formato del informe** | No aplica salvo alteración detectada. |
| **Condición de parada** | Detenerse si fue modificado de forma desconocida. |
| **Próximo checkpoint posible** | 0.3. |
| **Requiere aprobación humana** | Sí, ya concedida. |

### Checkpoint 0.3 — Auditoría persistida

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | 0.2 aprobado; cambios reconocidos; audit v2 inexistente o incompleto. |
| **Objetivo** | Persistir baseline, evidencia, contradicciones y gaps sin corregir código. |
| **Dependencias** | `product-scope-v2.md`. |
| **Lecturas obligatorias** | Auditoría previa, README, spec-map, arquitectura, Steering, código y tests relevantes. |
| **Archivos permitidos** | `docs/reviews/current-capability-audit-v2.md`. |
| **Archivos prohibidos** | Todo lo demás durante este hito. |
| **Procedimiento** | Documentar capacidades, evidencia, MemStorage parcial, providers, endpoints espaciales y P0/P1 ausentes. |
| **Validaciones permitidas** | Prettier del archivo, encoding, diff-check y Git checks. |
| **Criterio de terminado** | Audit completo, verificable y coherente. |
| **Formato del informe** | Registrar resultado en el informe acumulado del Bloque 1. |
| **Condición de parada** | Solo ante riesgo; si pasa, continuar a 0.4. |
| **Próximo checkpoint posible** | 0.4 dentro del mismo bloque. |
| **Requiere aprobación humana** | No, es hito interno. |

### Checkpoint 0.4 — Documentos de producto derivados

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | 0.3 validado internamente. |
| **Objetivo** | Crear matriz, personas, golden paths y roadmap v2. |
| **Dependencias** | Contrato y audit. |
| **Lecturas obligatorias** | `product-scope-v2.md`, audit, RBAC, sync, idempotencia, spec-map y demo. |
| **Archivos permitidos** | `docs/product/capability-status-matrix.md`; `docs/product/personas-and-permissions.md`; `docs/product/golden-paths-p0-p1.md`; `docs/roadmap/delivery-roadmap-v2.md`. |
| **Archivos prohibidos** | ADRs, arquitectura, Steering, Specs y código. |
| **Procedimiento** | Crear los cuatro documentos y hacer revisión cruzada con el audit. |
| **Validaciones permitidas** | Prettier, encoding, enlaces, estados, diff-check y Git checks. |
| **Criterio de terminado** | Cuatro documentos consistentes y trazables. |
| **Formato del informe** | Informe estándar acumulado del Bloque 1. |
| **Condición de parada** | Puerta humana al final de 0.4. |
| **Próximo checkpoint posible** | 0.5 tras aprobación del Bloque 1. |
| **Requiere aprobación humana** | Sí, al final del bloque. |

### Checkpoint 0.5 — ADRs 014–018

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Bloque 1 aprobado. |
| **Objetivo** | Registrar alcance, acciones del agente, hosting, colaboradores y límites agrícolas. |
| **Dependencias** | Documentos de producto aprobados. |
| **Lecturas obligatorias** | Contrato, audit, matriz, personas, golden paths, roadmap y ADRs previos. |
| **Archivos permitidos** | Los cinco ADRs 014–018 definidos por el plan de Fase 0. |
| **Archivos prohibidos** | Todo lo demás durante este hito. |
| **Procedimiento** | Crear ADRs y realizar revisión cruzada entre los cinco. |
| **Validaciones permitidas** | Prettier, encoding, enlaces, búsquedas cruzadas y Git checks. |
| **Criterio de terminado** | Cinco ADRs completos y sin contradicciones. |
| **Formato del informe** | Registrar resultado en el informe acumulado del Bloque 2. |
| **Condición de parada** | Solo ante riesgo; si pasa, continuar a 0.6. |
| **Próximo checkpoint posible** | 0.6 dentro del mismo bloque. |
| **Requiere aprobación humana** | No, es hito interno. |

### Checkpoint 0.6 — Arquitectura especializada

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | ADRs validados internamente. |
| **Objetivo** | Crear arquitectura principal del agente y colaboración; superseder el plan anterior. |
| **Dependencias** | ADR 015, 017 y 018. |
| **Lecturas obligatorias** | Contrato, ADRs, sync, idempotencia, auth, providers y arquitectura actual. |
| **Archivos permitidos** | `docs/architecture/operational-agent-plan.md`; `docs/architecture/collaboration-model.md`; `docs/architecture/farm-assistant-plan.md`. |
| **Archivos prohibidos** | Otros documentos y código. |
| **Procedimiento** | Definir REST P0, SSE opcional, WebSocket fuera, cola offline, escenarios separados, colaboración/eventos separados y supersesión. |
| **Validaciones permitidas** | Prettier, encoding, búsquedas de contradicciones, enlaces y Git checks. |
| **Criterio de terminado** | Una sola arquitectura activa y coherente con ADRs. |
| **Formato del informe** | Informe estándar acumulado del Bloque 2. |
| **Condición de parada** | Puerta humana al final de 0.6. |
| **Próximo checkpoint posible** | 0.7 tras aprobación del Bloque 2. |
| **Requiere aprobación humana** | Sí, al final del bloque. |

### Checkpoint 0.7 — Alineación documental

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Bloque 2 aprobado. |
| **Objetivo** | Alinear README y documentación activa. |
| **Dependencias** | ADRs y arquitectura aprobados. |
| **Lecturas obligatorias** | Todos los documentos aprobados y las rutas existentes equivalentes. |
| **Archivos permitidos** | `README.md`; `docs/spec-map.md`; `docs/architecture/current-and-target.md`; `docs/architecture/aws-service-plan.md`; `docs/architecture/platform-evolution.md`; `docs/product/vision-and-scope.md`; `docs/product/hackathon-demo-story.md`; `docs/kiro/development-process.md`. |
| **Archivos prohibidos** | Steering, Specs y código. |
| **Procedimiento** | Alinear cloud readiness, AWS target, agente/SES P0, tienda P1, marketplace P2, 165 pruebas y single-organization. |
| **Validaciones permitidas** | Prettier, encoding, búsquedas, enlaces y Git checks. |
| **Criterio de terminado** | Documentación activa coherente. |
| **Formato del informe** | Registrar resultado en el informe acumulado del Bloque 3. |
| **Condición de parada** | Solo ante riesgo; si pasa, continuar a 0.8. |
| **Próximo checkpoint posible** | 0.8 dentro del mismo bloque. |
| **Requiere aprobación humana** | No, es hito interno. |

### Checkpoint 0.8 — Steering

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | 0.7 validado internamente. |
| **Objetivo** | Convertir decisiones aprobadas en reglas operativas breves. |
| **Dependencias** | Documentación alineada. |
| **Lecturas obligatorias** | Contrato, ADRs, arquitectura, docs derivados y Steering actual. |
| **Archivos permitidos** | `.kiro/steering/product.md`; `.kiro/steering/tech.md`; `.kiro/steering/security.md`; `.kiro/steering/domain-rules.md`; `.kiro/steering/hackathon-scope.md`. |
| **Archivos prohibidos** | Todo lo demás. |
| **Procedimiento** | Alinear current/target, P0/P1/P2, confirmaciones, límites agrícolas y afirmaciones prohibidas. |
| **Validaciones permitidas** | Prettier, encoding, búsquedas y Git checks. |
| **Criterio de terminado** | Steering operativo, breve y sin duplicar el contrato. |
| **Formato del informe** | Informe estándar acumulado del Bloque 3. |
| **Condición de parada** | Puerta humana al final de 0.8. |
| **Próximo checkpoint posible** | 0.9 tras aprobación del Bloque 3. |
| **Requiere aprobación humana** | Sí, al final del bloque. |

### Checkpoint 0.9 — Requirements EARS

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Bloque 3 aprobado. |
| **Objetivo** | Crear requisitos EARS trazables. |
| **Dependencias** | Fuentes documentales aprobadas. |
| **Lecturas obligatorias** | Todos los documentos aprobados. |
| **Archivos permitidos** | `.kiro/specs/product-agent-scope-v2/requirements.md`. |
| **Archivos prohibidos** | Design, Tasks y todo lo demás durante este hito. |
| **Procedimiento** | Crear glosario, requisitos EARS, negativos y trazabilidad. |
| **Validaciones permitidas** | Prettier, encoding, comprobación EARS y Git checks. |
| **Criterio de terminado** | Requirements completo y trazable. |
| **Formato del informe** | Registrar resultado en el informe acumulado del Bloque 4. |
| **Condición de parada** | Solo ante riesgo; revisar trazabilidad y continuar a 0.10. |
| **Próximo checkpoint posible** | 0.10 dentro del mismo bloque. |
| **Requiere aprobación humana** | No, es hito interno. |

### Checkpoint 0.10 — Design

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Requirements validado internamente. |
| **Objetivo** | Diseñar la ejecución documental de la Spec. |
| **Dependencias** | Requirements. |
| **Lecturas obligatorias** | Requirements y sus fuentes. |
| **Archivos permitidos** | `.kiro/specs/product-agent-scope-v2/design.md`. |
| **Archivos prohibidos** | Tasks y todo lo demás durante este hito. |
| **Procedimiento** | Definir jerarquía, relaciones, ADRs, validaciones, riesgos y trazabilidad. |
| **Validaciones permitidas** | Prettier, encoding, referencias a requirement IDs y Git checks. |
| **Criterio de terminado** | Diseño completo sin inventar implementación funcional. |
| **Formato del informe** | Registrar resultado en el informe acumulado del Bloque 4. |
| **Condición de parada** | Solo ante riesgo; revisar trazabilidad y continuar a 0.11. |
| **Próximo checkpoint posible** | 0.11 dentro del mismo bloque. |
| **Requiere aprobación humana** | No, es hito interno. |

### Checkpoint 0.11 — Tasks

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Design validado internamente. |
| **Objetivo** | Crear tareas atómicas sin ejecutarlas. |
| **Dependencias** | Requirements y Design. |
| **Lecturas obligatorias** | Requirements, Design y fuentes aprobadas. |
| **Archivos permitidos** | `.kiro/specs/product-agent-scope-v2/tasks.md`. |
| **Archivos prohibidos** | Todo lo demás. |
| **Procedimiento** | Definir tareas, dependencias, archivos, validaciones y trazabilidad. |
| **Validaciones permitidas** | Prettier, encoding, IDs, dependencias y Git checks. |
| **Criterio de terminado** | Cadena Requirements–Design–Tasks consistente. |
| **Formato del informe** | Informe estándar acumulado del Bloque 4. |
| **Condición de parada** | Puerta humana al final de 0.11. |
| **Próximo checkpoint posible** | 0.12 tras aprobación del Bloque 4. |
| **Requiere aprobación humana** | Sí, al final del bloque. |

### Checkpoint 0.12 — Auditoría de consistencia

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Bloque 4 aprobado. |
| **Objetivo** | Detectar y resolver contradicciones documentales mecánicas antes de gates. |
| **Dependencias** | Todos los documentos de Fase 0. |
| **Lecturas obligatorias** | Todos los archivos creados/modificados y documentos activos relacionados. |
| **Archivos permitidos** | Primera pasada: ninguno. Correcciones mecánicas: solo archivos ya modificados en Fase 0, excluyendo contrato y ADRs salvo autorización. |
| **Archivos prohibidos** | Código, schema, dependencias y documentos superiores no autorizados. |
| **Procedimiento** | Buscar Amplify, CloudFront, solo lectura, future, marketplace, SES, Cognito, cloud readiness, assistant, copiloto, Bedrock, pruebas y P0/P1/P2; corregir únicamente problemas derivados y repetir la auditoría. |
| **Validaciones permitidas** | Búsquedas, enlaces, Prettier/encoding de correcciones y Git checks. |
| **Criterio de terminado** | Auditoría limpia o STOP REQUIRED por decisión humana. |
| **Formato del informe** | Registrar resultado en el informe acumulado del Bloque 5. |
| **Condición de parada** | Solo si la contradicción cambia alcance/ADR; si queda limpia, continuar a 0.13. |
| **Próximo checkpoint posible** | 0.13 dentro del mismo bloque. |
| **Requiere aprobación humana** | No, es hito interno. |

### Checkpoint 0.13 — Gates finales

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Auditoría 0.12 limpia. |
| **Objetivo** | Demostrar que la Fase 0 no degradó el repositorio. |
| **Dependencias** | 0.12 limpio. |
| **Lecturas obligatorias** | Scripts y configuración local. |
| **Archivos permitidos** | Ninguno. |
| **Archivos prohibidos** | Todo el repositorio. |
| **Procedimiento** | Ejecutar format, encoding, lint, typecheck, unit, MemStorage, build, db:check e integración PostgreSQL; después Git checks. |
| **Validaciones permitidas** | Gates completos y Git de solo lectura. |
| **Criterio de terminado** | Todos los gates PASS y estado Git conocido. |
| **Formato del informe** | Registrar tabla de resultados en el informe acumulado. |
| **Condición de parada** | Ante el primer fallo técnico. Si pasa, continuar a 0.14. |
| **Próximo checkpoint posible** | 0.14 dentro del mismo bloque. |
| **Requiere aprobación humana** | No, es hito interno. |

### Checkpoint 0.14 — Plan de commits

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Gates verdes. |
| **Objetivo** | Proponer staging y commits sin ejecutarlos. |
| **Dependencias** | 0.13. |
| **Lecturas obligatorias** | Estado Git, diffs y convención de commits. |
| **Archivos permitidos** | Ninguno. |
| **Archivos prohibidos** | Working tree e índice Git. |
| **Procedimiento** | Proponer agrupación, mensajes, dependencias y validaciones. |
| **Validaciones permitidas** | Git de solo lectura. |
| **Criterio de terminado** | Plan explícito sin staging ni commit. |
| **Formato del informe** | Registrar plan en el informe acumulado. |
| **Condición de parada** | Solo ante inconsistencia; si está completo, continuar a 0.15. |
| **Próximo checkpoint posible** | 0.15 dentro del mismo bloque. |
| **Requiere aprobación humana** | No, es hito interno. |

### Checkpoint 0.15 — PR y cierre

| Campo | Instrucción |
| --- | --- |
| **Estado inicial esperado** | Plan de commits preparado; no ejecutado. |
| **Objetivo** | Preparar título, cuerpo, evidencia, riesgos y checklist del PR. |
| **Dependencias** | 0.14. |
| **Lecturas obligatorias** | Cambios, gates, audit, ADRs y Spec. |
| **Archivos permitidos** | Ninguno salvo autorización expresa. |
| **Archivos prohibidos** | Git remoto y working tree. |
| **Procedimiento** | Preparar PR completo sin push, creación de PR, Ready ni merge. |
| **Validaciones permitidas** | Git de solo lectura. |
| **Criterio de terminado** | PR listo para copiar; estado Git conocido. |
| **Formato del informe** | Informe estándar completo del Bloque 5. |
| **Condición de parada** | Puerta humana final. |
| **Próximo checkpoint posible** | Ninguno dentro de Fase 0. |
| **Requiere aprobación humana** | Sí, al final del bloque. |

## 15. Formato de informe por bloque

Kiro reporta una sola vez al final del bloque:

1. Rama y HEAD.
2. Bloque y checkpoints ejecutados.
3. Archivos inspeccionados.
4. Archivos creados.
5. Archivos modificados.
6. Decisiones aplicadas.
7. Validaciones por checkpoint.
8. Autocorrecciones realizadas.
9. Fallos o warnings.
10. Ambigüedades.
11. Auditoría de archivos autorizados.
12. Git status.
13. Confirmación de que no hubo commit, push, PR ni deploy.
14. Frase exacta de parada.

Frases de parada:

```text
BLOQUE 1 — Evidencia y producto derivado completados. Esperando revisión humana.
BLOQUE 2 — Decisiones y arquitectura completadas. Esperando revisión humana.
BLOQUE 3 — Alineación documental y Steering completados. Esperando revisión humana.
BLOQUE 4 — Cadena Requirements–Design–Tasks completada. Esperando revisión humana.
BLOQUE 5 — Cierre técnico y preparación completados. Esperando revisión humana final.
```

## 16. Reanudación entre sesiones

1. Leer este runbook.
2. Leer `product-scope-v2.md`.
3. Inspeccionar Git.
4. Leer el prompt humano más reciente.
5. Identificar el bloque autorizado.
6. Identificar el último hito interno validado.
7. No deducir aprobación por archivos existentes.
8. Reanudar únicamente dentro del bloque autorizado.
9. Detenerse en la puerta del bloque o ante riesgo.

## 17. Política de paralelismo

- Una sola sesión con escritura por working tree.
- Análisis de solo lectura puede ser paralelo.
- Escritura paralela solo con worktrees y ramas separadas, autorización expresa y
  archivos independientes.
- Requirements → Design → Tasks nunca en paralelo.
- Auditoría y gates se ejecutan sobre una rama consolidada.
- Ninguna sesión puede mergear.

## 18. Definition of Done de Fase 0

- [x] `product-scope-v2.md` aprobado y canónico.
- [ ] Auditoría persistida aprobada.
- [ ] Matriz de capacidades.
- [ ] Personas y permisos.
- [ ] Golden paths.
- [ ] Roadmap v2.
- [ ] ADR 014–018.
- [ ] Arquitectura del agente.
- [ ] Modelo de colaboración.
- [ ] Plan anterior superseded.
- [ ] README y spec-map alineados.
- [ ] Arquitectura y AWS plan alineados.
- [ ] Visión, demo, evolución y proceso Kiro alineados.
- [ ] Steering alineado.
- [ ] Requirements, Design y Tasks coherentes.
- [ ] Cero contradicciones activas.
- [ ] Gates verdes.
- [ ] Plan de commits preparado.
- [ ] PR documentado.
- [ ] Ninguna capacidad futura presentada como implementada.
- [ ] P0/P1/P2 diferenciados.
- [ ] Working tree y estado Git conocidos.
- [ ] Ningún commit, push, PR Ready, merge o deploy sin autorización.

## 19. Regla final

Este runbook autoriza procedimiento, no autonomía.

Kiro debe continuar dentro de un bloque cuando el trabajo sea documental,
mecánico, respaldado y corregible localmente.

Kiro debe detenerse cuando continuar pueda propagar una decisión incorrecta,
afectar código, ocultar un fallo o producir un costo alto de corrección.

```text
STOP REQUIRED — se necesita decisión humana antes de continuar.
```
