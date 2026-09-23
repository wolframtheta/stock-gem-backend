import { registerAs } from '@nestjs/config';

/**
 * Prefix de rutes HTTP dins el procés Nest.
 * - Local / accés directe al contenidor: `api` → POST /api/auth/login
 * - Coolify amb path públic `/api` i strip prefix al proxy: buit → el proxy
 *   exposa https://host/api/* i el contenidor rep /auth/login
 */
export default registerAs('app', () => {
  const raw = process.env.API_GLOBAL_PREFIX;
  const globalPrefix =
    raw === undefined ? 'api' : raw.replace(/^\/+|\/+$/g, '');

  return {
    globalPrefix,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4300',
    port: parseInt(process.env.PORT || '3000', 10),
  };
});
