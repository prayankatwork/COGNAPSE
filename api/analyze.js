import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Allow CORS so that the Chrome Extension can call it
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

  const { userId, text } = req.method === 'POST' ? req.body : req.query;

  if (!userId || !text) {
    return res.status(400).json({ error: 'Missing userId or text parameter' });
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

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const docRef = doc(db, 'user_premium', userId);
    const docSnap = await getDoc(docRef);

    let isPremium = false;
    if (docSnap.exists()) {
      const data = docSnap.data();
      const now = new Date();
      const expiry = data.premiumExpiresAt ? new Date(data.premiumExpiresAt) : null;
      if (data.premium && (!expiry || expiry > now)) {
        isPremium = true;
      }
    }

    if (!isPremium) {
      return res.status(403).json({ error: 'COGNAPSE Premium Required' });
    }

    const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: 'AI Gateway is temporarily misconfigured.' });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are the COGNAPSE browser analyst. Analyze the following highlighted webpage text and return a strictly valid JSON response with these keys: "summary", "insight", "confidence", "recommendation".
Ensure the values are extremely concise, highly professional, and insightful.

Text to analyze:
"${text}"

JSON format:
{
  "summary": "Concise 1-2 sentence summary of the highlighted text",
  "insight": "1 key technical/strategic takeaway",
  "confidence": "High/Medium/Low based on analysis depth",
  "recommendation": "Optional logical follow-up action or research query"
}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const responseText = (await result.response).text();
    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText);
    } catch (e) {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        jsonResult = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI JSON response");
      }
    }

    return res.status(200).json(jsonResult);

  } catch (error) {
    console.error('Extension Analysis Error:', error);
    res.status(500).json({ error: 'Failed to process AI research insight.' });
  }
}
