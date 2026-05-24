import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';

import { ProductsModule } from './modules/products/products.module';
import { productsConfig } from './shared/config/config';
import { DatabaseModule } from './shared/database/database.module';
import { HealthController } from './shared/health/health.controller';
import { MessagingModule } from './shared/messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [productsConfig],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [productsConfig.KEY],
      useFactory: (config: ConfigType<typeof productsConfig>) => ({
        pinoHttp: {
          level: config.PRODUCTS_LOG_LEVEL,
          transport:
            config.NODE_ENV === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          autoLogging: true,
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
    DatabaseModule.forRootAsync({
      inject: [productsConfig.KEY],
      useFactory: (config: ConfigType<typeof productsConfig>) => ({
        url: config.PRODUCTS_DATABASE_URL,
      }),
    }),
    MessagingModule.forRootAsync({
      inject: [productsConfig.KEY],
      useFactory: (config: ConfigType<typeof productsConfig>) => ({
        url: config.PRODUCTS_RABBITMQ_URL,
      }),
    }),
    TerminusModule,
    ProductsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
