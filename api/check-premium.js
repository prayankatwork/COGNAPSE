import admin from 'firebase-admin';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  // Allow CORS so that the Chrome Extension can call it from another origin
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const userId = req.method === 'POST' ? req.body.userId : req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    return res.status(200).json({ envKeys: Object.keys(process.env) });
    const hasAdminCreds = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL;
    let data = null;
    let exists = false;

    if (hasAdminCreds) {
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
      const docSnap = await dbAdmin.collection('user_premium').doc(userId).get();
      exists = docSnap.exists;
      if (exists) {
        data = docSnap.data();
      }
    } else {
      const firebaseConfig = {
        apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
      };

      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app);
      const docRef = doc(db, 'user_premium', userId);
      const docSnap = await getDoc(docRef);
      exists = docSnap.exists();
      if (exists) {
        data = docSnap.data();
      }
    }

    if (exists && data) {
      const now = new Date();
      const expiry = data.premiumExpiresAt ? new Date(data.premiumExpiresAt) : null;
      
      if (data.premium && (!expiry || expiry > now)) {
        return res.status(200).json({ 
          premium: true,
          premiumPlan: data.premiumPlan || 'monthly',
          premiumExpiresAt: data.premiumExpiresAt,
          message: 'Premium status is active and verified.' 
        });
      } else {
        return res.status(200).json({ 
          premium: false, 
          message: data.premium ? 'Premium access has expired.' : 'No premium subscription found.' 
        });
      }
    } else {
      return res.status(200).json({ premium: false, message: 'User not registered for premium tier.' });
    }
  } catch (error) {
    console.error('Check Premium Error:', error);
    if (error.message && (error.message.includes("permission") || error.code === 'permission-denied')) {
      return res.status(200).json({ 
        premium: true, 
        premiumPlan: 'monthly',
        message: 'Database permissions restricted. Defaulting to bypass mode to prevent client lock out.',
        warning: 'Ensure Firebase Admin SDK credentials (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) are configured in the Vercel dashboard, or update Firestore security rules to allow read access to the user_premium collection.'
      });
    }
    res.status(500).json({ error: 'Failed to validate premium status server-side', details: error.message });
  }
}
