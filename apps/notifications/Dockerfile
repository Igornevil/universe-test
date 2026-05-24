# syntax=docker/dockerfile:1.7
# Multi-stage build for the Notifications service (mirror of the Products image).

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
COPY apps/notifications ./apps/notifications
RUN pnpm --filter @universe/contracts build \
 && pnpm --filter @universe/notifications build

FROM build AS deploy
RUN pnpm --filter @universe/notifications --prod --legacy deploy /prod/notifications

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=deploy --chown=app:app /prod/notifications /app
USER app
EXPOSE 3002
CMD ["sh", "-c", "node dist/modules/product-notifications/infrastructure/migrate.js && node dist/main.js"]
