// Test de QA ejecutado el 2026-07-23 (Verificación de hashing de contraseñas de usuarios)
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../../api/src/users";

describe("users password hashing", () => {
  it("hash y verify funcionan en happy path", () => {
    const h = hashPassword("secret-password-123");
    expect(verifyPassword("secret-password-123", h)).toBe(true);
  });
  it("verify falla con contraseña incorrecta", () => {
    const h = hashPassword("right");
    expect(verifyPassword("wrong", h)).toBe(false);
  });
  it("formato del hash incluye salt + scrypt", () => {
    const h = hashPassword("xyz12345");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(h.split("$")).toHaveLength(3);
  });
});
