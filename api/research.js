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

  const { prompt, isJson, estTokens } = req.method === 'POST' ? req.body : req.query;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt parameter' });
  }

  try {
    // 1. Swarm Gateway Configurations
    const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

    const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
    const groq = groqKey ? new Groq({ apiKey: groqKey }) : null;

    // Order of execution in the Serverless Swarm
    const swarmNodes = [];
    if (estTokens > 15000) {
      swarmNodes.push({ name: "gemini-flash", type: "gemini", model: "gemini-1.5-flash" });
      swarmNodes.push({ name: "gemini-pro", type: "gemini", model: "gemini-1.5-pro" });
      swarmNodes.push({ name: "groq-llama-3.1", type: "groq", model: "llama-3.1-8b-instant" });
    } else {
      swarmNodes.push({ name: "gemini-flash", type: "gemini", model: "gemini-1.5-flash" });
      swarmNodes.push({ name: "groq-llama-3.3", type: "groq", model: "llama-3.3-70b-versatile" });
      swarmNodes.push({ name: "gemini-pro", type: "gemini", model: "gemini-1.5-pro" });
      swarmNodes.push({ name: "groq-llama-3.1", type: "groq", model: "llama-3.1-8b-instant" });
    }

    let lastError = null;

    for (const node of swarmNodes) {
      try {
        if (node.type === "gemini" && genAI) {
          const genModel = genAI.getGenerativeModel({ model: node.model });
          const result = await genModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: isJson ? { responseMimeType: "application/json" } : {}
          });
          const textResponse = (await result.response).text();
          if (textResponse) {
            const finalData = isJson ? JSON.stringify(extractJson(textResponse)) : textResponse;
            return res.status(200).json({ result: finalData });
          }
        }

        if (node.type === "groq" && groq) {
          let finalPrompt = prompt;
          if (node.model.includes("8b") && estTokens > 5500) {
             finalPrompt = prompt.substring(0, 20000) + "\n[System: Content Pruned for Stability]";
          }
          const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: finalPrompt }],
            model: node.model,
            temperature: 0.1,
            response_format: isJson ? { type: "json_object" } : undefined
          });
          const content = response.choices[0]?.message?.content || "";
          if (content) {
            const finalData = isJson ? JSON.stringify(extractJson(content)) : content;
            return res.status(200).json({ result: finalData });
          }
        }
      } catch (e) {
        lastError = e;
        continue; // Try next stable swarm node
      }
    }

    // Swarm saturated fallback
    throw new Error(`INTELLIGENCE OVERLOAD: All public cloud nodes are currently saturated. For unlimited research, we recommend enabling 'Local Acceleration' via Ollama on your machine. Last Error: ${lastError ? lastError.message : 'Unknown'}`);

  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to process AI research.',
      details: error.stack || null
    });
  }
}
