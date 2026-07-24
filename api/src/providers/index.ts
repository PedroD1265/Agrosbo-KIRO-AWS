/**
 * Provider factory — selects the active implementation for each service
 * boundary based on environment configuration.
 *
 * Rules:
 * - In production, only managed providers are acceptable.
 * - In dev/test, local providers are the default.
 * - Selection is explicit by env var, not magic detection.
 */

import type { IdentityProvider } from './identity/types.js';
import type { AttachmentStorage } from './attachments/types.js';
import type { DocumentExtractionProvider } from './documents/types.js';

import { LocalSessionIdentityProvider } from './identity/local-session.js';
import { LocalAttachmentStorage } from './attachments/local.js';
import { NoOpDocumentExtraction } from './documents/noop.js';

export type AuthProviderType = 'local-session' | 'cognito-jwt';
export type StorageDriverType = 'local' | 's3';
export type DocExtractionType = 'none' | 'textract' | 'azure';

export interface ProviderConfig {
  authProvider: AuthProviderType;
  storageDriver: StorageDriverType;
  docExtraction: DocExtractionType;
}

export interface Providers {
  identity: IdentityProvider;
  attachments: AttachmentStorage;
  documents: DocumentExtractionProvider;
}

/**
 * Initialize providers based on config. Throws at startup if a required
 * managed provider is not yet implemented (fail-closed).
 */
export function createProviders(
  config: ProviderConfig,
  deps: {
    decodeToken: (token: string) => { userId: string; expiresAt: number } | null;
    loadUser: (userId: string) => Promise<{
      id: string;
      orgId: string;
      role: 'admin' | 'tecnico' | 'encargado' | 'operario' | 'finanzas';
      active: boolean;
    } | null>;
    cookieName: string;
  },
): Providers {
  // --- Identity ---
  let identity: IdentityProvider;
  if (config.authProvider === 'local-session') {
    identity = new LocalSessionIdentityProvider({
      decodeToken: deps.decodeToken,
      loadUser: deps.loadUser,
      cookieName: deps.cookieName,
    });
  } else if (config.authProvider === 'cognito-jwt') {
    // CognitoJwtIdentityProvider will be implemented in the infrastructure Spec.
    throw new Error(
      '[providers] cognito-jwt identity provider is not yet implemented. ' +
        'Set APP_AUTH_PROVIDER=local-session for development.',
    );
  } else {
    throw new Error(`[providers] Unknown APP_AUTH_PROVIDER: ${config.authProvider}`);
  }

  // --- Attachments ---
  let attachments: AttachmentStorage;
  if (config.storageDriver === 'local') {
    attachments = new LocalAttachmentStorage();
  } else if (config.storageDriver === 's3') {
    // S3AttachmentStorage will be implemented in the attachments Spec.
    throw new Error(
      '[providers] S3 attachment storage is not yet implemented. ' +
        'Set ATTACHMENTS_STORAGE_DRIVER=local for development.',
    );
  } else {
    throw new Error(`[providers] Unknown ATTACHMENTS_STORAGE_DRIVER: ${config.storageDriver}`);
  }

  // --- Document Extraction ---
  let documents: DocumentExtractionProvider;
  if (config.docExtraction === 'none') {
    documents = new NoOpDocumentExtraction();
  } else if (config.docExtraction === 'textract') {
    throw new Error(
      '[providers] Textract document extraction is not yet implemented. ' +
        'Set DOCUMENT_EXTRACTION_PROVIDER=none for development.',
    );
  } else if (config.docExtraction === 'azure') {
    throw new Error(
      '[providers] Azure Document Intelligence is not yet implemented. ' +
        'Set DOCUMENT_EXTRACTION_PROVIDER=none for development.',
    );
  } else {
    throw new Error(`[providers] Unknown DOCUMENT_EXTRACTION_PROVIDER: ${config.docExtraction}`);
  }

  return { identity, attachments, documents };
}

// Re-export types for convenience
export type {
  IdentityProvider,
  IdentityPrincipal,
  IdentityResolveInput,
} from './identity/types.js';
export type {
  AttachmentStorage,
  PrepareUploadParams,
  PrepareUploadResult,
} from './attachments/types.js';
export type {
  DocumentExtractionProvider,
  DocumentExtractionInput,
  DocumentExtractionResult,
} from './documents/types.js';
