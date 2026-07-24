// Test de QA ejecutado el 2026-07-23 (Verificación de control de acceso por roles RBAC)
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-with-more-than-sixteen-chars";
  process.env.AUTH_ENFORCEMENT = "on";
});

describe("permissions matrix (can())", () => {
  it("imports cleanly", async () => {
    const { can } = await import("../lib/permissions");
    expect(typeof can).toBe("function");
  });

  it("admin has all permissions", async () => {
    const { can } = await import("../lib/permissions");
    const admin = { id: "a1", role: "admin" as const, orgId: "o1", name: "A", active: true, createdAt: "" };
    expect(can(admin, "inventory:write")).toBe(true);
    expect(can(admin, "expenses:write")).toBe(true);
    expect(can(admin, "applications:write")).toBe(true);
    expect(can(admin, "harvestLots:write")).toBe(true);
    expect(can(admin, "users:manage")).toBe(true);
  });

  it("tecnico can write operational data but not manage users", async () => {
    const { can } = await import("../lib/permissions");
    const u = { id: "t1", role: "tecnico" as const, orgId: "o1", name: "T", active: true, createdAt: "" };
    expect(can(u, "inventory:write")).toBe(true);
    expect(can(u, "expenses:write")).toBe(true);
    expect(can(u, "applications:write")).toBe(true);
    expect(can(u, "harvestLots:write")).toBe(true);
    expect(can(u, "users:manage")).toBe(false);
  });

  it("encargado mirrors tecnico (no user management)", async () => {
    const { can } = await import("../lib/permissions");
    const u = { id: "e1", role: "encargado" as const, orgId: "o1", name: "E", active: true, createdAt: "" };
    expect(can(u, "inventory:write")).toBe(true);
    expect(can(u, "expenses:write")).toBe(true);
    expect(can(u, "applications:write")).toBe(true);
    expect(can(u, "harvestLots:write")).toBe(true);
    expect(can(u, "users:manage")).toBe(false);
  });

  it("finanzas can only write expenses", async () => {
    const { can } = await import("../lib/permissions");
    const u = { id: "f1", role: "finanzas" as const, orgId: "o1", name: "F", active: true, createdAt: "" };
    expect(can(u, "expenses:write")).toBe(true);
    expect(can(u, "inventory:write")).toBe(false);
    expect(can(u, "applications:write")).toBe(false);
    expect(can(u, "harvestLots:write")).toBe(false);
    expect(can(u, "users:manage")).toBe(false);
  });

  it("operario has no write permissions", async () => {
    const { can } = await import("../lib/permissions");
    const u = { id: "o1", role: "operario" as const, orgId: "o1", name: "O", active: true, createdAt: "" };
    expect(can(u, "inventory:write")).toBe(false);
    expect(can(u, "expenses:write")).toBe(false);
    expect(can(u, "applications:write")).toBe(false);
    expect(can(u, "harvestLots:write")).toBe(false);
    expect(can(u, "users:manage")).toBe(false);
  });

  it("null user has no permissions", async () => {
    const { can } = await import("../lib/permissions");
    expect(can(null, "inventory:write")).toBe(false);
    expect(can(null, "expenses:write")).toBe(false);
    expect(can(null, "users:manage")).toBe(false);
  });
});

describe("requireRole middleware — sensitive route guards (enforcement on)", () => {
  it("operario is blocked from inventory write (403)", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const mw = requireRole("admin", "tecnico", "encargado");
    const req: any = { user: { id: "u1", role: "operario", active: true } };
    let status = 0;
    const res: any = { status(c: number) { status = c; return this; }, json() { return this; } };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(status).toBe(403);
  });

  it("finanzas is blocked from inventory write (403)", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const mw = requireRole("admin", "tecnico", "encargado");
    const req: any = { user: { id: "u2", role: "finanzas", active: true } };
    let status = 0;
    const res: any = { status(c: number) { status = c; return this; }, json() { return this; } };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(status).toBe(403);
  });

  it("finanzas is allowed to write expenses (passes)", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const mw = requireRole("admin", "tecnico", "encargado", "finanzas");
    const req: any = { user: { id: "u3", role: "finanzas", active: true } };
    let nextCalled = false;
    const res: any = { status() { return this; }, json() { return this; } };
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it("operario is blocked from expenses write (403)", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const mw = requireRole("admin", "tecnico", "encargado", "finanzas");
    const req: any = { user: { id: "u4", role: "operario", active: true } };
    let status = 0;
    const res: any = { status(c: number) { status = c; return this; }, json() { return this; } };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(status).toBe(403);
  });

  it("encargado is blocked from user management (403)", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const mw = requireRole("admin");
    const req: any = { user: { id: "u5", role: "encargado", active: true } };
    let status = 0;
    const res: any = { status(c: number) { status = c; return this; }, json() { return this; } };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(status).toBe(403);
  });

  it("admin passes all sensitive route guards", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const routes = [
      requireRole("admin", "tecnico", "encargado"),
      requireRole("admin", "tecnico", "encargado", "finanzas"),
      requireRole("admin"),
    ];
    const req: any = { user: { id: "u6", role: "admin", active: true } };
    for (const mw of routes) {
      let nextCalled = false;
      const res: any = { status() { return this; }, json() { return this; } };
      mw(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    }
  });
});
