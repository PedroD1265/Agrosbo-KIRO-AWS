# AGROSBO Workstation Readiness

## 1. Estado
- **Fase**: 1 (Preparación del entorno de trabajo)
- **Rama de preparación**: `chore/workstation-readiness`
- **Fecha de validación**: 2026-07-26
- **Estado general**: COMPLETED / READY FOR AUDIT

## 2. Repositorio
- **Ruta local**: `D:\Pedro\AGROBO`
- **Remoto**: GitHub (`PedroD1265/agrosbo`, vía HTTPS, sin credenciales incrustadas)
- **Baseline de Fase 0**: `20148cf` (`chore(runtime): standardize on Node 24 LTS`)
- **Commits de Fase 1**:
  - `20148cf chore(runtime): standardize on Node 24 LTS`
  - `4a4308b chore(tooling): pin local AWS CDK CLI`
- **Política de concurrencia**: Una sola sesión escritora activa; prohibido el uso simultáneo de múltiples agentes escritores en la misma copia de trabajo.

## 3. Sistema
- **Sistema Operativo**: Windows 64 bits (x64)
- **Build detectado**: Windows 11 Build 26100 (Nota: PowerShell reporta `Windows 10` debido al número de versión interna del kernel `10.0.26100`, mientras que AWS CLI e identificadores del sistema reportan `Windows/11`).
- **WSL 2**: Habilitado y funcional.
- **Distribuciones WSL detectadas**: `docker-desktop-data`, `docker-desktop`.
- **Docker Desktop**: v4.x activo con backend WSL 2.
- **Contexto Docker**: `desktop-linux`.
- **Capacidad de cómputo**: 12 CPUs lógicas, recursos de memoria suficientes para entorno local (sin identificadores personales ni del equipo registrados).

## 4. Runtime
- **Node.js**: `v24.12.0`
- **npm**: `11.6.2`
- **Archivos de fijación**: `.nvmrc` y `.node-version` fijados explícitamente en `24.12.0`.
- **Package Engine**: `package.json` especifica `^24.12.0` (`>=24 <25`).
- **CI Configuration**: GitHub Actions configurado con Node `24.x` en `.github/workflows/ci.yml`.

## 5. Git y GitHub
- **Versión Git**: `2.47.1.windows.1`
- **Versión gh CLI**: `2.64.0`
- **Cuenta GitHub**: Confirmada y validada (`PedroD1265/agrosbo`, sin imprimir correo electrónico).
- **Protocolo de transporte**: HTTPS.
- **Estado del Working Tree**: Limpio.
- **Política de rama**: `main` protegida mediante proceso obligatorio de Pull Request; prohibido `git push --force`.

## 6. Docker y PostgreSQL
- **Entorno contenedorizado**: Docker & Docker Compose funcionales.
- **Backend**: WSL 2 / `desktop-linux`.
- **Contenedor activo**: `agrosbo-local-db` (`postgres:15-alpine`).
- **Puerto Host**: `54321` (`127.0.0.1:54321 -> 5432/tcp`).
- **Respaldo de base de datos**: Backup dump SQL exportado fuera del árbol del repositorio.
- **Tamaño aproximado del dump**: ~1.5 MB.
- **Checksum**: Hash SHA-256 verificado y almacenado privadamente.
- **Integridad de datos**: 26 pruebas de integración PostgreSQL aprobadas (idempotencia y migraciones verificadas).
- **Validación de clon limpio**: Verificada reproducibilidad completa desde clon local independiente (`D:\Pedro\AGROBO-phase1-verify`) con `npm ci`, quality gates, CDK local (`2.1133.0`) y contenedor temporal `agrosbo-phase1-verify-db` (`postgres:15-alpine`) en el puerto `54322` (contenedor auto-eliminado `--rm` al finalizar).
- **Seguridad**: Ninguna contraseña local registrada en este documento.

## 7. AWS CLI y autenticación
- **AWS CLI**: `v2.36.8`
- **Ruta de instalación**: `C:\Program Files\Amazon\AWSCLIV2\aws.exe`
- **Método de autenticación**: `aws login` (no IAM Identity Center / `aws sso login`).
- **Perfil base temporal**: `agrosbo-login` (credenciales temporales tipo login).
- **Perfil de rol**: `agrosbo-readonly` (credenciales temporales tipo `assume-role`).
- **Rol asumido**: `AgrosboDeveloperRole`
- **MFA**: Configurado y validado.
- **ARN activo (redactado)**: `arn:aws:sts::<ACCOUNT_ID>:assumed-role/AgrosboDeveloperRole/pedro-agrosbo-cli`
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
- **Antigravity** (Google DeepMind Agentic Assistant): IDE y asistente primario activo para esta fase.
- **Kiro**: Disponible (~1300 créditos declarados).
- **GitHub Copilot Student**: Disponible.
- **Lovable**: (~525 créditos declarados, uso restringido a prototipado rápido de UI).
- **Replit**: (~USD 20 declarados, sin uso en DB/Auth/Cloud productivo).
- **ChatGPT Plus**: Supervisión y revisión conceptual de arquitectura.
- **Gemini**: Uso puntual por cuota.
- **Azure**: (~USD 4000 en créditos declarados, sin uso productivo actual).
- **AWS**: (~USD 300 en créditos declarados, sujeto a verificación manual).
- **Reglas de gobernanza**: No registrar correos electrónicos ni IDs de cuenta; no conectar herramientas no aprobadas (Lovable, Replit) a bases de datos o servicios productivos; prohibido mantener dos agentes en modo escritor sobre la misma copia local. Las cuotas son aproximadas y declaradas por el usuario.

## 11. Variables y secretos
- **Exclusión en Git**: `.env` y `.env.*` ignorados en `.gitignore`.
- **Plantilla**: `.env.example` actualizado con terminología neutral para arquitectura cloud.
- **Claves privadas**: `.pem` y `.key` ignorados.
- **Rastreo de secretos**: 0 secretos o claves AKIA/ASIA en el historial o código rastreado.
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
- [x] Auditoría de secretos y variables de entorno realizada (0 secretos tracked)
- [x] `.env.example` actualizado
- [x] Documento de workstation readiness creado
- [x] Clon limpio reproducible (verificado en `D:\Pedro\AGROBO-phase1-verify` con DB temporal en puerto `54322`)
- [ ] Push a remoto (Pendiente)
- [ ] Validación de CI remoto en GitHub Actions (Pendiente)
- [ ] Pull Request (PR) hacia `main` (Pendiente)
- [ ] Merge a `main` (Pendiente)
- [ ] Retorno a `main` limpio (Pendiente)
