/**
 * Contract for attachment object storage — abstracts local disk vs S3.
 */
export interface AttachmentStorage {
  /**
   * Prepare an upload slot. For local: returns a target path/URL.
   * For S3: returns a presigned PUT URL + key.
   */
  prepareUpload(params: PrepareUploadParams): Promise<PrepareUploadResult>;

  /**
   * Confirm that an upload completed successfully (validate existence/size).
   * For local: verify file on disk. For S3: HEAD object.
   */
  confirmUpload(key: string): Promise<ConfirmUploadResult>;

  /**
   * Get download access for a stored object.
   * For local: return a relative URL path. For S3: presigned GET URL.
   */
  getDownloadAccess(key: string): Promise<DownloadAccessResult>;

  /**
   * Delete a stored object. Best-effort; returns whether it was found.
   */
  deleteObject(key: string): Promise<boolean>;

  /**
   * Verify object exists and optionally check its size.
   */
  verifyObject(key: string): Promise<VerifyObjectResult>;

  /** Provider identifier for diagnostics. */
  readonly name: string;
}

export interface PrepareUploadParams {
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PrepareUploadResult {
  /** Storage key (unique identifier for the object). */
  key: string;
  /**
   * For local: undefined (upload goes through API body).
   * For S3: presigned PUT URL for direct browser upload.
   */
  uploadUrl?: string;
  /** HTTP method for the upload URL (PUT for presigned, POST for local). */
  method: 'PUT' | 'POST';
}

export interface ConfirmUploadResult {
  exists: boolean;
  sizeBytes?: number;
}

export interface DownloadAccessResult {
  /** URL to access the file (relative path for local, presigned URL for S3). */
  url: string;
  /** Whether the URL expires. */
  expires: boolean;
  /** Expiry time if applicable. */
  expiresAt?: string;
}

export interface VerifyObjectResult {
  exists: boolean;
  sizeBytes?: number;
  mimeType?: string;
}
