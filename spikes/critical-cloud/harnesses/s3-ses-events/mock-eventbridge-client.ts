/**
 * S3 Harness -- Mock EventBridge Client
 *
 * DISPOSABLE -- not production code.
 */

import type { EventBridgeEvent } from './types.js';
import type { EventBridgeClient } from './eventbridge-client.js';

export type EbScenario = { type: 'success' } | { type: 'error'; message: string };

export function createMockEventBridgeClient(scenario: EbScenario): EventBridgeClient {
  return {
    async putEvent(_event: EventBridgeEvent): Promise<{ success: boolean; error?: string }> {
      if (scenario.type === 'error') {
        return { success: false, error: scenario.message };
      }
      return { success: true };
    },
  };
}
