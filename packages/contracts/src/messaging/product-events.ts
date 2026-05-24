import { z } from 'zod';

import { eventEnvelopeSchema } from './envelope.js';
import { ProductRoutingKey } from './routing.js';

const productCreatedDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  priceCents: z.number().int().nonnegative(),
  currency: z.literal('USD'),
});

const productDeletedDataSchema = z.object({
  id: z.string().uuid(),
});

export const productCreatedEventSchema = eventEnvelopeSchema.extend({
  eventName: z.literal(ProductRoutingKey.Created),
  data: productCreatedDataSchema,
});

export const productDeletedEventSchema = eventEnvelopeSchema.extend({
  eventName: z.literal(ProductRoutingKey.Deleted),
  data: productDeletedDataSchema,
});

export const productEventSchema = z.discriminatedUnion('eventName', [
  productCreatedEventSchema,
  productDeletedEventSchema,
]);

export type ProductCreatedEvent = z.infer<typeof productCreatedEventSchema>;
export type ProductDeletedEvent = z.infer<typeof productDeletedEventSchema>;
export type ProductEvent = z.infer<typeof productEventSchema>;
