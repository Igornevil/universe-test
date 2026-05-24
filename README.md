# Universe Test

> **Two-service event pipeline with a Next.js UI, written as if it were going
> to production.** A NestJS REST service writes products to its own Postgres
> and publishes domain events through RabbitMQ; a second NestJS worker
> consumes those events idempotently into its own Postgres. A Next.js
> frontend talks to the REST service and lets you list, paginate, create and
> delete products. The whole stack boots with a single `docker compose up`.

## Highlights

- **Two NestJS microservices** — Products (REST API + publisher) and
  Notifications (RabbitMQ consumer with manual ack + DLX/DLQ).
- **Separate Postgres per service** — true microservice isolation, no
  shared tables. Each service owns its Drizzle schema and migrations.
- **Type-safe wire format** — a shared `@universe/contracts` package
  exports Zod schemas + routing-key constants used by both backends and
  the frontend. Change a field name → TypeScript breaks every callsite.
- **Production architecture, ergonomic codebase.** Backend uses a
  **Feature-Sliced Modular Monolith** (`shared/` for generic infra, plus
  `modules/<feature>/` with classic domain / application / infrastructure /
  api layers inside). Frontend uses **Feature-Sliced Design (FSD)** —
  `app → views → widgets → features → entities → shared`, strict
  downward dependency rule.
- **One-command boot** — `pnpm stack:up` builds production images,
  applies migrations, brings up six containers, gates startup with
  healthchecks.
- **Hot-reload dev mode** — infra in Docker, apps on the host with
  watch mode for fast iteration.
- **Tested** — Vitest unit tests for the domain and use cases (with
  in-memory fakes), Supertest e2e against real Postgres for Products HTTP.
- **Fail-fast at boot** — services validate their entire `process.env`
  through Zod on startup; a malformed value aborts the process with a
  precise diagnostic instead of failing two minutes into traffic.

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

## TL;DR — just run it

```bash
git clone https://github.com/Igornevil/universe-test.git
cd universe-test
cp .env.example .env
pnpm stack:up           # full Docker stack (~30s first run)
pnpm db:seed:products   # optional: ~60 sample products
open http://localhost:3000
```

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

## Code organization

### Backend — Feature-Sliced Modular Monolith

Each NestJS service is split into **two top-level concerns**:

```
src/
├── shared/      # generic infra: doesn't know about products or notifications
└── modules/     # one folder per feature, fully self-contained
```

#### `shared/` — generic, reusable across features

Things any module might need, but none of them own. Provided as NestJS
dynamic modules (`forRootAsync`) so they're configured at the app boundary,
then injected into feature modules via tokens.

```
shared/
├── config/config.ts                    # Zod schema for env vars (registerAs namespace)
├── database/
│   ├── database.module.ts              # forRootAsync → provides DATABASE_CLIENT token
│   └── migrate.ts                      # runMigrations({ url, folder, label }) helper
├── messaging/
│   ├── amqp-connection.ts              # auto-reconnecting AMQP wrapper, .createChannel()
│   └── messaging.module.ts             # forRootAsync → provides AmqpConnection
├── health/health.controller.ts         # GET /health via @nestjs/terminus
└── pipes/zod-validation.pipe.ts        # generic NestJS pipe wrapping a Zod schema
```

#### `modules/<feature>/` — one feature, four layers

Example: [`apps/products/src/modules/products/`](apps/products/src/modules/products/).

```
modules/products/
├── domain/                             # pure TypeScript, no framework imports
│   ├── product.ts                      #   Entity with private ctor + create/restore factories
│   ├── money.ts                        #   Value Object — invariants in fromCents()
│   ├── errors.ts                       #   Domain errors (extend DomainError, carry stable code)
│   └── product.repository.ts           #   Repository interface + PRODUCT_REPOSITORY token
├── application/                        # use cases, outbound ports
│   ├── event-publisher.ts              #   EventPublisher interface + EVENT_PUBLISHER token
│   ├── create-product.use-case.ts      #   orchestrates: build entity → save → publish event
│   ├── delete-product.use-case.ts
│   ├── list-products.use-case.ts
│   └── __fixtures__/                   #   in-memory repo + recording publisher (test doubles)
├── infrastructure/                     # concrete implementations of domain ports
│   ├── product.repository.ts           #   Drizzle implementation of ProductRepository
│   ├── product-events.publisher.ts     #   RabbitMQ implementation of EventPublisher
│   ├── schema.ts                       #   Drizzle table definition (single source of truth)
│   ├── migrate.ts                      #   thin wrapper around shared runMigrations()
│   └── migrations/                     #   generated SQL + meta/_journal.json
├── api/                                # HTTP surface (REST controllers, filters)
│   ├── products.controller.ts          #   @Controller('products') with Zod-validated DTOs
│   └── domain-exception.filter.ts      #   maps domain errors → HTTP status codes
└── products.module.ts                  # NestJS module composing all the above
```

**Dependency rule (one-way):**

```
api ──► application ──► domain ◄── infrastructure
                          ▲
                          └── domain has zero imports from the layers above or beside it
```

This means:

- Use cases depend on `ProductRepository` (interface in domain), not on
  `DrizzleProductRepository` (impl in infrastructure). The NestJS DI
  container binds the token at boot.
- Swap Drizzle for TypeORM by touching only `infrastructure/`. Use cases
  and domain don't change.
- Unit-testing a use case is `new CreateProductUseCase(inMemoryRepo,
recordingPublisher)` — no NestJS, no DB, no broker.

**Adding a new feature** is a copy of `modules/products/` with the names
swapped — no edits to `shared/` or `AppModule` beyond a one-line `imports:
[...]` addition.

### Frontend — Feature-Sliced Design (FSD)

The web app uses the FSD layer hierarchy, adapted to Next.js App Router.

```
apps/web/src/
├── app/                                # Next.js App Router (routing, providers)
│   ├── layout.tsx
│   ├── page.tsx                        # thin — just renders <ProductsPage>
│   ├── providers.tsx                   # TanStack Query, Toaster
│   └── globals.css
├── views/                              # page compositions (FSD "pages")
│   └── products/ui/products-page.tsx   # orchestrates the products screen
├── widgets/                            # composite UI blocks
│   └── products-table/ui/products-table.tsx
├── features/                           # user actions — one slice per action
│   ├── create-product/
│   │   ├── ui/create-product-dialog.tsx
│   │   ├── model/use-create-product.ts
│   │   └── index.ts                    # ← public API
│   └── delete-product/
│       ├── ui/delete-confirm-dialog.tsx
│       ├── model/use-delete-product.ts
│       └── index.ts
├── entities/                           # business entities
│   └── product/
│       ├── api/products-api.ts         # HTTP calls (productsApi.list/create/remove)
│       ├── model/use-products.ts       # TanStack Query hook
│       ├── model/query-keys.ts         # productQueryKeys.{all,list(page,size)}
│       └── index.ts                    # ← public API: productsApi, useProducts, productQueryKeys
└── shared/                             # generic, no domain knowledge
    ├── ui/                             # shadcn primitives + Pagination + Skeleton
    ├── lib/{cn,format}.ts              # tiny helpers
    ├── api/http-client.ts              # base fetch wrapper + ApiError
    ├── config/env.ts                   # Zod-parsed NEXT_PUBLIC_*
    └── types/global.d.ts               # *.css module declarations
```

**Layer rules:**

- **Downward dependency only:** `app → views → widgets → features → entities → shared`.
  A widget may use features and shared, but never a view or app.
- **Public API via `index.ts`:** import `from '~/features/create-product'`,
  never `from '~/features/create-product/ui/create-product-dialog'`. Each
  slice's internals are private.
- **No cross-imports between slices of the same layer.** Two features
  cannot import each other directly — if they share logic, lift it into
  `entities/` or `shared/`.

This means each feature/widget/view is **self-contained**, just like the
backend modules. Same mental model on both sides of the wire.

### Shared contracts

`packages/contracts` is the single source of truth for everything that
crosses a process boundary:

```
packages/contracts/src/
├── api/
│   ├── pagination.ts                   # paginationQuerySchema, paginatedResponseSchema
│   ├── product.dto.ts                  # createProductDtoSchema, productResponseSchema
│   └── money-format.ts                 # parsePriceToCents, formatCentsAsDecimal (frontend helpers)
└── messaging/
    ├── envelope.ts                     # eventEnvelopeSchema, ENVELOPE_SCHEMA_VERSION
    ├── routing.ts                      # exchange/queue/routing-key constants
    └── product-events.ts               # productCreatedEventSchema, productDeletedEventSchema
```

Backend services import the same Zod schema the frontend uses to parse
responses, so a missed field anywhere is a TypeScript error before runtime.

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
└── docker-compose.infra.yml   # Infra only (Postgres + RabbitMQ)
```

## Prerequisites

- Node.js ≥ 20 (recommended: 22)
- pnpm ≥ 10
- Docker + Docker Compose

## Running the project

Two top-level workflows. **Production mode** is the fastest to demo and
matches what would deploy to a real environment. **Development mode** is
what you'd use while writing code — hot reload on every save, services on
the host, infra in Docker.

| URL                          | What                                        |
| ---------------------------- | ------------------------------------------- |
| http://localhost:3000        | Web UI                                      |
| http://localhost:3001        | Products REST API                           |
| http://localhost:3001/health | Products health check                       |
| http://localhost:15672       | RabbitMQ Management (login `guest`/`guest`) |

### Production mode — full Docker stack

Builds multi-stage production images (`pnpm deploy --prod` extracts a
minimal bundle into the runtime stage), runs migrations on container
start, and brings up all six services with one command:

```bash
cp .env.example .env
pnpm stack:up        # → docker compose up -d --build
```

After ~30 seconds (first build is slower), the URLs above are live. To
tear it down: `pnpm stack:down`. Tail logs across the stack:
`pnpm stack:logs`.

Health checks gate startup — `web` only starts after `products` is
healthy, which in turn waits for the Postgres and RabbitMQ containers
to be ready.

### Development mode — hot reload

Infrastructure (Postgres × 2 + RabbitMQ) runs in Docker; each Node app
runs on the host with file-watching enabled. Changes to source files
reload the relevant service in seconds.

```bash
cp .env.example .env
pnpm install
pnpm infra:up        # Postgres + RabbitMQ in Docker (no app containers)
pnpm db:migrate      # apply migrations for both services
```

Then, in separate terminals:

```bash
pnpm --filter @universe/products dev          # NestJS hot reload, port 3001
pnpm --filter @universe/notifications dev     # NestJS hot reload, health 3002
pnpm --filter @universe/web dev               # Next.js dev server, port 3000
```

Tear down: `pnpm infra:down`.

### Seeding sample products

Whichever mode you're in, populate the catalogue to exercise pagination
and the "newest first" ordering:

```bash
pnpm db:seed:products
```

Inserts ~60 realistic products with spread `createdAt`. Run multiple
times to add more rows.

### Verifying the event flow

Every product create/delete also produces a row in
`notifications_db.notifications`. Confirm with:

```bash
docker exec universe-postgres-notifications \
  psql -U notifications -d notifications \
  -c "SELECT event_name, payload FROM notifications ORDER BY received_at DESC LIMIT 10;"
```

You can also open the RabbitMQ management UI at
http://localhost:15672 (login `guest`/`guest`) to inspect the `products`
exchange, the `notifications.product-events` queue, ack rates, and the
dead-letter queue.

### Production build (without Docker)

If you need to deploy without Docker (e.g. to a bare Node host), each
app builds to a standalone artefact:

```bash
pnpm build                                            # compile all packages
pnpm --filter @universe/products start:prod          # node dist/main.js
pnpm --filter @universe/notifications start:prod
pnpm --filter @universe/web start                     # next start
```

Set the same env variables documented in [`.env.example`](.env.example)
(the Postgres URLs, RabbitMQ URL, ports, `NODE_ENV=production`) and run
migrations before booting (`pnpm db:migrate`).

## REST API

| Method | Path                           | Body / Query                                    | Response                                           |
| ------ | ------------------------------ | ----------------------------------------------- | -------------------------------------------------- |
| POST   | `/products`                    | `{ name, description?, priceCents, currency? }` | 201 `ProductResponse`                              |
| DELETE | `/products/:id`                | UUID in path                                    | 204                                                |
| GET    | `/products?page=1&pageSize=20` | offset pagination, `pageSize` ≤ 100             | 200 `{ items, total, page, pageSize, totalPages }` |
| GET    | `/health`                      | —                                               | 200 JSON via `@nestjs/terminus`                    |

Money is on the wire as integer cents (`priceCents: 1999`) to avoid any
floating-point ambiguity. The web client converts decimal strings like
`"19.99"` to cents before submitting.

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

The notifications service uses `eventId` as an idempotency key (unique
constraint on `notifications.event_id`) — duplicate deliveries become
no-ops.

Consumer ack policy:

- Schema-invalid message → `nack` without requeue → routed to DLQ via DLX
- Transient handler error → `nack` with requeue (retry on the same queue)
- Successful processing → `ack`

## Testing

```bash
pnpm typecheck                                # all packages
pnpm test                                     # unit tests (Vitest)
pnpm --filter @universe/products test:e2e     # e2e against real Postgres
```

- **Unit tests** cover the Products domain (Money value object, Product
  entity invariants, UUID validation), all three use cases (with an
  in-memory repository + recording publisher), and the Notifications
  handler. Pure TypeScript, no DB, no broker.
- **e2e tests** boot the full NestJS application via `@nestjs/testing`,
  run real Drizzle migrations against the live `products_db`, hit the
  HTTP API with Supertest, and verify both DB state and emitted events.
  The `AmqpConnection` and `EventPublisher` are stubbed so e2e tests do
  not require RabbitMQ to be running.

To run e2e locally: `pnpm infra:up && pnpm --filter @universe/products test:e2e`.

## Useful commands

| Command                          | Purpose                                           |
| -------------------------------- | ------------------------------------------------- |
| `pnpm install`                   | Install all workspace deps                        |
| `pnpm infra:up`                  | Start Postgres + RabbitMQ in Docker               |
| `pnpm infra:down`                | Stop infrastructure                               |
| `pnpm infra:logs`                | Tail infrastructure logs                          |
| `pnpm stack:up`                  | Build + start everything (apps + infra) in Docker |
| `pnpm stack:down`                | Stop the full stack                               |
| `pnpm stack:logs`                | Tail logs across the full stack                   |
| `pnpm db:migrate`                | Apply migrations to both services                 |
| `pnpm db:migrate:products`       | Migrations only for Products                      |
| `pnpm db:migrate:notifications`  | Migrations only for Notifications                 |
| `pnpm db:seed:products`          | Seed ~60 sample products                          |
| `pnpm db:generate:products`      | Generate a new migration from `schema.ts` diff    |
| `pnpm db:generate:notifications` | Same for Notifications                            |
| `pnpm build`                     | Build all packages (turbo, respects deps)         |
| `pnpm test`                      | Run unit tests across all packages                |
| `pnpm typecheck`                 | Type-check all packages                           |
| `pnpm lint`                      | ESLint across all packages                        |
| `pnpm format`                    | Format with Prettier                              |
| `pnpm format:check`              | Verify formatting without writing                 |

## Configuration

All env variables are documented in [`.env.example`](.env.example).
Highlights:

- `PRODUCTS_*` — port, database URL, RabbitMQ URL, log level for the
  Products service
- `NOTIFICATIONS_*` — same for the Notifications worker (plus its own DB)
- `POSTGRES_*` / `RABBITMQ_*` — credentials used by docker-compose for
  the infra containers
- `NEXT_PUBLIC_PRODUCTS_API_URL` — base URL the browser uses to reach
  the API (default `http://localhost:3001`)

The Products and Notifications services validate their entire
configuration on startup using Zod schemas — a missing or malformed
variable produces a clear error message and aborts the boot.

## Design decisions and trade-offs

- **RabbitMQ over SQS.** The task allowed either, but the domain is a
  textbook pub/sub fanout (Products emits, multiple consumers can
  subscribe). SQS is queue-only; the AWS-correct equivalent would be
  SNS + SQS, which is heavier than a single RabbitMQ container.
  RabbitMQ also has first-class NestJS support and a built-in
  management UI for inspecting queues during development.
- **Feature-Sliced Modular Monolith on the backend.** Top-level
  `shared/` for generic infra, `modules/<feature>/` for self-contained
  features. Inside a module, classic layered architecture (domain /
  application / infrastructure / api). Adding a new resource means
  copying one folder. Reviewable, growable, splittable into
  microservices later without touching shared.
- **Feature-Sliced Design on the frontend.** Same mental model as
  the backend — vertical slices, downward dependency rule, public
  API via `index.ts`. Easier to navigate than a flat
  `components/hooks/lib` layout.
- **Separate database per service.** Each service owns its schema and
  migrations — no shared tables, no cross-service joins.
- **Money as integer cents.** The wire and the database both use
  `priceCents`, avoiding any float arithmetic. Decimal display
  ("19.99") is purely a frontend concern.
- **`Money` value object.** Immutable class whose `fromCents` factory
  enforces invariants (integer, non-negative, supported currency). Any
  `Money` instance you receive is guaranteed valid. (The earlier
  `ProductId` VO was dropped in favour of a plain `string` +
  `assertProductId` helper — UUID validation lives in one place, no
  class indirection.)
- **Outbound port for events.** Use cases depend on an `EventPublisher`
  interface, not on RabbitMQ. The concrete `ProductEventsPublisher`
  lives in `modules/products/infrastructure/` and declares the exchange
  on bootstrap. This keeps the domain pure and makes use cases trivial
  to unit-test.
- **Publish after commit (not Transactional Outbox).** Conscious
  shortcut for the two-day budget. Products writes to its DB, then
  publishes. If the process crashes between commit and publish, the
  event is lost. The fix on a larger timeline is a transactional
  outbox table with a separate poller — see "Known limitations".

## Known limitations / future improvements

The following were intentionally deferred to stay within the time budget;
each is a clear next step rather than a missing piece:

- **Transactional Outbox** — guarantee that every committed write
  produces exactly one publish, even across crashes.
- **Idempotent message production** — consumers handle duplicate
  delivery via unique `eventId`; producers do not yet attach a stable
  idempotency key tied to a business operation.
- **Authentication / authorization** — not in scope for the task; the
  Products API is open.
- **Observability** — structured logs are in place; metrics
  (Prometheus) and distributed tracing (OpenTelemetry) are not.
- **Retry policy on publish failures** — relies on
  `amqp-connection-manager`'s auto-reconnect; a richer policy
  (exponential backoff, circuit breaker) is a next step.
- **Cursor-based pagination** — current pagination is offset/limit,
  fine for small catalogues but not for very large ones.
- **CI pipeline** — a `.github/workflows/ci.yml` running `typecheck +
lint + test` on every push/PR is the obvious first add.
