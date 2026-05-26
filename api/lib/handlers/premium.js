/**
 * COGNAPSE API — Premium / Payment Handlers
 * Consolidated from: create-order.js, verify-payment.js
 */
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { applyCors, handleOptions } from '../cors.js';
import { sendSafeError } from '../errors.js';
import { rateLimit } from '../rateLimit.js';
import { requireUser, assertUserIdMatches } from '../auth.js';
import { isProduction } from '../env.js';
import { setPremiumStatus } from '../premium.js';

const PLAN_AMOUNTS = { monthly: 9900, yearly: 79900 };

/* ─── POST /api/create-order ─── */

export async function handleCreateOrder(req, res) {
  try {
    applyCors(req, res);
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = await requireUser(req, res);
    if (decoded === false) return;

    const rl = rateLimit(req, { key: 'create-order', limit: 10, windowMs: 60_000 });
    if (!rl.allowed) return res.status(429).json({ error: 'Too many payment attempts. Please wait and retry.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const plan = body.plan === 'yearly' ? 'yearly' : body.plan === 'monthly' ? 'monthly' : null;
    const currency = body.currency || 'INR';
    const receipt = body.receipt;

    let amount;
    if (plan && PLAN_AMOUNTS[plan]) {
      amount = PLAN_AMOUNTS[plan];
    } else if (isProduction) {
      return res.status(400).json({ error: 'Invalid or missing plan. Use plan: "monthly" or "yearly".' });
    } else {
      amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: 'Amount must be at least 100 paise (INR 1.00)' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) return res.status(503).json({ error: 'Payment service is not configured on the server. Contact support.' });
    if (!keyId.startsWith('rzp_')) return res.status(503).json({ error: 'Invalid Razorpay key configuration.' });

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const safeReceipt = receipt && String(receipt).length <= 40 ? String(receipt) : `cg_${Date.now().toString(36)}`.slice(0, 40);

    const order = await razorpay.orders.create({ amount: Math.round(amount), currency, receipt: safeReceipt });
    return res.status(200).json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId });
  } catch (error) {
    const razorpayMsg = error?.error?.description || error?.error?.reason || error?.error?.code || error?.description || error?.message;
    const message = razorpayMsg ? `Failed to create order: ${razorpayMsg}` : 'Failed to create order on server. Use https://cognapse.vercel.app (not a preview deploy URL).';
    return sendSafeError(res, 500, message, error);
  }
}

/* ─── POST /api/verify-payment ─── */

export async function handleVerifyPayment(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan = 'monthly' } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'Missing payment verification fields' });
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (decoded && !assertUserIdMatches(decoded, userId)) return res.status(403).json({ error: 'User ID does not match authenticated session' });

  const uid = decoded?.uid || userId;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(503).json({ error: 'Payment verification is not configured.' });

  try {
    const generated_signature = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (generated_signature !== razorpay_signature) return res.status(400).json({ success: false, error: 'Payment signature mismatch' });

    const premiumData = {
      premium: true, premiumPlan: plan, premiumActivatedAt: new Date().toISOString(),
      premiumExpiresAt: plan === 'yearly' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await setPremiumStatus(uid, premiumData);
    return res.status(200).json({ success: true, message: 'Payment verified and premium activated.', premiumData });
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') return res.status(503).json({ success: false, error: 'Payment verified but premium activation is temporarily unavailable. Contact support with your payment ID.' });
    return sendSafeError(res, 500, 'Failed to verify payment.', error);
  }
}
