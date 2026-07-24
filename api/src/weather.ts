import { eq, lt } from "drizzle-orm";
import { db, hasDatabaseUrl } from "./db.js";
import { weatherCache, type WeatherForecast, type DailyForecast } from "@agrosbo/shared/schema.js";
import { createLogger } from "./logger.js";

const log = createLogger("weather");

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const TZ = "America/La_Paz";
const FRESH_MS = 60 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  payload: Omit<WeatherForecast, "stale">;
  expiresAt: number;
}
const memCache = new Map<string, CacheEntry>();

function keyFor(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function fetchOpenMeteo(lat: number, lng: number): Promise<Omit<WeatherForecast, "stale">> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    timezone: TZ,
    forecast_days: "7",
  });

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: ctrl.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`open-meteo HTTP ${res.status}`);

  const json = (await res.json()) as {
    timezone: string;
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      precipitation_probability_max: (number | null)[];
      wind_speed_10m_max: number[];
    };
  };

  const daily: DailyForecast[] = json.daily.time.map((date, i) => ({
    date,
    weatherCode: json.daily.weather_code[i] ?? 0,
    tMax: json.daily.temperature_2m_max[i] ?? 0,
    tMin: json.daily.temperature_2m_min[i] ?? 0,
    precipMm: json.daily.precipitation_sum[i] ?? 0,
    precipProb: json.daily.precipitation_probability_max[i] ?? 0,
    windKmh: json.daily.wind_speed_10m_max[i] ?? 0,
  }));

  return {
    lat,
    lng,
    timezone: json.timezone,
    daily,
    fetchedAt: new Date().toISOString(),
  };
}

async function loadFromDb(key: string): Promise<{ payload: Omit<WeatherForecast, "stale">; fetchedAt: number } | null> {
  if (!hasDatabaseUrl) return null;
  try {
    const rows = await db.select().from(weatherCache).where(eq(weatherCache.key, key)).limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      payload: r.payload as Omit<WeatherForecast, "stale">,
      fetchedAt: new Date(r.fetchedAt).getTime(),
    };
  } catch (err) {
    log.warn("weather cache db read failed", { err });
    return null;
  }
}

async function saveToDb(key: string, lat: number, lng: number, payload: Omit<WeatherForecast, "stale">): Promise<void> {
  if (!hasDatabaseUrl) return;
  const now = Date.now();
  const fetchedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + STALE_MS).toISOString();
  try {
    await db
      .insert(weatherCache)
      .values({ key, lat, lng, payload, fetchedAt, expiresAt })
      .onConflictDoUpdate({
        target: weatherCache.key,
        set: { lat, lng, payload, fetchedAt, expiresAt },
      });
    await db.delete(weatherCache).where(lt(weatherCache.expiresAt, fetchedAt));
  } catch (err) {
    log.warn("weather cache db write failed", { err });
  }
}

export async function getForecast(lat: number, lng: number): Promise<WeatherForecast> {
  const key = keyFor(lat, lng);
  const now = Date.now();

  const mem = memCache.get(key);
  if (mem && mem.expiresAt > now) {
    return { ...mem.payload, stale: false };
  }

  const dbHit = await loadFromDb(key);
  if (dbHit && now - dbHit.fetchedAt < FRESH_MS) {
    memCache.set(key, { payload: dbHit.payload, expiresAt: dbHit.fetchedAt + FRESH_MS });
    return { ...dbHit.payload, stale: false };
  }

  try {
    const fresh = await fetchOpenMeteo(lat, lng);
    memCache.set(key, { payload: fresh, expiresAt: now + FRESH_MS });
    await saveToDb(key, lat, lng, fresh);
    return { ...fresh, stale: false };
  } catch (err) {
    log.warn("open-meteo fetch failed; using stale cache if available", { err: (err as Error).message });
    if (dbHit && now - dbHit.fetchedAt < STALE_MS) {
      return { ...dbHit.payload, stale: true };
    }
    if (mem) {
      return { ...mem.payload, stale: true };
    }
    throw err;
  }
}
