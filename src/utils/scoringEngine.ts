import nlp from 'compromise';
import { lookupDomain, factualToScore } from './domainCredibility';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let embedderLoading = false;
let embedderReady = false;

/**
 * Patch global fetch to rewrite Hugging Face /resolve/ URLs to /raw/.
 * This avoids 307 redirects that break CORS in the browser.
 * Transformers.js env.remotePathTemplate is unreliable, so we intercept at the network level.
 */
let hfFetchPatched = false;
function patchHuggingFaceFetch() {
  if (hfFetchPatched) return;
  hfFetchPatched = true;

  const origFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    // Extract URL string from Request object or string — Transformers.js hub.js
    // constructs Request objects internally, so typeof-input check is insufficient.
    const urlStr = typeof input === 'string'
      ? input
      : input instanceof Request
        ? (input as Request).url
        : String(input);
    // Only rewrite non-ONNX files to /raw/. ONNX model files are stored with Git LFS,
    // and /raw/ returns LFS pointer files (text) instead of actual binary, which causes
    // ONNX Runtime to fail with "protobuf parsing failed". ONNX files must use /resolve/
    // which redirects to a CDN with proper binary content and CORS headers.
    if (urlStr.includes('huggingface.co/') && urlStr.includes('/resolve/') && !urlStr.includes('.onnx')) {
      const rewritten = urlStr.replace('/resolve/', '/raw/');
      // Preserve original input type: reconstruct Request if input was a Request;
      // fall back to string for URL objects or unknown types.
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

/**
 * Eagerly preload the Transformers.js embedding model in the background.
 * Call this on app boot so the 23MB model is cached before the user runs research.
 * The singleton guard in getEmbedder() ensures only one download starts.
 */
export function preloadModels(): void {
  getEmbedder().catch(() => {});
}

export async function getEmbedder(): Promise<any> {
  if (embedderReady) return embedder;
  if (embedderLoading) {
    while (embedderLoading) await new Promise(r => setTimeout(r, 100));
    return embedder;
  }
  embedderLoading = true;
  // Patch fetch so model file requests use /raw/ instead of /resolve/
  patchHuggingFaceFetch();
  try {
    // @ts-expect-error - CDN module has no type declarations
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
    env.allowLocalModels = false;
    // Disable browser cache to avoid stale HTML error responses that may have been
    // cached by the Cache API from earlier failed /resolve/ requests.
    env.useBrowserCache = false;
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    embedderReady = true;
    return embedder;
  } catch (e) {
    console.warn('[ScoringEngine] Transformers.js unavailable, using fallback scoring:', e);
    return null;
  } finally {
    embedderLoading = false;
  }
}


export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const mag = Math.sqrt(na) * Math.sqrt(nb);
  return mag === 0 ? 0 : dot / mag;
}

function averageEmbedding(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) avg[i] += v[i] / vectors.length;
  }
  return avg;
}

export async function computeSemanticRelevance(
  query: string,
  sourceTexts: string[]
): Promise<{ scores: number[]; average: number }> {
  const pipe = await getEmbedder();
  if (!pipe) return { scores: sourceTexts.map(() => 0.5), average: 0.5 };

  try {
    const qEmb = await pipe(query, { pooling: 'mean', normalize: true });
    const sEmbs = await Promise.all(
      sourceTexts.map(async (t) => {
        const emb = await pipe(t.slice(0, 500), { pooling: 'mean', normalize: true });
        return emb.data as number[];
      })
    );
    const qData = qEmb.data as number[];
    const scores = sEmbs.map((s) => cosineSimilarity(qData, s));
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { scores, average: avg };
  } catch {
    return { scores: sourceTexts.map(() => 0.5), average: 0.5 };
  }
}

export async function computeConsensusScore(
  sourceTexts: string[]
): Promise<{ score: number; agreementRate: number }> {
  const pipe = await getEmbedder();
  if (!pipe || sourceTexts.length < 2) {
    return { score: 0, agreementRate: 1 };
  }

  try {
    const embs = await Promise.all(
      sourceTexts.map(async (t) => {
        const e = await pipe(t.slice(0, 300), { pooling: 'mean', normalize: true });
        return e.data as number[];
      })
    );

    let pairwiseSum = 0;
    let pairwiseCount = 0;
    for (let i = 0; i < embs.length; i++) {
      for (let j = i + 1; j < embs.length; j++) {
        pairwiseSum += cosineSimilarity(embs[i], embs[j]);
        pairwiseCount++;
      }
    }
    const avgSimilarity = pairwiseCount > 0 ? pairwiseSum / pairwiseCount : 0;
    const agreementRate = Math.max(0, Math.min(1, avgSimilarity));
    const score = Math.round(agreementRate * 100) / 100;
    return { score, agreementRate };
  } catch {
    return { score: 0, agreementRate: 0.5 };
  }
}

export function computeEntityDiversity(sources: { domain?: string; key_finding?: string; title?: string }[]): {
  entityCount: number;
  orgCount: number;
  placeCount: number;
  personCount: number;
  topicCount: number;
  diversityScore: number;
} {
  if (sources.length === 0) return { entityCount: 0, orgCount: 0, placeCount: 0, personCount: 0, topicCount: 0, diversityScore: 0 };

  const allOrgs = new Set<string>();
  const allPlaces = new Set<string>();
  const allPeople = new Set<string>();
  const allTopics = new Set<string>();
  const allDomains = new Set<string>();

  for (const s of sources) {
    const text = `${s.title || ''} ${s.key_finding || ''}`;
    const doc = nlp(text);

    const orgs = doc.organizations().out('array') as string[];
    orgs.forEach((o) => allOrgs.add(o.toLowerCase()));

    const places = doc.places().out('array') as string[];
    places.forEach((p) => allPlaces.add(p.toLowerCase()));

    const people = doc.people().out('array') as string[];
    people.forEach((p) => allPeople.add(p.toLowerCase()));

    const nouns = doc.nouns().out('array') as string[];
    nouns.forEach((n) => allTopics.add(n.toLowerCase()));

    if (s.domain) allDomains.add(s.domain);
  }

  const entityCount = allOrgs.size + allPlaces.size + allPeople.size;
  const maxPossible = sources.length * 3;
  const entityRatio = maxPossible > 0 ? Math.min(entityCount / maxPossible, 1) : 0;
  const domainRatio = Math.min(allDomains.size / sources.length, 1);

  const diversityScore = Math.round(
    (entityRatio * 0.5 + domainRatio * 0.3 + Math.min(allTopics.size / (sources.length * 2), 1) * 0.2) * 100
  ) / 100;

  return {
    entityCount,
    orgCount: allOrgs.size,
    placeCount: allPlaces.size,
    personCount: allPeople.size,
    topicCount: allTopics.size,
    diversityScore,
  };
}



/* ─── AFINN-111 Word-List Sentiment Analysis ─── */

/**
 * AFINN-111 is a list of English words rated for valence with an integer
 * between -5 (negative) and +5 (positive). This is a curated subset relevant
 * for news/article bias detection — 0KB download, <0.1ms inference.
 */
const AFINN_WORDS: Record<string, number> = {
  // Strong positive (+5)
  'amazing': 5, 'awesome': 5, 'brilliant': 5, 'excellent': 5, 'extraordinary': 5,
  'fantastic': 5, 'gorgeous': 5, 'incredible': 5, 'magnificent': 5, 'masterpiece': 5,
  'miraculous': 5, 'outstanding': 5, 'perfect': 5, 'phenomenal': 5, 'remarkable': 5,
  'splendid': 5, 'stunning': 5, 'superb': 5, 'terrific': 5, 'triumph': 5,
  'wonderful': 5, 'genius': 5,
  // Strong positive (+4)
  'breakthrough': 4, 'flourishing': 4, 'heroic': 4, 'huge': 4, 'immense': 4,
  'impressive': 4, 'inspired': 4, 'innovative': 4, 'liberate': 4, 'overwhelming': 4,
  'profound': 4, 'revolutionary': 4, 'spectacular': 4, 'thrilled': 4, 'unprecedented': 4,
  'victory': 4, 'win': 4,
  // Moderate positive (+3)
  'beautiful': 3, 'benefit': 3, 'better': 3, 'celebrate': 3, 'cheer': 3,
  'confident': 3, 'delight': 3, 'easy': 3, 'effective': 3, 'efficient': 3,
  'empower': 3, 'encourage': 3, 'enhance': 3, 'enthusiasm': 3, 'excited': 3,
  'flourish': 3, 'fortunate': 3, 'freedom': 3, 'generous': 3, 'glad': 3,
  'great': 3, 'happiness': 3, 'happy': 3, 'healthy': 3, 'hopeful': 3,
  'joy': 3, 'lovely': 3, 'luck': 3, 'marvelous': 3, 'nice': 3,
  'optimistic': 3,  'passion': 3, 'peace': 3, 'pleasure': 3,
  'positive': 3, 'progress': 3, 'prosperity': 3,  'proud': 3, 'safe': 3,
  'satisfied': 3,
  'smart': 3, 'success': 3, 'superior': 3,
  'thank': 3, 'thrive': 3, 'truth': 3,
  // Mild positive (+2)
  'ability': 2, 'accept': 2, 'accomplish': 2, 'achieve': 2, 'admire': 2,
  'advantage': 2, 'agree': 2, 'amaze': 2, 'appeal': 2, 'appreciate': 2,
  'approve': 2, 'assure': 2, 'attract': 2, 'bless': 2, 'calm': 2,
  'capable': 2, 'care': 2, 'champion': 2, 'charm': 2, 'comfort': 2,
  'commit': 2, 'compassion': 2, 'competent': 2, 'complete': 2, 'connect': 2,
  'conscience': 2, 'cool': 2, 'courage': 2, 'creative': 2, 'curious': 2,
  'dedicate': 2, 'deserve': 2, 'devoted': 2, 'dignity': 2, 'diplomacy': 2,
  'elegant': 2, 'embrace': 2, 'emerge': 2, 'endorse': 2, 'enjoy': 2,
  'enlighten': 2, 'ensure': 2, 'enthusiastic': 2, 'essential': 2, 'ethical': 2,
  'excel': 2, 'fair': 2, 'faith': 2, 'favor': 2, 'fine': 2,
  'flourished': 2, 'focused': 2, 'fond': 2, 'gain': 2, 'gift': 2,
  'good': 2, 'grace': 2, 'grateful': 2, 'growth': 2, 'harmony': 2,
  'heal': 2, 'help': 2, 'honest': 2, 'honor': 2, 'hope': 2,
  'humane': 2, 'ideal': 2, 'improve': 2, 'independent': 2, 'inspire': 2,
  'integrity': 2, 'intelligent': 2, 'interest': 2, 'justice': 2, 'keen': 2,
  'kind': 2, 'leading': 2, 'learn': 2, 'legacy': 2, 'legitimate': 2,
  'light': 2, 'love': 2, 'loyal': 2, 'mercy': 2, 'merit': 2,
  'moral': 2, 'natural': 2, 'necessary': 2, 'noble': 2, 'open': 2,
  'opportunity': 2,  'patient': 2, 'peaceful': 2, 'perfectly': 2,
  'persist': 2, 'pioneer': 2, 'polite': 2, 'popular': 2, 'powerful': 2,
  'praise': 2, 'precious': 2, 'premium': 2, 'prepare': 2, 'pretty': 2,
  'protect': 2,  'pure': 2, 'purpose': 2, 'quality': 2,
  'rapid': 2, 'reasonable': 2, 'reform': 2, 'reliable': 2, 'relief': 2,
  'resolve': 2, 'respect': 2, 'responsible': 2, 'restore': 2, 'reward': 2,
  'rich': 2, 'right': 2, 'robust': 2, 'safety': 2, 'satisfy': 2,
  'save': 2,  'sensible': 2, 'shine': 2, 'sincere': 2,
  'skill': 2,  'smile': 2, 'smooth': 2, 'soul': 2,
  'spark': 2, 'spirit': 2, 'stable': 2, 'steady': 2, 'stimulate': 2,
  'strength': 2, 'strong': 2, 'succeed': 2, 'support': 2, 'supreme': 2,
  'sustainable': 2, 'swift': 2, 'talent': 2, 'thankful': 2,
  'thorough': 2, 'thriving': 2, 'top': 2, 'tough': 2, 'transform': 2,
  'transparent': 2, 'trust': 2, 'unique': 2, 'unity': 2, 'valuable': 2,
  'vibrant': 2, 'virtue': 2, 'vision': 2, 'vital': 2, 'wealth': 2,
  'welcome': 2, 'wellness': 2, 'wisdom': 2, 'worthy': 2, 'zeal': 2,
  // Mild negative (-2)
  'abandon': -2, 'adverse': -2, 'afraid': -2, 'aggressive': -2, 'alarm': -2,
  'anger': -2, 'angry': -2, 'anxiety': -2, 'anxious': -2, 'apathy': -2,
  'appalling': -2, 'arrogant': -2, 'ashamed': -2, 'assault': -2, 'atrocious': -2,
  'attack': -2, 'avoid': -2, 'bad': -2, 'bankrupt': -2, 'betray': -2,
  'bitter': -2, 'blame': -2, 'bleak': -2, 'boring': -2, 'break': -2,
  'brutal': -2, 'burden': -2, 'catastrophe': -2, 'caution': -2, 'collapse': -2,
  'conflict': -2, 'confuse': -2, 'conspiracy': -2, 'corrupt': -2, 'coward': -2,
  'crisis': -2, 'cruel': -2, 'damage': -2, 'danger': -2, 'deadly': -2,
  'debt': -2, 'deceive': -2, 'decline': -2, 'defeat': -2, 'defect': -2,
  'defy': -2, 'depress': -2, 'desperate': -2, 'destroy': -2, 'destruction': -2,
  'detain': -2, 'devastate': -2, 'difficult': -2, 'disagree': -2, 'disappear': -2,
  'disappoint': -2, 'disaster': -2, 'discard': -2, 'discrimination': -2, 'disgrace': -2,
  'disgust': -2, 'dishonest': -2, 'dismal': -2, 'dismiss': -2, 'disorder': -2,
  'dispute': -2, 'disrespect': -2, 'disrupt': -2, 'dissent': -2, 'distort': -2,
  'distress': -2, 'disturb': -2, 'doubt': -2, 'dread': -2, 'drought': -2,
  'dumb': -2, 'dump': -2, 'duty': -2, 'emergency': -2, 'enemy': -2,
  'envy': -2, 'epidemic': -2, 'error': -2, 'evade': -2, 'evil': -2,
  'exaggerate': -2, 'extreme': -2, 'fail': -2,
  'fear': -2, 'flaw': -2, 'forbid': -2, 'forced': -2, 'foreclosure': -2,
  'fragile': -2, 'fraud': -2, 'fright': -2, 'frustrate': -2, 'greed': -2,
  'grief': -2, 'grim': -2, 'guilt': -2, 'hardship': -2, 'harm': -2,
  'harsh': -2, 'hate': -2, 'havoc': -2, 'hazard': -2, 'helpless': -2,
  'hostile': -2, 'humiliate': -2, 'hurt': -2, 'ignorant': -2, 'illegal': -2,
  'illness': -2, 'impose': -2, 'impossible': -2, 'impoverish': -2, 'inadequate': -2,
  'incompetent': -2, 'inevitable': -2, 'inexcusable': -2, 'inflation': -2, 'injury': -2,
  'injustice': -2, 'insane': -2, 'insecurity': -2, 'insult': -2, 'interrupt': -2,
  'intimidate': -2, 'invade': -2, 'irresponsible': -2, 'jealous': -2, 'jeopardy': -2,
  'junk': -2, 'kill': -2, 'lack': -2, 'lag': -2, 'lawsuit': -2,
  'lazy': -2, 'leak': -2, 'liability': -2, 'lie': -2, 'limp': -2,
  'litigation': -2, 'lobby': -2, 'lockdown': -2, 'loot': -2, 'lose': -2,
  'loss': -2, 'lost': -2, 'malice': -2, 'manipulate': -2, 'meltdown': -2,
  'menace': -2, 'miserable': -2,
  'mislead': -2, 'mistake': -2,
  'monopoly': -2, 'mourn': -2, 'murder': -2, 'neglect': -2, 'nervous': -2,
  'nightmare': -2, 'nonsense': -2, 'nuclear': -2, 'obsolete': -2, 'obstacle': -2,
  'offend': -2, 'oppose': -2, 'oppression': -2, 'outage': -2, 'outburst': -2,
  'outrage': -2, 'overdue': -2, 'overthrow': -2, 'overwhelmed': -2, 'pain': -2,
  'panic': -2, 'penalty': -2, 'peril': -2, 'petty': -2, 'plague': -2,
  'plea': -2, 'plummet': -2, 'plunge': -2, 'poor': -2, 'poverty': -2,
  'prejudice': -2, 'pressure': -2, 'prevent': -2, 'problem': -2, 'propaganda': -2,
  'protest': -2, 'provoke': -2, 'punish': -2, 'racism': -2,
  'rage': -2, 'raid': -2, 'rebel': -2, 'recession': -2, 'regret': -2,
  'reject': -2, 'reluctant': -2, 'resent': -2, 'resign': -2, 'restrict': -2,
  'retaliate': -2, 'revenge': -2, 'risk': -2, 'rival': -2, 'rob': -2,
  'ruin': -2, 'rumor': -2, 'sabotage': -2, 'sacrifice': -2, 'scandal': -2,
  'scare': -2, 'seize': -2, 'severe': -2, 'shame': -2, 'shock': -2,
  'shrink': -2, 'sicken': -2,
  'slaughter': -2,
  'sorrow': -2, 'spam': -2, 'stagnate': -2, 'stolen': -2, 'stress': -2,
  'strike': -2, 'struggle': -2, 'stubborn': -2,
  'suicide': -2,
  'sue': -2, 'suppress': -2, 'surge': -2, 'suspect': -2, 'suspicious': -2,
  'tariff': -2, 'tax': -2, 'tense': -2, 'terrible': -2, 'terror': -2,
  'theft': -2, 'threat': -2, 'tired': -2,
  'tragedy': -2,
  'trauma': -2, 'tricky': -2, 'trouble': -2, 'ugly': -2, 'uncertain': -2,
  'undermine': -2, 'unemployment': -2, 'unethical': -2, 'unfair': -2, 'unfit': -2,
  'unjust': -2, 'unrest': -2, 'unsafe': -2, 'unstable': -2, 'unwanted': -2,
  'upheaval': -2, 'uprising': -2, 'upset': -2, 'urgency': -2, 'useless': -2,
  'vague': -2, 'verdict': -2, 'victim': -2, 'violate': -2, 'violence': -2,
  'volatile': -2, 'vulnerable': -2, 'waste': -2, 'weak': -2, 'worry': -2,
  'worse': -2, 'worst': -2, 'wound': -2, 'wrong': -2, 'zero': -2,
  // Strong negative (-4 to -5)
  'abominable': -4, 'abuse': -4, 'adultery': -4, 'agony': -4, 'assassinate': -4,
  'atrocity': -4, 'bewail': -4, 'blasphemy': -4, 'calamity': -4, 'carnage': -4,
  'cheat': -4, 'commotion': -4, 'condemn': -4, 'curse': -4, 'damn': -4,
  'deplorable': -4, 'depression': -4, 'despise': -4, 'detest': -4, 'devastating': -4,
  'dictator': -4, 'disastrous': -4, 'disease': -4, 'execrable': -4, 'exploit': -4,
  'famine': -4, 'fatal': -4, 'genocide': -4, 'gloom': -4, 'grievous': -4,
  'hatred': -4, 'heartbreaking': -4, 'heinous': -4, 'holocaust': -4, 'horrible': -4,
  'hostage': -4, 'hunger': -4, 'hypocrisy': -4, 'idiot': -4, 'ignominious': -4,
  'imprison': -4, 'indictment': -4, 'infuriate': -4, 'inhumane': -4, 'insidious': -4,
  'jeering': -4, 'killing': -4, 'lament': -4, 'ludicrous': -4, 'malevolent': -4,
  'massacre': -4, 'menacing': -4, 'misery': -4, 'molest': -4, 'monstrous': -4,
  'nefarious': -4, 'notorious': -4, 'obscene': -4, 'ominous': -4, 'oppressive': -4,
  'ordeal': -4, 'outrageous': -4, 'pathetic': -4, 'persecute': -4, 'poison': -4,
  'profane': -4, 'prosecute': -4, 'provocative': -4, 'racist': -4, 'radical': -4, 'rape': -4, 'repulsive': -4, 'resentment': -4, 'ridiculous': -4, 'ruthless': -4,
  'savage': -4, 'scam': -4, 'scorn': -4, 'sin': -4, 'sinister': -4,
  'slander': -4, 'slavery': -4, 'squalid': -4, 'subjugate': -4, 'suffer': -4,
  'torture': -4, 'tragic': -4, 'tyranny': -4, 'vicious': -4, 'villain': -4,
  'violent': -4, 'wicked': -4, 'woeful': -4, 'worthless': -4, 'wretched': -4,
};

/**
 * Analyze text sentiment using AFINN-111 word list.
 * Synchronous, no model download, <0.1ms for typical source text.
 */
function analyzeSentiment(text: string): { comparative: number } {
  if (!text || !text.trim()) return { comparative: 0 };

  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return { comparative: 0 };

  let totalScore = 0;
  let wordCount = 0;

  // Check for negation words that flip sentiment of subsequent words
  const negationWords = new Set(['not', 'no', 'never', 'neither', 'nor', 'hardly', 'barely', 'cannot', 'can\'t', 'won\'t', 'don\'t', 'doesn\'t', 'didn\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t', 'hasn\'t', 'haven\'t', 'hadn\'t']);
  let negateNext = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check for negation word
    if (negationWords.has(word)) {
      negateNext = true;
      continue;
    }

    const score = AFINN_WORDS[word];
    if (score !== undefined) {
      totalScore += negateNext ? -score : score;
      wordCount++;
      negateNext = false;
    }
  }

  // Normalize by word count to get comparative score
  const comparative = wordCount > 0 ? totalScore / wordCount / 5 : 0; // divide by 5 to normalize to ~[-1, 1]
  return { comparative: Math.max(-1, Math.min(1, comparative)) };
}

export function computeBiasFromSentiment(
  sources: { domain?: string; key_finding?: string; title?: string }[]
): {
  averageSentiment: number;
  emotionalIntensity: number;
  biasScore: number;
  hasDomainOverride: boolean;
} {
  if (sources.length === 0) return { averageSentiment: 0, emotionalIntensity: 0, biasScore: 0.1, hasDomainOverride: false };

  let totalComparative = 0;
  let totalIntensity = 0;

  for (const s of sources) {
    const text = `${s.title || ''} ${s.key_finding || ''}`;
    if (!text.trim()) continue;
    const result = analyzeSentiment(text);
    totalComparative += result.comparative;
    totalIntensity += Math.abs(result.comparative);
  }

  const avgSentiment = sources.length > 0 ? totalComparative / sources.length : 0;
  const emotionalIntensity = sources.length > 0 ? totalIntensity / sources.length : 0;

  // Compute bias score from sentiment (0 = neutral, 1 = strongly biased)
  const sentimentBias = Math.max(0, Math.min(1, Math.abs(avgSentiment) * 0.7 + emotionalIntensity * 0.3));

  return {
    averageSentiment: avgSentiment,
    emotionalIntensity,
    biasScore: Math.round(sentimentBias * 100) / 100,
    hasDomainOverride: false,
  };
}

/**
 * Known conspiracy / pseudoscience keywords for adversarial query detection.
 * When a query matches these patterns, the scoring engine applies a topic-level
 * credibility penalty and confidence reduction to prevent debunking sources from
 * inflating the overall score for pseudoscientific claims.
 *
 * Matches full query text (lowercased) — no partial substring matches to avoid
 * false positives on legitimate scientific queries (e.g., "flat earth's orbit").
 */
const ADVERSARIAL_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Classic conspiracy theories
  { pattern: /\bflat\s*earth\b/i, label: 'flat_earth' },
  { pattern: /\bchem(trails?|trail)\b/i, label: 'chemtrails' },
  { pattern: /\bmoon\s*landing\s*(was\s*)?(fake|hoax|staged)\.*?$/i, label: 'moon_landing_hoax' },
  { pattern: /\b(aliens?|extraterrestrial)\s*(built|made|constructed)\s*(the\s*)?pyramids?\b/i, label: 'ancient_aliens' },
  { pattern: /\b(earth\s+is|earth\s+be)\s+(round|sphere|globe)\b.*evidence.*against/i, label: 'flat_earth' },
  { pattern: /\bevolution\s*(is\s*)?(a\s*)?(lie|hoax|fake)\b/i, label: 'evolution_denial' },
  { pattern: /\bvaccines?\s*cause\s*(autism|infertility|diseases?)\b/i, label: 'anti_vax' },
  { pattern: /\b(9.?11|september\s*11)\s*(was\s*)?(an?\s*)?inside\s*(job|attack)\b/i, label: '911_inside_job' },
  // Pseudoscience triggers
  { pattern: /\bperpetual\s*motion\s*machine\b/i, label: 'perpetual_motion' },
  { pattern: /\b(psychic|telepathy|clairvoyance)\s*(is\s*)?real\b/i, label: 'psychic_claims' },
];

/**
 * Known "debate" / "uncertainty" keywords for medium-uncertainty detection.
 * When a query matches, the system knows to expect mixed evidence and should
 * avoid reporting "strong" consensus.
 */
const UNCERTAINTY_PATTERNS: RegExp[] = [
  /\b(will|will\s+we|will\s+there)\s+(ever\s+)?(achieve|reach|see|have|get|be)\b/i,
  /\b(is\s+(it\s+)?possible\b|can\s+we\b)/i,
  /\b(controversy|debate|disputed|uncertain|unknowns?|unclear)\b/i,
  /\b(future\s+(of|outlook)|predictions?|forecast|prospects?)\b/i,
  /\b(risk|benefit|trade.off|pro\s*(v|v\s*s?|\.\s*v\s*\.)\s*con)\b/i,
  /\b(should|whether)\s+.*\s+(is|are|be)\b/i,
  // Effects/impact on something — inherently uncertain as outcomes vary by methodology
  /\b(effects?|impact|implications?|outcomes?|consequences?)\s+(of|on)\b/i,
  // Trend/scenario projections — future-oriented and inherently speculative
  /\b(trends?|outlook|projections?|scenarios?|trajectory)\b/i,
  // Academic disagreements across studies
  /\b(studies?\s+(differ|conflict|disagree|vary|contradict)|literature\s+(is\s+)?(mixed|divided|inconclusive))\b/i,
  // Productivity/performance/adoption impact — a common class of uncertain topics
  /\b(productivity|efficiency|adoption|performance)\s+(effects?|impact|outcomes?|rates?|levels?)\b/i,
];

export function detectAdversarialQuery(query: string): { isAdversarial: boolean; label: string | null } {
  if (!query) return { isAdversarial: false, label: null };
  for (const p of ADVERSARIAL_PATTERNS) {
    if (p.pattern.test(query)) {
      return { isAdversarial: true, label: p.label };
    }
  }
  return { isAdversarial: false, label: null };
}

export function detectUncertaintyQuery(query: string): boolean {
  if (!query) return false;
  return UNCERTAINTY_PATTERNS.some((p) => p.test(query));
}

export function normalizeCredScore(raw?: number | null): number | null {
  if (raw == null) return null;
  return raw > 10 ? raw / 10 : raw;
}

export function computeEnhancedSourceCredibility(
  sources: { domain?: string; credibility_score?: number; key_finding?: string; title?: string }[]
): { perSource: number[]; average: number } {
  const perSource = sources.map((s) => {
    const cred = normalizeCredScore(s.credibility_score);
    const domainInfo = lookupDomain(s.domain || '');

    if (domainInfo) {
      if (cred == null) return factualToScore(domainInfo.factual) * 0.7 + 5 * 0.3;
      return factualToScore(domainInfo.factual) * 0.5 + cred * 0.3 + 2;
    }

    if (s.domain?.endsWith('.edu')) return 8.5;
    if (s.domain?.endsWith('.gov')) return 8;
    if (s.domain?.endsWith('.mil')) return 8;

    return cred ?? 5;
  });

  const average = perSource.length > 0
    ? perSource.reduce((a, b) => a + b, 0) / perSource.length
    : 5;

  return { perSource, average };
}

export async function computeAllScores(
  query: string,
  existingScores: { accuracy: number; bias: number; sourceDiversity: number; confidenceInterval: number },
  sources: { domain?: string; key_finding?: string; title?: string; credibility_score?: number }[],
  conflicts: any[],
  evidenceConsensus?: string
): Promise<{
  accuracy: number;
  bias: number;
  sourceDiversity: number;
  confidenceInterval: number;
  consensusScore: number;
  relevanceScore: number;
  entityDiversity: number;
  sentimentBias: number;
  enhancedCredibility: number;
  credibilityStdDev: number;
  overallQuality: number;
  usingEmbeddings: boolean;
  _adversarial?: { label: string | null; penalty: number };
  _uncertainty?: { penalty: number };
}> {
  const sourceTexts = sources.map((s) => `${s.title || ''} ${s.key_finding || ''}`).filter(Boolean);
  const conflictPenalty = Math.min((conflicts?.length || 0) * 0.15, 0.45);

  const [consensus, relevance] = await Promise.all([
    computeConsensusScore(sourceTexts),
    query && sourceTexts.length > 0
      ? computeSemanticRelevance(query, sourceTexts)
      : Promise.resolve({ scores: [], average: existingScores.confidenceInterval }),
  ]);

  const entityDiversity = computeEntityDiversity(sources);
  const sentimentResult = computeBiasFromSentiment(sources);
  const credibility = computeEnhancedSourceCredibility(sources);

  const consensusBase = ({ strong: 1, mixed: 0.7, contested: 0.4, insufficient: 0.2 } as Record<string, number>)[evidenceConsensus || ''] ?? 0.5;

  // ─── Adversarial / Uncertainty Detection ───
  // Detect if the query is about a known conspiracy/pseudoscience topic.
  // When detected, apply a topic-level credibility penalty and confidence reduction
  // so that debunking sources don't inflate the overall score.
  const adversarial = detectAdversarialQuery(query);
  const isUncertain = detectUncertaintyQuery(query);

  // For adversarial queries: reduce effective credibility by 40%,
  // increase bias substantially (the topic itself is unscientific),
  // and floor confidence to prevent false "strong" consensus.
  const adversarialPenalty = adversarial.isAdversarial ? 0.4 : 0;
  const uncertaintyPenalty = (!adversarial.isAdversarial && isUncertain) ? 0.15 : 0;

  const avgCredibility = credibility.average * (1 - adversarialPenalty);
  const stdDev = sources.length > 1
    ? Math.sqrt(credibility.perSource.reduce((sum, s) => sum + (s - avgCredibility) ** 2, 0) / credibility.perSource.length)
    : 0;

  const useEmbeddings = relevance.average !== 0.5 || consensus.score > 0;

  const accuracy = Math.round(Math.min(avgCredibility, 10) * 10) / 10;

  // Adversarial queries get a bias bump (topic itself is misleading)
  let finalBias = sentimentResult.hasDomainOverride
    ? sentimentResult.biasScore
    : existingScores.bias;
  if (adversarial.isAdversarial) {
    finalBias = Math.min(finalBias + 0.3, 0.9);
  } else if (isUncertain) {
    finalBias = Math.min(finalBias + 0.1, 0.8);
  }

  const sourceDiversity = Math.round(
    (entityDiversity.diversityScore * 0.4 + existingScores.sourceDiversity * 0.6) * 100
  ) / 100;

  // For adversarial queries, confidence is capped at 0.4 (prevents "strong" consensus)
  // For uncertainty queries, confidence is slightly reduced
  const maxConfidence = adversarial.isAdversarial ? 0.4 : isUncertain ? 0.75 : 0.99;
  const confidenceInterval = Math.round(
    Math.min(
      (consensus.score * 0.3 + consensusBase * 0.4 + (1 - conflictPenalty) * 0.3) * (1 - adversarialPenalty * 0.5),
      maxConfidence
    ) * 100
  ) / 100;

  const relevanceScore = relevance.average > 0
    ? Math.round(relevance.average * 100) / 100
    : existingScores.confidenceInterval;

  const overallQuality = Math.round((
    (avgCredibility / 10) * 0.35 +
    consensusBase * 0.20 +
    relevanceScore * 0.15 +
    entityDiversity.diversityScore * 0.10 +
    (1 - finalBias) * 0.10 +
    confidenceInterval * 0.10
  ) * 100);

  return {
    accuracy,
    bias: Math.round(finalBias * 100) / 100,
    sourceDiversity,
    confidenceInterval,
    consensusScore: consensus.score,
    relevanceScore,
    entityDiversity: entityDiversity.diversityScore,
    sentimentBias: sentimentResult.biasScore,
    enhancedCredibility: Math.round(avgCredibility * 10) / 10,
    credibilityStdDev: Math.round(stdDev * 100) / 100,
    overallQuality,
    usingEmbeddings: useEmbeddings,
    // Return detection metadata for downstream reporting
    _adversarial: adversarial.isAdversarial ? { label: adversarial.label, penalty: adversarialPenalty } : undefined,
    _uncertainty: isUncertain ? { penalty: uncertaintyPenalty } : undefined,
  };
}
