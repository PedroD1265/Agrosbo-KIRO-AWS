/**
 * Provisional duplicate detection rule for hackathon dataset.
 * Marks a harvest as possible_duplicate when ALL fields match:
 * cooperative_id, producer_id, parcel_id, product_state, harvested_date,
 * quantity_kg (rounded to 2 decimals).
 *
 * This rule is provisional and may change after observing real data.
 * MUST NOT: fuse, delete, overwrite, reject, or silently modify another record.
 * DISPOSABLE.
 */
import { HarvestDuplicateKey } from './types.js';

export function buildHarvestDuplicateKey(
  cooperative_id: string,
  producer_id: string,
  parcel_id: string,
  product_state: string,
  harvested_date: string,
  quantity_kg: number,
): HarvestDuplicateKey {
  return {
    cooperative_id,
    producer_id,
    parcel_id,
    product_state,
    harvested_date,
    quantity_kg_rounded: quantity_kg.toFixed(2),
  };
}

export function duplicateKeyMatches(a: HarvestDuplicateKey, b: HarvestDuplicateKey): boolean {
  return (
    a.cooperative_id === b.cooperative_id &&
    a.producer_id === b.producer_id &&
    a.parcel_id === b.parcel_id &&
    a.product_state === b.product_state &&
    a.harvested_date === b.harvested_date &&
    a.quantity_kg_rounded === b.quantity_kg_rounded
  );
}
