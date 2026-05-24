/**
 * RabbitMQ topology constants.
 * Producers and consumers MUST import from here — never hardcode strings.
 */

export const PRODUCTS_EXCHANGE = 'products' as const;
export const PRODUCTS_EXCHANGE_TYPE = 'topic' as const;

export const NOTIFICATIONS_PRODUCT_QUEUE = 'notifications.product-events' as const;
export const NOTIFICATIONS_PRODUCT_DLQ = 'notifications.product-events.dlq' as const;

export const PRODUCTS_DLX = 'products.dlx' as const;

export const ProductRoutingKey = {
  Created: 'product.created',
  Deleted: 'product.deleted',
} as const;

export type ProductRoutingKey = (typeof ProductRoutingKey)[keyof typeof ProductRoutingKey];

/** Pattern used by the Notifications consumer to bind to all product events. */
export const PRODUCT_EVENTS_BINDING_PATTERN = 'product.*' as const;
