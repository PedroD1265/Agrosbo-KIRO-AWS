# Database Deployment & Migration Lifecycle Architecture

This document defines the database migration strategy and deployment lifecycle for **AGROSBO**, distinguishing local/CI environments from production AWS infrastructure.

---

## 1. Local Development & Continuous Integration (CI)

In local development and automated CI pipelines, direct TCP/IP connections to PostgreSQL are available and used for zero-friction iteration.

### Environment & Tooling
- **Connection**: `DATABASE_URL` (standard PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/dbname`).
- **ORM & Migrations Tooling**: `drizzle-kit` (`drizzle-kit generate`, `drizzle-kit migrate`, `drizzle-kit check`).
- **Seed & Verification**: `npm run db:seed` executes idempotent seed scripts against the active schema.

### Execution Workflow
1. Developer makes schema changes in `@agrosbo/shared/schema.ts`.
2. Developer runs `npm run db:generate` to produce declarative migration SQL snapshots under `api/migrations/`.
3. CI pipeline (`integration-postgres` job) provisions an ephemeral PostgreSQL container, runs `npm run db:migrate`, applies `npm run db:seed`, executes the integration test suite, re-runs `npm run db:migrate` (verifying idempotency), and runs `npm run db:check`.

---

## 2. AWS Target Architecture (Aurora PostgreSQL Serverless v2 + Data API)

In AWS production, application Lambdas execute within AWS Lambda execution environments and communicate with Aurora PostgreSQL Serverless v2 via the **RDS Data API** (or inside VPC via private subnets).

### Why Traffic Lambdas MUST NOT Run Migrations on Cold Start
1. **Concurrency Chaos**: Multi-instance Lambda autoscaling would cause multiple cold-starting Lambdas to attempt applying DDL migrations simultaneously, leading to deadlocks, partial table locks, or failed invocations.
2. **Permission Boundary (Least Privilege)**: Traffic Lambdas run with restricted IAM roles allowing only DML operations (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). DDL privileges (`CREATE TABLE`, `ALTER TABLE`) are withheld from traffic Lambdas to prevent accidental schema modifications or data destruction.
3. **Invocation Latency**: Executing migration checks and DDL statements adds hundreds of milliseconds to cold-start response times, impairing user experience.

---

## 3. Production AWS Migration Execution Strategy

### Migration Runner
- **Runner Component**: Dedicated AWS CodeBuild job, ephemeral ECS Fargate Task, or an authorized single-concurrency Migration Runner Lambda invoked explicitly by the CI/CD deployment pipeline (e.g. AWS CodePipeline / GitHub Actions).
- **Execution Timing**: Executes in Phase 1 of deployment, **BEFORE** traffic is shifted to new application Lambdas or Amplify Hosting frontends.

### IAM Permissions & Security
- **IAM Authorization**: Migration Runner is granted `rds-data:ExecuteStatement` or `rds-data:BatchExecuteStatement` restricted specifically to `arn:aws:rds:us-east-1:ACCOUNT_ID:cluster:agrosbo-db-cluster`.
- **Secrets Manager Access**: `secretsmanager:GetSecretValue` scoped to `arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:agrosbo/rds-credentials-*`.
- **Traffic Lambdas**: Granted DML-only execution rights with zero Secrets Manager access to migration credentials.

### Advisory Locking & Concurrency Control
To prevent concurrent migrators if a pipeline job is retried:
1. The Migration Runner acquires a PostgreSQL advisory lock (`SELECT pg_advisory_lock(894372019)`) before inspecting `drizzle_migrations` or applying SQL scripts.
2. After applying migrations, the lock is released (`SELECT pg_advisory_unlock(894372019)`).
3. If the lock cannot be acquired within 10 seconds, the runner aborts with failure, preventing duplicate execution.

### Rollback & Zero-Downtime Migration Policy
1. **Backward Compatibility First**: Schema updates must follow expand-and-contract patterns (e.g. adding new nullable columns or tables first; deprecating old columns in subsequent releases).
2. **Automated Pipeline Rollback**: If migration fails, the CI/CD pipeline stops immediately and alerts operators. Traffic continues routing to existing healthy Lambda versions.
3. **Database Restore / Snapshot**: Aurora automated backups and Point-In-Time Restore (PITR) provide instant recovery if destructive data corruption occurs.
