import { z } from 'zod';

export interface CropStageDef {
  stageKey: string;
  label: string;
  expectedStartDay: number;
  expectedEndDay: number;
  irrigationNotes?: string;
  taskSuggestions?: string[];
  monitoringSuggestions?: string[];
}

export interface CropDef {
  id: string;
  cropName: string;
  localName?: string;
  defaultUnit: string;
  typicalCycleDays: number;
  stages: CropStageDef[];
  notes?: string;
}

export const CROP_CATALOG: CropDef[] = [
  {
    id: 'tomate',
    cropName: 'Tomate',
    defaultUnit: 'kg',
    typicalCycleDays: 120,
    stages: [
      {
        stageKey: 'almacigo',
        label: 'Almácigo',
        expectedStartDay: 0,
        expectedEndDay: 30,
        irrigationNotes: 'Riegos cortos y frecuentes; mantener cama húmeda.',
        taskSuggestions: ['Preparar bandejas', 'Riego ligero diario'],
        monitoringSuggestions: ['Revisar germinación', 'Detectar damping-off'],
      },
      {
        stageKey: 'trasplante',
        label: 'Trasplante',
        expectedStartDay: 30,
        expectedEndDay: 45,
        irrigationNotes: 'Riego de asentamiento; evitar exceso.',
        taskSuggestions: ['Trasplantar al sitio definitivo', 'Tutorado inicial'],
      },
      {
        stageKey: 'vegetativo',
        label: 'Vegetativo',
        expectedStartDay: 45,
        expectedEndDay: 75,
        irrigationNotes: 'Aumento gradual; sensible a estrés hídrico.',
        taskSuggestions: ['Poda de chupones', 'Fertilización N'],
        monitoringSuggestions: ['Mosca blanca', 'Tizón temprano'],
      },
      {
        stageKey: 'floracion',
        label: 'Floración / cuaje',
        expectedStartDay: 75,
        expectedEndDay: 95,
        irrigationNotes: 'Mantener humedad estable; evitar hongos por exceso.',
        taskSuggestions: ['Fertilización K-P', 'Polinización asistida si invernadero'],
      },
      {
        stageKey: 'fructificacion',
        label: 'Fructificación',
        expectedStartDay: 95,
        expectedEndDay: 120,
        irrigationNotes: 'Riego sostenido; reducir cerca de cosecha.',
        monitoringSuggestions: ['Tuta absoluta', 'Tizón tardío'],
      },
    ],
  },
  {
    id: 'cebolla',
    cropName: 'Cebolla',
    defaultUnit: 'kg',
    typicalCycleDays: 150,
    stages: [
      { stageKey: 'siembra', label: 'Siembra', expectedStartDay: 0, expectedEndDay: 35 },
      { stageKey: 'trasplante', label: 'Trasplante', expectedStartDay: 35, expectedEndDay: 55 },
      {
        stageKey: 'vegetativo',
        label: 'Vegetativo (hojas)',
        expectedStartDay: 55,
        expectedEndDay: 100,
        irrigationNotes: 'Riegos frecuentes hasta bulbificación.',
      },
      {
        stageKey: 'bulbificacion',
        label: 'Bulbificación',
        expectedStartDay: 100,
        expectedEndDay: 135,
        irrigationNotes: 'Reducir riego al iniciar bulbo.',
      },
      {
        stageKey: 'madurez',
        label: 'Madurez / cosecha',
        expectedStartDay: 135,
        expectedEndDay: 150,
        irrigationNotes: 'Suspender riego 10-15 días antes de cosecha.',
      },
    ],
  },
  {
    id: 'papa',
    cropName: 'Papa',
    defaultUnit: 'kg',
    typicalCycleDays: 130,
    stages: [
      { stageKey: 'siembra', label: 'Siembra', expectedStartDay: 0, expectedEndDay: 20 },
      { stageKey: 'emergencia', label: 'Emergencia', expectedStartDay: 20, expectedEndDay: 40 },
      {
        stageKey: 'vegetativo',
        label: 'Vegetativo',
        expectedStartDay: 40,
        expectedEndDay: 70,
        taskSuggestions: ['Aporque', 'Fertilización N'],
      },
      {
        stageKey: 'tuberizacion',
        label: 'Tuberización',
        expectedStartDay: 70,
        expectedEndDay: 110,
        irrigationNotes: 'Etapa crítica: evitar déficit hídrico.',
        monitoringSuggestions: ['Tizón tardío', 'Polilla de la papa'],
      },
      { stageKey: 'madurez', label: 'Madurez', expectedStartDay: 110, expectedEndDay: 130 },
    ],
  },
  {
    id: 'maiz',
    cropName: 'Maíz',
    defaultUnit: 'kg',
    typicalCycleDays: 140,
    stages: [
      { stageKey: 'siembra', label: 'Siembra', expectedStartDay: 0, expectedEndDay: 15 },
      { stageKey: 'emergencia', label: 'Emergencia', expectedStartDay: 15, expectedEndDay: 35 },
      { stageKey: 'vegetativo', label: 'Vegetativo', expectedStartDay: 35, expectedEndDay: 75 },
      {
        stageKey: 'floracion',
        label: 'Floración',
        expectedStartDay: 75,
        expectedEndDay: 95,
        irrigationNotes: 'Etapa crítica para rendimiento; no permitir estrés.',
      },
      { stageKey: 'llenado', label: 'Llenado de grano', expectedStartDay: 95, expectedEndDay: 130 },
      { stageKey: 'madurez', label: 'Madurez', expectedStartDay: 130, expectedEndDay: 140 },
    ],
  },
  {
    id: 'alfalfa',
    cropName: 'Alfalfa',
    defaultUnit: 'kg',
    typicalCycleDays: 365,
    stages: [
      {
        stageKey: 'establecimiento',
        label: 'Establecimiento',
        expectedStartDay: 0,
        expectedEndDay: 60,
      },
      { stageKey: 'corte1', label: 'Corte 1', expectedStartDay: 60, expectedEndDay: 120 },
      { stageKey: 'corte2', label: 'Corte 2', expectedStartDay: 120, expectedEndDay: 180 },
      { stageKey: 'corte3', label: 'Corte 3', expectedStartDay: 180, expectedEndDay: 240 },
      { stageKey: 'corte4', label: 'Corte 4', expectedStartDay: 240, expectedEndDay: 365 },
    ],
  },
  {
    id: 'arveja',
    cropName: 'Arveja',
    defaultUnit: 'kg',
    typicalCycleDays: 100,
    stages: [
      { stageKey: 'siembra', label: 'Siembra', expectedStartDay: 0, expectedEndDay: 15 },
      { stageKey: 'vegetativo', label: 'Vegetativo', expectedStartDay: 15, expectedEndDay: 50 },
      {
        stageKey: 'floracion',
        label: 'Floración',
        expectedStartDay: 50,
        expectedEndDay: 70,
        irrigationNotes: 'Sensible a déficit hídrico.',
      },
      { stageKey: 'llenado', label: 'Llenado de vainas', expectedStartDay: 70, expectedEndDay: 90 },
      { stageKey: 'madurez', label: 'Madurez', expectedStartDay: 90, expectedEndDay: 100 },
    ],
  },
];

export function findCrop(name: string | undefined | null): CropDef | undefined {
  if (!name) return undefined;
  const k = name.toLowerCase().trim();
  return CROP_CATALOG.find(
    (c) => c.id === k || c.cropName.toLowerCase() === k || c.localName?.toLowerCase() === k,
  );
}

export function estimateStage(
  crop: CropDef,
  startDate: string,
  now = new Date(),
): {
  current?: CropStageDef;
  dayOffset: number;
  cycleProgress: number;
  isOverdue: boolean;
} {
  const start = new Date(startDate);
  const dayOffset = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
  const cycleProgress = Math.min(1, dayOffset / crop.typicalCycleDays);
  const current =
    crop.stages.find((s) => dayOffset >= s.expectedStartDay && dayOffset < s.expectedEndDay) ??
    (dayOffset >= crop.typicalCycleDays ? crop.stages[crop.stages.length - 1] : crop.stages[0]);
  const isOverdue = dayOffset > crop.typicalCycleDays + 14;
  return { current, dayOffset, cycleProgress, isOverdue };
}

export const cropCatalogResponseSchema = z.array(
  z.object({
    id: z.string(),
    cropName: z.string(),
    defaultUnit: z.string(),
    typicalCycleDays: z.number(),
    stages: z.array(
      z.object({
        stageKey: z.string(),
        label: z.string(),
        expectedStartDay: z.number(),
        expectedEndDay: z.number(),
        irrigationNotes: z.string().optional(),
        taskSuggestions: z.array(z.string()).optional(),
        monitoringSuggestions: z.array(z.string()).optional(),
      }),
    ),
  }),
);
