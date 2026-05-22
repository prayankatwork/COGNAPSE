import crypto from 'crypto';
import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser, assertUserIdMatches } from './lib/auth.js';
import { setPremiumStatus } from './lib/premium.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    plan = 'monthly',
  } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification fields' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  if (decoded && !assertUserIdMatches(decoded, userId)) {
    return res.status(403).json({ error: 'User ID does not match authenticated session' });
  }

  const uid = decoded?.uid || userId;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Payment verification is not configured.' });
  }

  try {
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment signature mismatch' });
    }

    const premiumData = {
      premium: true,
      premiumPlan: plan,
      premiumActivatedAt: new Date().toISOString(),
      premiumExpiresAt:
        plan === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await setPremiumStatus(uid, premiumData);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and premium activated.',
      premiumData,
    });
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        error: 'Payment verified but premium activation is temporarily unavailable. Contact support with your payment ID.',
      });
    }
    return sendSafeError(res, 500, 'Failed to verify payment.', error);
  }
}
