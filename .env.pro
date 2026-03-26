# Database Configuration
DB_SYNCHRONIZE=false
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=lERS3DOl7juUuV6kar8kDgkKY3ms1humWXt2uvqPSdZEgInCyCrqfm0Y8BkHKRN0
DB_DATABASE=stock_gem

# JWT
JWT_SECRET=change-me-in-production-use-strong-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-too-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Superadmin (pnpm run seed:superadmin)
SUPERADMIN_EMAIL=admin@scrum-app.com
SUPERADMIN_PASSWORD=SuperAdmin123!
SUPERADMIN_NAME=Super Admin

# Environment
NODE_ENV=development
PORT=3500