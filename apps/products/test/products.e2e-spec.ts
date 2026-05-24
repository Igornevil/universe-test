import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ProductRoutingKey,
  productCreatedEventSchema,
  productDeletedEventSchema,
  type ProductEvent,
} from '@universe/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../src/modules/products/application/event-publisher';
import { AmqpConnection } from '../src/shared/messaging/amqp-connection';

import { resetDatabase } from './setup-e2e';

class RecordingPublisher implements EventPublisher {
  readonly published: ProductEvent[] = [];
  async publish(event: ProductEvent): Promise<void> {
    this.published.push(event);
  }
}

/** Stub AMQP connection so e2e tests do not require RabbitMQ to be running. */
class NoopAmqpConnection {
  async onModuleInit(): Promise<void> {
    return;
  }
  async onModuleDestroy(): Promise<void> {
    return;
  }
  async publish(): Promise<void> {
    return;
  }
}

describe('Products API (e2e)', () => {
  let app: INestApplication;
  let publisher: RecordingPublisher;

  beforeAll(async () => {
    await resetDatabase();

    publisher = new RecordingPublisher();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EVENT_PUBLISHER)
      .useValue(publisher)
      .overrideProvider(AmqpConnection)
      .useClass(NoopAmqpConnection)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await resetDatabase();
    publisher.published.length = 0;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /products', () => {
    it('creates a product and emits product.created', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Coffee Mug',
          description: 'A nice mug',
          priceCents: 1999,
          currency: 'USD',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Coffee Mug',
        description: 'A nice mug',
        priceCents: 1999,
        currency: 'USD',
      });
      expect(response.body.id).toMatch(/^[0-9a-f-]{36}$/);

      expect(publisher.published).toHaveLength(1);
      const event = productCreatedEventSchema.parse(publisher.published[0]);
      expect(event.eventName).toBe(ProductRoutingKey.Created);
      expect(event.data.id).toBe(response.body.id);
    });

    it('rejects empty name with 400 and validation details', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({ name: '', description: '', priceCents: 100, currency: 'USD' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('rejects negative priceCents', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'X', description: '', priceCents: -1, currency: 'USD' })
        .expect(400);
    });

    it('applies defaults for description and currency', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'Defaults', priceCents: 500 })
        .expect(201);

      expect(response.body.description).toBe('');
      expect(response.body.currency).toBe('USD');
    });
  });

  describe('DELETE /products/:id', () => {
    it('deletes an existing product and emits product.deleted', async () => {
      const created = await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'X', priceCents: 100 })
        .expect(201);

      publisher.published.length = 0;

      await request(app.getHttpServer()).delete(`/products/${created.body.id}`).expect(204);

      expect(publisher.published).toHaveLength(1);
      const event = productDeletedEventSchema.parse(publisher.published[0]);
      expect(event.data.id).toBe(created.body.id);

      const after = await request(app.getHttpServer())
        .delete(`/products/${created.body.id}`)
        .expect(404);
      expect(after.body.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('returns 400 for invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .delete('/products/not-a-uuid')
        .expect(400);
      expect(response.body.code).toBe('INVALID_PRODUCT_ID');
    });
  });

  describe('GET /products', () => {
    it('returns empty page when there are no products', async () => {
      const response = await request(app.getHttpServer()).get('/products').expect(200);
      expect(response.body).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    });

    it('paginates results correctly', async () => {
      for (let i = 0; i < 25; i += 1) {
        await request(app.getHttpServer())
          .post('/products')
          .send({ name: `P${i}`, priceCents: i * 10 })
          .expect(201);
      }

      const page1 = await request(app.getHttpServer())
        .get('/products?page=1&pageSize=10')
        .expect(200);
      expect(page1.body.items).toHaveLength(10);
      expect(page1.body.total).toBe(25);
      expect(page1.body.totalPages).toBe(3);

      const page3 = await request(app.getHttpServer())
        .get('/products?page=3&pageSize=10')
        .expect(200);
      expect(page3.body.items).toHaveLength(5);
    });

    it('rejects pageSize above the cap', async () => {
      await request(app.getHttpServer()).get('/products?pageSize=999').expect(400);
    });
  });
});
