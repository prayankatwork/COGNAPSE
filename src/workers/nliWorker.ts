// We use the CDN import to completely bypass Vite's bundler and its dynamic 'fs' require bugs.
// @ts-ignore
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Skip local model check since we are running in the browser and fetching from huggingface
env.allowLocalModels = false;
// Disable browser cache to avoid stale HTML error responses that may have been
// cached by the Cache API from earlier failed /resolve/ requests.
env.useBrowserCache = false;
// NOTE: We intentionally do NOT set env.remotePathTemplate here because ONNX model
// files are stored with Git LFS — /raw/ returns LFS pointer files (text) instead of
// actual binary, causing ONNX Runtime to fail. The fetch patch below selectively
// rewrites only non-ONNX files to /raw/ while leaving .onnx files on /resolve/.

/**
 * Patch fetch in this worker to rewrite Hugging Face /resolve/ URLs to /raw/.
 * This avoids 307 redirects that break CORS in the browser.
 */
{
  const origFetch = self.fetch.bind(self);
  self.fetch = (input, init) => {
    // Extract URL string from Request object or string — Transformers.js hub.js
    // constructs Request objects internally, so typeof-input check is insufficient.
    const urlStr = typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input);
    // Only rewrite non-ONNX files to /raw/. ONNX model files are stored with Git LFS,
    // and /raw/ returns LFS pointer files (text) instead of actual binary, which causes
    // ONNX Runtime to fail with "protobuf parsing failed". ONNX files must use /resolve/
    // which redirects to a CDN with proper binary content and CORS headers.
    if (urlStr.includes('huggingface.co/') && urlStr.includes('/resolve/') && !urlStr.includes('.onnx')) {
      const rewritten = urlStr.replace('/resolve/', '/raw/');
      if (typeof input === 'string') {
        input = rewritten;
      } else if (input instanceof Request) {
        input = new Request(rewritten, input);
      } else {
        input = rewritten;
      }
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
