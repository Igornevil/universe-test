import 'reflect-metadata';

import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { productsConfig } from './shared/config/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();
  app.enableCors({ origin: true, credentials: true });

  const config = app.get<ConfigType<typeof productsConfig>>(productsConfig.KEY);
  await app.listen(config.PRODUCTS_PORT);

  const logger = app.get(PinoLogger);
  logger.log(`Products service listening on port ${config.PRODUCTS_PORT}`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Products service', error);
  process.exit(1);
});
