/**
 * S3 Harness -- Cleanup Plan
 *
 * Defines the ordered cleanup steps for spike resources.
 * Resources are NOT created in T09 -- this is documentation for T12.
 *
 * DISPOSABLE -- not production code.
 */

import type { CleanupStep, HarnessConfig } from './types.js';

export function buildCleanupPlan(config: HarnessConfig): CleanupStep[] {
  return [
    {
      order: 1,
      service: 'EventBridge',
      action: 'remove-targets',
      resource: `rule/${config.eventBridgeRule} target: SQS queue`,
      reversible: true,
    },
    {
      order: 2,
      service: 'EventBridge',
      action: 'delete-rule',
      resource: `rule/${config.eventBridgeRule}`,
      reversible: true,
    },
    {
      order: 3,
      service: 'SES',
      action: 'delete-configuration-set-event-destination',
      resource: `${config.configurationSet}/agrosbo-spike-eb-dest`,
      reversible: true,
    },
    {
      order: 4,
      service: 'SES',
      action: 'delete-configuration-set',
      resource: config.configurationSet,
      reversible: true,
    },
    {
      order: 5,
      service: 'SQS',
      action: 'delete-queue',
      resource: config.sqsQueueName,
      reversible: false,
    },
  ];
}
