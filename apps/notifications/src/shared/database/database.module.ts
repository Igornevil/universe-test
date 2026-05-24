import {
  Inject,
  Logger,
  Module,
  type DynamicModule,
  type FactoryProvider,
  type OnModuleDestroy,
} from '@nestjs/common';
import postgres, { type Sql } from 'postgres';

export const DATABASE_URL = 'DATABASE_URL';
export const DATABASE_CLIENT = 'DATABASE_CLIENT';

export interface DatabaseModuleAsyncOptions {
  imports?: NonNullable<DynamicModule['imports']>;
  inject?: FactoryProvider['inject'];
  useFactory: (...args: never[]) => { url: string; poolSize?: number };
}

/**
 * Generic Postgres connection module. Provides a single shared postgres-js
 * client (`DATABASE_CLIENT`) configured with the URL resolved via
 * `forRootAsync`. Feature modules build their own typed Drizzle instance
 * scoped to their schema on top of this client.
 */
@Module({})
export class DatabaseModule implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly client: Sql) {}

  static forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      imports: options.imports,
      providers: [
        {
          provide: DATABASE_URL,
          inject: options.inject,
          useFactory: (...args: never[]): string => options.useFactory(...args).url,
        },
        {
          provide: DATABASE_CLIENT,
          inject: [DATABASE_URL],
          useFactory: (url: string): Sql => postgres(url, { max: 10 }),
        },
      ],
      exports: [DATABASE_CLIENT, DATABASE_URL],
    };
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing PostgreSQL connection pool');
    await this.client.end({ timeout: 5 });
  }
}
