import { Cloud, Cpu, FileSpreadsheet, Globe, Image, Plug, Boxes, ShieldCheck } from "lucide-react";
import type { Adapter } from "@shared/schema";

export const ADAPTER_ICONS: Record<string, typeof Cloud> = {
  weather: Cloud,
  iot: Cpu,
  imagery: Image,
  csv: FileSpreadsheet,
  "external-backend": Globe,
};

export const EXPORT_DATASETS = [
  { id: "blocks", label: "Bloques de campo", hint: "Parcelas, estado, cultivo" },
  { id: "greenhouses", label: "Invernaderos", hint: "Área, etapa, ciclo" },
  { id: "tasks", label: "Tareas", hint: "Asignaciones y prioridades" },
  { id: "irrigation-events", label: "Eventos de riego", hint: "Programación y cumplimiento" },
  { id: "observations", label: "Observaciones", hint: "Plagas, incidentes, notas" },
  { id: "inventory", label: "Inventario", hint: "Stock e insumos" },
  { id: "harvest-lots", label: "Lotes de cosecha", hint: "Trazabilidad" },
] as const;

export const IMPORT_DATASETS = [
  { id: "blocks", label: "Bloques de campo" },
  { id: "greenhouses", label: "Invernaderos" },
  { id: "inventory", label: "Inventario" },
  { id: "tasks", label: "Tareas" },
] as const;

export type ImportDatasetId = (typeof IMPORT_DATASETS)[number]["id"];
export type Section = "overview" | "adapters" | "csv";

export const SECTIONS: { id: Section; label: string; icon: typeof Plug; description: string }[] = [
  { id: "overview", label: "Resumen", icon: ShieldCheck, description: "Estado general de integraciones" },
  { id: "adapters", label: "Adaptadores", icon: Plug, description: "Registro y estado por conector" },
  { id: "csv", label: "Importar / Exportar", icon: Boxes, description: "Herramientas CSV" },
];

export function stateToStatus(state: Adapter["state"]): "ok" | "warn" | "critical" | "idle" {
  if (state === "connected") return "ok";
  if (state === "error") return "critical";
  if (state === "disconnected") return "warn";
  return "idle";
}

export function stateLabel(state: Adapter["state"]): string {
  if (state === "connected") return "Conectado";
  if (state === "error") return "Error";
  if (state === "disconnected") return "Desconectado";
  return "Vista previa";
}

export function readinessLabel(r: Adapter["readiness"]): string {
  if (r === "ready") return "Listo para usar";
  if (r === "needs-secrets") return "Requiere configuración";
  return "Solo vista previa";
}

export function readinessBadgeClass(r: Adapter["readiness"]): string {
  if (r === "ready") return "bg-status-ok-soft text-status-ok border-0";
  if (r === "needs-secrets") return "bg-status-warn-soft text-status-warn border-0";
  return "bg-status-idle-soft text-status-idle border-0";
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Nunca verificado";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Hace instantes";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} d`;
}
