---
inclusion: always
---

# AGROSBO — Seguridad

Responsabilidad: autenticación, autorización, secretos, seguridad del agente y
colaboradores. Fuente canónica:
[`docs/product/product-scope-v2.md`](../../docs/product/product-scope-v2.md) §5, §10.

## Autenticación CURRENT

- Cookie de sesión firmada HMAC-SHA256 con `SESSION_SECRET`; HttpOnly; SameSite.
- Contraseñas con scrypt + salt.
- `AUTH_ENFORCEMENT` on/off; off inyecta demo admin (solo dev).
- Revocación en memoria + tabla `revoked_sessions`.

## Autenticación PLANNED P0

- Amazon Cognito User Pool + JWT authorizer.
- Proveedor local solo para dev/tests.
- `APP_AUTH_PROVIDER=local-session|cognito-jwt`.
- En producción, `cognito-jwt` obligatorio.

## RBAC

- Roles CURRENT: admin, técnico, encargado, operario, finanzas.
- Permisos implementados: inventory:write, expenses:write, applications:write,
  harvestLots:write, users:manage.
- Permisos PLANNED P0: collaborators:invite (no implementado).
- El agente actúa con permisos efectivos del usuario; nunca superiores.

## Modelo de acción del agente (ADR 015)

- Herramientas estructuradas; no SQL libre.
- Navegación y lectura: sin confirmación.
- Mutaciones internas: borrador → confirmación explícita PWA → cola offline →
  idempotencia → auditoría.
- Confirmación reforzada para: gastos, inventario, eliminaciones, publicaciones,
  comunicaciones externas, decisiones con efecto contractual/financiero.
- El servidor no puede mutar por decisión del LLM sin confirmación PWA.

### Excepciones controladas (no requieren confirmación PWA)

- Respuesta del colaborador externo: autorizada por token válido + acción
  explícita; idempotente y auditada.
- Eventos SES (delivery notifications): validados y deduplicados.
- Expiración por TTL: automática.
- Revocación: iniciada manualmente por usuario autorizado; su actualización debe
  validarse y auditarse; no requiere una segunda confirmación adicional salvo que
  la futura Spec la clasifique como acción sensible.

Ninguna excepción permite mutación autónoma del LLM.

### Semántica de eventos SES

- Rechazo SES no crea sent.
- sent solo con aceptación SES + message ID.
- delivered solo con evento verificable.
- opened_link no prueba lectura humana.
- Eventos pueden repetirse y llegar fuera de orden.
- Deduplicación obligatoria.

## Colaboradores externos (ADR 017)

- Token opaco con entropía criptográfica.
- Solo hash resistente persistido.
- TTL, revocación, rate limiting, scope de una tarea.
- HTTPS obligatorio en producción.
- opened_link no prueba lectura humana.
- Eventos no lineales; deben deduplicarse.

## Auditoría

- Metadata mínima: usuario, herramienta, timestamp, duración, resultado técnico.
- Identificadores de entidades.
- Resultados resumidos o referencias.
- No almacenar: tokens raw, secretos, contraseñas, audio, imágenes completas,
  payloads sensibles.
- Parámetros sensibles redactados.
- Retención pendiente de Spec 30.

## Secretos

- MUST gestionar credenciales fuera del código.
- MUST NOT commitear secretos.
- MUST NOT registrar secretos ni PII en logs.

## Evaluación visual (ADR 018)

- Evaluación preliminar; nunca diagnóstico definitivo.
- Aviso de seguridad en cada evaluación.
- No recomendar automáticamente agroquímicos.
