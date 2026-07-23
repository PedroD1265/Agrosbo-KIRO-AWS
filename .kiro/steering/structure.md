# AGROSBO - Estructura

Responsabilidad: organización del repositorio y convenciones de separación de
capas.

## Layout del repositorio

- `/web`      -> PWA React (UI, cola offline, cliente API).
- `/api`      -> Lambda modular monolith (handlers, servicios, dominio).
- `/infra`    -> AWS CDK (un stack mínimo reproducible).
- `/docs`     -> ADRs y notas de decisión.
- `/spikes`   -> Código desechable de spikes, separado del código de producción.
- `.kiro/`    -> steering, specs, hooks.

## Separación de capas en `/api`

- `handlers/`  -> entrada HTTP (parseo, validación de forma, mapeo a servicios).
- `services/`  -> orquestación de casos de uso y transacciones Data API.
- `domain/`    -> reglas puras y deterministas (balances, disponibilidad,
  procedencia). Sin dependencias de infraestructura.

## MUST

- MUST mantener las reglas de dominio en `domain/` sin acceso directo a red,
  Data API ni S3.
- MUST centralizar las validaciones deterministas de cantidades en un único
  módulo de dominio reutilizable.
- MUST aislar la cola offline y su reconciliación en un módulo cliente propio.
- MUST mantener el código de spikes en `/spikes`, descartable y separado.

## SHOULD

- SHOULD nombrar entidades y campos exactamente como el modelo conceptual
  aprobado.

## MUST NOT

- MUST NOT promover código de spike a producción sin una tarea de
  reimplementación explícita.
