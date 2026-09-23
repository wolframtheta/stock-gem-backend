# Build stage
FROM node:24-alpine AS builder

# bcrypt (node-gyp) a Alpine
RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production stage
FROM node:24-alpine

RUN apk add --no-cache --virtual .build-deps python3 make g++

RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod \
  && apk del .build-deps

COPY --from=builder /app/dist ./dist
COPY scripts/typeorm-migration-dist.cjs ./scripts/typeorm-migration-dist.cjs
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
