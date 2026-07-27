# web/ — Local Agent Rules

> Inherits all rules from [`../AGENTS.md`](../AGENTS.md). This file adds only
> area-specific constraints for the `web/` package (PWA frontend).

## Architecture

- Preserve **PWA offline-first** behavior: service worker, IndexedDB (Dexie),
  mutation queue, backoff, reconciliation.
- Never bypass the offline mutation queue for operations that must survive
  disconnection.
- Maintain temp-ID → real-ID reconciliation (`idMap` in Dexie).
- Preserve visual indicators of offline/syncing/failed states.

## Sensitive areas

Files that require extra caution (offline integrity, auth, data flow):
`lib/sync/`, `lib/db/`, `lib/auth.ts`, `lib/permissions.ts`, `hooks/data/`.

## IndexedDB compatibility

Changes to Dexie stores or their schema require **compatibility analysis** —
existing client databases must either migrate gracefully or be documented as
breaking.

## Quality gates (Web-specific)

```text
npm run typecheck          # includes web/tsconfig.json
npm run test               # unit tests covering web
npm run build              # Vite build (dist/public)
```

## Cross-impact

Changes in `web/` may depend on `shared/` contracts and `api/` endpoints.
Verify that API contracts remain satisfied.
