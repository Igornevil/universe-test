# syntax=docker/dockerfile:1.7
# Multi-stage build for the Products service.
#   1. base    — node + pnpm
#   2. install — install all workspace deps (cached layer)
#   3. build   — compile contracts + products to dist
#   4. deploy  — extract a self-contained prod bundle via `pnpm deploy`
#   5. runtime — minimal image that runs migrations then the service

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.28.2

FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

FROM base AS install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/products/package.json ./apps/products/
COPY apps/notifications/package.json ./apps/notifications/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM install AS build
COPY tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY apps/products ./apps/products
RUN pnpm --filter @universe/contracts build \
 && pnpm --filter @universe/products build

FROM build AS deploy
RUN pnpm --filter @universe/products --prod --legacy deploy /prod/products

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=deploy --chown=app:app /prod/products /app
USER app
EXPOSE 3001
# Run migrations before starting the service so a fresh DB is always ready.
CMD ["sh", "-c", "node dist/modules/products/infrastructure/migrate.js && node dist/main.js"]
