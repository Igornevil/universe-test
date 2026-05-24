import { Module, type DynamicModule, type FactoryProvider } from '@nestjs/common';

import { AMQP_URL, AmqpConnection } from './amqp-connection';

export interface MessagingModuleAsyncOptions {
  imports?: NonNullable<DynamicModule['imports']>;
  inject?: FactoryProvider['inject'];
  useFactory: (...args: never[]) => { url: string };
}

/**
 * Generic AMQP module. Provides one shared `AmqpConnection` bound to the URL
 * resolved via `forRootAsync`. Topology (exchanges, queues, bindings) is
 * owned by feature modules that use the connection.
 */
@Module({})
export class MessagingModule {
  static forRootAsync(options: MessagingModuleAsyncOptions): DynamicModule {
    return {
      module: MessagingModule,
      global: true,
      imports: options.imports,
      providers: [
        {
          provide: AMQP_URL,
          inject: options.inject,
          useFactory: (...args: never[]): string => options.useFactory(...args).url,
        },
        AmqpConnection,
      ],
      exports: [AmqpConnection],
    };
  }
}
