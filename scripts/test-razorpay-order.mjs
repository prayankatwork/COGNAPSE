import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const key_id = env.RAZORPAY_KEY_ID;
const key_secret = env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env');
  process.exit(1);
}

const razorpay = new Razorpay({ key_id, key_secret });

try {
  const order = await razorpay.orders.create({
    amount: 9900,
    currency: 'INR',
    receipt: `cg_${Date.now().toString(36)}`.slice(0, 40),
  });
  console.log('SUCCESS', order.id, order.amount);
} catch (e) {
  console.error('RAZORPAY_ERROR', JSON.stringify(e?.error || e, null, 2));
  process.exit(1);
}
