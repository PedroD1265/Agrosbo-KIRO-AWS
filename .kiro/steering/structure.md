# AGROSBO - Estructura

Responsabilidad: organización del repositorio y convenciones. Documenta la
estructura EXISTENTE y propone una evolución gradual (sin ejecutar refactor).

## Layout actual del repositorio (real)

```
web/      PWA React
  src/
    app-shell/     layout (AppLayout, AppSidebar, TopBar, BottomNav)
    pages/         una página por dominio (Today, Blocks, Campaigns, ...)
    features/      today, tasks, reports, settings, integrations
    components/    UI (shadcn/ui) + map/ (SpatialMap)
    hooks/         data/ (queries + mutations), useSyncStatus, useWeatherForecast
    lib/           sync/ (engine, queue), db/ (idb Dexie), auth, permissions,
                   queryClient, RequireAuth
    shared/, test/
api/      Express modular monolith
  src/
    index.ts       arranque + middlewares + guard de auth
    routes.ts      registro único de rutas
    handlers/      adaptador Lambda (serverless-express)
    <dominio>.ts   módulos: storage, dbStorage, auth, users, attachments,
                   expenses, applications, beekeeping, weather, alertsEngine,
                   irrigationAdvisor, campaignSummary, adapters, csv, reports,
                   idempotency, seed, env, db, logger, vite
shared/   contratos: schema.ts (Zod + Drizzle), spatial.ts (GeoJSON), cropCatalog.ts
infra/    AWS CDK (placeholder: src/index.ts vacío)
docs/     adr/, architecture/, product/, kiro/, hackathon/, spikes/
spikes/   código desechable (spike-a-offline-sync validado)
.kiro/    steering/, specs/, hooks/
```

## Separación lógica actual (en `api/`)

- **Entrada HTTP**: `routes.ts` (parseo Zod, mapeo a módulos).
- **Persistencia**: `storage.ts` (interfaz `IStorage` + `MemStorage`) y
  `dbStorage.ts` (`DbStorage` Drizzle). Nota: varios dominios (attachments,
  expenses, applications, beekeeping, users, weather) acceden a `db`
  directamente, fuera de `IStorage`.
- **Reglas puras**: `alertsEngine.ts`, `campaignSummary.ts`,
  `irrigationAdvisor.ts`, y helpers de `shared/spatial.ts`.

## Evolución gradual propuesta (NO ejecutar ahora)

- Consolidar el acceso a datos detrás de `IStorage` (o repositorios por dominio)
  para que el modo memoria y PostgreSQL tengan la misma cobertura.
- Agrupar por módulo de dominio: `modules/<dominio>/{routes,service,repo}.ts`.
- Extraer las reglas puras a un espacio `domain/` reutilizable y testeable.
- Mantener contratos en `shared/` como fuente única cliente/servidor.

## MUST

- MUST mantener los contratos compartidos en `shared/` como fuente única.
- MUST aislar la cola offline y su reconciliación en el módulo cliente
  (`web/src/lib/sync`, `web/src/lib/db`).
- MUST registrar rutas nuevas en `api/src/routes.ts` (no dispersarlas).

## SHOULD

- SHOULD nombrar entidades y campos igual que los contratos de `shared/schema.ts`.
- SHOULD evolucionar hacia módulos por dominio de forma incremental, con una
  Spec que lo respalde.

## MUST NOT

- MUST NOT ejecutar un refactor masivo sin una Spec y tareas explícitas.
- MUST NOT promover código de `spikes/` a producción sin reimplementación.
