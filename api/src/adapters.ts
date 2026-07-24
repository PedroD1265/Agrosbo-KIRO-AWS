/**
 * Adapter Registry — in-memory stub registry for the Integration Workbench.
 * Real adapters (weather, IoT, imagery, external-backend) are not yet wired
 * to external services. This module is intentionally self-contained so that
 * future integration work only needs to replace/extend the handlers here.
 */

import type {
  Adapter,
  AdapterTestResult,
} from "@agrosbo/shared/schema.js";

const registry = new Map<string, Adapter>([
  [
    "weather",
    {
      id: "weather",
      name: "Clima / Meteorología",
      type: "weather",
      state: "stub",
      description:
        "Pronóstico y observaciones meteorológicas locales. Planificado para integrar Open-Meteo o similar para riego adaptativo.",
      capabilities: ["forecast-7d", "hourly-temp", "rain-probability", "wind-speed"],
      readiness: "needs-secrets",
      requiresSecrets: true,
      enabled: false,
      lastCheckAt: null,
    },
  ],
  [
    "iot",
    {
      id: "iot",
      name: "Sensores / IoT",
      type: "iot",
      state: "stub",
      description:
        "Telemetría continua de temperatura, humedad de suelo y estaciones de riego en invernaderos y bloques de campo.",
      capabilities: ["soil-moisture", "air-temp", "humidity", "irrigation-flow"],
      readiness: "needs-secrets",
      requiresSecrets: true,
      enabled: false,
      lastCheckAt: null,
    },
  ],
  [
    "imagery",
    {
      id: "imagery",
      name: "Imágenes / Drones",
      type: "imagery",
      state: "stub",
      description:
        "NDVI, ortomosaicos y vuelos periódicos por bloque. Compatible con DJI Terra y Pix4D.",
      capabilities: ["ndvi", "orthomosaic", "flight-schedule", "change-detection"],
      readiness: "needs-secrets",
      requiresSecrets: true,
      enabled: false,
      lastCheckAt: null,
    },
  ],
  [
    "csv",
    {
      id: "csv",
      name: "Import / Export CSV",
      type: "csv",
      state: "connected",
      description:
        "Importación masiva de catálogos (bloques, invernaderos, insumos, tareas) y exportación de reportes operativos en formato CSV estándar.",
      capabilities: [
        "export-blocks",
        "export-greenhouses",
        "export-tasks",
        "export-irrigation",
        "export-observations",
        "export-inventory",
        "export-harvest",
        "import-blocks",
        "import-greenhouses",
        "import-inventory",
        "import-tasks",
      ],
      readiness: "ready",
      requiresSecrets: false,
      enabled: true,
      lastCheckAt: new Date().toISOString(),
    },
  ],
  [
    "external-backend",
    {
      id: "external-backend",
      name: "Backend externo",
      type: "external-backend",
      state: "stub",
      description:
        "Sincronización maestra con backend de producción AgrosBO cuando esté disponible. Soportará multi-dispositivo y persistencia centralizada.",
      capabilities: ["multi-device-sync", "central-persistence", "audit-log"],
      readiness: "needs-secrets",
      requiresSecrets: true,
      enabled: false,
      lastCheckAt: null,
    },
  ],
]);

export function listAdapters(): Adapter[] {
  return Array.from(registry.values());
}

export function getAdapter(id: string): Adapter | undefined {
  return registry.get(id);
}

export function setEnabled(id: string, enabled: boolean): Adapter | undefined {
  const adapter = registry.get(id);
  if (!adapter) return undefined;
  if (adapter.requiresSecrets && enabled) {
    return undefined;
  }
  const updated: Adapter = { ...adapter, enabled };
  registry.set(id, updated);
  return updated;
}

export function runAdapterTest(id: string): AdapterTestResult | undefined {
  const adapter = registry.get(id);
  if (!adapter) return undefined;

  const checkedAt = new Date().toISOString();
  const updated: Adapter = { ...adapter, lastCheckAt: checkedAt };
  registry.set(id, updated);

  if (adapter.type === "csv") {
    return {
      success: true,
      message: "Adaptador CSV operativo. Exportación e importación disponibles.",
      checkedAt,
      details: {
        exportDatasets: 7,
        importDatasets: 4,
        encoding: "UTF-8",
        delimiter: ",",
      },
    };
  }

  return {
    success: false,
    message: `Adaptador "${adapter.name}" es un stub — no hay conexión real configurada todavía.`,
    checkedAt,
    details: {
      state: "stub",
      requiresSecrets: adapter.requiresSecrets,
      readiness: adapter.readiness,
    },
  };
}
