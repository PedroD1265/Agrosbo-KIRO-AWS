# ADR 016 — Hosting: S3 privado + CloudFront + OAC

- **Estado**: Accepted.
- **Fecha**: julio 2026.
- **Supersede**: ADR 011 (amplify-hosting-for-pwa). Amplify Hosting fue evaluado
  y descartado para el alcance aprobado.

## Contexto

El frontend de AGROSBO es una PWA estática (React + Vite). Se necesita hosting
con CDN, control de cache/headers y separación del origen API. Amplify Hosting y
S3+CloudFront fueron evaluados.

## Decisión

- **S3 privado** almacena el build estático del frontend.
- **CloudFront** sirve como CDN con Origin Access Control (OAC) para el frontend.
- **API Gateway HTTP API** es la entrada pública a la API (Lambda backend).
- **CDK** gestiona la infraestructura.

### Lo que NO queda decidido en este ADR

- Si API Gateway será un origen adicional de la misma distribución CloudFront
  para `/api/*`, o si la API usará una URL configurable separada.
- La topología exacta de orígenes de CloudFront (puede evaluarse en la Spec
  técnica de infraestructura).
- CORS y `VITE_API_BASE_URL` o mecanismo equivalente pueden utilizarse para
  conectar frontend y API si son orígenes separados.
- Mismo dominio no es obligatorio.

## Alternativas consideradas

### Amplify Hosting

Evaluado por conveniencia de deploys por rama y configuración mínima.

Descartado porque:

- Menor control sobre cache behaviors, headers personalizados y configuración de
  origen.
- Acoplamiento con el servicio Amplify sin necesidad funcional real.
- Para el alcance de este hackathon, S3+CF+OAC ofrece control suficiente con CDK
  reproducible.

Amplify Hosting se documenta como alternativa evaluada y no seleccionada. Podría
reconsiderarse en el futuro si la conveniencia de branch deploys supera la
necesidad de control.

### express.static (actual)

Estado actual para desarrollo local. No viable para producción Lambda.

## Consecuencias positivas

- Control sobre cache, headers, compresión y error pages.
- OAC elimina acceso público al bucket.
- CDK reproducible.
- Compatible con la arquitectura Lambda + API Gateway ya definida.
- Flexibilidad: la API puede estar en la misma distribución o en URL separada.

## Consecuencias negativas

- Requiere configurar manualmente cache behaviors y invalidaciones.
- No tiene branch previews automáticos nativos.
- Más líneas de CDK que Amplify Hosting.

## Riesgos

- Configuración inicial de OAC puede ser compleja.
- Sin invalidación automática de cache al desplegar (debe incluirse en CD).

## Referencias

- [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §14.
- [`./011-amplify-hosting-for-pwa.md`](./011-amplify-hosting-for-pwa.md)
  (superseded por esta decisión).
