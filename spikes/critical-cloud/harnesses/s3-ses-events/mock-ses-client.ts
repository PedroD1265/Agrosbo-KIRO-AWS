/**
 * S3 Harness -- Mock SES Client
 *
 * DISPOSABLE -- not production code.
 */

import type { SendEmailRequest, SesResponse } from './types.js';
import type { SesClient } from './ses-client.js';

export type SesScenario =
  | { type: 'success' }
  | { type: 'timeout'; delayMs: number }
  | { type: 'error'; code: string; message: string };

let messageCounter = 0;

export function createMockSesClient(scenario: SesScenario): SesClient {
  return {
    async sendEmail(_request: SendEmailRequest): Promise<SesResponse> {
      switch (scenario.type) {
        case 'success':
          messageCounter++;
          return {
            success: true,
            result: { messageId: `mock-msg-${messageCounter}-${Date.now()}` },
          };
        case 'timeout':
          await new Promise((resolve) => setTimeout(resolve, scenario.delayMs));
          throw new Error(`SES request timed out after ${scenario.delayMs}ms`);
        case 'error':
          return {
            success: false,
            error: { code: scenario.code, message: scenario.message },
          };
      }
    },
  };
}
