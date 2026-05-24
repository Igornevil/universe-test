import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const productsConfigSchema = z.object({
  PRODUCTS_PORT: z.coerce.number().int().positive().default(3001),
  PRODUCTS_DATABASE_URL: z.string().url(),
  PRODUCTS_RABBITMQ_URL: z.string().url(),
  PRODUCTS_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type ProductsConfig = z.infer<typeof productsConfigSchema>;

export const PRODUCTS_CONFIG = 'products';

export const productsConfig = registerAs(PRODUCTS_CONFIG, () => {
  const parsed = productsConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n  ');
    throw new Error(`Invalid Products service configuration:\n  ${formatted}`);
  }
  return parsed.data;
});
