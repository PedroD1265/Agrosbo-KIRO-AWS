# AGROSBO — Modelo de Colaboración

> Fuente canónica:
> [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §10.
>
> ADR de referencia:
> [`../adr/017-external-collaborators-and-notifications.md`](../adr/017-external-collaborators-and-notifications.md).
>
> Última actualización: julio 2026 (Fase 0, Checkpoint 0.6).

## 1. Colaborador interno

- Cuenta completa (PostgreSQL `users` table; Cognito en producción).
- Rol asignado: admin, técnico, encargado, operario, finanzas.
- Perfil: nombre, contacto, habilidades, disponibilidad, tarifa opcional.
- Historial de tareas y actividades consultable.
- Acceso interno limitado por RBAC.
- `collaborators:invite` es un permiso objetivo PLANNED P0, no implementado
  actualmente.

## 2. Colaborador externo

### Requisitos

- Token opaco generado con entropía criptográficamente segura.
- Solo un hash resistente del token se persiste.
- Expiración por TTL controlada por servidor.
- Revocación manual posible.
- Rate limiting en endpoint público.
- Scope: una sola tarea.
- HTTPS obligatorio en producción.
- Una simple apertura no invalida el enlace.
- Datos mínimos expuestos.

### Recomendaciones no normativas

Los siguientes son valores recomendados; los definitivos se fijan en la Spec de
implementación:

- Longitud del token: mínimo 32 bytes.
- Codificación: base64url.
- Algoritmo de hash: SHA-256.

### Flujo

1. Usuario autorizado solicita envío al agente o UI.
2. Sistema genera token opaco con entropía criptográfica.
3. Hash del token se persiste con referencia a la tarea, estado inicial, TTL y
   metadata.
4. SES envía correo con enlace que contiene el token en la URL.
5. Si SES acepta: evento `sent` registrado con message ID.
6. Si SES emite evento de entrega: evento `delivered` registrado.
7. Colaborador accede al endpoint público con el token.
8. Servidor: valida hash, verifica expiración, verifica estado, aplica rate
   limit.
9. Si válido: evento `opened_link` registrado; vista pública muestra datos
   mínimos de la tarea.
10. Colaborador responde (acepta/rechaza/solicita aclaración).
11. Respuesta registrada; evento `responded` registrado.
12. Cuando la tarea alcanza estado final: evento `completed` registrado; enlace
    invalidado.
13. Revocación manual posible en cualquier momento por usuario autorizado.

La respuesta del colaborador externo se autoriza mediante token válido y acción
explícita; no requiere confirmación adicional en la PWA. Debe ser idempotente,
limitada a la tarea y auditada.

## 3. Modelo de eventos (no lineal)

Los eventos de notificación y colaboración no forman una secuencia estricta.
Pueden recibirse fuera de orden, pueden repetirse y deben deduplicarse. El
estado principal de la colaboración no debe retroceder por un evento tardío.

### A. Registro principal de colaboración (conceptual)

Contiene la identidad de la colaboración, referencia a la tarea, hash del token,
expiración, revocación, respuesta estructurada y ciclo de vida propio. Los
nombres definitivos de campos y tablas quedan para la Spec de implementación.

### B. Registro inmutable de eventos (conceptual, separado)

Eventos posibles:

- `sent` — SES aceptó la solicitud; message ID.
- `delivered` — evento verificable de SES.
- `opened_link` — solicitud válida al endpoint del enlace.
- `responded` — respuesta estructurada recibida.
- `completed` — tarea alcanzó estado final.
- Fallos técnicos se registran como metadata o categoría técnica (no como estado
  canónico de colaboración).

### Reglas de eventos

- `sent`, `delivered` y `opened_link` no forman una secuencia estricta.
- Pueden recibirse fuera de orden (ej. `opened_link` antes de procesar
  `delivered`).
- Pueden repetirse (escáneres, retries de SES).
- Deben deduplicarse (por event ID o equivalente).
- El estado principal de la colaboración no debe retroceder por un evento tardío.
- Si SES rechaza la solicitud, no se registra `sent`.
- Webhooks/eventos de SES deben autenticarse o validarse.
- Ningún evento prueba lectura humana del correo.

> Nota: los nombres de tablas, columnas, enums y tipos definitivos no se fijan en
> este documento. El modelo es conceptual para guiar el diseño de la Spec.

## 4. Vista pública mínima

El colaborador externo ve únicamente:

- Título de la tarea.
- Descripción breve (si existe).
- Scope name (bloque o invernadero).
- Fecha límite (si existe).
- Acciones disponibles: aceptar, rechazar, solicitar aclaración.

No ve:

- Datos financieros.
- Inventario.
- Otros colaboradores.
- Historial de la organización.
- Información de otros bloques o tareas.

## 5. Single-organization

Este modelo funciona en single-organization (P0/P1). Multi-tenancy completo es
P2 y no bloquea esta capacidad. El token está scoped a una tarea específica, no
a una organización ni a un usuario interno.

## 6. Referencias

- [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §10.
- [`../product/personas-and-permissions.md`](../product/personas-and-permissions.md).
- [`../adr/017-external-collaborators-and-notifications.md`](../adr/017-external-collaborators-and-notifications.md).
- [`./operational-agent-plan.md`](./operational-agent-plan.md) §5.
