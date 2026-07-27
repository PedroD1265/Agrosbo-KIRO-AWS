---
name: aws-change-plan
description: Produces a structured plan for AWS/CDK changes without deploying. Activate when preparing infrastructure modifications, new services, or architecture changes.
---

# AWS Change Plan

Produce a structured plan for an AWS infrastructure change without executing it.

## Procedure

1. **Problem statement**: describe what needs to change and why.
2. **Service justification**: name each AWS service involved and justify its
   inclusion against the approved target architecture.
3. **IAM analysis**: define minimum required permissions (least privilege).
4. **Data flow**: describe how data moves through the proposed change.
5. **Networking**: VPC, subnets, security groups, endpoints affected.
6. **Observability**: logs, metrics, alarms, tracing implications.
7. **Cost estimation**: expected monthly cost range and scaling behavior.
8. **Rollback strategy**: how to revert if the change fails.
9. **Commands requiring authorization**: list every command that would need
   human approval to execute (e.g., `cdk deploy`, `aws` write operations).
10. **Potential outputs**: what artifacts the change would produce.

## Output

A structured plan document ready for human review.

## Rules

- This skill does **not** execute any deploy or resource-creation commands.
- Never run `cdk bootstrap`, `cdk deploy`, or `cdk destroy`.
- Never execute AWS CLI write operations.
- Never assume credentials are available — if verification is needed, flag it.
- Do not introduce services not listed in the approved architecture plan.
- End with **STOP REQUIRED** — the plan requires human authorization before
  any execution.
