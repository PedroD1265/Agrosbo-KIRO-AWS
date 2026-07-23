/**
 * Storage adapter interface for file uploads.
 * Demonstrates that file upload is OUTSIDE the PostgreSQL transaction.
 * A future S3 adapter would implement this interface.
 * DISPOSABLE.
 */

export interface StorageAdapter {
  /**
   * Upload a file and return its storage_key.
   * This operation MUST happen outside any DB transaction.
   * Returns null if upload fails (file stays pending).
   */
  upload(filename: string, content: Buffer): Promise<string | null>;
}

/**
 * Fake local storage adapter for spike testing.
 * Simulates upload success/failure without touching S3.
 */
export class FakeLocalStorage implements StorageAdapter {
  private stored: Map<string, Buffer> = new Map();
  private shouldFail = false;

  /** Force next upload to fail (for testing). */
  setFailMode(fail: boolean): void {
    this.shouldFail = fail;
  }

  async upload(filename: string, content: Buffer): Promise<string | null> {
    if (this.shouldFail) {
      return null; // Simulates upload failure
    }
    const key = `spike-uploads/${Date.now()}-${filename}`;
    this.stored.set(key, content);
    return key;
  }

  /** Check if a file was stored (for assertions). */
  has(key: string): boolean {
    return this.stored.has(key);
  }

  /** Get count of stored files. */
  get count(): number {
    return this.stored.size;
  }
}
