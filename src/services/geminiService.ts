import { useStore } from '../store';
import { COGNAPSE_SYSTEM_PROMPT } from '../systemPrompt';
import type { COGNAPSE_Output } from '../types';
import { callCloudAI } from './aiService';

const RESEARCH_MODEL = "gemini-1.5-flash";      
const UTILITY_MODEL = "gemini-1.5-flash";   

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

  return await callCloudAI(prompt, false, UTILITY_MODEL);
}

export async function executeCognapseResearch(
  query: string,
  userStats: { xp: number; count: number; rank: string }
): Promise<COGNAPSE_Output> {
  const prompt = `${COGNAPSE_SYSTEM_PROMPT}

USER QUERY: ${query}

--- USER CONTEXT ---
XP: ${userStats.xp}
Rank: ${userStats.rank}
Missions Completed: ${userStats.count}

Remember: Your output must be VALID JSON matching the provided schema. Structure your intelligence perfectly.`;

  const rawResponse = await callCloudAI(prompt, true, RESEARCH_MODEL);
  
  try {
    // callCloudAI already returns JSON.stringify output — parse once
    const parsed = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
    return parsed;
  } catch (error) {
    throw new Error("Intelligence synthesis format error. Please retry — cloud nodes may have returned partial data.");
  }
}

export async function executeQuickInfo(nodeName: string): Promise<string> {
  const prompt = `You are COGNAPSE. Provide a brilliant, one-sentence tactical summary of the following topic for a quick forensic snapshot: "${nodeName}"
Output pure plain text. No more than 30 words. Be sharp and professional.`;

  return await callCloudAI(prompt, false, UTILITY_MODEL);
}
