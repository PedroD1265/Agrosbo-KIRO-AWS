// Guard test: ensures the production aliases ('@' -> web/src, '@shared' -> shared)
// also resolve under Vitest. If an alias regresses, these imports throw and the
// suite fails loudly instead of silently losing RBAC / shared-contract coverage.
import { describe, it, expect } from "vitest";

describe("production aliases resolve under Vitest", () => {
  it("'@' alias resolves web/src modules (@/lib/permissions)", async () => {
    const mod = await import("@/lib/permissions");
    expect(typeof mod.can).toBe("function");
  });

  it("'@shared' alias resolves shared contracts (@shared/schema)", async () => {
    const mod = await import("@shared/schema");
    expect(mod.userRoleSchema).toBeDefined();
  });
});
