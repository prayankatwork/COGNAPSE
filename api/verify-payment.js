import crypto from 'crypto';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan = 'monthly' } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification fields' });
  }

  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    
    // Create HMAC SHA256 string
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment signature mismatch' });
    }

    if (!userId) {
      return res.status(200).json({ success: true, message: 'Payment verified, but no userId provided' });
    }

    const premiumData = {
      premium: true,
      premiumPlan: plan,
      premiumActivatedAt: new Date().toISOString(),
      premiumExpiresAt: plan === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const hasAdminCreds = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL;
    
    if (hasAdminCreds) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            })
          });
        }
        const dbAdmin = admin.firestore();
        await dbAdmin.collection('user_premium').doc(userId).set(premiumData);
        console.log(`[Admin SDK] Activated premium for user: ${userId}`);
      } catch (adminError) {
        console.error('Failed using admin SDK, falling back to Client SDK:', adminError);
        await fallbackClientUpdate(userId, premiumData);
      }
    } else {
      console.log('Firebase Private Key/Email env vars not detected. Falling back to Client SDK.');
      await fallbackClientUpdate(userId, premiumData);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Payment verified and Premium access activated successfully',
      premiumData 
    });

  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify payment or activate premium' });
  }
};

async function fallbackClientUpdate(userId, premiumData) {
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  await setDoc(doc(db, 'user_premium', userId), premiumData);
  console.log(`[Client SDK Fallback] Activated premium for user: ${userId}`);
}
