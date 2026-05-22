export const isProduction =
  process.env.VERCEL_ENV === 'production' ||
  process.env.NODE_ENV === 'production';

export const requireAuth =
  process.env.COGNAPSE_REQUIRE_AUTH !== 'false' && isProduction;

export const allowDevBypass =
  !isProduction && process.env.ALLOW_DEV_BYPASS === 'true';

export function getAllowedOrigins() {
  const fromEnv = process.env.ALLOWED_ORIGINS;
  if (fromEnv) {
    return fromEnv.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return [
    'https://cognapse.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
}
