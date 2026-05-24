import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';

import { ProductNotificationsModule } from './modules/product-notifications/product-notifications.module';
import { notificationsConfig } from './shared/config/config';
import { DatabaseModule } from './shared/database/database.module';
import { HealthController } from './shared/health/health.controller';
import { MessagingModule } from './shared/messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [notificationsConfig],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [notificationsConfig.KEY],
      useFactory: (config: ConfigType<typeof notificationsConfig>) => ({
        pinoHttp: {
          level: config.NOTIFICATIONS_LOG_LEVEL,
          transport:
            config.NODE_ENV === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          autoLogging: true,
        },
      }),
    }),
    DatabaseModule.forRootAsync({
      inject: [notificationsConfig.KEY],
      useFactory: (config: ConfigType<typeof notificationsConfig>) => ({
        url: config.NOTIFICATIONS_DATABASE_URL,
      }),
    }),
    MessagingModule.forRootAsync({
      inject: [notificationsConfig.KEY],
      useFactory: (config: ConfigType<typeof notificationsConfig>) => ({
        url: config.NOTIFICATIONS_RABBITMQ_URL,
      }),
    }),
    TerminusModule,
    ProductNotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
