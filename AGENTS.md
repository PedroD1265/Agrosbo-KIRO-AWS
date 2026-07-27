# AGROSBO — Agent Governance

> Applies to all AI tools operating on this repository.
> Local `AGENTS.md` files in subdirectories inherit these rules and add
> area-specific constraints. When in conflict, the **local** file restricts
> further; it never relaxes a rule defined here.

## 1. Canonical sources by subject

| Subject | Authoritative source |
| --- | --- |
| Product scope & horizons | [`docs/product/product-scope-v2.md`](docs/product/product-scope-v2.md) |
| Architecture decisions | ADRs in [`docs/adr/`](docs/adr/) (Accepted, not Superseded) |
| CURRENT state | Code, tests, CI, [`docs/product/capability-status-matrix.md`](docs/product/capability-status-matrix.md) |
| Authorized work | Active Spec + runbook in [`.kiro/specs/`](.kiro/specs/) |
| Operational rules | This file, Steering ([`.kiro/steering/`](.kiro/steering/)), [`docs/agents/`](docs/agents/) |
| Local rules | `AGENTS.md` in the nearest parent directory of the file being edited |

When a contradiction is detected, **stop and report it** — never resolve
silently. See [Spec 16 requirements](`.kiro/specs/multi-agent-workflow/requirements.md`)
for the full resolution procedure.

## 2. Single writer per working tree

- Only one agent session may write to a working tree at any time.
- Auditors (e.g. Antigravity) operate read-only on a separate worktree.
- A second writer requires: explicit human approval, a separate worktree
  (`git worktree add`), a dedicated branch, and disjoint file ownership.

## 3. Preflight (mandatory before any write)

```text
git branch --show-current
git status --short
git log -5 --oneline --decorate
git diff --check
```

If branch, HEAD, or tree status is unexpected → **STOP REQUIRED**.

## 4. Allowlist

- Each task defines an explicit allowlist of files that may be created or
  modified.
- Writing outside the allowlist → **STOP REQUIRED**.
- The agent cannot expand its own allowlist.

## 5. File ownership

- Each task declares exclusive ownership per file.
- Two agents cannot hold write-ownership on the same file simultaneously.
- Ownership transfer requires: handoff from current owner, human approval,
  preflight by the new owner.

## 6. Command classification

### A. Safe (no authorization needed)

Reading: `git status`, `git log`, `git diff`, `git branch` (list/show),
`git remote`, `git worktree list`, `git show`, `git rev-parse`, `git grep`,
file reads, searches.

### B. Quality gates (no authorization needed)

`npm run format`, `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`, `npm run check:encoding`, `npm run db:check`.

### C. Local writes within allowlist (no authorization needed)

Creating or editing files **inside** the active allowlist.

### D. Require human authorization

`git commit`, `git push`, `git branch` (create/rename), `git tag`,
`git stash`, `git checkout`/`git switch` (branch change),
`git worktree add`, `gh pr create`, `npm install`, `npm ci`,
changes to `package.json` or `package-lock.json`, files outside allowlist.

### E. Prohibited / destructive

`git push --force`, `git reset --hard`, `git clean -fd`, `git branch -D`,
`git rebase -i`, `git merge` (by agent), `cdk deploy`, `cdk destroy`,
AWS CLI write operations, `rm -rf` on project directories,
`.git/config` modifications, `DROP TABLE` / `ALTER TABLE` outside
authorized migration tasks.

## 7. Git policy

- No commit, push, PR, merge, rebase, or PR close without human authorization.
- Stage files by explicit path only — never `git add .` or `git add -A`.
- Never push directly to `main`.
- Merge is human-only.
- Conventional commits: `type(scope): description`.

## 8. Quality gates

Before closing any task block, all gates must pass:

`npm run format`, `npm run check:encoding`, `npm run lint`,
`npm run typecheck`, `npm test`, `npm run build`, `git diff --check`.

A gate failure that cannot be fixed within the allowlist → **STOP REQUIRED**.
Never disable a rule to pass a gate.

## 9. Handoff format

At the end of each session or task block, produce a structured handoff:
branch, HEAD, files created/modified, validations, ambiguities, git status,
and explicit confirmation of no unauthorized commit/push/deploy.

Template: [`docs/agents/handoff-template.md`](docs/agents/handoff-template.md).

## 10. STOP REQUIRED

Apply immediately when:
- A gate fails and is not fixable within the allowlist.
- An unauthorized file appears in the working tree.
- Branch or HEAD is unexpected.
- A contradiction affects scope, security, or architecture.
- A human decision is needed.
- Code, schema, or dependency changes are required.
- A secret is detected in staged files.
- Commit, push, PR, merge, or deploy is needed.

## 11. Security and secrets

- Never commit secrets (`.env`, `.pem`, `.key`, tokens, credentials).
- Never log secrets or PII.
- Manage credentials outside the codebase.
- Use `AUTH_ENFORCEMENT=on` conventions for production paths.

## 12. Deploy and AWS

- No deploy or AWS resource creation without explicit human authorization.
- No `cdk bootstrap`, `cdk deploy`, `cdk destroy`.
- No AWS CLI write operations (`create`, `delete`, `update`, `put`, `invoke`).
- Cloud read commands (`aws sts get-caller-identity`) only in tasks that
  expressly require cloud identity verification.

## 13. References

- [Spec 16 — multi-agent-workflow](.kiro/specs/multi-agent-workflow/)
- [Phase 2 Execution Runbook](docs/roadmap/phase-2-execution-runbook.md)
- [Operational documentation](docs/agents/)
- [Roles and responsibilities](docs/agents/roles-and-responsibilities.md)
- [Command policy](docs/agents/command-policy.md)
