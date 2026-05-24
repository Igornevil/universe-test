import {
  ENVELOPE_SCHEMA_VERSION,
  ProductRoutingKey,
  type ProductCreatedEvent,
} from '@universe/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Notification, NotificationRepository } from '../domain/notification';

import { ConsumeProductEventHandler } from './consume-product-event.handler';

class InMemoryNotificationRepository implements NotificationRepository {
  readonly stored: Notification[] = [];
  private readonly seenEventIds = new Set<string>();

  async save(notification: Notification): Promise<boolean> {
    if (this.seenEventIds.has(notification.eventId)) {
      return false;
    }
    this.seenEventIds.add(notification.eventId);
    this.stored.push(notification);
    return true;
  }
}

const buildEvent = (overrides: Partial<ProductCreatedEvent> = {}): ProductCreatedEvent => ({
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  eventName: ProductRoutingKey.Created,
  occurredAt: '2026-05-21T10:00:00.000+00:00',
  schemaVersion: ENVELOPE_SCHEMA_VERSION,
  data: {
    id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'Coffee Mug',
    description: 'Nice mug',
    priceCents: 1500,
    currency: 'USD',
  },
  ...overrides,
});

describe('ConsumeProductEventHandler', () => {
  let repo: InMemoryNotificationRepository;
  let handler: ConsumeProductEventHandler;

  beforeEach(() => {
    repo = new InMemoryNotificationRepository();
    handler = new ConsumeProductEventHandler(repo);
  });

  it('stores a notification from a new event', async () => {
    const event = buildEvent();
    const result = await handler.execute(event);

    expect(result.stored).toBe(true);
    expect(repo.stored).toHaveLength(1);
    const stored = repo.stored[0]!;
    expect(stored.eventId).toBe(event.eventId);
    expect(stored.eventName).toBe(event.eventName);
    expect(stored.occurredAt).toEqual(new Date(event.occurredAt));
    expect(stored.payload).toEqual(event.data);
  });

  it('reports stored=false when the same event arrives twice', async () => {
    const event = buildEvent();
    const first = await handler.execute(event);
    const second = await handler.execute(event);

    expect(first.stored).toBe(true);
    expect(second.stored).toBe(false);
    expect(repo.stored).toHaveLength(1);
  });

  it('treats events with different eventIds as separate notifications', async () => {
    await handler.execute(buildEvent({ eventId: '550e8400-e29b-41d4-a716-446655440000' }));
    await handler.execute(buildEvent({ eventId: '660e8400-e29b-41d4-a716-446655440002' }));

    expect(repo.stored).toHaveLength(2);
  });
});
