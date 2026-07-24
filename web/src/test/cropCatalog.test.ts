// Test de QA ejecutado el 2026-07-23 (Verificación de catálogo de cultivos)
import { describe, it, expect } from 'vitest';
import { CROP_CATALOG, findCrop, estimateStage } from '@agrosbo/shared/cropCatalog';

describe('cropCatalog', () => {
  it('contiene los 6 cultivos principales', () => {
    const ids = CROP_CATALOG.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(['tomate', 'cebolla', 'papa', 'maiz', 'alfalfa', 'arveja']),
    );
  });
  it('findCrop normaliza mayúsculas y espacios', () => {
    expect(findCrop('Tomate')?.id).toBe('tomate');
    expect(findCrop(' PAPA ')?.id).toBe('papa');
  });
  it('estimateStage devuelve etapa según día del ciclo', () => {
    const tomate = findCrop('tomate')!;
    const startIso = '2026-07-23';
    const now = new Date(new Date(startIso).getTime() + (tomate.typicalCycleDays + 5) * 86400000);
    const stage = estimateStage(tomate, startIso, now);
    expect(stage.dayOffset).toBeGreaterThan(tomate.typicalCycleDays);
    expect(stage.cycleProgress).toBe(1);
    expect(stage.isOverdue).toBe(false);
    expect(stage.current).toBeDefined();
  });
});
