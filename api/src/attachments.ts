import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { eq, and, desc } from 'drizzle-orm';
import { db } from './db.js';
import {
  attachments,
  type Attachment,
  type InsertAttachment,
  type AttachmentEntityType,
} from '@agrosbo/shared/schema.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);
const MAX_BYTES = 10 * 1024 * 1024;

import { createLogger } from './logger.js';
import type { AttachmentStorage } from './providers/attachments/types.js';
import type { DatabaseExecutor } from './executor.js';

const attachmentLog = createLogger('attachments');

export class AttachmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentValidationError';
  }
}

export class AttachmentDeleteError extends Error {
  readonly code = 'ATTACHMENT_DELETE_FAILED';
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'AttachmentDeleteError';
  }
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

const ENTITY_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function assertWithinUploads(fullPath: string): void {
  const resolved = path.resolve(fullPath);
  const root = UPLOAD_ROOT.endsWith(path.sep) ? UPLOAD_ROOT : UPLOAD_ROOT + path.sep;
  if (resolved !== UPLOAD_ROOT && !resolved.startsWith(root)) {
    throw new AttachmentValidationError('Ruta de archivo fuera de uploads/');
  }
}

function rowToAttachment(r: typeof attachments.$inferSelect): Attachment {
  const out: Attachment = {
    id: r.id,
    objectKey: r.objectKey,
    entityType: r.entityType,
    entityId: r.entityId,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    localStatus: r.localStatus,
    createdAt: r.createdAt,
  };
  if (r.remoteUrl) out.remoteUrl = r.remoteUrl;
  if (r.thumbnailUrl) out.thumbnailUrl = r.thumbnailUrl;
  if (r.uploadedAt) out.uploadedAt = r.uploadedAt;
  if (r.error) out.error = r.error;
  if (r.createdBy) out.createdBy = r.createdBy;
  return out;
}

export async function listAttachments(
  entityType?: AttachmentEntityType,
  entityId?: string,
): Promise<Attachment[]> {
  let rows;
  if (entityType && entityId) {
    rows = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)))
      .orderBy(desc(attachments.createdAt));
  } else if (entityType) {
    rows = await db
      .select()
      .from(attachments)
      .where(eq(attachments.entityType, entityType))
      .orderBy(desc(attachments.createdAt));
  } else {
    rows = await db.select().from(attachments).orderBy(desc(attachments.createdAt));
  }
  return rows.map(rowToAttachment);
}

import { getProviders } from './providers/index.js';

export interface CreateAttachmentOptions {
  storageProvider: AttachmentStorage;
  executor: DatabaseExecutor;
}

export async function createAttachment(
  input: InsertAttachment,
  opts: CreateAttachmentOptions,
): Promise<Attachment> {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new AttachmentValidationError(`MIME no permitido: ${input.mimeType}`);
  }
  if (input.sizeBytes > MAX_BYTES) {
    throw new AttachmentValidationError(`Archivo > 10MB`);
  }
  const buf = Buffer.from(input.dataBase64, 'base64');
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
    throw new AttachmentValidationError('Tamaño de archivo inválido');
  }
  if (Math.abs(buf.byteLength - input.sizeBytes) > 1024) {
    throw new AttachmentValidationError('Tamaño declarado no coincide con el contenido');
  }
  if (!ENTITY_ID_RE.test(input.entityId)) {
    throw new AttachmentValidationError('entityId inválido');
  }
  const id = `att-${randomUUID().slice(0, 10)}`;
  const safe = safeFileName(input.fileName);
  const objectKey = `${input.entityType}/${input.entityId}/${id}-${safe}`;

  const { executor, storageProvider } = opts;

  await storageProvider.writeFile(objectKey, buf);

  try {
    const downloadAccess = await storageProvider.getDownloadAccess(objectKey);
    const remoteUrl = downloadAccess.url;
    const now = new Date().toISOString();

    const [row] = await executor
      .insert(attachments)
      .values({
        id,
        objectKey,
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: safe,
        mimeType: input.mimeType,
        sizeBytes: buf.byteLength,
        localStatus: 'uploaded',
        remoteUrl,
        createdAt: now,
        uploadedAt: now,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    if (!row) {
      throw new Error('Insert returned no row');
    }

    return rowToAttachment(row);
  } catch (mainErr) {
    try {
      await storageProvider.deleteObject(objectKey);
    } catch (cleanupErr) {
      attachmentLog.error('attachment creation cleanup failed', {
        objectKey,
        mainErr,
        cleanupErr,
      });
    }
    throw mainErr;
  }
}

export interface DeleteAttachmentOptions {
  storageProvider?: AttachmentStorage;
  executor?: DatabaseExecutor;
}

export async function deleteAttachment(
  id: string,
  opts?: DeleteAttachmentOptions,
): Promise<boolean> {
  const dbExec = opts?.executor ?? db;
  const storageProvider = opts?.storageProvider ?? getProviders().attachments;

  const [row] = await dbExec.select().from(attachments).where(eq(attachments.id, id));
  if (!row) return false;

  try {
    await storageProvider.deleteObject(row.objectKey);
  } catch (err) {
    throw new AttachmentDeleteError(
      `Fallo al eliminar objeto storage '${row.objectKey}': ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  await dbExec.delete(attachments).where(eq(attachments.id, id));
  return true;
}

export const UPLOADS_DIR = UPLOAD_ROOT;
