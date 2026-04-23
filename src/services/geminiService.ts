import { COGNAPSE_SYSTEM_PROMPT } from '../systemPrompt';
import type { COGNAPSE_Output } from '../types';

export async function executeCognapseChat(
  query: string,
  reportContext: COGNAPSE_Output,
  chatHistory: { role: 'user' | 'model', content: string }[]
): Promise<string> {
  const formattedHistory = chatHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');

  const prompt = `You are COGNAPSE. The user just received the following structured research report.
Answer their follow-up question concisely, accurately, and naturally based on the report.
DO NOT re-run full research or output the JSON schema. Output pure plain text.

--- PREVIOUS REPORT CONTEXT ---
Title: ${reportContext.query_understood}
Bottom Line: ${reportContext.summary.bottom_line}
Full Synthesis: ${reportContext.summary.full_synthesis}
${reportContext.actionable_takeaways ? `Key Insight: ${reportContext.actionable_takeaways.key_insight}` : ''}

--- CHAT HISTORY ---
${formattedHistory}

USER: ${query}`;

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: prompt,
        system: "You are COGNAPSE, answering follow-up questions about a research report. Be concise, brilliant, and warm. No JSON, pure text.",
        stream: false,
        options: {
          temperature: 0.4
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "I was unable to formulate a response. Let me know if you would like me to try again.";
  } catch (error: any) {
    console.error("Chat error:", error);
    throw new Error("Failed to communicate with local Llama model. Ensure Ollama is running and has the llama3.2 model.");
  }
}

export async function executeCognapseResearch(
  query: string,
  userStats: { xp: number; count: number; rank: string }
): Promise<COGNAPSE_Output> {
  let modeInstruction = "";
  if (query.includes('|')) {
    modeInstruction = "\nNote: User wants batch research. Execute three separate searches simultaneously and combine results comprehensively.\n";
  } else if (query.toLowerCase().includes(' vs ')) {
    modeInstruction = "\nNote: User wants comparison. Frame the entire analysis around comparing these two entities specifically.\n";
  }

  const prompt = `CURRENT USER STATE:
XP: ${userStats.xp}
Searches Count: ${userStats.count}
Rank: ${userStats.rank}
${modeInstruction}
USER QUERY:
"${query}"`;

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: prompt,
        system: COGNAPSE_SYSTEM_PROMPT,
        stream: false,
        format: "json",
        options: {
          temperature: 0.3,
          top_p: 0.85,
          top_k: 40,
          num_ctx: 16384,
          num_predict: 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.response;

    if (!text) {
      throw new Error("Received empty response from Llama.");
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      console.error("No JSON braces found", text);
      throw new Error("LLM response did not contain a valid JSON object.");
    }

    const cleanText = text.substring(firstBrace, lastBrace + 1);

    try {
      const output = JSON.parse(cleanText) as COGNAPSE_Output;
      
      // Basic validation to prevent "incomplete data" error in UI
      if (!output.summary || !output.summary.bottom_line) {
         throw new Error("Missing required summary fields.");
      }
      
      return output;
    } catch (err) {
      console.error("Validation/Parsing failed", cleanText);
      throw new Error("Local LLM provided an incomplete intelligence structure. Please try a more specific query.");
    }
  } catch (error: any) {
    console.error("Research error:", error);
    throw new Error("Failed to communicate with local Llama model. Ensure Ollama is running and has the llama3.2 model.");
  }
}

export async function executeQuickInfo(topic: string): Promise<string> {
  const prompt = `Topic: "${topic}"
Instruction: Provide a one-sentence, highly brilliant, and concise summary of this topic. No conversational filler, just the fact.`;

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: prompt,
        system: "You are COGNAPSE. Provide 1-sentence intelligence snippets.",
        stream: false,
        options: { temperature: 0.2 }
      })
    });

    const data = await response.json();
    return data.response || "No data available for this node.";
  } catch (error) {
    return "Intelligence link failed. Manual research required.";
  }
}
