/**
 * S3 Harness -- EventBridge Client Interface
 *
 * DISPOSABLE -- not production code.
 */

import type { EventBridgeEvent, HarnessConfig } from './types.js';

export interface EventBridgeClient {
  putEvent(event: EventBridgeEvent): Promise<{ success: boolean; error?: string }>;
}

export function createLiveEventBridgeClient(_config: HarnessConfig): EventBridgeClient {
  throw new Error('Live EventBridge client not available in T09. Requires T12 authorization.');
}
