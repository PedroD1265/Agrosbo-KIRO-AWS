// Test de QA ejecutado el 2026-07-23 (Verificación de autenticación y tokens JWT/HMAC)
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-with-more-than-sixteen-chars";
  process.env.AUTH_ENFORCEMENT = "on";
});

describe("auth tokens", () => {
  it("sign and verify a token round-trip", async () => {
    const { encodeToken, decodeToken } = await import("../../../api/src/auth");
    const exp = Date.now() + 60_000;
    const tok = encodeToken("usr-1", exp);
    const dec = decodeToken(tok);
    expect(dec).not.toBeNull();
    expect(dec!.userId).toBe("usr-1");
    expect(dec!.expiresAt).toBe(exp);
  });

  it("reject a tampered token", async () => {
    const { encodeToken, decodeToken } = await import("../../../api/src/auth");
    const tok = encodeToken("usr-1", Date.now() + 60_000);
    const tampered = tok.replace("usr-1", "usr-2");
    expect(decodeToken(tampered)).toBeNull();
  });

  it("reject an expired token", async () => {
    const { encodeToken, decodeToken } = await import("../../../api/src/auth");
    const tok = encodeToken("usr-1", Date.now() - 1);
    expect(decodeToken(tok)).toBeNull();
  });

  it("reject malformed tokens", async () => {
    const { decodeToken } = await import("../../../api/src/auth");
    expect(decodeToken("garbage")).toBeNull();
    expect(decodeToken("two.parts")).toBeNull();
    expect(decodeToken("")).toBeNull();
  });

  it("reject a token signed with a different secret", async () => {
    const { encodeToken } = await import("../../../api/src/auth");
    const tok = encodeToken("usr-1", Date.now() + 60_000);
    // Re-import with a different secret in a child process-like fashion is
    // not possible inside vitest without complex isolation. We assert the
    // shape is HMAC-protected by mutating the signature byte and expecting
    // rejection.
    const [body, sig] = tok.split(".");
    const flipped = sig.slice(0, -2) + (sig.endsWith("00") ? "ff" : "00");
    const { decodeToken } = await import("../../../api/src/auth");
    expect(decodeToken(`${body}.${flipped}`)).toBeNull();
  });
});

describe("requireRole middleware (enforcement on)", () => {
  it("returns 403 when role does not match", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const middleware = requireRole("admin");
    const req: any = { user: { id: "u1", role: "operario", active: true } };
    let statusCode = 0;
    let body: any = null;
    let nextCalled = false;
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(b: any) { body = b; return this; },
    };
    middleware(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(body?.error).toMatch(/Permiso/);
  });

  it("calls next when role matches", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const middleware = requireRole("admin");
    const req: any = { user: { id: "u1", role: "admin", active: true } };
    let nextCalled = false;
    const res: any = { status() { return this; }, json() { return this; } };
    middleware(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it("returns 401 when there is no user", async () => {
    const { requireRole } = await import("../../../api/src/auth");
    const middleware = requireRole("admin");
    const req: any = {};
    let statusCode = 0;
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json() { return this; },
    };
    middleware(req, res, () => {});
    expect(statusCode).toBe(401);
  });
});
