import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const notificationsConfigSchema = z.object({
  NOTIFICATIONS_DATABASE_URL: z.string().url(),
  NOTIFICATIONS_RABBITMQ_URL: z.string().url(),
  NOTIFICATIONS_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  NOTIFICATIONS_HEALTH_PORT: z.coerce.number().int().positive().default(3002),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type NotificationsConfig = z.infer<typeof notificationsConfigSchema>;

export const NOTIFICATIONS_CONFIG = 'notifications';

export const notificationsConfig = registerAs(NOTIFICATIONS_CONFIG, () => {
  const parsed = notificationsConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n  ');
    throw new Error(`Invalid Notifications service configuration:\n  ${formatted}`);
  }
  return parsed.data;
});
