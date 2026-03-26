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

