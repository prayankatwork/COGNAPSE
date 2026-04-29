import { callCloudAI } from '../../../services/aiService';

const RealitySchema = {
  type: "object",
  properties: {
    realities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", description: "Must be one of: optimistic, realistic, pessimistic" },
          assumption: { type: "string" },
          outcome: { type: "string" },
          key_factors: {
            type: "array",
            items: { type: "string" }
          },
          risks: {
            type: "array",
            items: { type: "string" }
          },
          confidence: { type: "integer", description: "0-100" }
        },
        required: ["id", "type", "assumption", "outcome", "key_factors", "risks", "confidence"]
      }
    },
    divergence_insights: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["realities", "divergence_insights"]
};

export interface Reality {
  id: string;
  type: 'optimistic' | 'realistic' | 'pessimistic';
  assumption: string;
  outcome: string;
  key_factors: string[];
  risks: string[];
  confidence: number;
}

export interface ParallelRealities {
  realities: Reality[];
  divergence_insights: string[];
}

export async function generateRealities(query: string, activeInventory?: string): Promise<ParallelRealities> {
  const prompt = `You are a highly empathetic life strategist and behavioral psychologist helping someone navigate complex choices.
User scenario / dilemma: "${query}"
${activeInventory ? `\nThe user has provided a psychological self-report inventory to ground your advice in their actual lived experience, state of mind, and constraints:\n"${activeInventory}"\nEnsure the generated outcomes strictly reflect these deeply human traits and constraints.\n` : ''}
Generate EXACTLY 3 distinct potential pathways or scenarios:
1. Optimistic (best-case scenario, high effort, deeply fulfilling)
2. Realistic (the messy middle, average conditions, practical trade-offs)
3. Pessimistic (the cautionary tale, recognizing constraints, risks, and emotional toll)

For each pathway, identify the outcome, key emotional and practical factors, risks, and a confidence score.
Avoid clinical AI-speak. Write clearly, practically, and empathetically. Ensure they are meaningfully different by varying effort levels, emotional states, and external constraints.
After generating them, compare them and identify 1-2 strategic takeaways that highlight the core tension driving success vs failure.
Keep outputs lightweight, concise, and structured.

Return as JSON matching this schema: ${JSON.stringify(RealitySchema)}`;

  try {
    const response = await callCloudAI(prompt, true, 'gemini-1.5-flash');
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    return data as ParallelRealities;
  } catch (error) {
    console.error("Error generating realities:", error);
    throw error;
  }
}

export async function generateHybrid(query: string, r1: Reality, r2: Reality, activeInventory?: string): Promise<{ reality: Reality, divergence_insight: string }> {
  const prompt = `You are an insightful life coach synthesizing conflicting pathways.
User's situation: "${query}"
${activeInventory ? `\nThe user has provided their psychological context:\n"${activeInventory}"\nKeep their literal human constraints and emotional traits in mind when merging these scenarios.\n` : ''}
Two potential pathways have collided or heavily influenced each other:
Pathway 1 (${r1.type}): ${r1.outcome} (Assumption: ${r1.assumption})
Pathway 2 (${r2.type}): ${r2.outcome} (Assumption: ${r2.assumption})

Create a SINGULAR HYBRID pathway that represents the messy, realistic middle ground between these distinct possibilities.
Return a structured JSON with:
"reality": A single realistic object (id, type="realistic", assumption, outcome, key_factors, risks, confidence)
"divergence_insight": A sentence explaining the human truths exposed when these two paths intertwine.
Write in a non-robotic, incredibly empathetic, practical, and clear way.`;

  try {
    const response = await callCloudAI(prompt, true, 'gemini-1.5-flash');
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    data.reality.id = `hybrid-${Date.now()}`;
    return data as { reality: Reality, divergence_insight: string };
  } catch (error) {
    console.error("Error generating hybrid reality:", error);
    throw error;
  }
}

export async function generateExpansion(query: string, existingRealities: Reality[], activeInventory?: string): Promise<ParallelRealities> {
  const prompt = `You are a visionary life strategist forecasting the long-term, cascading effects of life decisions. 
User's original dilemma: "${query}"
${activeInventory ? `\nThe user has provided their psychological context:\n"${activeInventory}"\nFactor these deep personal traits and constraints into how situations evolve in the long term for them specifically.\n` : ''}
Based on these first-order outcomes or pathways:
${JSON.stringify(existingRealities.map(r => ({ type: r.type, outcome: r.outcome, assumption: r.assumption })), null, 2)}

Generate 3 SECOND-ORDER distinct pathways (simulating further out in time, representing deeper life consequences):
1. The Idealistic Compounding (what happens if the best case sustains and grows over time)
2. The Practical Evolution (the grounded, natural next phase of the pragmatic path)
3. The Long-term Cascade (how early constraints or failures deepen into a lasting cautionary tale, or force an eventual pivot)

For each pathway, identify the ultimate outcome, key emotional/practical factors, ongoing risks, and a confidence score.
Ensure these sound like long-term, natural human consequences—not clinical AI generations. Use empathetic, relatable language.
After generating them, compare them and identify 1-2 strategic takeaways about the enduring nature of this decision.
Keep outputs lightweight, concise, and structured.

Return as JSON matching this schema: ${JSON.stringify(RealitySchema)}`;

  try {
    const response = await callCloudAI(prompt, true, 'gemini-1.5-flash');
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    // suffix their IDs so they are identifiable and unique
    data.realities = data.realities.map((r: any) => ({ ...r, id: `second-order-${r.id}` }));
    return data as ParallelRealities;
  } catch (error) {
    console.error("Error generating second-order realities:", error);
    throw error;
  }
}
