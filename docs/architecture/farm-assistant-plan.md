# AGROSBO - Plan del copiloto de datos (futuro)

Arquitectura futura. **No se implementa** ahora. **Bedrock no se activa** sin una
Spec aprobada.

## Arquitectura propuesta

```
Usuario
  → Assistant endpoint (API)
    → Bedrock (tool calling)
      → tool request (solo herramientas autorizadas)
        → herramienta ejecuta consulta de solo lectura
          → PostgreSQL
        ← resultado estructurado
      ← composición de respuesta
  ← respuesta basada en datos reales
```

## Herramientas iniciales propuestas (solo lectura)

- `get_farm_summary`
- `get_livestock_counts`
- `get_inventory_status`
- `get_overdue_tasks`
- `get_campaign_costs`
- `get_active_harvests`
- `get_service_requests`
- `get_orders`

## Reglas

- **Solo lectura** en la primera versión.
- **No SQL libre**: solo herramientas predefinidas y parametrizadas.
- **No acceso entre organizaciones**: toda herramienta respeta tenancy y RBAC.
- **No acciones sin confirmación** humana; las acciones se preparan como borrador.
- **No inventar datos**: si una herramienta no devuelve datos, se indica; no se
  alucina.
- **Registrar tool calls** para auditoría.
- **Fallback determinista**: si Bedrock no está disponible, degradar a respuestas
  basadas en consultas directas o mensajes claros de indisponibilidad.
- **Bedrock solo se activa** cuando exista una Spec aprobada (`farm-data-assistant`,
  #13).

## Notas

- Las herramientas se mapean a consultas ya existentes o triviales sobre el
  esquema actual (inventario, tareas, campañas, cosechas). Las de comercio/
  servicios (`get_service_requests`, `get_orders`) dependen de dominios futuros.
- La confirmación humana es obligatoria antes de cualquier mutación (coherente
  con domain-rules: ninguna acción financiera o contractual automática por IA).
