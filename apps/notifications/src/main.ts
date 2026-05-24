import 'reflect-metadata';

import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { notificationsConfig } from './shared/config/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();

  const config = app.get<ConfigType<typeof notificationsConfig>>(notificationsConfig.KEY);
  await app.listen(config.NOTIFICATIONS_HEALTH_PORT);

  const logger = app.get(PinoLogger);
  logger.log(`Notifications service running (health on port ${config.NOTIFICATIONS_HEALTH_PORT})`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Notifications service', error);
  process.exit(1);
});
