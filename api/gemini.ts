import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { model, prompt, isJson } = req.body;
  
  // Look for GEMINI_API_KEY first (production secure), fallback to VITE_ if testing locally
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) return res.status(500).json({ error: 'API key not configured in Vercel settings.' });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: isJson ? { responseMimeType: "application/json" } : {}
    });
    
    res.status(200).json({ response: (await result.response).text() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
