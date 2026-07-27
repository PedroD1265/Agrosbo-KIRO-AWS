# infra/ — Local Agent Rules

> Inherits all rules from [`../AGENTS.md`](../AGENTS.md). This file adds only
> area-specific constraints for the `infra/` package (AWS CDK).

## Architecture

- Infrastructure as Code with **AWS CDK** (TypeScript).
- `infra/src/index.ts` is currently a placeholder (`export {}`).
- Future stacks will define: VPC, Aurora, S3, CloudFront, Lambda, API Gateway,
  Cognito, Secrets Manager, CloudWatch.

## Prohibited commands

The following are **never** permitted without explicit human authorization:

```text
cdk bootstrap
cdk deploy
cdk destroy
aws [any write operation: create, delete, update, put, invoke]
```

Local validation (`cdk synth`, `cdk diff`) requires an expressly approved
cloud task — it is not automatically safe.

## Protected resources

IAM policies, VPC configurations, S3 bucket policies, CloudFront distributions,
and security groups are high-sensitivity. Changes require documented cost,
security, and rollback analysis.

## Planning vs. execution

Writing CDK constructs locally does **not** constitute deployment. However, even
local planning must be within an authorized task allowlist that includes
`infra/src/`.

## No unapproved resources

Do not introduce AWS services not listed in the approved target architecture
([`docs/architecture/aws-service-plan.md`](../docs/architecture/aws-service-plan.md)).

## Quality gates

```text
npm run typecheck   # includes infra/tsconfig.json
npm run build       # tsc -b infra/tsconfig.json
```
