---
name: pr-audit
description: Reviews a branch or PR before merge by auditing diff, allowlist compliance, tests, CI, secrets, and canonical alignment. Activate when a PR is ready for review.
---

# PR Audit

Perform a structured read-only review of a branch or pull request.

## Procedure

1. Verify branch and base (`git log --oneline main..HEAD`).
2. Review the full diff (`git diff main...HEAD --stat`, then file-by-file).
3. Check allowlist compliance:
   - Every modified file must be within the task's declared allowlist.
   - Flag any file outside the allowlist.
4. Verify tests pass (`npm test`, `npm run test:integration` if applicable).
5. Check CI status (read workflow results if available).
6. Scan for secrets:
   - Check staged files for `.env`, `.pem`, `.key`, tokens, credentials.
   - Flag any suspicious content.
7. Verify alignment with canonical sources:
   - Changes consistent with product-scope-v2?
   - Changes consistent with active Spec and ADRs?
   - No CURRENT/PLANNED confusion?
8. Classify each finding: **BLOCKER** / **HIGH** / **MEDIUM** / **LOW**.
9. Emit overall verdict: **PASS**, **PASS WITH CHANGES**, or **FAIL**.

## Output

Structured review report with findings table and verdict.

## Rules

- This skill operates in **read-only mode** — never modify files.
- Never correct findings — only report them.
- Never stage, commit, push, or merge.
- Never approve merge autonomously — verdicts are advisory for the human.
