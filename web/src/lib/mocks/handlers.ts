/**
 * Mock request handlers for VITE_USE_MOCKS=1 (B0).
 *
 * B0 covers only the read endpoints needed to render the initial preview:
 *   /api/auth/{session,me,login,logout}
 *   /api/tasks, /api/blocks, /api/greenhouses
 *   /api/campaigns, /api/campaigns/:id/summary
 *   /api/observations, /api/irrigation-events
 *   /api/weather/forecast, /api/alerts, /api/settings
 *   /api/crops, /api/users
 *   /api/spatial/features (empty valid response)
 *
 * Every other endpoint MUST fall through to `unmocked()` which returns a
 * 501 Response with { error: 'UNMOCKED_ENDPOINT', path, method, hint }.
 *
 * No mutation eco. No POST/PUT/PATCH/DELETE handlers here — those belong
 * to B3 (Assistant Dock + confirmation flow).
 */
import {
  alertSchema,
  blockSchema,
  campaignSchema,
  greenhouseSchema,
  irrigationEventSchema,
  observationSchema,
  settingsSchema,
  taskSchema,
  weatherForecastSchema,
} from '@shared/schema';
import {
  DEMO_ALERTS,
  DEMO_BLOCKS,
  DEMO_CAMPAIGNS,
  DEMO_CROPS,
  DEMO_GREENHOUSES,
  DEMO_IRRIGATION,
  DEMO_OBSERVATIONS,
  DEMO_SESSION_ME,
  DEMO_SETTINGS,
  DEMO_SPATIAL_FEATURES,
  DEMO_TASKS,
  DEMO_USERS,
  buildCampaignSummary,
  buildWeatherForecast,
} from './fixtures';

const JSON_HEADERS: HeadersInit = { 'content-type': 'application/json' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function unmocked(path: string, method: string): Response {
  return json(
    {
      error: 'UNMOCKED_ENDPOINT',
      path,
      method,
      hint: 'Add a handler in web/src/lib/mocks/handlers.ts (allowed under B0 only for the covered read list).',
    },
    501,
  );
}

/** One-shot validation of all fixture payloads against shared schemas. */
let validated = false;
function validateFixturesOnce(): void {
  if (validated) return;
  validated = true;
  DEMO_BLOCKS.forEach((x) => blockSchema.parse(x));
  DEMO_GREENHOUSES.forEach((x) => greenhouseSchema.parse(x));
  DEMO_CAMPAIGNS.forEach((x) => campaignSchema.parse(x));
  DEMO_TASKS.forEach((x) => taskSchema.parse(x));
  DEMO_OBSERVATIONS.forEach((x) => observationSchema.parse(x));
  DEMO_IRRIGATION.forEach((x) => irrigationEventSchema.parse(x));
  DEMO_ALERTS.forEach((x) => alertSchema.parse(x));
  settingsSchema.parse(DEMO_SETTINGS);
  weatherForecastSchema.parse(buildWeatherForecast(-17.39, -66.15));
}

/**
 * Resolve a mock Response for the given URL + method.
 * Returns `null` when the request must not be mocked (production behavior).
 * Returns an `UNMOCKED_ENDPOINT` 501 for anything outside the B0 coverage list.
 */
export function handleMockRequest(url: URL, method: string): Response | null {
  validateFixturesOnce();
  const path = url.pathname;
  const m = method.toUpperCase();

  // --- Auth (GET/POST allowed, no persistence, no credentials stored) ---
  if (path === '/api/auth/me' || path === '/api/auth/session') {
    return json(DEMO_SESSION_ME);
  }
  if (path === '/api/auth/login' && m === 'POST') {
    return json({ user: DEMO_SESSION_ME.user });
  }
  if (path === '/api/auth/logout' && m === 'POST') {
    return new Response(null, { status: 204 });
  }

  // --- Read-only domain endpoints (B0 covered list) ---
  if (m !== 'GET') {
    // B0 explicitly excludes mutation echoes. Force UNMOCKED so callers see it.
    return unmocked(path, m);
  }

  if (path === '/api/tasks') return json(DEMO_TASKS);
  if (path === '/api/blocks') return json(DEMO_BLOCKS);
  if (path === '/api/greenhouses') return json(DEMO_GREENHOUSES);
  if (path === '/api/campaigns') return json(DEMO_CAMPAIGNS);
  const cmpSummary = path.match(/^\/api\/campaigns\/([^/]+)\/summary$/);
  if (cmpSummary) return json(buildCampaignSummary(cmpSummary[1]));
  if (path === '/api/observations') return json(DEMO_OBSERVATIONS);
  if (path === '/api/irrigation-events') return json(DEMO_IRRIGATION);
  if (path === '/api/alerts') return json(DEMO_ALERTS);
  if (path === '/api/settings') return json(DEMO_SETTINGS);
  if (path === '/api/crops') return json(DEMO_CROPS);
  if (path === '/api/users') return json(DEMO_USERS);
  if (path === '/api/spatial/features') return json(DEMO_SPATIAL_FEATURES);

  if (path === '/api/weather/forecast') {
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    return json(buildWeatherForecast(Number.isFinite(lat) ? lat : -17.39, Number.isFinite(lng) ? lng : -66.15));
  }

  return unmocked(path, m);
}

/** Endpoints intentionally covered by B0 (documented for the handoff). */
export const B0_COVERED_ENDPOINTS = [
  'GET /api/auth/me',
  'GET /api/auth/session',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'GET /api/tasks',
  'GET /api/blocks',
  'GET /api/greenhouses',
  'GET /api/campaigns',
  'GET /api/campaigns/:id/summary',
  'GET /api/observations',
  'GET /api/irrigation-events',
  'GET /api/weather/forecast',
  'GET /api/alerts',
  'GET /api/settings',
  'GET /api/crops',
  'GET /api/users',
  'GET /api/spatial/features (empty valid FeatureCollection)',
] as const;
