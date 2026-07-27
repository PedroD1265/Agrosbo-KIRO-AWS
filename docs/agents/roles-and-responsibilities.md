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
| Role | External prototyping environment |
| Default mode | Isolated |
| Write capability | Own isolated environment only — not the main repo |
| Worktree | N/A (external platform) |
| Limits | No access to DB, auth, or cloud; produces disposable prototypes |
| Handoff | Export artifacts manually if useful; reimplementation required |
| Human-only actions | Deciding what to promote from prototype |

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
| Human-only actions | Commit, push, PR, merge, deploy, resource creation, dependency management, branch deletion, conflict resolution |
