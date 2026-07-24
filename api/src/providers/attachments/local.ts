import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  AttachmentStorage,
  PrepareUploadParams,
  PrepareUploadResult,
  ConfirmUploadResult,
  DownloadAccessResult,
  VerifyObjectResult,
} from './types.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function assertWithinUploads(fullPath: string): void {
  const resolved = path.resolve(fullPath);
  const root = UPLOAD_ROOT.endsWith(path.sep) ? UPLOAD_ROOT : UPLOAD_ROOT + path.sep;
  if (resolved !== UPLOAD_ROOT && !resolved.startsWith(root)) {
    throw new Error('Path traversal attempt detected');
  }
}

/**
 * Local filesystem attachment storage — for development only.
 * Files are stored under `uploads/<entityType>/<entityId>/<key>-<filename>`.
 */
export class LocalAttachmentStorage implements AttachmentStorage {
  readonly name = 'local';

  async prepareUpload(params: PrepareUploadParams): Promise<PrepareUploadResult> {
    const id = `att-${randomUUID().slice(0, 10)}`;
    const safe = safeFileName(params.fileName);
    const key = `${params.entityType}/${params.entityId}/${id}-${safe}`;
    // For local, upload is inline (base64 in JSON body) — no presigned URL.
    return { key, method: 'POST' };
  }

  /**
   * Write file content to local disk. Called by the attachment handler
   * after receiving the base64 body (local-only flow).
   */
  async writeFile(key: string, content: Buffer): Promise<void> {
    const fullPath = path.join(UPLOAD_ROOT, key);
    assertWithinUploads(fullPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async confirmUpload(key: string): Promise<ConfirmUploadResult> {
    const fullPath = path.join(UPLOAD_ROOT, key);
    assertWithinUploads(fullPath);
    try {
      const stat = await fs.stat(fullPath);
      return { exists: true, sizeBytes: stat.size };
    } catch {
      return { exists: false };
    }
  }

  async getDownloadAccess(key: string): Promise<DownloadAccessResult> {
    return {
      url: `/uploads/${key}`,
      expires: false,
    };
  }

  async deleteObject(key: string): Promise<boolean> {
    const fullPath = path.join(UPLOAD_ROOT, key);
    assertWithinUploads(fullPath);
    try {
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async verifyObject(key: string): Promise<VerifyObjectResult> {
    const fullPath = path.join(UPLOAD_ROOT, key);
    assertWithinUploads(fullPath);
    try {
      const stat = await fs.stat(fullPath);
      return { exists: true, sizeBytes: stat.size };
    } catch {
      return { exists: false };
    }
  }
}

export const UPLOADS_DIR = UPLOAD_ROOT;
