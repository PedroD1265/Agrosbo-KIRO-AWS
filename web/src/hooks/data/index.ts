import { useQuery } from '@tanstack/react-query';
import type {
  Block,
  Greenhouse,
  Campaign,
  IrrigationEvent,
  Task,
  Observation,
  InventoryItem,
  InventoryMovement,
  HarvestLot,
  Alert,
  Settings,
  FieldApplication,
  Apiary,
  Hive,
  HiveInspection,
  HoneyHarvest,
} from '@shared/schema';
import type { GeoJsonFeatureCollection } from '@shared/spatial';
import type { CampaignSummary } from '@/lib/apiTypes';
import type { CropDef } from '@agrosbo/shared/cropCatalog';
import type { IrrigationAdvice } from '@/lib/apiTypes';

export function useBlocks() {
  return useQuery<Block[]>({ queryKey: ['/api/blocks'] });
}

export function useBlock(id: string | undefined) {
  return useQuery<Block>({
    queryKey: ['/api/blocks', id],
    enabled: Boolean(id),
  });
}

export function useGreenhouses() {
  return useQuery<Greenhouse[]>({ queryKey: ['/api/greenhouses'] });
}

export function useGreenhouse(id: string | undefined) {
  return useQuery<Greenhouse>({
    queryKey: ['/api/greenhouses', id],
    enabled: Boolean(id),
  });
}

export function useCampaigns() {
  return useQuery<Campaign[]>({ queryKey: ['/api/campaigns'] });
}

export function useTasks() {
  return useQuery<Task[]>({ queryKey: ['/api/tasks'] });
}

export function useIrrigationEvents() {
  return useQuery<IrrigationEvent[]>({ queryKey: ['/api/irrigation-events'] });
}

export function useObservations() {
  return useQuery<Observation[]>({ queryKey: ['/api/observations'] });
}

export function useInventory() {
  return useQuery<InventoryItem[]>({ queryKey: ['/api/inventory'] });
}

export function useInventoryMovements(itemId: string | undefined) {
  return useQuery<InventoryMovement[]>({
    queryKey: ['/api/inventory', itemId, 'movements'],
    enabled: Boolean(itemId),
  });
}

export function useHarvestLots() {
  return useQuery<HarvestLot[]>({ queryKey: ['/api/harvest-lots'] });
}

export function useAlerts() {
  return useQuery<Alert[]>({ queryKey: ['/api/alerts'] });
}

export function useSettings() {
  return useQuery<Settings>({ queryKey: ['/api/settings'] });
}

export function useSpatialFeatures() {
  return useQuery<GeoJsonFeatureCollection>({
    queryKey: ['/api/spatial/features'],
  });
}

export function useCampaignSummary(id: string | undefined) {
  return useQuery<CampaignSummary>({
    queryKey: ['/api/campaigns', id, 'summary'],
    enabled: Boolean(id),
  });
}

export function useCropCatalog() {
  return useQuery<CropDef[]>({ queryKey: ['/api/crops'], staleTime: 60 * 60 * 1000 });
}

export function useApplications() {
  return useQuery<FieldApplication[]>({ queryKey: ['/api/applications'] });
}

export function useIrrigationAdvice(scope?: {
  scopeType: 'block' | 'greenhouse';
  scopeId: string;
}) {
  const url = scope
    ? `/api/irrigation/advice?scopeType=${scope.scopeType}&scopeId=${scope.scopeId}`
    : '/api/irrigation/advice';
  return useQuery<IrrigationAdvice[]>({
    queryKey: [url],
  });
}

export function useApiaries() {
  return useQuery<Apiary[]>({ queryKey: ['/api/apiaries'] });
}
export function useHives() {
  return useQuery<Hive[]>({ queryKey: ['/api/hives'] });
}
export function useHiveInspections(hiveId?: string) {
  const url = hiveId ? `/api/hive-inspections?hiveId=${hiveId}` : '/api/hive-inspections';
  return useQuery<HiveInspection[]>({ queryKey: [url] });
}
export function useHoneyHarvests() {
  return useQuery<HoneyHarvest[]>({ queryKey: ['/api/honey-harvests'] });
}

import type { Attachment, Expense, LaborCost, User, AttachmentEntityType } from '@shared/schema';
import type { CostBreakdown } from '@/lib/apiTypes';

export function useAttachments(entityType?: AttachmentEntityType, entityId?: string) {
  const params = new URLSearchParams();
  if (entityType) params.set('entityType', entityType);
  if (entityId) params.set('entityId', entityId);
  const qs = params.toString();
  const url = qs ? `/api/attachments?${qs}` : '/api/attachments';
  return useQuery<Attachment[]>({
    queryKey: [url],
    enabled: !entityId || Boolean(entityId),
  });
}

export function useExpenses(filter?: {
  campaignId?: string;
  from?: string;
  to?: string;
  category?: string;
}) {
  const params = new URLSearchParams();
  if (filter?.campaignId) params.set('campaignId', filter.campaignId);
  if (filter?.from) params.set('from', filter.from);
  if (filter?.to) params.set('to', filter.to);
  if (filter?.category) params.set('category', filter.category);
  const qs = params.toString();
  const url = qs ? `/api/expenses?${qs}` : '/api/expenses';
  return useQuery<Expense[]>({ queryKey: [url] });
}

export function useLaborCosts(filter?: { campaignId?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filter?.campaignId) params.set('campaignId', filter.campaignId);
  if (filter?.from) params.set('from', filter.from);
  if (filter?.to) params.set('to', filter.to);
  const qs = params.toString();
  const url = qs ? `/api/labor-costs?${qs}` : '/api/labor-costs';
  return useQuery<LaborCost[]>({ queryKey: [url] });
}

export function useCampaignCosts(id: string | undefined) {
  return useQuery<CostBreakdown>({
    queryKey: ['/api/campaigns', id, 'costs'],
    enabled: Boolean(id),
  });
}

export function useUsers() {
  return useQuery<User[]>({ queryKey: ['/api/users'] });
}

export * from './mutations';
