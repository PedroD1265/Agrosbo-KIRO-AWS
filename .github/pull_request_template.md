## Summary

<!-- One-paragraph description of what this PR does. -->

## Motivation

<!-- Why is this change needed? Link to issue, Spec, or ADR if applicable. -->

## Scope

<!-- What areas of the codebase are touched? What is explicitly out of scope? -->

## Architecture impact

<!-- Does this change the system architecture? Refer to docs/architecture/ if needed. -->

- [ ] No architecture change
- [ ] Architecture documented in ADR / docs/architecture

## AWS impact

<!-- Does this PR add, remove, or change AWS service usage? -->

- [ ] No AWS change
- [ ] AWS service plan updated (`docs/architecture/aws-service-plan.md`)
- [ ] Infrastructure not deployed (target only)

## Kiro artifacts

<!-- Which Kiro governance artifacts are affected? -->

- [ ] Steering updated
- [ ] Spec (requirements / design / tasks) created or updated
- [ ] ADR created or updated
- [ ] Hooks reviewed

## Quality evidence

- [ ] `npm run clean` passes
- [ ] `npm run format` passes
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (state count: ___/___  )
- [ ] `npm run build` passes
- [ ] Clean-clone `npm ci` + gates reproducible

## Security checklist

- [ ] No secrets committed (`.env`, `.pem`, `.key`, credentials)
- [ ] No PII in logs or test data
- [ ] Auth enforcement documented for production
- [ ] RBAC guards on sensitive write endpoints

## Offline-first checklist

- [ ] Mutations that work offline are documented
- [ ] Idempotency keys used on write endpoints
- [ ] No operations claimed as offline that lack an API endpoint

## Tests

- [ ] Existing tests pass without modification
- [ ] New tests added for new behavior (if applicable)
- [ ] No tests skipped or weakened to achieve green

## Screenshots / demo evidence

<!-- Attach screenshots, recordings, or link to demo story if UI changes are involved. Remove section if not applicable. -->

## Out of scope

<!-- List capabilities or changes explicitly NOT included in this PR. -->

## Risks

<!-- What could go wrong? What assumptions are made? -->

## Follow-up work

<!-- Link to issues or describe next steps triggered by this PR. -->
