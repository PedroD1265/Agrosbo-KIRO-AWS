/**
 * S3 Harness -- Correlation & Deduplication
 *
 * In-memory store for correlating SES events by MessageId.
 * Handles: deduplication, out-of-order, expiry.
 *
 * DISPOSABLE -- not production code.
 */

import type { CorrelationRecord, DeliveryState, EventBridgeEvent } from './types.js';

const MAX_AGE_MS = 60_000; // events older than 60s are rejected

export interface ProcessResult {
  accepted: boolean;
  duplicate: boolean;
  outOfOrder: boolean;
  expired: boolean;
  reason?: string;
  record?: CorrelationRecord;
}

export class CorrelationStore {
  private records = new Map<string, CorrelationRecord>();
  private processedEventIds = new Set<string>();

  /**
   * Process an incoming event. Returns processing result.
   */
  process(event: EventBridgeEvent, nowMs: number = Date.now()): ProcessResult {
    const eventId = event.id;
    const messageId = event.detail.messageId;
    const detailType = event['detail-type'];

    // Deduplication by event ID
    if (this.processedEventIds.has(eventId)) {
      return {
        accepted: false,
        duplicate: true,
        outOfOrder: false,
        expired: false,
        reason: 'duplicate_event',
      };
    }

    // Check event age
    const eventTime = new Date(event.time).getTime();
    if (nowMs - eventTime > MAX_AGE_MS) {
      return {
        accepted: false,
        duplicate: false,
        outOfOrder: false,
        expired: true,
        reason: 'event_expired',
      };
    }

    // Map detail-type to state
    const newState = mapState(detailType);
    if (!newState) {
      return {
        accepted: false,
        duplicate: false,
        outOfOrder: false,
        expired: false,
        reason: `unknown_detail_type: ${detailType}`,
      };
    }

    // Get or create record
    let record = this.records.get(messageId);
    let outOfOrder = false;

    if (!record) {
      // First event for this messageId
      record = { messageId, state: newState, events: [eventId] };
      if (newState === 'SENT') {
        record.sentAt = event.time;
      } else if (newState === 'DELIVERED') {
        // Delivery before Send -- out of order but accepted
        record.deliveredAt = event.time;
        outOfOrder = true;
      }
      this.records.set(messageId, record);
    } else {
      // Existing record -- apply state transition
      if (newState === 'DELIVERED' && record.state === 'SENT') {
        // Normal transition
        record.state = 'DELIVERED';
        record.deliveredAt = event.time;
        record.events.push(eventId);
      } else if (newState === 'SENT' && record.state === 'DELIVERED') {
        // Sent arrived after Delivered -- out of order, record but don't downgrade
        record.sentAt = event.time;
        record.events.push(eventId);
        outOfOrder = true;
      } else if (newState === record.state) {
        // Same state repeated -- idempotent, mark as duplicate
        this.processedEventIds.add(eventId);
        return {
          accepted: false,
          duplicate: true,
          outOfOrder: false,
          expired: false,
          reason: 'idempotent_state',
        };
      } else {
        record.events.push(eventId);
      }
    }

    this.processedEventIds.add(eventId);
    return { accepted: true, duplicate: false, outOfOrder, expired: false, record };
  }

  getRecord(messageId: string): CorrelationRecord | undefined {
    return this.records.get(messageId);
  }

  getStats(): { total: number; sent: number; delivered: number } {
    let sent = 0;
    let delivered = 0;
    for (const r of this.records.values()) {
      if (r.state === 'SENT') sent++;
      else delivered++;
    }
    return { total: this.records.size, sent, delivered };
  }

  clear(): void {
    this.records.clear();
    this.processedEventIds.clear();
  }
}

function mapState(detailType: string): DeliveryState | null {
  switch (detailType) {
    case 'Email Sent':
      return 'SENT';
    case 'Email Delivered':
      return 'DELIVERED';
    default:
      return null;
  }
}
