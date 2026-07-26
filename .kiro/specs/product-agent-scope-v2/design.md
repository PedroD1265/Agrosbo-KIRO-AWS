# Design — product-agent-scope-v2

## 1. Resumen

Este Design especifica cómo la Spec product-agent-scope-v2 preserva jerarquía
documental, propaga decisiones sin duplicarlas, mantiene trazabilidad, separa
CURRENT de PLANNED y deriva implementación a Specs posteriores. No diseña
implementación funcional.

## 2. Objetivos

- Consolidar un corpus documental coherente.
- Garantizar que cada decisión tiene una fuente canónica única.
- Evitar documentos contradictorios.
- Hacer auditable el estado de cada capacidad.
- Preparar un handoff limpio hacia Specs de implementación.

## 3. No objetivos

- Diseñar endpoints REST.
- Diseñar schemas de base de datos.
- Diseñar CDK stacks.
- Diseñar componentes React.
- Diseñar prompts del agente.
- Implementar código o infraestructura.

## 4. Fuentes de verdad y precedencia

| Nivel | Documento                                                                        | Rol                            |
| ----- | -------------------------------------------------------------------------------- | ------------------------------ |
| 1     | product-scope-v2.md                                                              | Contrato canónico del producto |
| 2     | ADRs 014–018                                                                     | Decisiones técnicas Accepted   |
| 3     | operational-agent-plan.md, collaboration-model.md                                | Arquitectura técnica           |
| 4     | capability-status-matrix.md, personas-and-permissions.md, golden-paths-p0-p1.md  | Producto derivado              |
| 5     | delivery-roadmap-v2.md, spec-map.md                                              | Secuencia                      |
| 6     | Esta Spec (requirements/design/tasks)                                            | Formalización                  |
| 7     | Steering                                                                         | Reglas operativas              |
| 8     | README, demo-story                                                               | Comunicación                   |
| 9     | Código y tests                                                                   | Evidencia de CURRENT (no redefine alcance; confirma o refuta) |

## 5. Componentes documentales

### 5.1 Canónicos (fuente única, no derivados)

- product-scope-v2.md
- ADRs 014–018

### 5.1b Evidencia auditada de CURRENT (no contrato canónico)

- current-capability-audit-v2.md

### 5.2 Técnicos (diseño derivado del contrato y ADRs)

- operational-agent-plan.md
- collaboration-model.md

### 5.3 Derivados de producto (resumen y presentación)

- capability-status-matrix.md
- personas-and-permissions.md
- golden-paths-p0-p1.md
- delivery-roadmap-v2.md
- spec-map.md

### 5.4 Reglas operativas

- Steering (8 archivos)

### 5.5 Comunicación

- README.md
- hackathon-demo-story.md
- vision-and-scope.md
- development-process.md

### 5.6 Históricos/superseded

- farm-assistant-plan.md (SUPERSEDED)

## 6. Relaciones entre documentos

```text
product-scope-v2 (canónico)
├── ADRs 014–018 (decisiones)
│   ├── operational-agent-plan (técnico, basado en ADR 015, 018)
│   └── collaboration-model (técnico, basado en ADR 017)
├── capability-status-matrix (derivado)
├── personas-and-permissions (derivado)
├── golden-paths-p0-p1 (derivado)
├── delivery-roadmap-v2 (secuencia)
├── spec-map (índice)
├── Steering (reglas operativas)
└── README, demo-story, vision (comunicación)
```

Un documento derivado no puede contradecir su fuente superior.

## 7. Flujo Requirements → Design → Tasks

1. Requirements congela reglas trazables a fuentes aprobadas.
2. Design especifica cómo se organizan los documentos y se valida coherencia.
3. Tasks desglosa trabajo atómico verificable para completar la Fase 0.

Secuencial. No paralelo. No se modifica un paso anterior tras iniciar el siguiente.

## 8. Modelo de trazabilidad

Cada artefacto documental debe poder responder:

- ¿Qué requirement IDs justifican su existencia?
- ¿Qué fuente canónica respalda cada afirmación?
- ¿Qué Spec posterior lo implementará funcionalmente?

La auditoría de consistencia (Checkpoint 0.12) verificará estas relaciones.

## 9. Taxonomía de estados

| Estado              | Uso                                                      |
| ------------------- | -------------------------------------------------------- |
| CURRENT / IMPLEMENTED | Evidencia apropiada: código funcional y, cuando aplique, rutas, persistencia y tests; nunca solo un nombre, tipo, interface o pantalla |
| PARTIAL             | Componentes existen; flujo incompleto                    |
| PLACEHOLDER         | Interface/scaffold; sin funcionalidad real               |
| DOCUMENTED_ONLY     | En docs pero sin código                                  |
| MISSING             | Sin código ni docs operativos                            |
| PLANNED P0          | Aprobado, no implementado                                |
| PLANNED P1          | Posterior, no implementado                               |
| OUT OF SCOPE / P2   | Fuera del alcance obligatorio                            |
| FUTURE SPEC         | Deuda técnica sin Spec asignada                          |

## 10. Estrategia de supersesión

- farm-assistant-plan.md: SUPERSEDED; conserva contenido histórico; enlaza a operational-agent-plan.md.
- ADR 011 (Amplify): superseded por ADR 016.
- Spec 13 (farm-data-assistant): superseded/reframed por Specs 15, 21–26.
- Spec 14 (demo-hardening): evolución activa en Spec 31.
- No se borran documentos; se marcan explícitamente.

## 11. Límites de arquitectura ya decididos

Decididos por ADRs Accepted; no se rediscuten en esta Spec:

- S3+CF+OAC para frontend (ADR 016).
- Amplify descartado (ADR 016).
- Herramientas estructuradas, no SQL libre (ADR 015).
- Borrador → confirmación → cola → idempotencia (ADR 015).
- Token opaco con hash para externos (ADR 017).
- Evaluación preliminar, no diagnóstico (ADR 018).
- IrrigationDelayScenario determinista (ADR 018).
- Single-organization P0/P1 (ADR 014).

## 12. Decisiones deliberadamente diferidas

| Decisión                                 | Se resuelve en |
| ---------------------------------------- | -------------- |
| Topología CloudFront /api/\*             | Spec 18/19     |
| Schema definitivo de colaboraciones      | Spec 24        |
| Algoritmo/longitud exacta del token      | Spec 24        |
| Ruta REST del agente                     | Spec 21        |
| Prompts del agente                       | Spec 21        |
| Retención de auditoría                   | Spec 30        |
| WAF                                      | Spec 30 (solo si justificado) |

## 13. Descomposición hacia Specs 16–31

| Spec  | Implementa requirements                    |
| ----- | ------------------------------------------ |
| 16    | Governance multi-agente (fuera de Fase 0)  |
| 17    | Viabilidad técnica (REQ-I01–I09, REQ-F01–F06, REQ-E01–E12, REQ-G01–G07) |
| 18–20 | AWS infra (REQ-I01–I09)                    |
| 21    | Agente lectura (REQ-B01–B06)               |
| 22    | Agente escritura (REQ-C01–C08)             |
| 23    | Voz (REQ-F01–F06)                          |
| 24    | Colaboradores (REQ-D01–D06, REQ-E01–E12)   |
| 25    | Visión (REQ-G01–G07)                       |
| 26    | Escenarios (REQ-H01–H04)                   |
| 27–28 | P1 (REQ-K01, REQ-F07)                      |
| 29    | UI/accessibility polish (presentación)     |
| 30    | Security-cost-reliability (REQ-J01–J06)    |
| 31    | Demo (verifica golden path P0)             |

## 14. Estrategia de validación

### 14.1 Validaciones mecánicas

- Prettier sobre cada archivo modificado.
- check:encoding (UTF-8, sin BOM, sin mojibake).
- git diff --check (whitespace).
- Unicidad de IDs.
- Enlaces relativos resolubles.

### 14.2 Validaciones semánticas

- Búsquedas cruzadas de términos clave.
- Ausencia de Amplify como target activo.
- Ausencia de /api/\* decidido.
- SES con semántica honesta.
- CURRENT vs PLANNED coherente.
- Ningún servicio presentado como desplegado.

### 14.3 Quality gates (Checkpoint 0.13)

format, encoding, lint, typecheck, test, test:memstorage, build, db:check,
test:integration.

## 15. Manejo de contradicciones

1. Detectar mediante búsquedas cruzadas (Checkpoint 0.12).
2. Si la contradicción es mecánica (typo, estado desactualizado): corregir en
   el documento inferior.
3. Si la contradicción afecta alcance, seguridad o arquitectura: STOP REQUIRED.
4. No corregir documentos de nivel superior sin autorización.

## 16. Riesgos y mitigaciones

| Riesgo                                      | Mitigación                                            |
| ------------------------------------------- | ----------------------------------------------------- |
| Contradicciones residuales                  | Auditoría sistemática en 0.12                         |
| Documentos muy extensos                     | Enlaces y resúmenes; no duplicar contratos            |
| Spec chain demasiado rígida                 | Correcciones mecánicas permitidas sin STOP            |
| Decisiones inadvertidamente inventadas      | Trazabilidad obligatoria a fuente aprobada            |

## 17. Rollback documental

Si se detecta un error grave post-aprobación:

- No se modifica silenciosamente.
- Se registra la corrección y su justificación.
- Un documento canónico solo se modifica con autorización humana.
- Un documento derivado puede corregirse mecánicamente si no cambia alcance/ADR.

## 18. Matriz requirement ID → sección de Design

| Requirement IDs    | Sección de Design                                      |
| ------------------ | ------------------------------------------------------ |
| REQ-A01–A06        | §9 Taxonomía de estados; §5 Componentes                |
| REQ-B01–B06        | §11 Límites decididos; §13 Descomposición (Spec 21)    |
| REQ-C01–C08        | §11 Límites decididos; §13 Descomposición (Spec 22)    |
| REQ-D01–D06        | §11 Límites decididos; §12 Diferidos; §13 (Spec 24)   |
| REQ-E01–E12        | §11; §12 (schema diferido); §13 (Spec 24)             |
| REQ-F01–F06        | §12 Diferidos; §13 (Spec 23)                           |
| REQ-F07            | §13 (Spec 28 — P1 offline voice notes)                 |
| REQ-G01–G07        | §11; §13 (Spec 25)                                     |
| REQ-H01–H04        | §11; §13 (Spec 26)                                     |
| REQ-I01–I09        | §11; §12 (topología); §13 (Specs 18–20)               |
| REQ-J01–J06        | §11; §12 (retención); §13 (Spec 30)                   |
| REQ-K01–K03        | §9; §13 (Specs 27–28, spatial future)                  |
| REQ-L01–L07        | §7 Flujo; §14 Validación; §15 Contradicciones          |
| REQ-NEG01–NEG04    | §9; §14.2 Validaciones semánticas                      |
