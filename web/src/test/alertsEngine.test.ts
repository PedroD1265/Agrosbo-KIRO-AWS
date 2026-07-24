// Test de QA ejecutado el 2026-07-23 (Verificación del motor de alertas)
import { describe, it, expect } from "vitest";
import { deriveAlerts } from "../../../api/src/alertsEngine";

const now = new Date("2026-07-23T10:00:00.000Z");

describe("alertsEngine", () => {
  it("emite alerta crítica por stock bajo (ratio < 0.5)", () => {
    const alerts = deriveAlerts({
      now,
      blocks: [], greenhouses: [],
      inventory: [{ id: "iv-1", name: "Mancozeb", category: "fito", unit: "kg", stock: 2, min: 10, lastMovement: now.toISOString() }],
      tasks: [], observations: [], irrigation: [], applications: [], hives: [],
    });
    const lo = alerts.find((a) => a.id === "lowstock-iv-1");
    expect(lo).toBeDefined();
    expect(lo!.level).toBe("critical");
  });

  it("emite alerta por tarea vencida de alta prioridad", () => {
    const alerts = deriveAlerts({
      now,
      blocks: [], greenhouses: [],
      inventory: [],
      tasks: [{
        id: "t-1", title: "Riego", scopeType: "block", scopeId: "b-01", scopeName: "B1",
        assignee: "Juan", dueDate: "2026-07-15", priority: "high", status: "pending", hasPhotos: 0,
      } as any],
      observations: [], irrigation: [], applications: [], hives: [],
    });
    expect(alerts.some((a) => a.id === "task-overdue-t-1")).toBe(true);
  });

  it("emite alerta por carencia activa de fitosanitario", () => {
    const alerts = deriveAlerts({
      now,
      blocks: [], greenhouses: [],
      inventory: [], tasks: [], observations: [], irrigation: [],
      applications: [{
        id: "fa-1", scopeType: "block", scopeId: "b-01", scopeName: "B1",
        applicationType: "fungicide", productName: "Mancozeb",
        appliedAt: "2026-07-20T10:00:00.000Z", responsible: "Juan",
        preHarvestIntervalDays: 14, safeHarvestDate: "2026-08-03",
        createdAt: now.toISOString(),
      } as any],
      hives: [],
    });
    const car = alerts.find((a) => a.id === "carencia-fa-1");
    expect(car).toBeDefined();
    expect(car!.message).toMatch(/Mancozeb/);
  });

  it("NO emite carencia si safeHarvestDate ya pasó", () => {
    const alerts = deriveAlerts({
      now,
      blocks: [], greenhouses: [],
      inventory: [], tasks: [], observations: [], irrigation: [],
      applications: [{
        id: "fa-2", scopeType: "block", scopeId: "b-01", scopeName: "B1",
        applicationType: "fungicide", productName: "Mancozeb",
        appliedAt: "2026-07-01T10:00:00.000Z", responsible: "Juan",
        preHarvestIntervalDays: 14, safeHarvestDate: "2026-07-15",
        createdAt: "2026-07-01T10:00:00.000Z",
      } as any],
      hives: [],
    });
    expect(alerts.find((a) => a.id === "carencia-fa-2")).toBeUndefined();
  });

  it("emite alerta por colmena con reina ausente y sin inspección reciente", () => {
    const alerts = deriveAlerts({
      now,
      blocks: [], greenhouses: [],
      inventory: [], tasks: [], observations: [], irrigation: [], applications: [],
      hives: [{
        id: "hv-1", apiaryId: "ap-1", code: "C-01", status: "warn",
        queenStatus: "absent", colonyStrength: "weak", broodLevel: "low",
        honeyStores: "low", lastInspectionAt: "2026-05-01T10:00:00.000Z",
        createdAt: "2026-03-01T10:00:00.000Z",
      } as any],
    });
    expect(alerts.some((a) => a.id.startsWith("hive-queen-hv-1"))).toBe(true);
    expect(alerts.some((a) => a.id.startsWith("hive-overdue-hv-1"))).toBe(true);
  });
});
