import { getFirestoreAdmin } from './firebaseAdmin.js';

export async function getPremiumStatus(userId) {
  const db = getFirestoreAdmin();
  if (!db) {
    throw new Error('SERVER_DATABASE_NOT_CONFIGURED');
  }

  const docSnap = await db.collection('user_premium').doc(userId).get();
  if (!docSnap.exists) {
    return { premium: false, message: 'No premium subscription found.' };
  }

  const data = docSnap.data();
  const now = new Date();
  const expiry = data.premiumExpiresAt ? new Date(data.premiumExpiresAt) : null;

  if (data.premium && (!expiry || expiry > now)) {
    return {
      premium: true,
      premiumPlan: data.premiumPlan || 'monthly',
      premiumExpiresAt: data.premiumExpiresAt,
      message: 'Premium status is active and verified.',
    };
  }

  return {
    premium: false,
    message: data.premium ? 'Premium access has expired.' : 'No premium subscription found.',
  };
}

export async function setPremiumStatus(userId, premiumData) {
  const db = getFirestoreAdmin();
  if (!db) {
    throw new Error('SERVER_DATABASE_NOT_CONFIGURED');
  }
  await db.collection('user_premium').doc(userId).set(premiumData);
}
