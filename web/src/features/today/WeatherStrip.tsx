import { Cloud, CloudRain, CloudDrizzle, CloudSnow, Sun, CloudFog, Zap } from "lucide-react";
import { useWeatherForecast, weatherLabel, irrigationAdvice } from "@/hooks/useWeatherForecast";
import { cn } from "@/lib/utils";

interface Props {
  lat: number | null;
  lng: number | null;
  className?: string;
}

function iconFor(code: number) {
  if (code === 0 || code <= 2) return Sun;
  if (code === 3) return Cloud;
  if (code <= 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77 || (code >= 85 && code <= 86)) return CloudSnow;
  return Zap;
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function WeatherStrip({ lat, lng, className }: Props) {
  const { data, isLoading, isError } = useWeatherForecast(lat, lng);

  if (lat === null || lng === null) return null;

  if (isLoading) {
    return (
      <div className={cn("flex h-[88px] items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 px-3", className)}>
        <Cloud className="h-4 w-4 animate-pulse text-primary-foreground/60" />
        <span className="text-xs text-primary-foreground/70">Cargando clima…</span>
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  const today = data.daily[0];
  const advice = irrigationAdvice(data.daily);
  const TodayIcon = iconFor(today.weatherCode);

  const adviceClasses =
    advice.tone === "warn"
      ? "bg-status-warn/20 text-primary-foreground ring-1 ring-status-warn/40"
      : advice.tone === "info"
      ? "bg-primary-foreground/15 text-primary-foreground"
      : "bg-status-ok/20 text-primary-foreground ring-1 ring-status-ok/30";

  return (
    <div
      className={cn(
        "rounded-xl border border-primary-foreground/15 bg-primary-foreground/8 backdrop-blur-sm px-3.5 py-3",
        className,
      )}
      data-testid="weather-strip"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TodayIcon className="h-5 w-5 text-primary-foreground" />
          <div className="leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular text-primary-foreground">
                {Math.round(today.tMax)}°
              </span>
              <span className="text-xs text-primary-foreground/70 tabular">
                / {Math.round(today.tMin)}°
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70">
              {weatherLabel(today.weatherCode)} · {today.precipProb}% lluvia
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {data.daily.slice(1, 7).map((d) => {
            const I = iconFor(d.weatherCode);
            const dt = new Date(d.date);
            return (
              <div
                key={d.date}
                className="flex flex-col items-center gap-0.5 rounded-md bg-primary-foreground/8 px-1.5 py-1 min-w-[36px]"
                title={`${weatherLabel(d.weatherCode)} · ${d.precipMm.toFixed(1)} mm`}
              >
                <span className="text-[9px] font-medium uppercase tracking-wide text-primary-foreground/70">
                  {DAY_NAMES[dt.getDay()]}
                </span>
                <I className="h-3.5 w-3.5 text-primary-foreground/90" />
                <span className="text-[10px] font-semibold tabular text-primary-foreground">
                  {Math.round(d.tMax)}°
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
          adviceClasses,
        )}
        data-testid="weather-advice"
      >
        <CloudRain className="h-3 w-3" />
        {advice.text}
      </div>
    </div>
  );
}
