/**
 * S3 Harness -- Mock SQS Client
 *
 * DISPOSABLE -- not production code.
 */

import type { SqsMessage, SqsReceiveResponse } from './types.js';
import type { SqsClient } from './sqs-client.js';

export type SqsScenario =
  | { type: 'messages'; messages: SqsMessage[] }
  | { type: 'empty' }
  | { type: 'error'; code: string; message: string };

export function createMockSqsClient(scenario: SqsScenario): SqsClient {
  return {
    async receiveMessages(_maxMessages: number): Promise<SqsReceiveResponse> {
      switch (scenario.type) {
        case 'messages':
          return { success: true, messages: scenario.messages };
        case 'empty':
          return { success: true, messages: [] };
        case 'error':
          return {
            success: false,
            error: { code: scenario.code, message: scenario.message },
          };
      }
    },
  };
}
