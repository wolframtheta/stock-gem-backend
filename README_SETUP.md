# Setup del Backend

## Instal·lació de dependències

```bash
pnpm install
```

## Configuració de variables d'entorn

Crea un fitxer `.env` a l'arrel del backend amb el següent contingut:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=scrum_store
DB_PASSWORD=scrum_store
DB_DATABASE=stock_gem

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:4200

# JWT (temporal, es configurarà després)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads
```

## Executar l'aplicació

```bash
# Desenvolupament
pnpm start:dev

# Producció
pnpm build
pnpm start:prod
```

## Migracions

```bash
# Generar migració (després de canvis al schema)
pnpm migration:generate src/migrations/NomMigracio

# Executar migracions
pnpm migration:run

# Revertir última migració
pnpm migration:revert
```

### Docker / Coolify (prod, sense `src/`)

```bash
pnpm build   # ja dins la imatge
pnpm run migration:show:dist
pnpm run migration:run:dist
# equivalent sense pnpm:
node scripts/typeorm-migration-dist.cjs run
```

**Coolify:** usa **Post-deployment** (no Pre-deployment). El pre-deploy fa `docker exec` al contenidor **encara en execució** (imatge antiga) i falla si el script encara no hi és.

1. Desactiva Pre-deployment.
2. Desplega una vegada (pull + rebuild sense cache si cal).
3. Post-deployment command: `node scripts/typeorm-migration-dist.cjs run`
4. Següents deploys: el post-deploy corre al contenidor **nou** abans de donar-lo per bo.

Variables `DB_*` al servei Coolify (no cal `.env.pro` dins la imatge).

**Build Coolify:** marca `NODE_ENV=production` com a **Runtime only** (no buildtime), o el warning de pnpm/devDeps pot afectar builds sense multi-stage (aquest Dockerfile ja fa build al stage `builder` amb totes les deps).

## Tests

```bash
# Tests unitaris
pnpm test

# Tests en mode watch
pnpm test:watch

# Tests e2e
pnpm test:e2e

# Cobertura
pnpm test:cov
```

