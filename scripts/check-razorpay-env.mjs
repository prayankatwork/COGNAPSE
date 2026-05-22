import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync(process.argv[2] || '.env.production.check', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const id = env.RAZORPAY_KEY_ID;
const secret = env.RAZORPAY_KEY_SECRET;
const viteId = env.VITE_RAZORPAY_KEY_ID;

console.log('RAZORPAY_KEY_ID set:', !!id, id?.slice(0, 8));
console.log('RAZORPAY_KEY_SECRET set:', !!secret, 'len', secret?.length);
console.log('VITE_RAZORPAY_KEY_ID set:', !!viteId, viteId?.slice(0, 8));
console.log('Key IDs match:', id === viteId);
const idMode = id?.startsWith('rzp_live_') ? 'live' : id?.startsWith('rzp_test_') ? 'test' : 'unknown';
const viteMode = viteId?.startsWith('rzp_live_') ? 'live' : viteId?.startsWith('rzp_test_') ? 'test' : 'unknown';
console.log('Server key mode:', idMode);
console.log('Vite key mode:', viteMode);
if (id && viteId && id !== viteId) {
  console.error('MISMATCH: RAZORPAY_KEY_ID and VITE_RAZORPAY_KEY_ID differ — checkout can fail or show wrong test/live UI.');
  process.exitCode = 1;
}
if (idMode !== viteMode && id && viteId) {
  console.error('MISMATCH: server and Vite keys are different modes (test vs live).');
  process.exitCode = 1;
}
