/**
 * Demo fixtures for VITE_USE_MOCKS=1 (B0).
 *
 * All values must satisfy the Zod schemas in `shared/schema.ts`. They are
 * validated at load time via `validateFixtures()` in `handlers.ts`.
 *
 * Sources: shape-only from `shared/schema.ts` and `web/src/lib/apiTypes.ts`;
 * inspired (never copied raw) by fixtures in `replit-deliverables/phase-4-5/`.
 * Nothing here talks to the network.
 */
import type {
  Alert,
  Block,
  Campaign,
  Greenhouse,
  IrrigationEvent,
  Observation,
  Settings,
  Task,
  User,
  WeatherForecast,
} from '@shared/schema';
import { CROP_CATALOG } from '@shared/cropCatalog';
import type { CampaignSummary } from '@/lib/apiTypes';

export const DEMO_CROPS = CROP_CATALOG;

const NOW = new Date('2026-07-28T13:00:00Z');
const iso = (offsetHours: number) =>
  new Date(NOW.getTime() + offsetHours * 3_600_000).toISOString();
const day = (offsetDays: number) => iso(offsetDays * 24).slice(0, 10);

export const DEMO_USER: User = {
  id: 'u-demo-owner',
  orgId: 'org-demo',
  name: 'Propietaria Demo',
  email: 'demo@agrosbo.local',
  username: 'owner.demo',
  role: 'admin',
  active: true,
  createdAt: iso(-24 * 30),
};

export const DEMO_USERS: User[] = [
  DEMO_USER,
  {
    id: 'u-demo-tec',
    orgId: 'org-demo',
    name: 'Técnico Demo',
    email: 'tecnico@agrosbo.local',
    username: 'tecnico.demo',
    role: 'tecnico',
    active: true,
    createdAt: iso(-24 * 20),
  },
  {
    id: 'u-demo-op',
    orgId: 'org-demo',
    name: 'Operario Demo',
    username: 'operario.demo',
    role: 'operario',
    active: true,
    createdAt: iso(-24 * 10),
  },
];

export const DEMO_BLOCKS: Block[] = [
  {
    id: 'blk-01',
    name: 'Bloque Norte',
    farm: 'Finca La Esperanza',
    areaHa: 2.4,
    crop: 'Café',
    variety: 'Castillo',
    stage: 'flower',
    lastIrrigation: iso(-30),
    status: 'ok',
    alerts: 0,
    centroidLat: -17.39,
    centroidLng: -66.15,
  },
  {
    id: 'blk-02',
    name: 'Bloque Sur',
    farm: 'Finca La Esperanza',
    areaHa: 1.8,
    crop: 'Aguacate',
    variety: 'Hass',
    stage: 'veg',
    lastIrrigation: iso(-72),
    status: 'warn',
    alerts: 1,
    centroidLat: -17.4,
    centroidLng: -66.16,
  },
];

export const DEMO_GREENHOUSES: Greenhouse[] = [
  {
    id: 'gh-01',
    name: 'Invernadero 1',
    areaM2: 240,
    crop: 'Tomate',
    variety: 'Roma',
    stage: 'flower',
    status: 'ok',
    alerts: 0,
    tempC: 24,
    humidity: 62,
    lat: -17.39,
    lng: -66.15,
  },
];

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 'cmp-01',
    scopeType: 'block',
    scopeId: 'blk-01',
    scopeName: 'Bloque Norte',
    crop: 'Café',
    variety: 'Castillo',
    startDate: day(-60),
    endDate: day(120),
    stage: 'flower',
    progress: 40,
    status: 'ok',
  },
];

export const DEMO_TASKS: Task[] = [
  {
    id: 'tsk-01',
    title: 'Riego programado Bloque Norte',
    scopeType: 'block',
    scopeId: 'blk-01',
    scopeName: 'Bloque Norte',
    assignee: 'u-demo-op',
    dueDate: iso(4),
    priority: 'high',
    status: 'pending',
    notes: 'Verificar goteros sección 2.',
  },
  {
    id: 'tsk-02',
    title: 'Inspección visual aguacate',
    scopeType: 'block',
    scopeId: 'blk-02',
    scopeName: 'Bloque Sur',
    assignee: 'u-demo-tec',
    dueDate: iso(28),
    priority: 'med',
    status: 'in_progress',
  },
];

export const DEMO_OBSERVATIONS: Observation[] = [
  {
    id: 'obs-01',
    scopeType: 'block',
    scopeId: 'blk-02',
    scopeName: 'Bloque Sur',
    author: 'Técnico Demo',
    createdAt: iso(-8),
    type: 'pest',
    text: 'Presencia leve de trips en hojas jóvenes.',
    hasPhotos: 1,
  },
];

export const DEMO_IRRIGATION: IrrigationEvent[] = [
  {
    id: 'irr-01',
    scopeType: 'block',
    scopeId: 'blk-01',
    scopeName: 'Bloque Norte',
    scheduledAt: iso(6),
    durationMin: 45,
    volumeL: 900,
    status: 'scheduled',
    responsible: 'u-demo-op',
  },
];

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'alr-01',
    level: 'warn',
    scope: 'Bloque Sur',
    message: 'Sin riego por 72h y temperatura alta pronosticada.',
    at: iso(-2),
  },
];

export const DEMO_SETTINGS: Settings = {
  orgName: 'Finca La Esperanza (Demo)',
  location: 'Cochabamba, Bolivia',
  timezone: 'America/La_Paz',
  preferOffline: true,
  confirmBeforeSync: true,
  criticalAlertsBanner: true,
};

export function buildWeatherForecast(lat: number, lng: number): WeatherForecast {
  return {
    lat,
    lng,
    timezone: 'America/La_Paz',
    fetchedAt: iso(0),
    stale: false,
    daily: Array.from({ length: 7 }, (_, i) => ({
      date: day(i),
      weatherCode: i === 2 ? 61 : i === 5 ? 3 : 1,
      tMax: 26 - (i % 3),
      tMin: 12 + (i % 2),
      precipMm: i === 2 ? 6.2 : 0,
      precipProb: i === 2 ? 75 : i === 5 ? 30 : 5,
      windKmh: 8 + i,
    })),
  };
}

export function buildCampaignSummary(id: string): CampaignSummary {
  const campaign = DEMO_CAMPAIGNS.find((c) => c.id === id) ?? DEMO_CAMPAIGNS[0];
  return {
    campaign,
    tasks: { total: 2, pending: 1, in_progress: 1, done: 0, overdue: 0 },
    irrigation: {
      total: 1,
      done: 0,
      scheduled: 1,
      skipped: 0,
      totalDurationMin: 45,
      totalVolumeL: 900,
    },
    observations: { total: 1, byType: { pest: 1 } },
    harvest: {
      lots: 0,
      totalQuantity: 0,
      unitMix: {},
      revenue: 0,
      cost: 0,
      margin: 0,
      currency: null,
    },
    costs: { fromMovements: 0, currency: null },
  };
}

/** Empty but valid FeatureCollection for /api/spatial/features (documented shape). */
export const DEMO_SPATIAL_FEATURES = {
  type: 'FeatureCollection' as const,
  features: [] as unknown[],
};

export const DEMO_SESSION_ME = {
  user: DEMO_USER,
  enforcement: 'off' as const,
  bypass: true,
};
