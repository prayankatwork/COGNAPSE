// We use the CDN import to completely bypass Vite's bundler and its dynamic 'fs' require bugs.
// @ts-ignore
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Skip local model check since we are running in the browser and fetching from huggingface
env.allowLocalModels = false;

/**
 * Patch fetch in this worker to rewrite Hugging Face /resolve/ URLs to /raw/.
 * This avoids 307 redirects that break CORS in the browser.
 */
{
  const origFetch = self.fetch.bind(self);
  self.fetch = (input, init) => {
    if (typeof input === 'string' && input.includes('huggingface.co/') && input.includes('/resolve/')) {
      input = input.replace('/resolve/', '/raw/');
    }
    return origFetch(input, init);
  };
}

// We use a singleton pattern for the pipeline
let classifierPromise: Promise<any> | null = null;

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = pipeline('text-classification', 'Xenova/nli-deberta-v3-small', {
      progress_callback: (x: any) => {
        self.postMessage({ status: 'progress', data: x });
      }
    });
  }
  return classifierPromise;
}

self.addEventListener('message', async (event) => {
  const { id, pairs } = event.data;

  try {
    const classifier = await getClassifier();
    
    const results = await Promise.all(
      pairs.map(async ({ premise, hypothesis }: { premise: string, hypothesis: string }) => {
        // text-classification requires the first argument to be a string
        const out = await classifier(premise, { text_pair: hypothesis });
        
        const label = out[0].label; 
        const score = out[0].score;
        
        return {
          hypothesis,
          label,
          score: Math.round(score * 100)
        };
      })
    );

    self.postMessage({ status: 'complete', id, results });
  } catch (error: any) {
    self.postMessage({ status: 'error', id, error: error.message });
  }
});
