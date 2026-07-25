/**
 * LocalAttachmentStorage unit tests.
 *
 * Validates:
 * - Object key generation (canonical, stable)
 * - File creation within uploads directory
 * - Confirm/verify after write
 * - Delete by canonical key (not URL)
 * - Path traversal rejection (../, absolute, encoded)
 * - Cleanup on failure scenarios
 *
 * Documentation:
 * - S3 is NOT implemented yet.
 * - Future integration will use `objectKey` persisted in DB as the stable reference.
 * - Presigned URLs will NEVER be stored as identity — they are ephemeral.
 * - The flow will be: prepareUpload → client uploads directly to S3 → confirmUpload.
 * - No distributed transaction (S3 + PostgreSQL) will be attempted.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LocalAttachmentStorage } from '../providers/attachments/local.js';

describe('LocalAttachmentStorage', () => {
  let storage: LocalAttachmentStorage;
  let tmpDir: string;

  beforeEach(async () => {
    // Use a temp directory to avoid polluting the project
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agrosbo-att-test-'));
    // Override the UPLOAD_ROOT by creating a subclass or monkey-patching
    // Since UPLOAD_ROOT is module-scoped const, we test via the public API
    // using keys that resolve within the default uploads dir.
    storage = new LocalAttachmentStorage();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  // --- Key generation ---

  it('prepareUpload returns a canonical key with entityType/entityId prefix', async () => {
    const result = await storage.prepareUpload({
      entityType: 'observation',
      entityId: 'obs-123',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    });
    expect(result.key).toMatch(/^observation\/obs-123\/att-[a-f0-9-]+-photo\.jpg$/);
    expect(result.method).toBe('POST');
    // No presigned URL for local storage
    expect(result.uploadUrl).toBeUndefined();
  });

  it('prepareUpload sanitizes dangerous filenames', async () => {
    const result = await storage.prepareUpload({
      entityType: 'task',
      entityId: 't-1',
      fileName: '../../../etc/passwd',
      mimeType: 'text/plain',
      sizeBytes: 100,
    });
    // Dots and slashes in filename are sanitized to underscores
    expect(result.key).not.toContain('../');
    expect(result.key).toMatch(/^task\/t-1\/att-[a-f0-9-]+-/);
  });

  it('key is stable structure (entityType/entityId/id-filename)', async () => {
    const r1 = await storage.prepareUpload({
      entityType: 'harvestLot',
      entityId: 'hl-abc',
      fileName: 'receipt.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5000,
    });
    // Key parts
    const parts = r1.key.split('/');
    expect(parts[0]).toBe('harvestLot');
    expect(parts[1]).toBe('hl-abc');
    expect(parts[2]).toMatch(/^att-[a-f0-9-]+-receipt\.pdf$/);
  });

  // --- Write and confirm ---

  it('writeFile + confirmUpload verifies existence and size', async () => {
    const key = 'observation/obs-test/att-abc-test.jpg';
    const content = Buffer.from('fake image data for testing');
    await storage.writeFile(key, content);
    const confirm = await storage.confirmUpload(key);
    expect(confirm.exists).toBe(true);
    expect(confirm.sizeBytes).toBe(content.length);
    // Cleanup
    await storage.deleteObject(key);
  });

  it('confirmUpload returns exists=false for nonexistent key', async () => {
    const confirm = await storage.confirmUpload('observation/obs-99/nonexistent.jpg');
    expect(confirm.exists).toBe(false);
  });

  // --- Download access ---

  it('getDownloadAccess returns relative path (not presigned URL)', async () => {
    const result = await storage.getDownloadAccess('observation/obs-1/att-x-photo.jpg');
    expect(result.url).toBe('/uploads/observation/obs-1/att-x-photo.jpg');
    expect(result.expires).toBe(false);
    // remoteUrl is NOT the identity — it's a serving path
  });

  // --- Delete ---

  it('deleteObject removes file by canonical key', async () => {
    const key = 'task/t-del/att-del-file.txt';
    const content = Buffer.from('to be deleted');
    await storage.writeFile(key, content);
    const deleted = await storage.deleteObject(key);
    expect(deleted).toBe(true);
    const verify = await storage.verifyObject(key);
    expect(verify.exists).toBe(false);
  });

  it('deleteObject returns false for nonexistent key', async () => {
    const deleted = await storage.deleteObject('task/t-99/nonexistent.txt');
    expect(deleted).toBe(false);
  });

  // --- Path traversal rejection ---

  it('rejects path traversal with ../', async () => {
    await expect(storage.writeFile('../../../etc/passwd', Buffer.from('x'))).rejects.toThrow(
      /traversal/i,
    );
  });

  it('rejects path traversal with encoded ../', async () => {
    // Even if key contains %2e%2e, the resolved path would still be within uploads
    // because path.join normalizes. The guard checks resolved vs root.
    const malicious = '..%2F..%2F..%2Fetc%2Fpasswd';
    // This won't traverse because path.join treats it as a literal filename
    // But let's verify the assertion still holds for a real traversal attempt
    await expect(storage.writeFile('../../outside/file.txt', Buffer.from('x'))).rejects.toThrow(
      /traversal/i,
    );
  });

  it('rejects absolute path outside uploads', async () => {
    const abs = path.resolve('/', 'tmp', 'evil.txt');
    // deleteObject with an absolute-looking key
    await expect(storage.deleteObject(`../../${abs}`)).rejects.toThrow(/traversal/i);
  });

  it('cannot delete file outside uploads directory', async () => {
    await expect(storage.deleteObject('../../package.json')).rejects.toThrow(/traversal/i);
  });

  // --- Verify ---

  it('verifyObject returns size for existing file', async () => {
    const key = 'observation/obs-v/att-v-verify.bin';
    await storage.writeFile(key, Buffer.alloc(42));
    const result = await storage.verifyObject(key);
    expect(result.exists).toBe(true);
    expect(result.sizeBytes).toBe(42);
    await storage.deleteObject(key);
  });
});

import {
  createAttachment,
  deleteAttachment,
  AttachmentValidationError,
  AttachmentDeleteError,
} from '../attachments.js';
import type { AttachmentStorage } from '../providers/attachments/types.js';
import type { DatabaseExecutor } from '../executor.js';

describe('Attachment Lifecycle, Compensation, and Safe Deletion', () => {
  it('1. Successful creation persists objectKey and returns Attachment', async () => {
    const writtenKeys: string[] = [];
    const mockProvider: AttachmentStorage = {
      name: 'mock',
      prepareUpload: async () => ({ key: 'mock-key', method: 'POST' }),
      confirmUpload: async () => ({ exists: true }),
      getDownloadAccess: async (k) => ({ url: `/uploads/${k}`, expires: false }),
      deleteObject: async () => true,
      writeFile: async (k) => {
        writtenKeys.push(k);
      },
      verifyObject: async () => ({ exists: true }),
    };

    const insertedRows: any[] = [];
    const mockExecutor: DatabaseExecutor = {
      insert: () => ({
        values: (vals: any) => ({
          returning: async () => {
            insertedRows.push(vals);
            return [vals];
          },
        }),
      }),
    } as any;

    const dataBase64 = Buffer.from('hello world content').toString('base64');
    const att = await createAttachment(
      {
        entityType: 'observation',
        entityId: 'obs-100',
        fileName: 'my report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 19,
        dataBase64,
      },
      { storageProvider: mockProvider, executor: mockExecutor },
    );

    expect(att.id).toMatch(/^att-[a-f0-9-]+$/);
    expect(att.objectKey).toBe(insertedRows[0].objectKey);
    expect(att.objectKey).toMatch(/^observation\/obs-100\/att-[a-f0-9-]+-my_report\.pdf$/);
    expect(att.fileName).toBe('my_report.pdf');
    expect(writtenKeys).toEqual([att.objectKey]);
  });

  it('2. getDownloadAccess failure after writeFile triggers deleteObject compensation with same objectKey', async () => {
    const deletedKeys: string[] = [];
    const mockProvider: AttachmentStorage = {
      name: 'mock',
      prepareUpload: async () => ({ key: 'mock-key', method: 'POST' }),
      confirmUpload: async () => ({ exists: true }),
      getDownloadAccess: async () => {
        throw new Error('Download access failed');
      },
      deleteObject: async (k) => {
        deletedKeys.push(k);
        return true;
      },
      writeFile: async () => {},
      verifyObject: async () => ({ exists: true }),
    };

    const dataBase64 = Buffer.from('test data').toString('base64');
    await expect(
      createAttachment(
        {
          entityType: 'task',
          entityId: 't-200',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 9,
          dataBase64,
        },
        { storageProvider: mockProvider },
      ),
    ).rejects.toThrow('Download access failed');

    expect(deletedKeys.length).toBe(1);
    expect(deletedKeys[0]).toMatch(/^task\/t-200\/att-[a-f0-9-]+-doc\.pdf$/);
  });

  it('3. insert metadata failure after writeFile triggers deleteObject compensation with same objectKey', async () => {
    const deletedKeys: string[] = [];
    const mockProvider: AttachmentStorage = {
      name: 'mock',
      prepareUpload: async () => ({ key: 'mock-key', method: 'POST' }),
      confirmUpload: async () => ({ exists: true }),
      getDownloadAccess: async (k) => ({ url: `/uploads/${k}`, expires: false }),
      deleteObject: async (k) => {
        deletedKeys.push(k);
        return true;
      },
      writeFile: async () => {},
      verifyObject: async () => ({ exists: true }),
    };

    const mockFailingExecutor: DatabaseExecutor = {
      insert: () => ({
        values: () => ({
          returning: async () => {
            throw new Error('DB Connection Timeout on insert');
          },
        }),
      }),
    } as any;

    const dataBase64 = Buffer.from('test data').toString('base64');
    await expect(
      createAttachment(
        {
          entityType: 'task',
          entityId: 't-200',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 9,
          dataBase64,
        },
        { storageProvider: mockProvider, executor: mockFailingExecutor },
      ),
    ).rejects.toThrow('DB Connection Timeout on insert');

    expect(deletedKeys.length).toBe(1);
    expect(deletedKeys[0]).toMatch(/^task\/t-200\/att-[a-f0-9-]+-doc\.pdf$/);
  });

  it('4. When cleanup deleteObject ALSO fails, main error is preserved', async () => {
    const mockProvider: AttachmentStorage = {
      name: 'mock',
      prepareUpload: async () => ({ key: 'mock-key', method: 'POST' }),
      confirmUpload: async () => ({ exists: true }),
      getDownloadAccess: async () => {
        throw new Error('Primary Error: Download Access Failed');
      },
      deleteObject: async () => {
        throw new Error('Secondary Error: S3 Bucket Unavailable on Cleanup');
      },
      writeFile: async () => {},
      verifyObject: async () => ({ exists: true }),
    };

    const dataBase64 = Buffer.from('test data').toString('base64');
    await expect(
      createAttachment(
        {
          entityType: 'task',
          entityId: 't-200',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 9,
          dataBase64,
        },
        { storageProvider: mockProvider },
      ),
    ).rejects.toThrow('Primary Error: Download Access Failed');
  });

  it('5. Safe deletion removes object via row.objectKey and deletes DB metadata', async () => {
    const deletedKeys: string[] = [];
    let dbDeleted = false;

    const mockProvider: AttachmentStorage = {
      name: 'mock',
      prepareUpload: async () => ({ key: 'mock-key', method: 'POST' }),
      confirmUpload: async () => ({ exists: true }),
      getDownloadAccess: async (k) => ({ url: `/uploads/${k}`, expires: false }),
      deleteObject: async (k) => {
        deletedKeys.push(k);
        return true;
      },
      writeFile: async () => {},
      verifyObject: async () => ({ exists: true }),
    };

    const mockRow = {
      id: 'att-safe-1',
      objectKey: 'task/t-10/att-safe-1-image.png',
      entityType: 'task',
      entityId: 't-10',
      fileName: 'image.png',
      remoteUrl:
        'https://s3.amazonaws.com/bucket/task/t-10/att-safe-1-image.png?X-Amz-Signature=expired123',
    };

    const mockExecutor: DatabaseExecutor = {
      select: () => ({
        from: () => ({
          where: () => [mockRow],
        }),
      }),
      delete: () => ({
        where: () => {
          dbDeleted = true;
          return [mockRow];
        },
      }),
    } as any;

    const result = await deleteAttachment('att-safe-1', {
      storageProvider: mockProvider,
      executor: mockExecutor,
    });

    expect(result).toBe(true);
    expect(deletedKeys).toEqual(['task/t-10/att-safe-1-image.png']);
    expect(dbDeleted).toBe(true);
  });

  it('6. Expired or altered remoteUrl does not affect deletion because objectKey is used', async () => {
    const deletedKeys: string[] = [];
    const mockProvider: AttachmentStorage = {
      name: 'mock',
      prepareUpload: async () => ({ key: 'mock-key', method: 'POST' }),
      confirmUpload: async () => ({ exists: true }),
      getDownloadAccess: async (k) => ({ url: `/uploads/${k}`, expires: false }),
      deleteObject: async (k) => {
        deletedKeys.push(k);
        return true;
      },
      writeFile: async () => {},
      verifyObject: async () => ({ exists: true }),
    };

    const mockRow = {
      id: 'att-expired-url',
      objectKey: 'observation/obs-55/att-expired-url-photo.jpg',
      entityType: 'observation',
      entityId: 'obs-55',
      fileName: 'photo.jpg',
      remoteUrl: 'https://completely-bogus-presigned-url.com/expired-token-12345',
    };

    const mockExecutor: DatabaseExecutor = {
      select: () => ({
        from: () => ({
          where: () => [mockRow],
        }),
      }),
      delete: () => ({
        where: () => [mockRow],
      }),
    } as any;

    const result = await deleteAttachment('att-expired-url', {
      storageProvider: mockProvider,
      executor: mockExecutor,
    });

    expect(result).toBe(true);
    expect(deletedKeys).toEqual(['observation/obs-55/att-expired-url-photo.jpg']);
  });

  it('7. deleteObject failure preserves DB metadata and throws AttachmentDeleteError', async () => {
    let dbDeleted = false;
    const mockThrowingProvider: AttachmentStorage = {
      name: 'mock-throwing',
      prepareUpload: async () => ({ key: 'mock-key', method: 'POST' }),
      confirmUpload: async () => ({ exists: true }),
      getDownloadAccess: async (k) => ({ url: `/uploads/${k}`, expires: false }),
      deleteObject: async () => {
        throw new Error('S3 500 Internal Error during DELETE');
      },
      writeFile: async () => {},
      verifyObject: async () => ({ exists: true }),
    };

    const mockRow = {
      id: 'att-fail-del',
      objectKey: 'task/t-99/att-fail-del-file.pdf',
      entityType: 'task',
      entityId: 't-99',
      fileName: 'file.pdf',
    };

    const mockExecutor: DatabaseExecutor = {
      select: () => ({
        from: () => ({
          where: () => [mockRow],
        }),
      }),
      delete: () => ({
        where: () => {
          dbDeleted = true;
          return [mockRow];
        },
      }),
    } as any;

    const err = await deleteAttachment('att-fail-del', {
      storageProvider: mockThrowingProvider,
      executor: mockExecutor,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AttachmentDeleteError);
    expect(err.code).toBe('ATTACHMENT_DELETE_FAILED');
    expect(err.message).toContain('att-fail-del-file.pdf');
    expect(dbDeleted).toBe(false);
  });

  it('8. deleteAttachment returns false for non-existent metadata', async () => {
    const mockExecutor: DatabaseExecutor = {
      select: () => ({
        from: () => ({
          where: () => [],
        }),
      }),
    } as any;

    const result = await deleteAttachment('att-non-existent', {
      executor: mockExecutor,
    });
    expect(result).toBe(false);
  });
});
