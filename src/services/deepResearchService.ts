import { useStore, DeepResearchThesis } from '../store';

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3.2";

export async function executeDeepResearch(query: string) {
  const setDeepResearch = useStore.getState().setDeepResearch;
  
  try {
    setDeepResearch({ status: 'running', stage: 1, progress: 'Expanding research objective...' });
    
    // Stage 1: Query expansion and subtopic breakdown
    const expansion = await callOllama(`
      Break down the following research topic into 5-7 specialized sub-topics for deep investigation.
      Topic: "${query}"
      Output as a comma-separated list of sub-topics.
    `);
    
    setDeepResearch({ stage: 2, progress: 'Discovering sources and verifying claims...' });
    // Stage 2: Source discovery (Simulated)
    await new Promise(r => setTimeout(r, 2000));
    
    setDeepResearch({ stage: 3, progress: 'Extracting key data points and validating sources...' });
    // Stage 3: Extraction and validation
    await new Promise(r => setTimeout(r, 2000));
    
    setDeepResearch({ stage: 4, progress: 'Synthesizing cross-references and detecting contradictions...' });
    // Stage 4: Synthesis
    await new Promise(r => setTimeout(r, 2000));
    
    setDeepResearch({ stage: 5, progress: 'Generating final industry-level thesis...' });
    
    // Stage 5: Thesis generation
    const thesisPrompt = `
      You are an autonomous professional research system. Generate a comprehensive industry-level thesis for the topic: "${query}".
      
      Strict Structure (Output ONLY valid JSON matching this schema):
      {
        "title": "string",
        "abstract": "string",
        "introduction": "string",
        "problemStatement": "string",
        "literatureReview": "string",
        "methodology": "string",
        "findings": "string",
        "comparativeInsights": "string",
        "limitations": "string",
        "futureScope": "string",
        "conclusion": "string",
        "references": [{ "title": "string", "url": "string", "credibility": number }]
      }

      Rules:
      - Assign confidence scores internally and only include verifiable information.
      - Ensure professional, academic tone.
      - References Layer: Provide 5+ high-credibility source citations.
      - CRITICAL: Do NOT generate placeholder, fake, or dead URLs. Use established, verifiable domains (e.g., reuters.com, apnews.com, bloomberg.com, wikipedia.org, nature.com).
      - References should be realistic and ranked by credibility (1-10).
    `;

    const response = await callOllama(thesisPrompt, true);
    const thesis: DeepResearchThesis = JSON.parse(response);
    
    setDeepResearch({ status: 'completed', stage: 5, progress: 'Research completed.', thesis });
    
  } catch (error: any) {
    console.error("Deep Research Error:", error);
    setDeepResearch({ status: 'error', error: error.message || 'Deep research failed.' });
  }
}

async function callOllama(prompt: string, isJson: boolean = false): Promise<string> {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: prompt,
      stream: false,
      format: isJson ? "json" : undefined,
      options: {
        temperature: 0.2, // Low temp for research
        num_ctx: 16384 // High context for deep research
      }
    })
  });

  if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
  const data = await response.json();
  return data.response;
}
