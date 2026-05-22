import Razorpay from 'razorpay';
import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { rateLimit } from './lib/rateLimit.js';
import { requireUser } from './lib/auth.js';
import { isProduction } from './lib/env.js';

/** Server-authoritative plan prices (paise). Client amounts are ignored in production. */
const PLAN_AMOUNTS = {
  monthly: 9900,
  yearly: 79900,
};

function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

export default async function handler(req, res) {
  try {
    applyCors(req, res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await requireUser(req, res);
    if (decoded === false) return;

    const rl = rateLimit(req, { key: 'create-order', limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return res.status(429).json({ error: 'Too many payment attempts. Please wait and retry.' });
    }

    const body = parseBody(req);
    const plan = body.plan === 'yearly' ? 'yearly' : body.plan === 'monthly' ? 'monthly' : null;
    const currency = body.currency || 'INR';
    const receipt = body.receipt;

    let amount;
    if (plan && PLAN_AMOUNTS[plan]) {
      amount = PLAN_AMOUNTS[plan];
    } else if (isProduction) {
      return res.status(400).json({
        error: 'Invalid or missing plan. Use plan: "monthly" or "yearly".',
      });
    } else {
      amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 100) {
        return res.status(400).json({ error: 'Amount must be at least 100 paise (INR 1.00)' });
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) {
      return res.status(503).json({
        error: 'Payment service is not configured on the server. Contact support.',
      });
    }
    if (!keyId.startsWith('rzp_')) {
      return res.status(503).json({ error: 'Invalid Razorpay key configuration.' });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const safeReceipt =
      receipt && String(receipt).length <= 40
        ? String(receipt)
        : `cg_${Date.now().toString(36)}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt: safeReceipt,
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (error) {
    const razorpayMsg =
      error?.error?.description ||
      error?.error?.reason ||
      error?.error?.code ||
      error?.description ||
      error?.message;
    const message = razorpayMsg
      ? `Failed to create order: ${razorpayMsg}`
      : 'Failed to create order on server. Use https://cognapse.vercel.app (not a preview deploy URL).';
    return sendSafeError(res, 500, message, error);
  }
}
