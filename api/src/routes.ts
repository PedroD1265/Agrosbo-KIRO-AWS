import { Router, type Request, type Response, type NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { storage, InventoryStockError } from './storage.js';
import {
  insertBlockSchema,
  insertGreenhouseSchema,
  insertCampaignSchema,
  insertIrrigationEventSchema,
  insertTaskSchema,
  insertObservationSchema,
  insertInventoryItemSchema,
  insertHarvestLotSchema,
  settingsSchema,
  taskStatusSchema,
  updateBlockSchema,
  updateGreenhouseSchema,
  updateCampaignSchema,
  updateTaskSchema,
  updateIrrigationEventSchema,
  updateInventoryItemSchema,
  updateHarvestLotSchema,
  exportDatasetSchema,
  importDatasetSchema,
} from '@agrosbo/shared/schema.js';
import { listAdapters, getAdapter, setEnabled, runAdapterTest } from './adapters.js';
import {
  blocksToCSV,
  greenhousesToCSV,
  tasksToCSV,
  irrigationEventsToCSV,
  observationsToCSV,
  inventoryToCSV,
  harvestLotsToCSV,
  parseAndImport,
} from './csv.js';
import { claim, complete, release, claimTx, completeTx } from './idempotency.js';
import { usesTransactionalDatabaseStorage } from './storage.js';
import type { IStorage } from './storage.js';
import type { DbStorage } from './dbStorage.js';
import { db } from './db.js';
import {
  requireDatabaseExecutor,
  isTransactionalStorage,
  DatabaseRequiredError,
} from './executor.js';

declare module 'express-serve-static-core' {
  interface Request {
    storage?: IStorage;
  }
}

class IdempotencyAbortError extends Error {
  constructor(public reason: string) {
    super(`Idempotency abort: ${reason}`);
  }
}

export function getStorage(req: Request): IStorage {
  return req.storage ?? storage;
}

const apiLog = createLogger('routes');

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function notFound(res: Response, entityName: string) {
  return res.status(404).json({ error: `${entityName} no encontrado` });
}

function idemKey(req: Request): string | null {
  const k = req.header('x-idempotency-key');
  if (!k) return null;
  return `${req.method}:${req.baseUrl}${req.path}:${k}`;
}

function idempotent(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return asyncHandler(async (req, res, next) => {
    const key = idemKey(req);
    if (!key) {
      return fn(req, res, next);
    }

    if (!usesTransactionalDatabaseStorage()) {
      const claimResult = await claim(key);

      if (claimResult.type === 'completed') {
        res.setHeader('X-Idempotent-Replay', '1');
        // Replay: 204 responses have a null body
        if (claimResult.body === null) {
          return res.status(claimResult.status).end();
        }
        return res.status(claimResult.status).json(claimResult.body);
      }
      if (claimResult.type === 'processing') {
        res.setHeader('Retry-After', '2');
        return res.status(409).json({
          error: 'Solicitud duplicada en proceso',
          code: 'IDEMPOTENCY_IN_PROGRESS',
        });
      }
      if (claimResult.type === 'unavailable') {
        res.setHeader('Retry-After', '5');
        return res.status(503).json({
          error: 'Servicio de idempotencia no disponible. Reintentar.',
        });
      }

      const token = claimResult.token;
      let captured: { status: number; body: unknown } | null = null;
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      const originalEnd = res.end.bind(res);

      res.json = ((body: unknown) => {
        captured = { status: res.statusCode, body };
        return res;
      }) as Response['json'];
      res.send = ((body?: unknown) => {
        if (!captured) captured = { status: res.statusCode, body: body ?? null };
        return res;
      }) as Response['send'];
      res.end = ((...args: unknown[]) => {
        if (!captured) captured = { status: res.statusCode, body: null };
        return (originalEnd as (...a: unknown[]) => Response)(...args);
      }) as unknown as Response['end'];

      let handlerError: unknown = null;
      try {
        await fn(req, res, next);
      } catch (err) {
        handlerError = err;
      }
      res.json = originalJson;
      res.send = originalSend;
      res.end = originalEnd as Response['end'];

      const cap = captured as { status: number; body: unknown } | null;
      if (handlerError || !cap) {
        await release(key, token);
        if (handlerError) throw handlerError;
        return;
      }

      if (cap.status >= 500) {
        await release(key, token);
        if (cap.body === null) return res.status(cap.status).end();
        return res.status(cap.status).json(cap.body);
      }

      try {
        await complete(key, token, cap.status, cap.body);
      } catch (err) {
        apiLog.error('idempotency complete failed', { err });
        await release(key, token);
        res.setHeader('Retry-After', '5');
        return res.status(503).json({
          error: 'Servicio de idempotencia no disponible. Reintentar.',
        });
      }

      if (cap.body === null) return res.status(cap.status).end();
      return res.status(cap.status).json(cap.body);
    }

    const currentStorage = req.storage ?? storage;
    const respHolder: {
      current: {
        status: number;
        body: unknown;
        headers?: Record<string, string>;
      } | null;
    } = { current: null };

    try {
      await (currentStorage as DbStorage).withTransaction(async (txStorage, tx) => {
        const claimResult = await claimTx(tx, key);

        if (claimResult.type === 'completed') {
          respHolder.current = {
            status: claimResult.status,
            body: claimResult.body,
            headers: { 'X-Idempotent-Replay': '1' },
          };
          return;
        }

        if (claimResult.type === 'processing') {
          respHolder.current = {
            status: 409,
            body: {
              error: 'Solicitud duplicada en proceso',
              code: 'IDEMPOTENCY_IN_PROGRESS',
            },
            headers: { 'Retry-After': '2' },
          };
          throw new IdempotencyAbortError('processing');
        }

        if (claimResult.type === 'unavailable') {
          respHolder.current = {
            status: 503,
            body: { error: 'Servicio de idempotencia no disponible. Reintentar.' },
            headers: { 'Retry-After': '5' },
          };
          throw new IdempotencyAbortError('unavailable');
        }

        const token = claimResult.token;
        req.storage = txStorage;

        let captured: { status: number; body: unknown } | null = null;
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        const originalEnd = res.end.bind(res);

        res.json = ((body: unknown) => {
          captured = { status: res.statusCode, body };
          return res;
        }) as Response['json'];
        res.send = ((body?: unknown) => {
          if (!captured) captured = { status: res.statusCode, body: body ?? null };
          return res;
        }) as Response['send'];
        res.end = ((...args: unknown[]) => {
          if (!captured) captured = { status: res.statusCode, body: null };
          return (originalEnd as (...a: unknown[]) => Response)(...args);
        }) as unknown as Response['end'];

        let handlerError: unknown = null;
        try {
          await fn(req, res, next);
        } catch (err) {
          handlerError = err;
        } finally {
          res.json = originalJson;
          res.send = originalSend;
          res.end = originalEnd as Response['end'];
        }

        if (handlerError) {
          throw handlerError;
        }

        const cap = captured as { status: number; body: unknown } | null;
        if (!cap || cap.status >= 500) {
          throw new Error(`Handler error or no response: ${cap?.status}`);
        }

        await completeTx(tx, key, token, cap.status, cap.body);
        respHolder.current = { status: cap.status, body: cap.body };
      });

      if (respHolder.current) {
        if (respHolder.current.headers) {
          for (const [h, v] of Object.entries(respHolder.current.headers)) {
            res.setHeader(h, v);
          }
        }
        // 204 responses have null body
        if (respHolder.current.body === null) {
          return res.status(respHolder.current.status).end();
        }
        return res.status(respHolder.current.status).json(respHolder.current.body);
      }
    } catch (err) {
      if (err instanceof IdempotencyAbortError) {
        if (respHolder.current) {
          if (respHolder.current.headers) {
            for (const [h, v] of Object.entries(respHolder.current.headers)) {
              res.setHeader(h, v);
            }
          }
          return res.status(respHolder.current.status).json(respHolder.current.body);
        }
      }
      throw err;
    }
  });
}
import { createLogger } from './logger.js';
import { getForecast } from './weather.js';
import { deriveAlerts } from './alertsEngine.js';
import { buildCampaignSummary } from './campaignSummary.js';
import {
  insertFieldApplicationSchema,
  insertApiarySchema,
  insertHiveSchema,
  insertHiveInspectionSchema,
  insertHoneyHarvestSchema,
} from '@agrosbo/shared/schema.js';
import { listApplications, createApplication, InventoryItemNotFoundError } from './applications.js';
import {
  listApiaries,
  createApiary,
  listHives,
  createHive,
  listInspections,
  createInspection,
  HiveInventoryItemNotFoundError,
  listHoneyHarvests,
  createHoneyHarvest,
} from './beekeeping.js';
import { CROP_CATALOG } from '@agrosbo/shared/cropCatalog.js';
import { buildIrrigationAdvice } from './irrigationAdvisor.js';
import {
  insertAttachmentSchema,
  insertExpenseSchema,
  insertLaborCostSchema,
  insertUserSchema,
  attachmentEntityTypeSchema,
  expenseCategorySchema,
} from '@agrosbo/shared/schema.js';
import {
  listAttachments,
  createAttachment,
  deleteAttachment,
  AttachmentValidationError,
} from './attachments.js';
import {
  listExpenses,
  createExpense,
  deleteExpense,
  listLaborCosts,
  createLaborCost,
  costsForCampaign,
  costsForScope,
} from './expenses.js';
import { listUsers, createUser, getUserByLogin, verifyPassword } from './users.js';
import {
  requireAuth,
  requireRole,
  setSessionCookie,
  clearSessionCookie,
  revokeToken,
  COOKIE_NAME,
} from './auth.js';
import { env } from './env.js';
import {
  applicationsCSV,
  carenciaActivaCSV,
  expensesCSV,
  laborCSV,
  apiariesCSV,
  hivesCSV,
  inspectionsCSV,
  honeyHarvestsCSV,
} from './reports.js';

export function registerRoutes(router: Router) {
  // Health endpoints registered separately via registerHealthRoutes (health.ts).

  /* Blocks */
  router.get(
    '/blocks',
    asyncHandler(async (req, res) => res.json(await getStorage(req).listBlocks())),
  );
  router.get(
    '/blocks/:id',
    asyncHandler(async (req, res) => {
      const b = await getStorage(req).getBlock(req.params.id as string);
      if (!b) return res.status(404).json({ error: 'Bloque no encontrado' });
      res.json(b);
    }),
  );
  router.post(
    '/blocks',
    idempotent(async (req, res) => {
      const data = insertBlockSchema.parse(req.body);
      res.status(201).json(await getStorage(req).createBlock(data));
    }),
  );
  router.patch(
    '/blocks/:id',
    idempotent(async (req, res) => {
      const data = updateBlockSchema.parse(req.body);
      const updated = await getStorage(req).updateBlock(String(req.params.id as string), data);
      if (!updated) return notFound(res, 'Bloque');
      res.json(updated);
    }),
  );
  router.delete(
    '/blocks/:id',
    idempotent(async (req, res) => {
      const ok = await getStorage(req).deleteBlock(String(req.params.id as string));
      if (!ok) return notFound(res, 'Bloque');
      res.json({ ok: true });
    }),
  );

  /* Greenhouses */
  router.get(
    '/greenhouses',
    asyncHandler(async (req, res) => res.json(await getStorage(req).listGreenhouses())),
  );
  router.get(
    '/greenhouses/:id',
    asyncHandler(async (req, res) => {
      const g = await getStorage(req).getGreenhouse(req.params.id as string);
      if (!g) return res.status(404).json({ error: 'Invernadero no encontrado' });
      res.json(g);
    }),
  );
  router.post(
    '/greenhouses',
    idempotent(async (req, res) => {
      const data = insertGreenhouseSchema.parse(req.body);
      res.status(201).json(await getStorage(req).createGreenhouse(data));
    }),
  );
  router.patch(
    '/greenhouses/:id',
    idempotent(async (req, res) => {
      const data = updateGreenhouseSchema.parse(req.body);
      const updated = await getStorage(req).updateGreenhouse(String(req.params.id as string), data);
      if (!updated) return notFound(res, 'Invernadero');
      res.json(updated);
    }),
  );
  router.delete(
    '/greenhouses/:id',
    idempotent(async (req, res) => {
      const ok = await getStorage(req).deleteGreenhouse(String(req.params.id as string));
      if (!ok) return notFound(res, 'Invernadero');
      res.json({ ok: true });
    }),
  );

  /* Campaigns */
  router.get(
    '/campaigns',
    asyncHandler(async (req, res) => res.json(await getStorage(req).listCampaigns())),
  );
  router.post(
    '/campaigns',
    idempotent(async (req, res) => {
      const data = insertCampaignSchema.parse(req.body);
      res.status(201).json(await getStorage(req).createCampaign(data));
    }),
  );
  router.get(
    '/campaigns/:id/summary',
    asyncHandler(async (req, res) => {
      const id = String(req.params.id as string);
      const campaigns = await getStorage(req).listCampaigns();
      const campaign = campaigns.find((c) => c.id === id);
      if (!campaign) return notFound(res, 'Campaña');
      const [tasks, irrigation, observations, harvest, movements] = await Promise.all([
        storage.listTasks(),
        storage.listIrrigationEvents(),
        storage.listObservations(),
        storage.listHarvestLots(),
        storage.listInventoryMovements(),
      ]);
      res.json(
        buildCampaignSummary({ campaign, tasks, irrigation, observations, harvest, movements }),
      );
    }),
  );
  router.patch(
    '/campaigns/:id',
    idempotent(async (req, res) => {
      const data = updateCampaignSchema.parse(req.body);
      const updated = await getStorage(req).updateCampaign(String(req.params.id as string), data);
      if (!updated) return notFound(res, 'Campaña');
      res.json(updated);
    }),
  );
  router.delete(
    '/campaigns/:id',
    idempotent(async (req, res) => {
      const ok = await getStorage(req).deleteCampaign(String(req.params.id as string));
      if (!ok) return notFound(res, 'Campaña');
      res.json({ ok: true });
    }),
  );

  /* Irrigation */
  router.get(
    '/irrigation-events',
    asyncHandler(async (req, res) => res.json(await getStorage(req).listIrrigationEvents())),
  );
  router.post(
    '/irrigation-events',
    idempotent(async (req, res) => {
      const data = insertIrrigationEventSchema.parse(req.body);
      res.status(201).json(await getStorage(req).createIrrigationEvent(data));
    }),
  );
  router.post(
    '/irrigation-events/:id/done',
    idempotent(async (req, res) => {
      const ev = await getStorage(req).markIrrigationDone(String(req.params.id as string));
      if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
      res.json(ev);
    }),
  );
  router.patch(
    '/irrigation-events/:id',
    idempotent(async (req, res) => {
      const data = updateIrrigationEventSchema.parse(req.body);
      const updated = await getStorage(req).updateIrrigationEvent(
        String(req.params.id as string),
        data,
      );
      if (!updated) return notFound(res, 'Evento de riego');
      res.json(updated);
    }),
  );
  router.delete(
    '/irrigation-events/:id',
    idempotent(async (req, res) => {
      const ok = await getStorage(req).deleteIrrigationEvent(String(req.params.id as string));
      if (!ok) return notFound(res, 'Evento de riego');
      res.json({ ok: true });
    }),
  );

  /* Tasks */
  router.get(
    '/tasks',
    asyncHandler(async (req, res) => res.json(await getStorage(req).listTasks())),
  );
  router.post(
    '/tasks',
    idempotent(async (req, res) => {
      const data = insertTaskSchema.parse(req.body);
      res.status(201).json(await getStorage(req).createTask(data));
    }),
  );
  router.patch(
    '/tasks/:id/status',
    idempotent(async (req, res) => {
      const { status } = z.object({ status: taskStatusSchema }).parse(req.body);
      const updated = await getStorage(req).updateTaskStatus(
        String(req.params.id as string),
        status,
      );
      if (!updated) return res.status(404).json({ error: 'Tarea no encontrada' });
      res.json(updated);
    }),
  );
  router.patch(
    '/tasks/:id',
    idempotent(async (req, res) => {
      const data = updateTaskSchema.parse(req.body);
      const updated = await getStorage(req).updateTask(String(req.params.id as string), data);
      if (!updated) return notFound(res, 'Tarea');
      res.json(updated);
    }),
  );
  router.delete(
    '/tasks/:id',
    idempotent(async (req, res) => {
      const ok = await getStorage(req).deleteTask(String(req.params.id as string));
      if (!ok) return notFound(res, 'Tarea');
      res.json({ ok: true });
    }),
  );

  /* Observations */
  router.get(
    '/observations',
    asyncHandler(async (req, res) => res.json(await getStorage(req).listObservations())),
  );
  router.post(
    '/observations',
    idempotent(async (req, res) => {
      const data = insertObservationSchema.parse(req.body);
      res.status(201).json(await getStorage(req).createObservation(data));
    }),
  );
  router.delete(
    '/observations/:id',
    idempotent(async (req, res) => {
      const ok = await getStorage(req).deleteObservation(String(req.params.id as string));
      if (!ok) return notFound(res, 'Observación');
      res.json({ ok: true });
    }),
  );

  router.post(
    '/observations/:id/tasks',
    idempotent(async (req, res) => {
      const obsId = String(req.params.id as string);
      const observations = await getStorage(req).listObservations();
      const obs = observations.find((o) => o.id === obsId);
      if (!obs) return notFound(res, 'Observación');
      const body = z
        .object({
          title: z.string().min(1).optional(),
          assignee: z.string().min(1),
          dueDate: z.string(),
          priority: z.enum(['low', 'med', 'high']).default('med'),
          notes: z.string().optional(),
        })
        .parse(req.body);
      const task = await getStorage(req).createTask({
        title: body.title ?? `Atender: ${obs.text.slice(0, 60)}`,
        scopeType: obs.scopeType,
        scopeId: obs.scopeId,
        assignee: body.assignee,
        dueDate: body.dueDate,
        priority: body.priority,
        status: 'pending',
        notes: body.notes,
        sourceObservationId: obs.id,
      });
      res.status(201).json(task);
    }),
  );

  /* Inventory */
  router.get(
    '/inventory',
    asyncHandler(async (req, res) => res.json(await getStorage(req).listInventory())),
  );
  router.post(
    '/inventory',
    requireRole('admin', 'tecnico', 'encargado'),
    idempotent(async (req, res) => {
      const data = insertInventoryItemSchema.parse(req.body);
      res.status(201).json(await getStorage(req).createInventoryItem(data));
    }),
  );
  router.patch(
    '/inventory/:id',
    requireRole('admin', 'tecnico', 'encargado'),
    idempotent(async (req, res) => {
      const body = z
        .object({
          delta: z.number().refine((v) => Number.isFinite(v) && v !== 0, 'delta != 0'),
          lastMovement: z.string().optional(),
          note: z.string().optional(),
          unitCost: z.number().nonnegative().optional(),
          currency: z.string().min(1).max(8).optional(),
          scopeType: z.enum(['block', 'greenhouse']).optional(),
          scopeId: z.string().optional(),
          taskId: z.string().optional(),
        })
        .parse(req.body);
      const at = body.lastMovement
        ? new Date(`${body.lastMovement}T00:00:00.000Z`).toISOString()
        : undefined;
      try {
        const result = await getStorage(req).createInventoryMovement({
          itemId: String(req.params.id as string),
          delta: body.delta,
          note: body.note,
          unitCost: body.unitCost,
          currency: body.currency,
          scopeType: body.scopeType,
          scopeId: body.scopeId,
          taskId: body.taskId,
          at,
        });
        if (!result) return res.status(404).json({ error: 'Insumo no encontrado' });
        res.json(result.item);
      } catch (err) {
        if (err instanceof InventoryStockError) {
          return res.status(409).json({ error: err.message });
        }
        throw err;
      }
    }),
  );
  router.get(
    '/inventory/:id/movements',
    asyncHandler(async (req, res) => {
      const movs = await getStorage(req).listInventoryMovements(String(req.params.id as string));
      res.json(movs);
    }),
  );
  router.get(
    '/inventory-movements',
    asyncHandler(async (req, res) => {
      res.json(await getStorage(req).listInventoryMovements());
    }),
  );
  router.patch(
    '/inventory/:id/edit',
    requireRole('admin', 'tecnico', 'encargado'),
    idempotent(async (req, res) => {
      const data = updateInventoryItemSchema.parse(req.body);
      const updated = await getStorage(req).updateInventoryItem(
        String(req.params.id as string),
        data,
      );
      if (!updated) return notFound(res, 'Insumo');
      res.json(updated);
    }),
  );
  router.delete(
    '/inventory/:id',
    requireRole('admin', 'tecnico', 'encargado'),
    idempotent(async (req, res) => {
      const ok = await getStorage(req).deleteInventoryItem(String(req.params.id as string));
      if (!ok) return notFound(res, 'Insumo');
      res.json({ ok: true });
    }),
  );

  /* Harvest */
  router.get(
    '/harvest-lots',
    asyncHandler(async (req, res) => res.json(await getStorage(req).listHarvestLots())),
  );
  router.post(
    '/harvest-lots',
    requireRole('admin', 'tecnico', 'encargado'),
    idempotent(async (req, res) => {
      const data = insertHarvestLotSchema.parse(req.body);
      res.status(201).json(await getStorage(req).createHarvestLot(data));
    }),
  );
  router.patch(
    '/harvest-lots/:id',
    requireRole('admin', 'tecnico', 'encargado'),
    idempotent(async (req, res) => {
      const data = updateHarvestLotSchema.parse(req.body);
      const updated = await getStorage(req).updateHarvestLot(String(req.params.id as string), data);
      if (!updated) return notFound(res, 'Lote');
      res.json(updated);
    }),
  );
  router.delete(
    '/harvest-lots/:id',
    requireRole('admin', 'tecnico', 'encargado'),
    idempotent(async (req, res) => {
      const ok = await getStorage(req).deleteHarvestLot(String(req.params.id as string));
      if (!ok) return notFound(res, 'Lote');
      res.json({ ok: true });
    }),
  );

  /* Weather */
  router.get(
    '/weather/forecast',
    asyncHandler(async (req, res) => {
      const { lat, lng } = z
        .object({
          lat: z.coerce.number().min(-90).max(90),
          lng: z.coerce.number().min(-180).max(180),
        })
        .parse(req.query);
      try {
        const forecast = await getForecast(lat, lng);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(forecast);
      } catch (err) {
        const reqLog = (req as Request).log ?? apiLog;
        reqLog.warn('weather forecast unavailable', { err: (err as Error).message });
        res.status(503).json({ error: 'Pronóstico no disponible' });
      }
    }),
  );

  /* Alerts â€” derived from current state via rules engine */
  router.get(
    '/alerts',
    asyncHandler(async (req, res) => {
      const [blocks, greenhouses, inventory, irrigation, observations, tasks, applications, hives] =
        await Promise.all([
          storage.listBlocks(),
          storage.listGreenhouses(),
          storage.listInventory(),
          storage.listIrrigationEvents(),
          storage.listObservations(),
          storage.listTasks(),
          listApplications().catch(() => []),
          listHives().catch(() => []),
        ]);
      res.json(
        deriveAlerts({
          blocks,
          greenhouses,
          inventory,
          irrigation,
          observations,
          tasks,
          applications,
          hives,
        }),
      );
    }),
  );

  /* ================================================================
   * Crop catalog (static, referencial)
   * ============================================================== */
  router.get(
    '/crops',
    asyncHandler(async (req, res) => res.json(CROP_CATALOG)),
  );

  /* ================================================================
   * Field applications (fitosanitarios / fertilizantes)
   * ============================================================== */
  router.get(
    '/applications',
    asyncHandler(async (req, res) => res.json(await listApplications())),
  );
  router.post(
    '/applications',
    requireRole('admin', 'tecnico', 'encargado'),
    // idempotency: external-db â€” HTTP claim recorded; business tx is independent.
    // TODO(uow): pass drizzle tx from claim into createApplication to fully unify.
    idempotent(async (req, res) => {
      const data = insertFieldApplicationSchema.parse(req.body);
      const reqStorage = getStorage(req);
      try {
        res.status(201).json(
          await createApplication(data, {
            storage: reqStorage,
            executor: requireDatabaseExecutor(reqStorage),
          }),
        );
      } catch (err) {
        if (err instanceof InventoryStockError) {
          return res.status(409).json({ error: err.message });
        }
        if (err instanceof InventoryItemNotFoundError) {
          return res.status(422).json({ error: err.message });
        }
        throw err;
      }
    }),
  );

  /* ================================================================
   * Irrigation advisor
   * ============================================================== */
  router.get(
    '/irrigation/advice',
    asyncHandler(async (req, res) => {
      const q = z
        .object({
          scopeType: z.enum(['block', 'greenhouse']).optional(),
          scopeId: z.string().optional(),
        })
        .parse(req.query);
      const [blocks, greenhouses, irrigation, campaigns] = await Promise.all([
        storage.listBlocks(),
        storage.listGreenhouses(),
        storage.listIrrigationEvents(),
        storage.listCampaigns(),
      ]);
      const targets: { type: 'block' | 'greenhouse'; entity: any }[] = [];
      if (q.scopeType && q.scopeId) {
        const e =
          q.scopeType === 'block'
            ? blocks.find((b) => b.id === q.scopeId)
            : greenhouses.find((g) => g.id === q.scopeId);
        if (!e) return notFound(res, 'Scope');
        targets.push({ type: q.scopeType, entity: e });
      } else {
        for (const b of blocks) targets.push({ type: 'block', entity: b });
        for (const g of greenhouses) targets.push({ type: 'greenhouse', entity: g });
      }
      const advices = await Promise.all(
        targets.map(async ({ type, entity }) => {
          const camp = campaigns.find((c) => c.scopeType === type && c.scopeId === entity.id);
          let forecast = null;
          const lat = type === 'block' ? entity.centroidLat : entity.lat;
          const lng = type === 'block' ? entity.centroidLng : entity.lng;
          if (typeof lat === 'number' && typeof lng === 'number') {
            try {
              forecast = await getForecast(lat, lng);
            } catch {
              forecast = null;
            }
          }
          return buildIrrigationAdvice({
            scope: entity,
            scopeType: type,
            irrigationEvents: irrigation,
            campaign: camp,
            forecast,
          });
        }),
      );
      res.json(advices);
    }),
  );

  /* ================================================================
   * Beekeeping
   * ============================================================== */
  router.get(
    '/apiaries',
    asyncHandler(async (req, res) => res.json(await listApiaries())),
  );
  router.post(
    '/apiaries',
    requireRole('admin', 'tecnico', 'encargado'),
    // idempotency: external-db â€” HTTP claim recorded; business tx is independent.
    idempotent(async (req, res) => {
      const data = insertApiarySchema.parse(req.body);
      res.status(201).json(await createApiary(data));
    }),
  );
  router.get(
    '/hives',
    asyncHandler(async (req, res) => res.json(await listHives())),
  );
  router.post(
    '/hives',
    requireRole('admin', 'tecnico', 'encargado'),
    // idempotency: external-db â€” HTTP claim recorded; business tx is independent.
    idempotent(async (req, res) => {
      const data = insertHiveSchema.parse(req.body);
      res.status(201).json(await createHive(data));
    }),
  );
  router.get(
    '/hive-inspections',
    asyncHandler(async (req, res) => {
      const hiveId = typeof req.query.hiveId === 'string' ? req.query.hiveId : undefined;
      res.json(await listInspections(hiveId));
    }),
  );
  router.post(
    '/hive-inspections',
    requireRole('admin', 'tecnico', 'encargado'),
    // idempotency: external-db â€” HTTP claim recorded; business tx is independent.
    idempotent(async (req, res) => {
      const data = insertHiveInspectionSchema.parse(req.body);
      const reqStorage = getStorage(req);
      try {
        res.status(201).json(
          await createInspection(data, {
            storage: reqStorage,
            executor: requireDatabaseExecutor(reqStorage),
          }),
        );
      } catch (err) {
        if (err instanceof InventoryStockError) {
          return res.status(409).json({ error: err.message });
        }
        if (err instanceof HiveInventoryItemNotFoundError) {
          return res.status(422).json({ error: err.message });
        }
        throw err;
      }
    }),
  );
  router.get(
    '/honey-harvests',
    asyncHandler(async (req, res) => res.json(await listHoneyHarvests())),
  );
  router.post(
    '/honey-harvests',
    requireRole('admin', 'tecnico', 'encargado'),
    // idempotency: external-db â€” HTTP claim recorded; business tx is independent.
    idempotent(async (req, res) => {
      const data = insertHoneyHarvestSchema.parse(req.body);
      res.status(201).json(await createHoneyHarvest(data));
    }),
  );

  /* ================================================================
   * Attachments (offline-first media)
   * ============================================================== */
  router.get(
    '/attachments',
    asyncHandler(async (req, res) => {
      const q = z
        .object({
          entityType: attachmentEntityTypeSchema.optional(),
          entityId: z.string().optional(),
        })
        .parse(req.query);
      res.json(await listAttachments(q.entityType, q.entityId));
    }),
  );
  router.post(
    '/attachments',
    // idempotency: external-storage â€” claim recorded; file write and DB insert happen
    // independently (no shared tx). S3+PostgreSQL atomicity requires additional
    // saga or compensating delete (tracked as TODO(cloud) in attachments.ts).
    idempotent(async (req, res) => {
      const data = insertAttachmentSchema.parse(req.body);
      try {
        res.status(201).json(await createAttachment(data));
      } catch (err) {
        if (err instanceof AttachmentValidationError) {
          return res.status(422).json({ error: err.message });
        }
        throw err;
      }
    }),
  );
  router.delete(
    '/attachments/:id',
    asyncHandler(async (req, res) => {
      const ok = await deleteAttachment(req.params.id as string);
      if (!ok) return notFound(res, 'Adjunto');
      res.status(204).end();
    }),
  );

  /* ================================================================
   * Expenses + Labor (Finanzas agrícolas)
   * ============================================================== */
  router.get(
    '/expenses',
    asyncHandler(async (req, res) => {
      const q = z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          campaignId: z.string().optional(),
          scopeType: z.enum(['block', 'greenhouse']).optional(),
          scopeId: z.string().optional(),
          category: expenseCategorySchema.optional(),
        })
        .parse(req.query);
      res.json(await listExpenses(q));
    }),
  );
  router.post(
    '/expenses',
    requireRole('admin', 'tecnico', 'encargado', 'finanzas'),
    // idempotency: external-db â€” HTTP claim recorded; business tx is independent.
    idempotent(async (req, res) => {
      const data = insertExpenseSchema.parse(req.body);
      res.status(201).json(await createExpense(data, requireDatabaseExecutor(getStorage(req))));
    }),
  );
  router.delete(
    '/expenses/:id',
    requireRole('admin', 'tecnico', 'encargado', 'finanzas'),
    // idempotency: external-db â€” HTTP claim recorded; business tx (deleteExpense)
    // is independent. Tolerant-delete: already-deleted or never-existed â†’ 204.
    idempotent(async (req, res) => {
      const ok = await deleteExpense(
        req.params.id as string,
        requireDatabaseExecutor(getStorage(req)),
      );
      if (!ok) {
        // Tolerant-delete: ya borrado o nunca existió â†’ tratar como éxito
        // para que reintentos offline no marquen la mutación como error.
        return res.status(204).end();
      }
      res.status(204).end();
    }),
  );
  router.get(
    '/labor-costs',
    asyncHandler(async (req, res) => {
      const q = z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          campaignId: z.string().optional(),
          scopeType: z.enum(['block', 'greenhouse']).optional(),
          scopeId: z.string().optional(),
        })
        .parse(req.query);
      res.json(await listLaborCosts(q));
    }),
  );
  router.post(
    '/labor-costs',
    requireRole('admin', 'tecnico', 'encargado', 'finanzas'),
    // idempotency: external-db â€” HTTP claim recorded; business tx is independent.
    idempotent(async (req, res) => {
      const data = insertLaborCostSchema.parse(req.body);
      res.status(201).json(await createLaborCost(data, requireDatabaseExecutor(getStorage(req))));
    }),
  );
  router.get(
    '/campaigns/:id/costs',
    asyncHandler(async (req, res) => {
      res.json(await costsForCampaign(req.params.id as string));
    }),
  );
  router.get(
    '/scope-costs',
    asyncHandler(async (req, res) => {
      const q = z
        .object({
          scopeType: z.enum(['block', 'greenhouse']),
          scopeId: z.string(),
        })
        .parse(req.query);
      res.json(await costsForScope(q.scopeType, q.scopeId));
    }),
  );

  /* ================================================================
   * Users (auth-ready, no runtime guards yet)
   * ============================================================== */
  router.get(
    '/users',
    requireRole('admin'),
    asyncHandler(async (req, res) => res.json(await listUsers())),
  );
  router.post(
    '/users',
    requireRole('admin'),
    // idempotency: external-db â€” HTTP claim recorded; business tx is independent.
    idempotent(async (req, res) => {
      const data = insertUserSchema.parse(req.body);
      res.status(201).json(await createUser(data, requireDatabaseExecutor(getStorage(req))));
    }),
  );
  router.post(
    '/auth/login',
    asyncHandler(async (req, res) => {
      const { login, password } = z
        .object({
          login: z.string().min(1),
          password: z.string().min(1),
        })
        .parse(req.body);
      const found = await getUserByLogin(login);
      if (!found || !found.passwordHash || !found.user.active) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      if (!verifyPassword(password, found.passwordHash)) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      setSessionCookie(res, found.user.id);
      res.json({ user: found.user });
    }),
  );
  router.get(
    '/auth/me',
    asyncHandler(async (req, res) => {
      res.json({
        user: req.user ?? null,
        enforcement: env.authEnforcement,
        bypass: req.authBypass === true,
      });
    }),
  );
  router.post(
    '/auth/logout',
    asyncHandler(async (req, res) => {
      const raw = req.headers.cookie
        ?.split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith(COOKIE_NAME + '='))
        ?.slice(COOKIE_NAME.length + 1);
      if (raw) revokeToken(decodeURIComponent(raw));
      clearSessionCookie(res);
      res.json({ ok: true });
    }),
  );

  /* ================================================================
   * Reports â€” CSV exports (Fase 4)
   * ============================================================== */
  function sendCsv(res: Response, name: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }
  router.get(
    '/reports/applications.csv',
    asyncHandler(async (req, res) => {
      const q = z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          campaignId: z.string().optional(),
        })
        .parse(req.query);
      sendCsv(res, 'applications', await applicationsCSV(q));
    }),
  );
  router.get(
    '/reports/carencia.csv',
    asyncHandler(async (req, res) => {
      sendCsv(res, 'carencia', await carenciaActivaCSV());
    }),
  );
  router.get(
    '/reports/expenses.csv',
    asyncHandler(async (req, res) => {
      const q = z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          campaignId: z.string().optional(),
        })
        .parse(req.query);
      sendCsv(res, 'expenses', await expensesCSV(q));
    }),
  );
  router.get(
    '/reports/labor.csv',
    asyncHandler(async (req, res) => {
      const q = z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          campaignId: z.string().optional(),
        })
        .parse(req.query);
      sendCsv(res, 'labor', await laborCSV(q));
    }),
  );
  router.get(
    '/reports/apiaries.csv',
    asyncHandler(async (req, res) => sendCsv(res, 'apiaries', await apiariesCSV())),
  );
  router.get(
    '/reports/hives.csv',
    asyncHandler(async (req, res) => sendCsv(res, 'hives', await hivesCSV())),
  );
  router.get(
    '/reports/inspections.csv',
    asyncHandler(async (req, res) => sendCsv(res, 'inspections', await inspectionsCSV())),
  );
  router.get(
    '/reports/honey-harvests.csv',
    asyncHandler(async (req, res) => sendCsv(res, 'honey-harvests', await honeyHarvestsCSV())),
  );
  router.get(
    '/reports/honey.csv',
    asyncHandler(async (req, res) => sendCsv(res, 'honey-harvests', await honeyHarvestsCSV())),
  );

  /* ================================================================
   * Health â€” replaced by /health/live and /health/ready (health.ts)
   * ============================================================== */

  /* Settings */
  router.get(
    '/settings',
    asyncHandler(async (req, res) => res.json(await getStorage(req).getSettings())),
  );
  router.put(
    '/settings',
    asyncHandler(async (req, res) => {
      const data = settingsSchema.parse(req.body);
      res.json(await getStorage(req).updateSettings(data));
    }),
  );

  /* ================================================================
   * Integrations â€” Adapter Registry
   * ============================================================== */

  router.get(
    '/integrations/adapters',
    asyncHandler(async (req, res) => res.json(listAdapters())),
  );

  router.get(
    '/integrations/adapters/:id',
    asyncHandler(async (req, res) => {
      const a = getAdapter(req.params.id as string);
      if (!a) return res.status(404).json({ error: 'Adaptador no encontrado' });
      res.json(a);
    }),
  );

  router.post(
    '/integrations/adapters/:id/toggle',
    asyncHandler(async (req, res) => {
      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
      const updated = setEnabled(req.params.id as string, enabled);
      if (!updated) {
        const existing = getAdapter(req.params.id as string);
        if (!existing) return res.status(404).json({ error: 'Adaptador no encontrado' });
        return res.status(400).json({
          error: 'No se puede habilitar: el adaptador requiere secretos no configurados.',
        });
      }
      res.json(updated);
    }),
  );

  router.post(
    '/integrations/adapters/:id/test',
    asyncHandler(async (req, res) => {
      const result = runAdapterTest(req.params.id as string);
      if (!result) return res.status(404).json({ error: 'Adaptador no encontrado' });
      res.json(result);
    }),
  );

  /* ================================================================
   * Integrations â€” CSV Export
   * ============================================================== */

  router.get(
    '/integrations/export/:dataset',
    asyncHandler(async (req, res) => {
      const dataset = exportDatasetSchema.parse(req.params.dataset);
      let csv: string;
      const now = new Date().toISOString().slice(0, 10);

      switch (dataset) {
        case 'blocks':
          csv = blocksToCSV(await getStorage(req).listBlocks());
          break;
        case 'greenhouses':
          csv = greenhousesToCSV(await getStorage(req).listGreenhouses());
          break;
        case 'tasks':
          csv = tasksToCSV(await getStorage(req).listTasks());
          break;
        case 'irrigation-events':
          csv = irrigationEventsToCSV(await getStorage(req).listIrrigationEvents());
          break;
        case 'observations':
          csv = observationsToCSV(await getStorage(req).listObservations());
          break;
        case 'inventory':
          csv = inventoryToCSV(await getStorage(req).listInventory());
          break;
        case 'harvest-lots':
          csv = harvestLotsToCSV(await getStorage(req).listHarvestLots());
          break;
        default:
          return res.status(400).json({ error: 'Dataset desconocido' });
      }

      const filename = `agro-${dataset}-${now}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    }),
  );

  /* ================================================================
   * Integrations â€” CSV Import
   * ============================================================== */

  router.post(
    '/integrations/import/:dataset',
    asyncHandler(async (req, res) => {
      const dataset = importDatasetSchema.parse(req.params.dataset);
      const { csv, dryRun } = z
        .object({ csv: z.string().min(1), dryRun: z.boolean().default(true) })
        .parse(req.body);

      const result = await parseAndImport(dataset, csv, dryRun, storage);
      res.json(result);
    }),
  );

  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', issues: err.issues });
    }
    if (err instanceof DatabaseRequiredError || (err as any)?.code === 'DATABASE_REQUIRED') {
      return res.status(503).json({
        error: (err as Error).message || 'Operación no disponible con almacenamiento en memoria',
        code: 'DATABASE_REQUIRED',
      });
    }
    const reqLog = (_req as Request).log ?? apiLog;
    reqLog.error('unhandled api error', { err });
    res.status(500).json({ error: 'Error interno del servidor' });
  });
}
