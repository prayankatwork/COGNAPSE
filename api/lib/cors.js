import { getAllowedOrigins } from './env.js';

export function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();

  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', allowed[0]);
  } else if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With'
  );
  res.setHeader('Vary', 'Origin');
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.status(204).end();
    return true;
  }
  return false;
}
