# GitHub Copilot Instructions — AGROSBO

> This file directs Copilot to the governance framework. It is **not** a source
> of truth — the canonical rules live in [`../AGENTS.md`](../AGENTS.md).

## Rules

1. Read and respect the root [`AGENTS.md`](../AGENTS.md) and the local
   `AGENTS.md` nearest to the file being edited.
2. A suggestion does **not** constitute authorization to modify files.
3. Only suggest changes within the active task's allowlist.
4. Commit, push, PR creation, merge, and deploy require **human authorization**.
5. Never suggest disabling lint, format, or typecheck rules.
6. Never suggest secrets, credentials, or tokens in code.
7. Respect the modular monolith pattern (API) and offline-first PWA (web).

## References

- [Spec 16 — multi-agent-workflow](../.kiro/specs/multi-agent-workflow/)
- [Operational docs](../docs/agents/)
- [Command policy](../docs/agents/command-policy.md)
- [Product scope](../docs/product/product-scope-v2.md)
