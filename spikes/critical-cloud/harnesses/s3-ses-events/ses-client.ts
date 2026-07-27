/**
 * S3 Harness -- SES Client Interface
 *
 * DISPOSABLE -- not production code.
 */

import type { SendEmailRequest, SesResponse, HarnessConfig } from './types.js';

export interface SesClient {
  sendEmail(request: SendEmailRequest): Promise<SesResponse>;
}

export function createLiveSesClient(_config: HarnessConfig): SesClient {
  throw new Error('Live SES client not available in T09. Requires T12 authorization.');
}
