import { useQuery } from '@tanstack/react-query';
import type { DailyForecast, WeatherForecast } from '@shared/schema';

export type { DailyForecast, WeatherForecast };

async function fetchForecast(lat: number, lng: number): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
  });
  const res = await fetch(`/api/weather/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather ${res.status}`);
  return (await res.json()) as WeatherForecast;
}

export function useWeatherForecast(lat: number | null | undefined, lng: number | null | undefined) {
  return useQuery({
    queryKey: ['weather-forecast', lat, lng],
    queryFn: () => fetchForecast(lat as number, lng as number),
    enabled: typeof lat === 'number' && typeof lng === 'number',
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/* ---- Helpers ---------------------------------------------------------- */

export function weatherLabel(code: number): string {
  if (code === 0) return 'Despejado';
  if (code <= 2) return 'Parcial';
  if (code === 3) return 'Nublado';
  if (code <= 48) return 'Niebla';
  if (code <= 57) return 'Llovizna';
  if (code <= 67) return 'Lluvia';
  if (code <= 77) return 'Nieve';
  if (code <= 82) return 'Chubascos';
  if (code <= 86) return 'Nevadas';
  return 'Tormenta';
}

/** Recomendación operativa simple para riego basado en pronóstico de hoy y mañana. */
export function irrigationAdvice(daily: DailyForecast[]): {
  tone: 'ok' | 'warn' | 'info';
  text: string;
} {
  if (daily.length === 0) return { tone: 'info', text: 'Sin pronóstico' };
  const today = daily[0];
  const tomorrow = daily[1];
  const rainSoon =
    (today?.precipMm ?? 0) >= 5 || (today?.precipProb ?? 0) >= 70 || (tomorrow?.precipMm ?? 0) >= 8;
  if (rainSoon) {
    return {
      tone: 'info',
      text: `Lluvia probable (${Math.max(today.precipProb, tomorrow?.precipProb ?? 0)}%) — considera diferir riegos no críticos.`,
    };
  }
  if (today.tMax >= 28 && today.precipMm < 1) {
    return {
      tone: 'warn',
      text: `Día caluroso (${Math.round(today.tMax)}°C) sin lluvia — mantener riegos programados.`,
    };
  }
  return { tone: 'ok', text: 'Condiciones estables — operar según plan.' };
}
