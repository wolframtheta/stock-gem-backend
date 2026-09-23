# Build stage
FROM node:24-alpine AS builder

# bcrypt (node-gyp) a Alpine
RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build && pnpm prune --prod

# Production stage (sense pnpm/corepack — evita doble download a npm registry)
FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY scripts/typeorm-migration-dist.cjs ./scripts/typeorm-migration-dist.cjs
COPY scripts/migration-baseline.cjs ./scripts/migration-baseline.cjs
COPY scripts/migrate-article-descriptions-to-observations-dist.cjs ./scripts/migrate-article-descriptions-to-observations-dist.cjs

ENV NODE_ENV=production

EXPOSE 3000

# Coolify Pre-deployment: NO usar (exec al contenidor VELL, sense migration:run:dist).
# Coolify Post-deployment: node scripts/typeorm-migration-dist.cjs run
#   (primer deploy: desactiva post-deploy, desplega, activa post-deploy)
# Coolify: NODE_ENV=production només "Runtime", no "Available at Buildtime".
CMD ["node", "dist/src/main.js"]
