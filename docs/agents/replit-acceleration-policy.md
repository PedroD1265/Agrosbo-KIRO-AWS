# Replit Acceleration Policy

> Governance source: [`../../AGENTS.md`](../../AGENTS.md).
> Agent matrix: [`./roles-and-responsibilities.md`](./roles-and-responsibilities.md).
> Multi-agent Spec: [`.kiro/specs/multi-agent-workflow/`](../../.kiro/specs/multi-agent-workflow/).

## 1. Proposito

Formalizar el uso de Replit como entorno de aceleracion y prototipado externo
dentro del modelo multiagente de AGROSBO. Replit complementa a Kiro, Codex y
Antigravity para trabajo mecanico, sintetico, aislado y descartable que no
requiere contexto de monorepo ni credenciales AWS activas.

## 2. Posicion dentro del modelo multiagente

| Agente | Rol principal | Autoridad |
|--------|--------------|-----------|
| Kiro | Desarrollo principal; Specs, arquitectura, integracion | Requirements, Design, Tasks, allowlists, aceptacion |
| Codex | Implementador delegado para trabajo extenso autorizado | Escritura delegada en worktree propio |
| Antigravity | Auditor independiente de solo lectura | Revision, deteccion de contradicciones |
| Replit | Acelerador externo bajo demanda | Trabajo mecanico, sintetico, aislado, verificable, descartable |
| Humano | Autoridad final | Ramas, commits, push, PR, merge, dependencias, cloud, promocion |

Replit NO es:
- Fuente de verdad de arquitectura, Specs, ADRs ni Steering.
- Autoridad sobre decisiones de region, modelos, IAM, schemas o migraciones.
- Escritor autorizado del working tree principal.
- Sustituto de Kiro para integracion o Codex para implementacion sostenida.

## 3. Autoridades y limites

### Lo que Replit puede hacer

- Analizar, comparar y proponer (Plan Mode).
- Generar artefactos mecanicos y sinteticos (Build Mode, con autorizacion).
- Producir borradores verificables para revision por Kiro.

### Lo que Replit no puede hacer

- Crear o modificar Specs oficiales (`.kiro/specs/`).
- Modificar ADRs o Steering por iniciativa propia.
- Decidir region, modelos de IA, IAM policies, schemas o migraciones.
- Implementar infraestructura final (CDK, Lambda, Aurora, etc.).
- Usar Replit Database, Replit Auth o Replit Deployments.
- Crear secretos o credenciales.
- Conectarse a bases de datos reales de AGROSBO.
- Ejecutar AWS CLI de escritura o lectura contra la cuenta del proyecto.
- Trabajar sobre la rama `main`.
- Modificar `package.json` o `package-lock.json` del monorepo sin autorizacion.
- Instalar dependencias preventivamente.
- Presentar borradores como IMPLEMENTED.
- Hacer push, PR, merge o deploy al repositorio.
- Crear una segunda fuente de verdad que compita con los documentos canonicos.

## 4. Plan Mode (modo predeterminado)

Plan Mode es el modo inicial obligatorio para toda interaccion con Replit.

En Plan Mode, Replit:
- Lee y analiza documentos provistos.
- Compara opciones y produce recomendaciones.
- Identifica riesgos y dependencias.
- Produce salidas textuales en la conversacion.

En Plan Mode, Replit NO puede:
- Modificar archivos.
- Ejecutar workflows o builds.
- Instalar dependencias.
- Iniciar servicios.
- Crear ramas, commits o recursos.

## 5. Condiciones obligatorias para Build Mode

Build Mode solo puede autorizarse cuando TODAS las siguientes condiciones se
cumplen:

1. Existe una tarea aprobada con objetivo explicito.
2. La Spec relevante ya tomo las decisiones arquitectonicas necesarias.
3. Existe una allowlist exacta de archivos/artefactos a producir.
4. El resultado esperado es pequeno, aislado y descartable.
5. Existen criterios de aceptacion y rechazo documentados.
6. Esta definido el mecanismo de revision (Replit entrega; Kiro o Codex adapta; Kiro valida; humano autoriza promocion).
7. El trabajo no se solapa con ownership activo de Kiro o Codex.
8. El humano autoriza explicitamente la transicion a Build Mode.

## 6. Usos autorizados

Despues de que Kiro haya definido el alcance, Replit puede preparar:

- Escenarios de negocio y casos de uso narrativos.
- Fixtures y datasets agricolas sinteticos.
- Corpus de voz (frases, transcripciones esperadas).
- Vocabularios personalizados para Transcribe.
- Conversaciones simuladas para el agente.
- Casos limite y matrices de pruebas.
- Payloads de ejemplo (posteriores a decisiones de transporte).
- Contenido de correos sinteticos.
- Datos sinteticos de tienda publica (P1).
- Casos E2E narrativos.
- Borradores de prompts (posteriores a decisiones de Spec).
- Analisis mecanicos y comparaciones documentales.
- Prototipos UI aislados sin servicios propios de Replit.
- Scaffolds de codigo desechable para evaluacion.

## 7. Usos prohibidos

Replit no puede, bajo ninguna circunstancia:

- Crear o modificar Specs oficiales.
- Modificar ADRs o Steering.
- Decidir region, modelos, IAM, schemas o migraciones.
- Implementar infraestructura final (CDK, serverless, Aurora).
- Usar Replit Database, Auth o Deployments como servicios del producto.
- Crear secretos ni almacenar credenciales.
- Conectarse a bases de datos reales o a la cuenta AWS del proyecto.
- Ejecutar comandos AWS.
- Trabajar sobre `main` ni sobre ramas de otros agentes.
- Modificar `package.json` o `package-lock.json` sin autorizacion.
- Instalar dependencias preventivas ("por si acaso").
- Presentar borradores como IMPLEMENTED o como decisiones tomadas.
- Hacer push, PR, merge o deploy.
- Crear una segunda fuente de verdad.

## 8. Flujo operativo por tarea

```text
1. Kiro define la Spec o checkpoint relevante.
2. Se identifica trabajo mecanico delegable (sintetico, aislado, verificable).
3. Replit recibe el prompt contractual con alcance exacto (ver §9).
4. Replit trabaja en Plan Mode: analiza, confirma comprension, propone plan.
5. Humano y ChatGPT revisan la propuesta.
6. Kiro valida coherencia con la Spec y fuentes canonicas.
7. El humano autoriza Build Mode solamente si aporta valor.
8. Replit produce artefactos sin integrarlos al repositorio.
9. Replit entrega via mecanismo autorizado (§10).
10. Kiro o Codex adapta el artefacto y prepara su integracion en una rama oficial.
11. Antigravity audita cuando el riesgo lo justifique.
12. Los quality gates normales siguen siendo obligatorios.
13. El humano autoriza la promocion, commit, push, PR y merge.
```

Resumen:

```text
Replit entrega → Kiro o Codex adapta → Kiro valida →
Antigravity audita (si aplica) → humano autoriza promocion.
```

## 9. Prompt contractual minimo para delegacion

Todo trabajo delegado a Replit debe incluir como minimo:

| Campo | Descripcion |
|-------|-------------|
| Objetivo | Que se espera producir y para que |
| Fuentes canonicas | Documentos que el trabajo debe respetar |
| Allowlist | Archivos/artefactos exactos a producir |
| Prohibiciones | Que no debe hacer ni decidir |
| Decisiones abiertas | Que puede proponer pero no resolver |
| Criterios de aceptacion | Como se verifica que el resultado es correcto |
| Criterios de rechazo | Condiciones que invalidan el resultado |
| Formato de entrega | Mecanismo y estructura esperada |

Ejemplo minimo:

```text
TAREA: Generar corpus de voz sintetico para spike S2.
FUENTES: product-scope-v2 §11, design.md §5.2.
ALLOWLIST: 5 archivos .txt con frases + ground truth.
PROHIBIDO: decidir dialectos, generar audio, instalar dependencias.
ABIERTO: puede proponer frases adicionales.
ACEPTACION: 5 frases agricolas en espanol, 5-15 palabras, vocabulario alineado.
RECHAZO: frases en ingles, vocabulario no agricola, mas de 10 archivos.
ENTREGA: conversacion (texto en el chat).
```

## 10. Mecanismos de entrega

Ordenados de menor a mayor acoplamiento:

1. **Conversacion**: texto directamente en el chat con Replit. Preferido para
   analisis, comparaciones y artefactos pequenos.
2. **Archivos descargables**: Replit produce archivos que el humano descarga y
   provee a Kiro o Codex para adaptacion y validacion.
3. **Replit App aislada**: prototipo funcional visible en la URL temporal de
   Replit; no conectado a servicios del proyecto.
4. **Rama aislada autorizada**: solo cuando el humano autoriza explicitamente
   una rama dedicada con ownership disjunto. Requiere revision completa antes
   de merge.

## 11. Regla de no-promocion automatica

Los siguientes artefactos internos de Replit NO se promocionan automaticamente
al repositorio:

- Checkpoints internos del proyecto Replit.
- Archivos en `attached_assets/` de Replit.
- Configuracion de entorno de Replit (`.replit`, `replit.nix`, etc.).
- Commits internos del proyecto Replit.
- Dependencias instaladas en el entorno Replit.

Solo los artefactos explicitamente aceptados entran al repositorio siguiendo el
flujo: Replit entrega; Kiro o Codex adapta; Kiro valida; el humano autoriza
la promocion.

## 12. Reglas Git

- Por defecto, Replit no tiene acceso directo al repositorio Git de AGROSBO.
- La via preferida de entrega es conversacion o archivos descargables.
- Excepcionalmente, el humano puede autorizar una rama o entorno Git aislado
  para que Replit entregue artefactos.
- Esa excepcion requiere: ownership disjunto, allowlist exacta, rama dedicada,
  y autorizacion humana explicita.
- Nunca se trabaja sobre `main`.
- Replit no hace push, PR, merge, deploy ni force push al repositorio.
- Checkpoints internos, commits automaticos, `attached_assets/` y configuracion
  del entorno Replit (`.replit`, `replit.nix`, etc.) no se promocionan
  directamente.
- Kiro o Codex adapta unicamente los artefactos aceptados.
- El humano autoriza la incorporacion final al repositorio.

## 13. Regla de retorno

Un trabajo solo se delega a Replit cuando:

1. El ahorro estimado de tiempo es mayor que el costo de revision.
2. La salida es verificable objetivamente (contra criterios explicitos).
3. El artefacto es descartable sin costo si falla la revision.
4. El riesgo de introducir errores o deuda es bajo.
5. No duplica trabajo que Kiro o Codex ya estan haciendo.
6. No crea artefactos que requieran mantenimiento innecesario.

Si alguna condicion no se cumple, el trabajo permanece con Kiro o Codex.

## 14. Ejemplos autorizados por fase

### Fase 3 — Spikes criticos

- Corpus de voz sintetico (frases + ground truth).
- Vocabulario personalizado de Transcribe.
- Payloads de prueba para Bedrock tool calling.
- Datos sinteticos de colaboracion (tokens, estados, transiciones).
- Templates de correo SES sinteticos.

### Fases 4-5 — Infraestructura y agente

- Conversaciones simuladas humano-agente.
- Escenarios de tool calling con fixtures.
- Matrices de casos limite para herramientas del agente.
- Borradores de system prompts (posteriores a decisions de Spec 21).

### Fase 6 — Colaboradores y notificaciones

- Datos sinteticos de colaboradores externos.
- Escenarios de ciclo de vida (sent → delivered → responded → completed).
- Contenido de correos de notificacion.
- Casos limite de TTL, revocacion y concurrencia.

### Fase 7 — Inteligencia agricola

- Descripciones sinteticas de fotografias agricolas (para prompts).
- Escenarios de IrrigationDelayScenario con datos ficticios.
- Matrices de confianza y supuestos.

### P1 — Tienda publica

- Datos sinteticos de productos, interesados y solicitudes.
- Escenarios de comparacion explicada.
- Prototipos UI de tienda (aislados, sin Replit services).

### UI/Demo

- Prototipos visuales aislados para evaluar layouts.
- Datos de seed para golden path.

## 15. Tareas que permanecen con Kiro, Codex o humano

Las siguientes tareas NO se delegan a Replit:

- Escritura de Requirements, Design o Tasks.
- Redaccion o modificacion de ADRs.
- Modificacion de Steering.
- Implementacion dentro de `api/src/`, `web/src/`, `shared/`, `infra/src/`.
- Modificacion de schemas o migraciones.
- Configuracion de CDK o infraestructura.
- Decisiones de region, modelo, IAM.
- Ejecucion de spikes contra AWS.
- Gestion de secretos o credenciales.
- Commit, push, PR, merge.
- Quality gates.
- Auditorias de seguridad.

## 16. STOP REQUIRED

Detener inmediatamente si:

- Se necesita modificar fuera de la allowlist de la tarea.
- Existe contradiccion con AGENTS.md o fuentes canonicas.
- Se necesita cambiar una Spec, ADR o Steering.
- Se necesita tomar una decision arquitectonica.
- Se necesita acceso a AWS.
- Se necesitan dependencias del monorepo.
- Se necesita modificar codigo funcional.
- No se puede preservar a Kiro como autoridad de integracion.
- El documento o artefacto convertiria a Replit en fuente de verdad.
- El humano no ha autorizado Build Mode pero se requieren archivos.

## 17. Checklist previo a Plan Mode

Antes de iniciar Plan Mode con Replit:

- [ ] Existe un objetivo claro para la delegacion.
- [ ] Se identificaron las fuentes canonicas relevantes.
- [ ] Se definio que decisiones estan abiertas vs. tomadas.
- [ ] El prompt contractual esta preparado (ver §9).
- [ ] No hay solapamiento con trabajo activo de Kiro o Codex.

## 18. Checklist previo a Build Mode

Antes de autorizar Build Mode:

- [ ] Plan Mode fue completado y el plan es coherente.
- [ ] Existe tarea aprobada con allowlist exacta.
- [ ] La Spec relevante ya tomo las decisiones necesarias.
- [ ] El resultado es pequeno, aislado y descartable.
- [ ] Criterios de aceptacion y rechazo estan definidos.
- [ ] Mecanismo de revision esta definido (Kiro o Codex adapta; Kiro valida; humano autoriza).
- [ ] No hay solapamiento de ownership.
- [ ] El humano autoriza explicitamente.

## 19. Checklist de aceptacion y transferencia

Antes de promover un artefacto de Replit al repositorio:

- [ ] Kiro verifico contra criterios de aceptacion.
- [ ] El artefacto cumple la allowlist (no archivos extra).
- [ ] No contiene secretos, credenciales ni PII.
- [ ] No introduce dependencias no autorizadas.
- [ ] No contradice documentos canonicos.
- [ ] No crea una segunda fuente de verdad.
- [ ] Antigravity audito (si solicitado).
- [ ] El humano autoriza la promocion al repositorio.

## 20. Regla de entrega

```text
Replit entrega → Kiro o Codex adapta → Kiro valida →
Antigravity audita (si aplica) → humano autoriza promocion.
```

Ningun artefacto de Replit entra al repositorio sin pasar por este flujo.
La entrega por conversacion (§10.1) sigue requiriendo que Kiro o Codex adapte
el contenido y que el humano autorice su incorporacion.
