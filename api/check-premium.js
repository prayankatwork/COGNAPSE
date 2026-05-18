import { initializeApp } from 'firebase/app';
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
    const docRef = doc(db, 'user_premium', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
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
    res.status(500).json({ error: 'Failed to validate premium status server-side' });
  }
}
