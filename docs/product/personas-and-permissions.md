# AGROSBO — Personas y Permisos

> Fuente canónica: [`./product-scope-v2.md`](./product-scope-v2.md) §9 y §10.
>
> Última actualización: julio 2026 (Fase 0, revisión final del PR #3).

## Personas

### Propietario / Administrador (admin)

- Dueño de la finca; acceso total.
- Decide acciones financieras y de personal.
- Gestiona usuarios y roles.
- Aprueba publicaciones (P1).
- Alcance: P0.

### Gerente / Encargado (encargado)

- Planifica campañas y supervisa operaciones.
- Aprueba gastos y mano de obra.
- Asigna tareas y prioridades.
- Alcance: P0.

### Agrónomo / Técnico (tecnico)

- Registra aplicaciones fitosanitarias, observaciones e inspecciones.
- Configura riego y campañas.
- Gestiona inventario y cosecha.
- Alcance: P0.

### Trabajador / Operario (operario)

- Ejecuta tareas asignadas.
- Registra datos en campo, frecuentemente offline.
- No gestiona inventario ni finanzas directamente.
- Alcance: P0.

### Visualizador / Finanzas (finanzas)

- Consulta reportes y costos.
- Registra gastos y mano de obra.
- No modifica inventario, aplicaciones ni cosechas.
- Alcance: P0.

### Colaborador externo (P0)

- Sin cuenta completa en el sistema.
- Accede vía enlace seguro limitado a una tarea.
- Puede: aceptar, rechazar o solicitar aclaración.
- Token opaco; hash persistido; expiración por TTL; revocable.
- Datos mínimos expuestos.

### Visitante / Comprador (P1)

- Accede a la tienda pública sin registro.
- Envía solicitud de compra.
- No tiene acceso a datos internos de la finca.

## A. Permisos actuales implementados

Estos permisos están actualmente aplicados por el backend (`requireRole` en
`routes.ts`) y el frontend (`web/src/lib/permissions.ts`).

| Permiso | admin | encargado | tecnico | finanzas | operario |
| --- | --- | --- | --- | --- | --- |
| inventory:write | Sí | Sí | Sí | No | No |
| expenses:write | Sí | Sí | Sí | Sí | No |
| applications:write | Sí | Sí | Sí | No | No |
| harvestLots:write | Sí | Sí | Sí | No | No |
| users:manage | Sí | No | No | No | No |

Evidencia: `web/src/lib/permissions.ts` ROLE_PERMISSIONS,
`api/src/routes.ts` requireRole calls, `api/src/auth.ts` requireRole middleware.

Notas:

- Tareas, observaciones, riego, bloques, invernaderos y campañas no tienen guards
  de rol en las rutas actuales (accesibles por cualquier usuario autenticado).
- `AUTH_ENFORCEMENT=off` omite todos los guards (solo desarrollo).

## B. Permisos objetivo P0/P1 (PLANNED, no implementados)

Los siguientes permisos están planificados pero no implementados:

| Permiso | Horizonte | Roles previstos | Notas |
| --- | --- | --- | --- |
| tasks:create | PLANNED P0 | admin, encargado, tecnico, operario | Guard no implementado hoy |
| tasks:update | PLANNED P0 | admin, encargado, tecnico, operario | Guard no implementado hoy |
| observations:create | PLANNED P0 | admin, encargado, tecnico, operario | Guard no implementado hoy |
| reports:read | PLANNED P0 | admin, encargado, tecnico, finanzas | Guard no implementado hoy |
| collaborators:invite | PLANNED P0 | admin, encargado, tecnico | Capacidad inexistente |
| publications:manage | PLANNED P1 | admin, encargado | Capacidad inexistente |
| shop:request | PLANNED P1 | visitante (sin cuenta) | Capacidad inexistente |

## Colaborador externo — Acciones permitidas

El colaborador externo puede únicamente:

- **Aceptar** la tarea limitada por su enlace.
- **Rechazar** la tarea.
- **Solicitar aclaración** sobre la tarea.

No puede:

- Crear tareas.
- Modificar datos internos.
- Ver información más allá de lo mínimo necesario.
- Acceder a otras tareas o áreas de la finca.

## Agente — Permisos

El agente operacional actúa con los permisos efectivos del usuario que lo invoca.
El agente nunca obtiene permisos propios superiores a los del usuario.

## Modelo de acceso del colaborador externo

1. Sistema genera token opaco aleatorio con entropía criptográfica.
2. Solo un hash resistente del token se persiste en PostgreSQL con estado y TTL.
   El algoritmo, longitud y codificación definitivos se definen en Spec 24.
   SHA-256 con token de alta entropía es una recomendación no normativa.
3. SES envía correo con enlace que contiene el token.
4. Colaborador accede al endpoint público con el token.
5. Servidor valida hash, expiración, estado y rate limit.
6. Vista pública muestra únicamente los datos mínimos de la tarea.
7. Colaborador puede: aceptar, rechazar o solicitar aclaración.
8. Respuesta se registra; estado se actualiza.
9. El enlace se invalida al alcanzar estado terminal (completed) o por
   revocación manual.
10. Una simple apertura no invalida el enlace.
