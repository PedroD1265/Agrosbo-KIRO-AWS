// Test de QA ejecutado el 2026-07-23 (Verificación de esquema y derivación de fechas de carencia)
import { describe, it, expect } from "vitest";
import { insertFieldApplicationSchema } from "@agrosbo/shared/schema";

describe("field application schema", () => {
  it("acepta carga válida sin inventario", () => {
    const r = insertFieldApplicationSchema.safeParse({
      scopeType: "block", scopeId: "b-01",
      applicationType: "fungicide", productName: "Mancozeb",
      appliedAt: "2026-07-23T10:00:00.000Z", responsible: "Juan",
      preHarvestIntervalDays: 14,
    });
    expect(r.success).toBe(true);
  });
  it("rechaza productName vacío", () => {
    const r = insertFieldApplicationSchema.safeParse({
      scopeType: "block", scopeId: "b-01",
      applicationType: "fungicide", productName: "",
      appliedAt: "2026-07-23T10:00:00.000Z", responsible: "Juan",
    });
    expect(r.success).toBe(false);
  });
  it("rechaza dose negativa", () => {
    const r = insertFieldApplicationSchema.safeParse({
      scopeType: "block", scopeId: "b-01",
      applicationType: "fertilizer", productName: "Urea",
      appliedAt: "2026-07-23T10:00:00.000Z", responsible: "Juan",
      dose: -5,
    });
    expect(r.success).toBe(false);
  });
});

describe("safeHarvestDate derivation", () => {
  function deriveSafeDate(appliedAt: string, days: number): string {
    return new Date(new Date(appliedAt).getTime() + days * 86_400_000)
      .toISOString().slice(0, 10);
  }
  it("calcula fecha segura sumando días al appliedAt", () => {
    expect(deriveSafeDate("2026-07-23T10:00:00.000Z", 14)).toBe("2026-08-06");
  });
  it("respeta días=0 (sin carencia)", () => {
    expect(deriveSafeDate("2026-07-23T10:00:00.000Z", 0)).toBe("2026-07-23");
  });
});
