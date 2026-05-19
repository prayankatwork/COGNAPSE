import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// Helper to extract JSON safely
const extractJson = (text) => {
  try { return JSON.parse(text); } 
  catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } 
      catch (inner) {
        let cleaned = match[0].replace(/\\u\{[a-fA-F0-9]+\}/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        try { return JSON.parse(cleaned); } catch (last) { throw new Error("JSON_EXTRACTION_FAILED"); }
      }
    }
    throw new Error("NO_JSON_FOUND");
  }
};

export default async function handler(req, res) {
  // Allow CORS
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
    // 1. Verify Premium Status
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

    // 2. Swarm Gateway Configurations
    const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

    const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
    const groq = groqKey ? new Groq({ apiKey: groqKey }) : null;

    const prompt = `You are the COGNAPSE Strategic Intelligence Analyst OS. Provide an extremely concise, high-impact strategic summary and takeaway of the following webpage text.
To conserve operational credits, keep the output highly condensed, ultra-concise, and straight-to-the-point using direct, premium analytical terminology.

Text to Analyze:
"${text}"

Return a strictly valid JSON response with these exact keys:
{
  "summary": "A highly condensed strategic summary of exactly 20-30 words (strictly 2 sentences max). Be extremely direct, concise, and dense.",
  "insight": "A single premium, high-impact key takeaway of exactly 10-15 words (strictly 1 sentence).",
  "confidence": "HIGH, MEDIUM, or LOW",
  "recommendation": "An extremely brief research direction of exactly 8-12 words."
}`;

    // Order of execution in the Serverless Swarm
    const swarmNodes = [
      { name: "groq-llama-3.3", type: "groq", model: "llama-3.3-70b-versatile" },
      { name: "gemini-flash", type: "gemini", model: "gemini-1.5-flash" },
      { name: "gemini-pro", type: "gemini", model: "gemini-1.5-pro" },
      { name: "groq-llama-3.1", type: "groq", model: "llama-3.1-8b-instant" }
    ];

    let lastError = null;

    for (const node of swarmNodes) {
      try {
        console.log(`Swarm attempting node: ${node.name} (${node.model})`);

        if (node.type === "gemini" && genAI) {
          const genModel = genAI.getGenerativeModel({ model: node.model });
          const result = await genModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { 
              responseMimeType: "application/json",
              maxOutputTokens: 150
            }
          });
          const textResponse = (await result.response).text();
          if (textResponse) {
            const parsed = extractJson(textResponse);
            return res.status(200).json(parsed);
          }
        }

        if (node.type === "groq" && groq) {
          const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: node.model,
            temperature: 0.1,
            max_tokens: 150,
            response_format: { type: "json_object" }
          });
          const content = response.choices[0]?.message?.content || "";
          if (content) {
            const parsed = extractJson(content);
            return res.status(200).json(parsed);
          }
        }
      } catch (e) {
        console.warn(`Swarm node ${node.name} failed:`, e.message);
        lastError = e;
        continue; // Try next stable swarm node!
      }
    }

    // Swarm saturated fallback
    throw new Error(`INTELLIGENCE OVERLOAD: All swarm nodes are saturated. Last error: ${lastError ? lastError.message : 'Unknown'}`);

  } catch (error) {
    console.error('Extension Analysis Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process AI research insight.',
      details: error.stack || null
    });
  }
}
