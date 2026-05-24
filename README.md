# Universe Test

Production-style microservices test task: **Products** + **Notifications** + **Web**.

A small but architecturally complete system: a NestJS REST service that publishes
domain events through RabbitMQ to a second NestJS worker, both backed by their own
PostgreSQL databases, fronted by a Next.js UI. The whole stack runs with a single
`docker compose up`.

## Stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Language           | TypeScript 5 (strict)                              |
| Backend framework  | NestJS 10                                          |
| Database           | PostgreSQL 16 (one DB per service)                 |
| ORM + migrations   | Drizzle ORM + drizzle-kit                          |
| Message broker     | RabbitMQ 3 (topic exchange, manual ack, DLX → DLQ) |
| Frontend           | Next.js 14 (App Router) + shadcn/ui + Tailwind     |
| Server state (web) | TanStack Query                                     |
| Forms / validation | React Hook Form + Zod                              |
| Logging            | pino (via nestjs-pino, JSON in production)         |
| Monorepo           | pnpm workspaces + Turborepo                        |
| Tests              | Vitest + Supertest                                 |

## Architecture

```
┌─────────────────┐   REST/JSON    ┌────────────────────┐
│   Next.js Web   │ ─────────────► │  Products Service  │
│   (:3000)       │                │     (:3001)        │
└─────────────────┘                └─────────┬──────────┘
                                             │ publish (after DB commit)
                                             ▼
                                   ┌──────────────────────┐
                                   │ RabbitMQ topic       │
                                   │ exchange "products"  │
                                   │ routing key product.*│
                                   └─────────┬────────────┘
                                             │ queue notifications.product-events
                                             ▼
                                   ┌────────────────────────┐
                                   │ Notifications Service  │
                                   │   (worker, no HTTP)    │
                                   │   logs + persists      │
                                   └──────────┬─────────────┘
                                              │
                          ┌───────────────────┴────────────────────┐
                          ▼                                        ▼
                ┌─────────────────┐                      ┌──────────────────┐
                │  products_db    │                      │ notifications_db │
                └─────────────────┘                      └──────────────────┘
```

Each NestJS service follows a layered (DDD-flavoured) layout:

```
src/
├── domain/          # Entities, Value Objects, Repository interfaces, domain errors
├── application/     # Use cases, outbound ports (EventPublisher, …)
├── infrastructure/  # Drizzle repositories, RabbitMQ publisher/consumer
└── presentation/    # REST controllers, DTOs, exception filters (Products only)
```

The shared `@universe/contracts` package owns the wire format: Zod schemas for
API DTOs and broker event payloads, plus exchange/queue/routing-key constants
that both producer and consumer import.

## Repository layout

```
universe-test/
├── apps/
│   ├── products/        # NestJS — Products API (port 3001)
│   ├── notifications/   # NestJS — RabbitMQ worker (health port 3002)
│   └── web/             # Next.js — UI (port 3000)
├── packages/
│   └── contracts/       # Shared Zod schemas (events + API DTOs)
├── docker-compose.yml         # Full stack (apps + infra)
├── docker-compose.infra.yml   # Infra only (Postgres + RabbitMQ)
└── plan/                      # Design notes (dated planning docs)
```

## Prerequisites

- Node.js ≥ 20 (recommended: 22)
- pnpm ≥ 10
- Docker + Docker Compose

## Quick start — full Docker stack

```bash
cp .env.example .env
pnpm stack:up
```

After ~30 seconds (first build is slower):

| URL                          | What                                        |
| ---------------------------- | ------------------------------------------- |
| http://localhost:3000        | Web UI                                      |
| http://localhost:3001        | Products REST API                           |
| http://localhost:3001/health | Products health check                       |
| http://localhost:15672       | RabbitMQ Management (login `guest`/`guest`) |

To tear it down: `pnpm stack:down`.

The web UI lets you list, paginate, create and delete products. Every
create/delete also produces a row in `notifications_db.notifications` — verify
with:

```bash
docker exec universe-postgres-notifications \
  psql -U notifications -d notifications \
  -c "SELECT event_name, payload FROM notifications ORDER BY received_at DESC LIMIT 10;"
```

## Local development (apps on host, infra in Docker)

```bash
cp .env.example .env
pnpm install
pnpm infra:up                  # Postgres + RabbitMQ in Docker
pnpm --filter @universe/contracts build

# In separate terminals:
pnpm --filter @universe/products db:migrate && pnpm --filter @universe/products dev
pnpm --filter @universe/notifications db:migrate && pnpm --filter @universe/notifications dev
pnpm --filter @universe/web dev
```

## REST API

| Method | Path                           | Body / Query                                    | Response                                           |
| ------ | ------------------------------ | ----------------------------------------------- | -------------------------------------------------- |
| POST   | `/products`                    | `{ name, description?, priceCents, currency? }` | 201 `ProductResponse`                              |
| DELETE | `/products/:id`                | UUID in path                                    | 204                                                |
| GET    | `/products?page=1&pageSize=20` | offset pagination, `pageSize` ≤ 100             | 200 `{ items, total, page, pageSize, totalPages }` |
| GET    | `/health`                      | —                                               | 200 JSON via `@nestjs/terminus`                    |

Money is on the wire as integer cents (`priceCents: 1999`) to avoid any
floating-point ambiguity. The web client converts decimal strings like `"19.99"`
to cents before submitting.

Validation errors return 400 with a structured body:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "details": [{ "path": "name", "message": "Required" }]
}
```

Domain errors map to specific status codes via a Nest exception filter:
`PRODUCT_NOT_FOUND` → 404, `INVALID_PRODUCT_ID` → 400, etc.

## Messaging contract

| Concept        | Value                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| Exchange       | `products` (type `topic`, durable)                                                          |
| Routing keys   | `product.created`, `product.deleted`                                                        |
| Consumer queue | `notifications.product-events` (durable, manual ack, `x-dead-letter-exchange=products.dlx`) |
| DLX / DLQ      | `products.dlx` (fanout) → `notifications.product-events.dlq`                                |
| Prefetch       | 10                                                                                          |

Every event uses a small envelope:

```json
{
  "eventId": "550e8400-…",
  "eventName": "product.created",
  "occurredAt": "2026-05-21T21:38:10.562Z",
  "schemaVersion": 1,
  "data": { "id": "…", "name": "…", "priceCents": 1999, "currency": "USD", "description": "…" }
}
```

The notifications service uses `eventId` as an idempotency key (unique constraint
in `notifications.event_id`) — duplicate deliveries become no-ops.

Consumer behaviour:

- Schema-invalid message → `nack` without requeue → routed to DLQ via DLX
- Transient handler error → `nack` with requeue (retry on the same queue)
- Successful processing → `ack`

## Testing

```bash
pnpm typecheck                                # all packages
pnpm test                                     # unit tests (Vitest)
pnpm --filter @universe/products test:e2e     # e2e against real Postgres
```

- **Unit tests** cover the Products domain (Value Objects, Entity invariants),
  use cases (with in-memory repository + recording publisher), and the
  Notifications handler.
- **e2e tests** boot the full NestJS application via `@nestjs/testing`, run real
  Drizzle migrations against the live `products_db`, hit the HTTP API with
  Supertest, and verify both DB state and emitted events. The `AmqpConnection`
  and `EventPublisher` are stubbed so the tests do not require RabbitMQ to be
  running.

To run e2e locally: `pnpm infra:up && pnpm --filter @universe/products test:e2e`.

## Useful commands

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `pnpm install`      | Install all workspace deps                        |
| `pnpm infra:up`     | Start Postgres + RabbitMQ in Docker               |
| `pnpm infra:down`   | Stop infrastructure                               |
| `pnpm infra:logs`   | Tail infrastructure logs                          |
| `pnpm stack:up`     | Build + start everything (apps + infra) in Docker |
| `pnpm stack:down`   | Stop the full stack                               |
| `pnpm stack:logs`   | Tail logs across the full stack                   |
| `pnpm build`        | Build all packages (turbo, respects deps)         |
| `pnpm test`         | Run unit tests across all packages                |
| `pnpm typecheck`    | Type-check all packages                           |
| `pnpm format`       | Format with Prettier                              |
| `pnpm format:check` | Verify formatting without writing                 |

## Configuration

All env variables are documented in [`.env.example`](.env.example). Highlights:

- `PRODUCTS_*` — port, database URL, RabbitMQ URL, log level for the Products service
- `NOTIFICATIONS_*` — same for the Notifications worker (plus its own DB)
- `POSTGRES_*` / `RABBITMQ_*` — credentials used by docker-compose for the infra containers
- `NEXT_PUBLIC_PRODUCTS_API_URL` — base URL the browser uses to reach the API (default `http://localhost:3001`)

The Products and Notifications services validate their entire configuration on
startup using Zod schemas — a missing or malformed variable produces a clear
error message and aborts the boot.

## Design decisions and trade-offs

The full reasoning is in [plan/2026-05-21 - Universe Test - Загальний план.md](plan/2026-05-21%20-%20Universe%20Test%20-%20%D0%97%D0%B0%D0%B3%D0%B0%D0%BB%D1%8C%D0%BD%D0%B8%D0%B9%20%D0%BF%D0%BB%D0%B0%D0%BD.md).
Selected highlights:

- **RabbitMQ over SQS.** The task allowed either, but the domain is a
  textbook pub/sub fanout (Products emits, multiple consumers can subscribe).
  SQS is a queue, not a fanout primitive; the AWS-correct replacement would be
  SNS + SQS, which is heavier than a single RabbitMQ container. RabbitMQ also
  has first-class NestJS support and a built-in management UI for inspecting
  queues during development.
- **Separate database per service.** Each service owns its schema and migrations
  — no shared tables, no cross-service joins.
- **Money as integer cents.** The wire and the database both use `priceCents`,
  avoiding any float arithmetic. Decimal display ("19.99") is purely a frontend
  concern.
- **Value Objects in the domain.** `Money` and `ProductId` are immutable
  classes whose constructors enforce their invariants — any instance you receive
  is guaranteed valid.
- **Outbound port for events.** Use cases depend on an `EventPublisher`
  interface, not on RabbitMQ. The concrete implementation lives in
  `infrastructure/messaging/`. This keeps the domain pure and makes the use
  cases trivial to unit test.
- **Publish after commit (not Transactional Outbox).** Conscious shortcut for
  the two-day budget. The Products service writes to its DB, then publishes.
  If the process crashes between the two, the event is lost. The fix on a
  larger timeline is a transactional outbox table with a separate poller — see
  the "Future improvements" section.

## Known limitations / future improvements

The following were intentionally deferred to stay within the time budget; each
is a clear next step rather than a missing piece:

- **Transactional Outbox** — guarantee that every committed write produces
  exactly one publish, even across crashes.
- **Idempotent message production** — currently consumers handle duplicate
  delivery; producers do not yet attach a stable idempotency key tied to a
  business operation.
- **Authentication / authorization** — not in scope for the task; the
  Products API is open.
- **Observability** — structured logs are in place; metrics (Prometheus) and
  distributed tracing (OpenTelemetry) are not.
- **Retry policy on publish failures** — relies on amqp-connection-manager's
  auto-reconnect; a richer policy (exponential backoff, circuit breaker) is a
  next step.
- **Cursor-based pagination** — current pagination is offset/limit, fine for
  small catalogues but not for very large ones.
