# AGROSBO Phase 4-5 Pack — Validation Report

**Generated:** 2026-07-27T23:00:31.180Z
**Baseline SHA:** 156036a
**Result:** ✅ ALL CHECKS PASS

**Summary:** 20 passed, 0 failed, 20 total checks

## Check Results

| ID | Status | Description | Message |
|-----|--------|-------------|---------|
| CHK-01 | ✅ PASS | All required files present | All 11 pre-existing files present |
| CHK-02 | ✅ PASS | All JSON files parse without error | All 8 JSON files parse ok |
| CHK-03 | ✅ PASS | Case counts meet minimums | agent-read-conversations.es.json: 48, agent-write-confirmation-scenarios.es.json: 36, idempotency-replay-cases.json: 24, |
| CHK-04 | ✅ PASS | Case IDs are unique within each file | No duplicate IDs found |
| CHK-05 | ✅ PASS | Case IDs follow expected series patterns | All IDs match expected series patterns |
| CHK-06 | ✅ PASS | source-baseline.json contains required verified facts | All 4 baseline facts verified |
| CHK-07 | ✅ PASS | rbac-matrix.json defines all 5 required roles | Roles present: admin, tecnico, encargado, operario, finanzas |
| CHK-08 | ✅ PASS | Prohibited role names absent from role assignment contexts | No prohibited role names in role assignment contexts (allowed in reference/documentation fields) |
| CHK-09 | ✅ PASS | ADR-018 boundaries respected in conversation fixtures | No ADR-018 boundary violations detected |
| CHK-10 | ✅ PASS | Incorrect env var COGNITO_CLIENT_ID absent (use COGNITO_APP_CLIENT_ID) | COGNITO_APP_CLIENT_ID used correctly throughout |
| CHK-11 | ✅ PASS | Route catalog includes health routes as AUTH_PUBLIC | Both health routes present and marked authPublic |
| CHK-12 | ✅ PASS | All route publicPaths start with /api/ | All 73 routes have /api/ prefix |
| CHK-13 | ✅ PASS | Idempotency cases reference correct constants | TTL=86400000ms, replay header, 409 conflict code all correct |
| CHK-14 | ✅ PASS | Write scenarios include ADR-015 constraints | All 36 write cases have adrConstraints; 34 reference ADR-015 |
| CHK-15 | ✅ PASS | Deployment cases cover required failure categories | Categories covered: cold-start, auth-provider, auth-enforcement, attachments-provider, database-failure, validation-fail |
| CHK-16 | ✅ PASS | Sensitive write scenarios have sensitiveAction:true and confirmationUI | 16 sensitive cases identified; 13 have reinforced confirmation |
| CHK-17 | ✅ PASS | manifest.json has required fields | manifest.json has 11 file entries |
| CHK-18 | ✅ PASS | No localhost URLs hardcoded in fixtures | No hardcoded localhost URLs found |
| CHK-19 | ✅ PASS | RBAC matrix includes gap analysis | Gap analysis present with 7 documented gaps |
| CHK-20 | ✅ PASS | Read conversations cover all major resource types | Read categories covered: blocks-read, greenhouses-read, campaigns-read, tasks-read, observations-read, irrigation-read,  |

## File Sizes

| File | Bytes | SHA-256 (first 16) |
|------|-------|-------------------|
| README.md | 3,978 | a7eff678ea3f701b |
| source-baseline.json | 5,801 | d943494b32f63917 |
| route-catalog.json | 32,607 | 24929de114b4bf54 |
| rbac-matrix.json | 15,704 | aa2424d5c1eb969d |
| agent-read-conversations.es.json | 45,885 | 606f7ef004501eb9 |
| agent-write-confirmation-scenarios.es.json | 49,608 | 16a4dffa19e6d478 |
| idempotency-replay-cases.json | 16,971 | de617c4c3dee8e58 |
| deployment-and-provider-failure-cases.json | 20,322 | dc05e73b23a77850 |
| validate-pack.mjs | 20,764 | 63ee57bc3a73ede2 |
| manifest.json | 4,858 | 87c3e9ab8b227d46 |

---
*Validator: validate-pack.mjs — Node.js v22.22.0*