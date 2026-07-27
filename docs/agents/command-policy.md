# Command Policy

> Summary in [`../../AGENTS.md`](../../AGENTS.md) §6.
> Formal definition: [Spec 16 Design §4](../../.kiro/specs/multi-agent-workflow/design.md).

## Classification Matrix

### A. Safe — Reading (no authorization needed)

| Tool | Commands |
| --- | --- |
| Git | `git status`, `git log`, `git diff`, `git branch` (list/show), `git remote -v`, `git worktree list`, `git show`, `git rev-parse`, `git grep` |
| Files | `read_file`, `read_code`, `grep_search`, `file_search`, `list_directory` |

### B. Safe — Quality Gates (no authorization needed)

| Tool | Commands |
| --- | --- |
| npm | `npm run format` (check mode), `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:memstorage`, `npm run test:integration`, `npm run build`, `npm run check:encoding`, `npm run db:check` |
| Git | `git diff --check` |

### C. Safe — Local Writes within Allowlist (no authorization needed)

| Tool | Actions |
| --- | --- |
| Editor | Create or edit files **inside** the active task's allowlist |

### D. Require Human Authorization

| Tool | Commands |
| --- | --- |
| Git | `git commit`, `git push`, `git branch` (create/rename), `git tag`, `git stash`, `git checkout`/`git switch` (branch change), `git worktree add` |
| GitHub CLI | `gh pr create`, `gh pr merge`, `gh pr close` |
| npm | `npm install`, `npm ci`, any change to `package.json` or `package-lock.json` |
| Docker | Container lifecycle commands affecting shared resources |
| PostgreSQL | `psql` connections to non-local databases |
| Drizzle | `drizzle-kit generate`, `npm run db:migrate`, `npm run db:seed` (require DB task) |

### E. Prohibited / Destructive (never without exception)

| Tool | Commands |
| --- | --- |
| Git | `git push --force`, `git push --force-with-lease`, `git reset --hard`, `git clean -fd`, `git clean -fx`, `git branch -D`, `git rebase -i`, `git merge` (by agent) |
| AWS CLI | Any write operation: `create`, `delete`, `update`, `put`, `invoke` |
| CDK | `cdk deploy`, `cdk destroy` |
| Shell | `rm -rf` on project directories, modification of `.git/config` |
| Database | `DROP TABLE`, `ALTER TABLE` outside expressly authorized migrations |
| IAM | Any policy modification without explicit cloud authorization |

## Notes

- `cdk bootstrap`, `cdk synth`, `cdk diff` require an expressly approved cloud
  task — they are **not** automatically safe even in local mode.
- `aws sts get-caller-identity` is permitted only in tasks that expressly
  require cloud identity verification.
- `git merge` is **always human-only** regardless of context.
- Staging must use explicit file paths — never `git add .` or `git add -A`.
- Push is only to feature branches — never directly to `main`.
