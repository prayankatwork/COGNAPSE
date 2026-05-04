import Groq from "groq-sdk";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { model, prompt } = req.body;
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  
  if (!apiKey) return res.status(500).json({ error: 'API key not configured in Vercel settings.' });

  try {
    const groq = new Groq({ apiKey });
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: model,
      temperature: 0.1,
    });
    res.status(200).json({ response: response.choices[0]?.message?.content || "" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
