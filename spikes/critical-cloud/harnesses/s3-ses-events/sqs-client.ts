/**
 * S3 Harness -- SQS Client Interface
 *
 * DISPOSABLE -- not production code.
 */

import type { SqsReceiveResponse, HarnessConfig } from './types.js';

export interface SqsClient {
  receiveMessages(maxMessages: number): Promise<SqsReceiveResponse>;
}

export function createLiveSqsClient(_config: HarnessConfig): SqsClient {
  throw new Error('Live SQS client not available in T09. Requires T12 authorization.');
}
