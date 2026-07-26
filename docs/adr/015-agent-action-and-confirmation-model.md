# ADR 015 — Modelo de acción y confirmación del agente

- **Estado**: Accepted.
- **Fecha**: julio 2026.

## Contexto

El Asistente AGROSBO (operational farm agent) debe poder consultar datos y
ejecutar mutaciones, pero nunca de forma autónoma. Se requiere un modelo de
seguridad que permita utilidad sin riesgo de acciones no autorizadas.

## Decisión

### Herramientas estructuradas

- El agente invoca herramientas parametrizadas; no genera ni ejecuta SQL.
- Toda afirmación sobre el estado real de la finca se basa en datos consultados.
- Explicaciones generales y ayuda de interfaz pueden generarse sin herramientas
  cuando no afirmen hechos operativos.
- El agente indica cuando no consultó información real.

### Navegación y lectura

- No requieren confirmación del usuario.
- El agente puede navegar visiblemente dentro de la UI.
- Puede leer cualquier dato autorizado por el RBAC del usuario.

### Borrador visible

- Antes de cualquier mutación propuesta por el agente, se prepara un borrador
  visible en la UI.
- El usuario puede revisarlo, editarlo o descartarlo.

### Confirmación explícita (usuarios internos)

El flujo aplica a mutaciones propuestas por el agente para un usuario interno:

```text
herramienta estructurada
→ borrador visible
→ confirmación explícita en la PWA
→ cola offline (Dexie)
→ ejecución idempotente (X-Idempotency-Key)
→ auditoría
```

Acciones sensibles (gastos, inventario, eliminaciones, publicaciones,
comunicaciones externas, decisiones con efecto contractual/financiero) requieren
confirmación reforzada (UI distinguible).

El servidor no puede ejecutar una mutación únicamente por decisión del LLM.

### Excepciones al flujo de confirmación PWA

Las siguientes operaciones no requieren confirmación adicional en la PWA, pero
deben ser idempotentes, validadas y auditadas:

- **Respuesta estructurada del colaborador externo**: se autoriza mediante token
  válido y acción explícita en la vista pública (aceptar/rechazar/aclarar);
  limitada a la tarea scoped por el token.
- **Eventos externos verificables**: eventos SES (delivery notifications),
  expiración por TTL y revocación actualizan estado de colaboración sin
  confirmación PWA; deben validarse, deduplicarse y auditarse.

Ninguna excepción permite que el LLM ejecute una mutación autónoma.

### Auditoría segura

La auditoría registra:

- Metadata mínima: usuario, herramienta, timestamp, duración, resultado técnico.
- Identificadores de entidades afectadas.
- Resultado resumido o referencia (no payload completo).

No se almacena:

- Token raw, secreto, contraseña o credencial.
- Audio, imagen completa o payload sensible innecesario.
- Parámetros sensibles sin redacción.

Política de retención, archivado y eliminación controlada se definirá en la Spec
de seguridad y confiabilidad (Spec 30).

## Alternativas consideradas

1. **SQL libre generado por el modelo**: riesgo inaceptable de inyección,
   exposición de datos y violación de RBAC; descartado.
2. **Mutaciones autónomas sin confirmación**: imposibilidad de auditoría y
   control del usuario; descartado.
3. **Ejecución server-side directa (sin cola offline)**: perdería la
   idempotencia y consistencia offline-first; descartado.
4. **Confirmación implícita por silencio/timeout**: incoherente con el principio
   de consentimiento explícito; descartado.

## Consecuencias positivas

- Seguridad: ninguna mutación interna sin consentimiento verificable.
- Trazabilidad: auditoría con metadata mínima y segura.
- Consistencia: misma cola offline e idempotencia para agente y UI directa.
- Confianza del usuario: acciones visibles y revisables antes de ejecutar.
- Colaboradores externos operan sin fricción de confirmación PWA.

## Consecuencias negativas

- Latencia adicional por el ciclo borrador → confirmación para acciones internas.
- Complejidad de UI para mostrar borradores de forma clara.

## Riesgos

- UX friction si la confirmación es demasiado frecuente o verbosa.
- Necesidad de distinguir bien acciones normales de sensibles en la UI.

## Referencias

- [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §5.
- [`./014-product-scope-p0-p1-p2.md`](./014-product-scope-p0-p1-p2.md).
- [`../architecture/collaboration-model.md`](../architecture/collaboration-model.md).
