# ADR 012 - Fronteras de proveedores de servicios cloud

Estado: Accepted

Fecha: 2026-07-24

## Contexto

La aplicación necesita integrarse con múltiples servicios administrados (Cognito,
S3, Textract/Azure DI, SES, EventBridge) sin acoplar la lógica de negocio a un
SDK concreto ni impedir el desarrollo local sin credenciales cloud.

## Decisión

Definir **interfaces de proveedor** (contratos TypeScript) por capacidad. Cada
interfaz tiene al menos dos implementaciones: una local (para dev/tests) y una
administrada (para staging/prod). La selección se hace por configuración.

### Proveedores definidos

| Interface | Local implementation | Managed implementation | Config variable |
|-----------|---------------------|------------------------|-----------------|
| `IdentityProvider` | `LocalSessionIdentityProvider` | `CognitoJwtIdentityProvider` (futuro) | `APP_AUTH_PROVIDER` |
| `AttachmentStorage` | `LocalAttachmentStorage` | `S3AttachmentStorage` (futuro) | `ATTACHMENTS_STORAGE_DRIVER` |
| `DocumentExtractionProvider` | `NoOpDocumentExtraction` | `TextractProvider` / `AzureDocIntelligenceProvider` (futuros) | `DOCUMENT_EXTRACTION_PROVIDER` |
| `NotificationPublisher` | (no implementar sin necesidad) | `SesNotificationPublisher` (futuro) | — |
| `TaskScheduler` | (no implementar sin necesidad) | `EventBridgeScheduler` (futuro) | — |

### Reglas

- No implementar una interfaz hasta que exista un consumidor real.
- No agregar providers stub que acepten llamadas sin efecto verificable.
- No crear mocks de servicios AWS que escondan la ausencia de integración.
- Implementaciones locales MUST ser funcionales (no vacías), con persistencia
  real (disco/memoria) suficiente para tests y dev.
- La selección de proveedor es explícita por variable de entorno; no detección
  mágica.

## Alternativas

- SDK directo en handlers: descartada; acopla y dificulta testing.
- Adapter pattern con factory centralizada: viable a futuro; en esta fase basta
  con interfaces simples + selección por config.

## Consecuencias

- Cada servicio cloud se integra implementando la interfaz correspondiente,
  sin tocar la lógica de dominio.
- Tests corren sin AWS/Azure credentials.
- Dev local funciona sin configuración cloud.
- Producción falla al iniciar si un proveedor obligatorio no está configurado
  (fail-closed).
