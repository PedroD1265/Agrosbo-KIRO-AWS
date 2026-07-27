# ADR 011 - Amplify Hosting para la PWA frontend

Estado: Superseded by [ADR 016 — Hosting: S3 privado + CloudFront + OAC](./016-hosting-s3-cloudfront-oac.md)

Fecha: 2026-07-24

## Contexto

El frontend es un build estático de Vite (React PWA). Se necesita un hosting que
soporte despliegues por rama, HTTPS, custom domains y CDN global sin gestionar
infraestructura manualmente. Antes se consideraba S3 + CloudFront como origen
único (para conservar cookies same-origin); con la decisión de usar Cognito JWT
(ADR 010) el frontend ya no depende de same-origin.

## Decisión

- **AWS Amplify Hosting** como hosting frontend objetivo.
- Despliegues automáticos por rama (preview environments).
- **API URL configurable** via `VITE_API_BASE_URL` (variable de build-time en
  Amplify).
- **No depender de cookies same-origin**: auth por Bearer token (Cognito JWT).
- **CloudFront separado** solo cuando exista una necesidad específica (p. ej.
  WAF personalizado, custom caching rules complejos, o servir adjuntos desde un
  dominio unificado). Amplify ya incluye CDN.

## Alternativas

- S3 + CloudFront manual: viable pero más operación manual; Amplify simplifica
  CI/CD por rama.
- Vercel/Netlify: descartados; preferimos stack AWS integrado.
- Express sirviendo estáticos: solo para desarrollo local; no escalable/CDN.

## Consecuencias

- El build de Vite (`dist/public`) se despliega directamente en Amplify.
- Frontend y API están en dominios distintos → CORS configurado en API Gateway.
- `VITE_API_BASE_URL` es obligatoria en despliegues Amplify.
- Desarrollo local conserva el proxy de Vite middleware o `VITE_API_BASE_URL`
  apuntando al Express local.
- El service worker (`sw.js`) funciona bajo Amplify sin cambios (es un asset
  estático).
