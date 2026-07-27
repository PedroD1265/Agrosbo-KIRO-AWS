# Roles and Responsibilities

> Canonical governance rules: [`../../AGENTS.md`](../../AGENTS.md).
> Formal requirements: [Spec 16 requirements](../../.kiro/specs/multi-agent-workflow/requirements.md).

## Agent Matrix

### Kiro

| Attribute | Value |
| --- | --- |
| Role | Primary development agent |
| Default mode | Writer (single active session) |
| Write capability | Yes — within allowlist |
| Worktree | Main (`D:\Pedro\AGROBO`) |
| Limits | Cannot commit/push/merge/deploy without human auth |
| Handoff | Structured report at end of each block |
| Human-only actions | Commit, push, PR, merge, deploy, dependency install |

### Antigravity

| Attribute | Value |
| --- | --- |
| Role | Independent auditor |
| Default mode | Read-only |
| Write capability | No |
| Worktree | Dedicated (`D:\Pedro\AGROBO-audit`, detached HEAD) |
| Limits | Cannot modify files; produces review reports externally |
| Handoff | Audit report (via chat or external document) |
| Human-only actions | N/A (no write actions) |

### Codex

| Attribute | Value |
| --- | --- |
| Role | Delegated development agent (future) |
| Default mode | Writer (conditional, on own worktree) |
| Write capability | Yes — own worktree, own branch, disjoint allowlist |
| Worktree | Dedicated (`D:\Pedro\AGROBO-codex`, dedicated branch) |
| Limits | No overlap with Kiro's active file ownership; human auth required |
| Handoff | Structured report; integration via PR |
| Human-only actions | Commit, push, PR, merge |

### GitHub Copilot

| Attribute | Value |
| --- | --- |
| Role | Inline suggestion assistant and PR reviewer |
| Default mode | Advisor (inline completions, PR comments) |
| Write capability | Suggestions only — not autonomous writes |
| Worktree | N/A (operates within editor context) |
| Limits | Cannot commit, push, merge, or close PRs autonomously |
| Handoff | N/A (suggestions are ephemeral) |
| Human-only actions | Accepting suggestions, committing changes |

### Lovable

| Attribute | Value |
| --- | --- |
| Role | External prototyping environment |
| Default mode | Isolated |
| Write capability | Own isolated environment only — not the main repo |
| Worktree | N/A (external platform) |
| Limits | No access to DB, auth, or cloud; produces disposable prototypes |
| Handoff | Export artifacts manually if useful; reimplementation required |
| Human-only actions | Deciding what to promote from prototype |

### Replit

| Attribute | Value |
| --- | --- |
| Role | External acceleration and prototyping environment |
| Default mode | Plan Mode (read-only analysis; no file modifications) |
| Write capability | Own isolated environment only — never the main repo directly |
| Worktree | N/A (external platform); may use an authorized isolated branch for delivery |
| Limits | Not a source of truth; cannot decide architecture, schemas, regions, models, or IAM; Kiro approves scope and integration |
| Handoff | Artifacts delivered via conversation, downloadable files, isolated app, or authorized branch; Kiro or Codex adapts; Kiro validates; Antigravity audits if warranted; human authorizes promotion |
| Human-only actions | Branch creation/authorization, artifact promotion authorization, dependencies and installations, AWS/cloud operations, commit, push, PR, merge, deploy |

**Modes**:

- **Plan Mode** (default): Analyze, compare, propose. No file creation, no
  workflows, no dependency installation, no service connections. Must be used
  as the first step in every delegation.
- **Build Mode** (conditional): Create isolated, disposable artifacts. Requires
  explicit human authorization, an approved task, exact allowlist, and acceptance
  criteria. Replit delivers; Kiro or Codex adapts; Kiro validates; the human
  authorizes promotion.

**Relationship to other agents**:

- Kiro defines scope, approves integration, and holds architectural authority.
- Codex is preferred for sustained implementation within the monorepo.
- Replit is preferred for mechanical, synthetic, isolated, and verifiable work
  that does not require monorepo context or active AWS credentials.
- Antigravity audits Replit artifacts before promotion if requested.
- Human controls all promotion to Git.

**Detailed policy**: [`./replit-acceleration-policy.md`](./replit-acceleration-policy.md).

### Gemini

| Attribute | Value |
| --- | --- |
| Role | Advisory consultation |
| Default mode | Read-only (external chat) |
| Write capability | No |
| Worktree | N/A (external) |
| Limits | Cannot write to any working tree; provides analysis and opinions |
| Handoff | Recommendations shared via chat |
| Human-only actions | All repository modifications |

### ChatGPT

| Attribute | Value |
| --- | --- |
| Role | Supervision, review, conceptual arbitration |
| Default mode | Read-only (external chat) |
| Write capability | No |
| Worktree | N/A (external) |
| Limits | Cannot write to any working tree; provides review and guidance |
| Handoff | Recommendations shared via chat |
| Human-only actions | All repository modifications |

### Human

| Attribute | Value |
| --- | --- |
| Role | Final authority |
| Default mode | Full access |
| Write capability | Yes — unrestricted |
| Worktree | Any |
| Limits | None (sovereign) |
| Handoff | N/A |
| Human-only actions | Branch creation/authorization, artifact promotion, dependency installation, AWS/cloud operations, commit, push, PR, merge, deploy, resource creation, conflict resolution |
