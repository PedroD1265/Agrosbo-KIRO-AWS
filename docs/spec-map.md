# AGROSBO - Mapa de Specs

## Secuencia

| # | Spec | Objetivo |
|---|------|----------|
| 1 | project-foundation-and-risk-spikes | Estructura, calidad, infra de lab y 3 spikes de riesgo |
| 2 | authentication-and-app-shell | Cognito, API Gateway, PWA shell, layout por rol |
| 3 | offline-origin-capture | Capturista: productor, parcela, cosecha offline + sync |
| 4 | source-lots-and-harvest-allocation | Lotes iniciales desde cosechas con asignación parcial |
| 5 | lot-transformations | Split, merge, process con balance determinista |
| 6 | documents-and-extraction | Adjuntar documentos, extracción con proveedor elegido |
| 7 | shipments-and-completeness-review | Embarque, revisión determinista, hallazgos accionables |
| 8 | immutable-snapshots-and-evidence-package | Sello, snapshot, paquete ZIP descargable |
| 9 | provenance-tree | Vista visual de procedencia con consulta recursiva |
| 10 | production-infrastructure-and-deployment | Infra final, ambientes, seguridad, dominios, hardening |
| 11 | demo-hardening | Dataset, flujo demo, métricas verificables, polish |

## Dependencias

```
1 (foundation + spikes)
├── 2 (auth + shell) ← necesita subconjunto mínimo de infra (Cognito, API GW)
│   ├── 3 (offline capture) ← necesita auth + resultado Spike A
│   │   ├── 4 (lots + allocation) ← necesita cosechas + resultado Spike B
│   │   │   └── 5 (transformations) ← necesita lotes iniciales
│   │   │       └── 7 (shipments + review) ← necesita lotes resultantes + docs
│   │   │           └── 8 (snapshots) ← necesita revisión aprobada
│   │   │               └── 9 (provenance tree) ← necesita datos de procedencia
│   │   └── 6 (documents) ← necesita auth + resultado Spike C
│   │       └── 7 (ver arriba)
│   └── 10 (prod infra) ← puede iniciar tras auth; despliegue final tras 9
└── 11 (demo) ← depende de todas las anteriores
```

## Notas sobre infraestructura

- Spec 1 crea infraestructura de LABORATORIO (prefijo `agrosbo-dev-spike`).
  Solo bucket S3 y Aurora PostgreSQL Serverless v2 + Data API, con comandos de
  creación/destrucción documentados.
- Spec 2 necesita un subconjunto mínimo de infra (Cognito user pool + API
  Gateway HTTP API). Este subconjunto se crea como parte de Spec 2 usando CDK,
  NO depende de la Spec 10.
- Spec 10 (`production-infrastructure-and-deployment`) se ocupa de: ambientes
  de staging/producción, despliegue público, seguridad final, observabilidad,
  dominios, hardening y reproducibilidad. NO es una dependencia tardía que
  bloquee las Specs iniciales.

## Reglas

- Cada Spec se ejecuta por checkpoints con autorización explícita.
- No se avanza automáticamente de una Spec a la siguiente.
- El código de spikes (Spec 1) es descartable y no se promueve a producción.
