# AGROSBO Workstation Readiness

## 1. Estado
- **Fase**: 1 (Preparación del entorno de trabajo)
- **Rama de preparación**: `chore/workstation-readiness`
- **Fecha de validación**: 2026-07-26
- **Estado general**: READY FOR MERGE REVIEW

## 2. Repositorio
- **Ruta local**: `<repo-root>`
- **Remoto**: GitHub (`<owner>/agrosbo`, vía HTTPS, sin credenciales incrustadas)
- **Baseline previo a Fase 1**: `7571f02`
- **Commits de Fase 1**:
  - `20148cf chore(runtime): standardize on Node 24 LTS`
  - `4a4308b chore(tooling): pin local AWS CDK CLI`
  - `d76549d docs(setup): record workstation and cloud readiness`
  - `efe5204 docs(setup): record clean-clone verification`
- **Política de concurrencia**: Una sola sesión escritora activa; prohibido el uso simultáneo de múltiples agentes escritores en la misma copia de trabajo.

## 3. Sistema
- **Sistema Operativo**: Windows x64
- **WSL 2**: Habilitado y funcional. Distintas herramientas pueden mostrar etiquetas Windows 10/11 para el mismo build.
- **Distribuciones WSL observadas**: `Ubuntu`, `Ubuntu-24.04`, `docker-desktop`.
- **Docker Desktop**: v4.x activo con backend WSL 2.
- **Contexto Docker**: `desktop-linux`.
- **Capacidad de cómputo**: 12 CPUs lógicas, recursos de memoria suficientes para entorno local (sin identificadores personales ni del equipo registrados).

## 4. Runtime
- **Node.js**: `24.x`, validado localmente con `v24.12.0`
- **npm**: `11.x`, validado localmente con `11.6.2`
- **Archivos de fijación**: `.nvmrc` (`24`) y `.node-version` (`24`).
- **Package Engine**: `package.json` especifica `>=24 <25`.
- **CI Configuration**: GitHub Actions configurado con Node `24` en `.github/workflows/ci.yml`.

## 5. Git y GitHub
- **Versión Git**: `2.52.0.windows.1`
- **Versión gh CLI**: `2.86.0`
- **Cuenta GitHub**: Confirmada y validada (`<owner>/agrosbo`, sin imprimir correo electrónico).
- **Protocolo de transporte**: HTTPS.
- **Estado del Working Tree**: Limpio.
- **Política de rama**: `main` protegida mediante proceso obligatorio de Pull Request; prohibido `git push --force`.

## 6. Docker y PostgreSQL
- **Entorno contenedorizado**: Docker & Docker Compose funcionales.
- **Backend**: WSL 2 / `desktop-linux`.
- **Contenedor activo**: `agrosbo-local-db` (`postgres:15-alpine`).
- **Puerto Host**: `54321` (`127.0.0.1:54321 -> 5432/tcp`).
- **Respaldo de base de datos**: Backup dump SQL exportado fuera del árbol del repositorio.
- **Tamaño verificado del dump**: 62,051 bytes (~60.6 KB).
- **Checksum**: Hash SHA-256 verificado y almacenado privadamente.
- **Integridad de datos**: 26 pruebas de integración PostgreSQL aprobadas (idempotencia y migraciones verificadas).
- **Validación de clon limpio**: Verificada reproducibilidad completa desde clon local independiente (`<repo-parent>\AGROBO-phase1-verify`) con `npm ci`, quality gates, CDK local (`2.1133.0`) y contenedor temporal `agrosbo-phase1-verify-db` (`postgres:15-alpine`) en el puerto `54322` (contenedor auto-eliminado `--rm` al finalizar).
- **Seguridad**: Ninguna contraseña local registrada en este documento.

## 7. AWS CLI y autenticación
- **AWS CLI**: AWS CLI v2 localizada mediante `where.exe aws` (ruta estándar de Windows validada en la estación auditada).
- **Método de autenticación**: `aws login` (no IAM Identity Center / `aws sso login`).
- **Perfil base temporal**: `agrosbo-login` (credenciales temporales tipo login).
- **Perfil de rol**: `agrosbo-readonly` (credenciales temporales tipo `assume-role`).
- **Rol asumido**: `AgrosboDeveloperRole`
- **MFA**: Configurado y validado.
- **ARN activo (redactado)**: `arn:aws:sts::<ACCOUNT_ID>:assumed-role/AgrosboDeveloperRole/<ROLE_SESSION_NAME>`
- **Política adjunta**: `ReadOnlyAccess`
- **Región provisional**: `sa-east-1`
- **Access keys permanentes**: 0
- **Root access keys**: 0
- **Pruebas de solo lectura**: STS, S3, Lambda, CloudFormation e IAM — PASS.
- **Aclaraciones operativas**: IAM Identity Center no es el método activo; no ejecutar `aws configure sso`; el rol actual no posee permisos de despliegue ni escritura.

## 8. Controles de costos
- **Créditos AWS**: Revisados y confirmados.
- **Expiración de créditos**: Registrada privadamente.
- **Budget predeployment**: MANUAL CONFIRMATION REQUIRED
- **Alertas de presupuesto**: MANUAL CONFIRMATION REQUIRED
- **Cost Anomaly Detection**: MANUAL CONFIRMATION REQUIRED

## 9. AWS CDK
- **Versión CLI local**: `aws-cdk@2.1133.0`
- **Dependencia local**: Fijada exactamente en `infra/package.json` (`"aws-cdk": "2.1133.0"`).
- **Instalación global**: No requerida ni utilizada.
- **Estado de librerías**: `aws-cdk-lib` y `constructs` no instaladas aún.
- **Comandos CDK**: `bootstrap`, `synth`, `diff`, `deploy` y `destroy` NO ejecutados.

## 10. IDEs y agentes
- **Antigravity**: IDE utilizado durante esta fase.
- **Kiro**: disponible para ejecución guiada.
- **GitHub Copilot**: disponible para asistencia y revisión.
- **Lovable**: restringido a prototipado UI, sin DB/Auth/Cloud productivo.
- **Replit**: restringido a prototipos, sin DB/Auth/Cloud productivo.
- **ChatGPT**: supervisión y revisión conceptual.
- **Gemini**: consultas puntuales.
- **AWS y Azure**: créditos administrados fuera del repositorio.
- **Reglas de gobernanza**: Los saldos, cuotas, fechas de expiración e identificadores de cuenta se administran en documentación privada y no se almacenan en el repositorio. No conectar herramientas no aprobadas a bases de datos o servicios productivos; prohibido mantener dos agentes en modo escritor sobre la misma copia local.

## 11. Variables y secretos
- **Exclusión en Git**: `.env` y `.env.*` ignorados en `.gitignore`.
- **Plantilla**: `.env.example` actualizado con terminología neutral para arquitectura cloud.
- **Claves privadas**: `.pem` y `.key` ignorados.
- **Rastreo de secretos**: No se detectaron patrones AKIA, ASIA o bloques de clave privada en los archivos rastreados del working tree durante la auditoría de Fase 1.
- **DATABASE_URL**: Utilizada únicamente de forma temporal durante la ejecución de pruebas locales.
- **Credenciales AWS**: Resueltas exclusivamente mediante tokens temporales.
- **Estrategia de producción**: Uso obligatorio de AWS Secrets Manager en fases posteriores.

## 12. Quality gates
- **`npm run format`**: PASS (`prettier --check .`)
- **`npm run check:encoding`**: PASS (sin mojibake ni BOM)
- **`npm run lint`**: PASS (0 errores, 154 warnings preexistentes)
- **`npm run typecheck`**: PASS (`tsc --noEmit`)
- **Pruebas unitarias**: PASS (132 tests aprobados)
- **Pruebas MemStorage**: PASS (7 tests aprobados)
- **Pruebas PostgreSQL**: PASS (26 integration tests aprobados)
- **Build**: PASS (`npm run build` en todos los workspaces)
- **Migraciones**: PASS (`npm run db:migrate`)
- **Idempotencia de migraciones**: PASS
- **Verificación de DB**: PASS (`npm run db:check`)

## 13. Advertencias conocidas
- **ESLint**: 154 warnings preexistentes (uso de `any`, variables sin usar en tests/UI).
- **Deprecaciones transitivas**: Warnings de npm sobre paquetes CJS/Vite obsoletos.
- **Vite Rollup**: Chunk de producción web > 500 KB (`index-D3BuvveK.js` ~1.1 MB).
- **Infraestructura**: Aplicación CDK no sintetizada aún.
- **AWS Role**: Permisos actualmente acotados a `ReadOnlyAccess`.

## 14. Acciones prohibidas durante Fase 1
- `cdk bootstrap`
- `cdk synth`
- `cdk diff`
- `cdk deploy`
- `cdk destroy`
- Creación, modificación o eliminación de recursos AWS.
- Modificación de roles, usuarios o políticas IAM.
- `git push`, `git merge` o alteraciones de `main` sin aprobación.

## 15. Procedimiento diario
Ejecutar los siguientes comandos de verificación no destructivos al iniciar la sesión:

```powershell
git branch --show-current
git status --short
node --version
npm --version
docker ps --filter "name=agrosbo-local-db"
aws sts get-caller-identity --profile agrosbo-readonly --query Arn --output text
```

*Nota: La llamada STS puede solicitar reautenticación MFA. El ARN impreso debe ser redactado antes de ser compartido.*

## 16. Estado de cierre de Fase 1
- [x] Node 24 LTS fijado y validado
- [x] AWS CLI v2 validada con perfiles temporales `agrosbo-login` y `agrosbo-readonly`
- [x] Rol `AgrosboDeveloperRole` con `ReadOnlyAccess` y MFA verificado
- [x] CDK CLI local `aws-cdk@2.1133.0` fijado en `@agrosbo/infra`
- [x] Docker + PostgreSQL `agrosbo-local-db` funcional (165 tests PASS)
- [x] Auditoría de secretos y variables de entorno realizada (0 secretos en working tree)
- [x] `.env.example` actualizado
- [x] Documento de workstation readiness creado
- [x] Clon limpio reproducible (verificado en `<repo-parent>\AGROBO-phase1-verify` con DB temporal en puerto `54322`)
- [x] Push a remoto
- [x] CI remoto (quality-gates e integration-postgres en PASS)
- [x] Pull Request hacia `main` (PR #4)
- [ ] Merge a `main` (Pendiente)
- [ ] Retorno a `main` limpio (Pendiente)
- [ ] Eliminación controlada de ramas (Pendiente)
- [ ] Eliminación posterior del clon de verificación (Pendiente)
