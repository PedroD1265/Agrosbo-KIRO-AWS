/**
 * S2 Harness -- Corpus Agricola Sintetico
 *
 * 40 synthetic Spanish phrases covering agricultural operations.
 * All data is fictional -- no real people, farms, or coordinates.
 *
 * DISPOSABLE -- not production code.
 */

import type { CorpusEntry } from './types.js';

export const CORPUS: CorpusEntry[] = [
  // ===== RIEGO (5) =====
  {
    id: 'RIEGO-01',
    category: 'riego',
    text: 'Programar riego del bloque norte para manana a las 6 de la manana',
    criticalTerms: [
      { term: 'riego', type: 'agricultural' },
      { term: 'bloque norte', type: 'location' },
    ],
    expectedNumbers: ['6'],
    expectedUnits: [],
    expectedTemporalRefs: ['manana', '6 de la manana'],
  },
  {
    id: 'RIEGO-02',
    category: 'riego',
    text: 'Aplicar 200 litros por hectarea en el sector 3 durante 45 minutos',
    criticalTerms: [
      { term: 'riego', type: 'agricultural' },
      { term: 'sector 3', type: 'location' },
    ],
    expectedNumbers: ['200', '3', '45'],
    expectedUnits: ['litros', 'hectarea', 'minutos'],
    expectedTemporalRefs: [],
  },
  {
    id: 'RIEGO-03',
    category: 'riego',
    text: 'El riego por goteo del invernadero 2 se completo hoy a las 14 horas',
    criticalTerms: [
      { term: 'riego por goteo', type: 'agricultural' },
      { term: 'invernadero 2', type: 'location' },
    ],
    expectedNumbers: ['2', '14'],
    expectedUnits: ['horas'],
    expectedTemporalRefs: ['hoy', '14 horas'],
  },
  {
    id: 'RIEGO-04',
    category: 'riego',
    text: 'Suspender riego en lote 7 hasta el lunes por saturacion del suelo',
    criticalTerms: [
      { term: 'riego', type: 'agricultural' },
      { term: 'lote 7', type: 'location' },
      { term: 'saturacion', type: 'agricultural' },
    ],
    expectedNumbers: ['7'],
    expectedUnits: [],
    expectedTemporalRefs: ['lunes'],
  },
  {
    id: 'RIEGO-05',
    category: 'riego',
    text: 'Revisar presion de la bomba del sistema de drenaje sector sur',
    criticalTerms: [
      { term: 'bomba', type: 'agricultural' },
      { term: 'drenaje', type: 'agricultural' },
      { term: 'sector sur', type: 'location' },
    ],
    expectedNumbers: [],
    expectedUnits: [],
    expectedTemporalRefs: [],
  },

  // ===== TAREAS (5) =====
  {
    id: 'TAREA-01',
    category: 'tareas',
    text: 'Asignar poda del bloque este a equipo 2 para el miercoles',
    criticalTerms: [
      { term: 'poda', type: 'agricultural' },
      { term: 'bloque este', type: 'location' },
    ],
    expectedNumbers: ['2'],
    expectedUnits: [],
    expectedTemporalRefs: ['miercoles'],
  },
  {
    id: 'TAREA-02',
    category: 'tareas',
    text: 'Completar limpieza de canales en 3 horas antes del viernes',
    criticalTerms: [{ term: 'canales', type: 'agricultural' }],
    expectedNumbers: ['3'],
    expectedUnits: ['horas'],
    expectedTemporalRefs: ['viernes'],
  },
  {
    id: 'TAREA-03',
    category: 'tareas',
    text: 'Registrar aplicacion de fungicida en invernadero 1 con 5 litros por tanque',
    criticalTerms: [
      { term: 'fungicida', type: 'agricultural' },
      { term: 'invernadero 1', type: 'location' },
    ],
    expectedNumbers: ['1', '5'],
    expectedUnits: ['litros'],
    expectedTemporalRefs: [],
  },
  {
    id: 'TAREA-04',
    category: 'tareas',
    text: 'La fumigacion del lote 4 con herbicida se hizo ayer a las 7 de la manana',
    criticalTerms: [
      { term: 'fumigacion', type: 'agricultural' },
      { term: 'herbicida', type: 'agricultural' },
      { term: 'lote 4', type: 'location' },
    ],
    expectedNumbers: ['4', '7'],
    expectedUnits: [],
    expectedTemporalRefs: ['ayer', '7 de la manana'],
  },
  {
    id: 'TAREA-05',
    category: 'tareas',
    text: 'Mover la tarea de fertilizacion al jueves porque llovio mucho',
    criticalTerms: [{ term: 'fertilizacion', type: 'agricultural' }],
    expectedNumbers: [],
    expectedUnits: [],
    expectedTemporalRefs: ['jueves'],
  },

  // ===== INVENTARIO (5) =====
  {
    id: 'INV-01',
    category: 'inventario',
    text: 'Quedan 150 kilos de fertilizante 20-20-20 en bodega principal',
    criticalTerms: [
      { term: 'fertilizante', type: 'agricultural' },
      { term: 'bodega', type: 'location' },
    ],
    expectedNumbers: ['150', '20', '20', '20'],
    expectedUnits: ['kilos'],
    expectedTemporalRefs: [],
  },
  {
    id: 'INV-02',
    category: 'inventario',
    text: 'Recibimos 80 litros de fungicida y 25 kilos de herbicida hoy',
    criticalTerms: [
      { term: 'fungicida', type: 'agricultural' },
      { term: 'herbicida', type: 'agricultural' },
    ],
    expectedNumbers: ['80', '25'],
    expectedUnits: ['litros', 'kilos'],
    expectedTemporalRefs: ['hoy'],
  },
  {
    id: 'INV-03',
    category: 'inventario',
    text: 'Se necesitan 500 metros de manguera para el sector nuevo',
    criticalTerms: [{ term: 'manguera', type: 'agricultural' }],
    expectedNumbers: ['500'],
    expectedUnits: ['metros'],
    expectedTemporalRefs: [],
  },
  {
    id: 'INV-04',
    category: 'inventario',
    text: 'Actualizar stock de semilla de maiz a 320 kilogramos',
    criticalTerms: [
      { term: 'semilla', type: 'agricultural' },
      { term: 'maiz', type: 'agricultural' },
    ],
    expectedNumbers: ['320'],
    expectedUnits: ['kilogramos'],
    expectedTemporalRefs: [],
  },
  {
    id: 'INV-05',
    category: 'inventario',
    text: 'Descontar 12 litros de insecticida del inventario del invernadero 3',
    criticalTerms: [
      { term: 'insecticida', type: 'agricultural' },
      { term: 'invernadero 3', type: 'location' },
    ],
    expectedNumbers: ['12', '3'],
    expectedUnits: ['litros'],
    expectedTemporalRefs: [],
  },

  // ===== COSECHA (5) =====
  {
    id: 'COS-01',
    category: 'cosecha',
    text: 'Registrar cosecha de 2500 kilos de tomate en bloque sur lote 2',
    criticalTerms: [
      { term: 'cosecha', type: 'agricultural' },
      { term: 'tomate', type: 'agricultural' },
      { term: 'bloque sur', type: 'location' },
      { term: 'lote 2', type: 'location' },
    ],
    expectedNumbers: ['2500', '2'],
    expectedUnits: ['kilos'],
    expectedTemporalRefs: [],
  },
  {
    id: 'COS-02',
    category: 'cosecha',
    text: 'La cosecha de ayer del lote 5 fue de 180 kilogramos de pimiento',
    criticalTerms: [
      { term: 'cosecha', type: 'agricultural' },
      { term: 'pimiento', type: 'agricultural' },
      { term: 'lote 5', type: 'location' },
    ],
    expectedNumbers: ['5', '180'],
    expectedUnits: ['kilogramos'],
    expectedTemporalRefs: ['ayer'],
  },
  {
    id: 'COS-03',
    category: 'cosecha',
    text: 'Programar cosecha de lechuga para el sabado en 4 hectareas',
    criticalTerms: [
      { term: 'cosecha', type: 'agricultural' },
      { term: 'lechuga', type: 'agricultural' },
    ],
    expectedNumbers: ['4'],
    expectedUnits: ['hectareas'],
    expectedTemporalRefs: ['sabado'],
  },
  {
    id: 'COS-04',
    category: 'cosecha',
    text: 'Van 750 kilos acumulados de pepino esta semana en invernadero 4',
    criticalTerms: [
      { term: 'pepino', type: 'agricultural' },
      { term: 'invernadero 4', type: 'location' },
    ],
    expectedNumbers: ['750', '4'],
    expectedUnits: ['kilos'],
    expectedTemporalRefs: ['esta semana'],
  },
  {
    id: 'COS-05',
    category: 'cosecha',
    text: 'Cerrar lote de cosecha numero 15 con rendimiento de 3200 kilos por hectarea',
    criticalTerms: [
      { term: 'cosecha', type: 'agricultural' },
      { term: 'rendimiento', type: 'agricultural' },
    ],
    expectedNumbers: ['15', '3200'],
    expectedUnits: ['kilos', 'hectarea'],
    expectedTemporalRefs: [],
  },

  // ===== SIEMBRA (4) =====
  {
    id: 'SIEM-01',
    category: 'siembra',
    text: 'Iniciar siembra de maiz en bloque oeste con 25 kilos de semilla por hectarea',
    criticalTerms: [
      { term: 'siembra', type: 'agricultural' },
      { term: 'maiz', type: 'agricultural' },
      { term: 'bloque oeste', type: 'location' },
    ],
    expectedNumbers: ['25'],
    expectedUnits: ['kilos', 'hectarea'],
    expectedTemporalRefs: [],
  },
  {
    id: 'SIEM-02',
    category: 'siembra',
    text: 'La siembra del sector 5 se completo el martes en 8 hectareas',
    criticalTerms: [
      { term: 'siembra', type: 'agricultural' },
      { term: 'sector 5', type: 'location' },
    ],
    expectedNumbers: ['5', '8'],
    expectedUnits: ['hectareas'],
    expectedTemporalRefs: ['martes'],
  },
  {
    id: 'SIEM-03',
    category: 'siembra',
    text: 'Preparar terreno para siembra de frijol la proxima semana en 3 lotes',
    criticalTerms: [
      { term: 'siembra', type: 'agricultural' },
      { term: 'frijol', type: 'agricultural' },
    ],
    expectedNumbers: ['3'],
    expectedUnits: ['lotes'],
    expectedTemporalRefs: ['proxima semana'],
  },
  {
    id: 'SIEM-04',
    category: 'siembra',
    text: 'Registrar floracion en bloque norte a los 45 dias de la siembra',
    criticalTerms: [
      { term: 'floracion', type: 'agricultural' },
      { term: 'siembra', type: 'agricultural' },
      { term: 'bloque norte', type: 'location' },
    ],
    expectedNumbers: ['45'],
    expectedUnits: ['dias'],
    expectedTemporalRefs: [],
  },

  // ===== OBSERVACIONES (5) =====
  {
    id: 'OBS-01',
    category: 'observaciones',
    text: 'Se observan manchas amarillas en hojas del lote 3 posible deficiencia de nitrogeno',
    criticalTerms: [
      { term: 'manchas', type: 'agricultural' },
      { term: 'deficiencia', type: 'agricultural' },
      { term: 'nitrogeno', type: 'agricultural' },
      { term: 'lote 3', type: 'location' },
    ],
    expectedNumbers: ['3'],
    expectedUnits: [],
    expectedTemporalRefs: [],
  },
  {
    id: 'OBS-02',
    category: 'observaciones',
    text: 'Detectar presencia de mosca blanca en invernadero 2 nivel medio',
    criticalTerms: [
      { term: 'mosca blanca', type: 'agricultural' },
      { term: 'invernadero 2', type: 'location' },
    ],
    expectedNumbers: ['2'],
    expectedUnits: [],
    expectedTemporalRefs: [],
  },
  {
    id: 'OBS-03',
    category: 'observaciones',
    text: 'El suelo del bloque este tiene humedad al 65 por ciento despues de la lluvia de ayer',
    criticalTerms: [
      { term: 'humedad', type: 'agricultural' },
      { term: 'bloque este', type: 'location' },
    ],
    expectedNumbers: ['65'],
    expectedUnits: ['por ciento'],
    expectedTemporalRefs: ['ayer'],
  },
  {
    id: 'OBS-04',
    category: 'observaciones',
    text: 'Temperatura en invernadero 1 alcanzo 38 grados a las 13 horas',
    criticalTerms: [{ term: 'invernadero 1', type: 'location' }],
    expectedNumbers: ['1', '38', '13'],
    expectedUnits: ['grados', 'horas'],
    expectedTemporalRefs: ['13 horas'],
  },
  {
    id: 'OBS-05',
    category: 'observaciones',
    text: 'Reportar dano por granizo en 2 hectareas del sector norte desde esta manana',
    criticalTerms: [
      { term: 'granizo', type: 'agricultural' },
      { term: 'sector norte', type: 'location' },
    ],
    expectedNumbers: ['2'],
    expectedUnits: ['hectareas'],
    expectedTemporalRefs: ['esta manana'],
  },

  // ===== CONSULTAS (4) =====
  {
    id: 'CONS-01',
    category: 'consultas',
    text: 'Cual es el estado del riego en el bloque norte hoy',
    criticalTerms: [
      { term: 'riego', type: 'agricultural' },
      { term: 'bloque norte', type: 'location' },
    ],
    expectedNumbers: [],
    expectedUnits: [],
    expectedTemporalRefs: ['hoy'],
  },
  {
    id: 'CONS-02',
    category: 'consultas',
    text: 'Cuantos kilos de tomate se cosecharon esta semana en total',
    criticalTerms: [
      { term: 'cosecha', type: 'agricultural' },
      { term: 'tomate', type: 'agricultural' },
    ],
    expectedNumbers: [],
    expectedUnits: ['kilos'],
    expectedTemporalRefs: ['esta semana'],
  },
  {
    id: 'CONS-03',
    category: 'consultas',
    text: 'Que tareas quedan pendientes para manana en el invernadero 2',
    criticalTerms: [{ term: 'invernadero 2', type: 'location' }],
    expectedNumbers: ['2'],
    expectedUnits: [],
    expectedTemporalRefs: ['manana'],
  },
  {
    id: 'CONS-04',
    category: 'consultas',
    text: 'Mostrar resumen de aplicaciones de la ultima semana por bloque',
    criticalTerms: [{ term: 'aplicaciones', type: 'agricultural' }],
    expectedNumbers: [],
    expectedUnits: [],
    expectedTemporalRefs: ['ultima semana'],
  },

  // ===== CONFIRMACIONES (4) =====
  {
    id: 'CONF-01',
    category: 'confirmaciones',
    text: 'Si confirmo el registro de 300 kilos de cosecha en lote 6',
    criticalTerms: [
      { term: 'cosecha', type: 'agricultural' },
      { term: 'lote 6', type: 'location' },
    ],
    expectedNumbers: ['300', '6'],
    expectedUnits: ['kilos'],
    expectedTemporalRefs: [],
  },
  {
    id: 'CONF-02',
    category: 'confirmaciones',
    text: 'Correcto eso es todo por ahora guardar los cambios',
    criticalTerms: [],
    expectedNumbers: [],
    expectedUnits: [],
    expectedTemporalRefs: [],
  },
  {
    id: 'CONF-03',
    category: 'confirmaciones',
    text: 'Aprobado iniciar la fumigacion en bloque sur con 10 litros de producto',
    criticalTerms: [
      { term: 'fumigacion', type: 'agricultural' },
      { term: 'bloque sur', type: 'location' },
    ],
    expectedNumbers: ['10'],
    expectedUnits: ['litros'],
    expectedTemporalRefs: [],
  },
  {
    id: 'CONF-04',
    category: 'confirmaciones',
    text: 'De acuerdo programar para las 5 de la tarde del domingo',
    criticalTerms: [],
    expectedNumbers: ['5'],
    expectedUnits: [],
    expectedTemporalRefs: ['5 de la tarde', 'domingo'],
  },

  // ===== CANCELACIONES (3) =====
  {
    id: 'CANC-01',
    category: 'cancelaciones',
    text: 'Cancelar la tarea de riego del bloque este programada para hoy',
    criticalTerms: [
      { term: 'riego', type: 'agricultural' },
      { term: 'bloque este', type: 'location' },
    ],
    expectedNumbers: [],
    expectedUnits: [],
    expectedTemporalRefs: ['hoy'],
  },
  {
    id: 'CANC-02',
    category: 'cancelaciones',
    text: 'No cancelar eso volver al paso anterior',
    criticalTerms: [],
    expectedNumbers: [],
    expectedUnits: [],
    expectedTemporalRefs: [],
  },
  {
    id: 'CANC-03',
    category: 'cancelaciones',
    text: 'Descartar el registro de 50 kilos que acabo de dictar fue un error',
    criticalTerms: [],
    expectedNumbers: ['50'],
    expectedUnits: ['kilos'],
    expectedTemporalRefs: [],
  },
];

// Validate corpus has exactly 40 entries
if (CORPUS.length !== 40) {
  throw new Error(`Corpus must have exactly 40 entries, got ${CORPUS.length}`);
}
