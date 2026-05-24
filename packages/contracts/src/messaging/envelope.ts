import { z } from 'zod';

/**
 * Standard envelope wrapping every event published to the broker.
 * Carries cross-cutting metadata so consumers can implement idempotency,
 * tracing, and ordering without inspecting payload-specific fields.
 */
export const eventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventName: z.string().min(1),
  occurredAt: z.string().datetime({ offset: true }),
  schemaVersion: z.literal(1),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export const ENVELOPE_SCHEMA_VERSION = 1 as const;
