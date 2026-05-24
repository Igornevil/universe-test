# syntax=docker/dockerfile:1.7
# Multi-stage build for the Next.js frontend using the `output: "standalone"`
# bundle, which produces a self-contained server.js plus minimal node_modules.

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
ARG NEXT_PUBLIC_PRODUCTS_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_PRODUCTS_API_URL=${NEXT_PUBLIC_PRODUCTS_API_URL}
COPY tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web
RUN pnpm --filter @universe/contracts build \
 && pnpm --filter @universe/web build

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

# Next.js standalone output places the server.js for the target app at
# apps/web/server.js inside the standalone tree.
COPY --from=build --chown=app:app /repo/apps/web/.next/standalone/ ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /repo/apps/web/public ./apps/web/public

USER app
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
