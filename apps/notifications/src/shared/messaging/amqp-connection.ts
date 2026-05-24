import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import amqp, {
  type AmqpConnectionManager,
  type ChannelWrapper,
  type SetupFunc,
} from 'amqp-connection-manager';

export const AMQP_URL = 'AMQP_URL';

/**
 * Generic, auto-reconnecting AMQP connection wrapper.
 * Feature modules call `createChannel(setup)` to declare their own
 * exchanges/queues/bindings on top of this connection.
 */
@Injectable()
export class AmqpConnection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmqpConnection.name);
  private connection!: AmqpConnectionManager;

  constructor(@Inject(AMQP_URL) private readonly url: string) {}

  onModuleInit(): void {
    this.connection = amqp.connect([this.url], {
      heartbeatIntervalInSeconds: 15,
      reconnectTimeInSeconds: 5,
    });
    this.connection.on('connect', () => this.logger.log('AMQP connected'));
    this.connection.on('disconnect', ({ err }: { err?: Error }) =>
      this.logger.warn(`AMQP disconnected: ${err?.message ?? 'unknown'}`),
    );
  }

  /** Create a channel with a topology setup callback (declared on (re)connect). */
  createChannel(options: { json?: boolean; setup: SetupFunc }): ChannelWrapper {
    return this.connection.createChannel({
      json: options.json,
      setup: options.setup,
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing AMQP connection');
    try {
      await this.connection?.close();
    } catch (error) {
      this.logger.warn(`Error closing AMQP connection: ${(error as Error).message}`);
    }
  }
}
