/**
 * Conflict Detector — analyzes sources for divergent stances and generates
 * missing conflict entries that the AI may have skipped.
 *
 * Uses keyword-based stance classification on source titles and key_findings
 * to detect positive vs negative framing, then generates conflict entries
 * when both stances are present.
 */
import type { COGNAPSE_Output } from '../types';

/**
 * Hedging / contrastive signal patterns found in synthesis text.
 * When the AI uses these phrases, it indicates genuine disagreement
 * or uncertainty that may not be reflected in the consensus label.
 * Each pattern includes a label for the generated conflict explanation.
 */
const HEDGING_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bhowever\b/i, label: 'contrast' },
  { pattern: /\bbut\b/i, label: 'contrast' },
  { pattern: /\byet\b/i, label: 'contrast' },
  { pattern: /\b(nonetheless|nevertheless)\b/i, label: 'contrast' },
  { pattern: /\b(although|though|whereas|while\s+some)\b/i, label: 'concession' },
  { pattern: /\b(on\s+the\s+(one|other)\s+hand)\b/i, label: 'alternate_view' },
  { pattern: /\b(some\s+(argue|suggest|claim|believe|contend|propose|maintain|assert))\b/i, label: 'alternate_view' },
  { pattern: /\b(others?\s+(argue|suggest|claim|believe|contend|propose|disagree|maintain|assert))\b/i, label: 'alternate_view' },
  { pattern: /\b(conversely|alternatively|in\s+contrast|by\s+comparison)\b/i, label: 'alternative' },
  { pattern: /\b(this\s+(is\s+)?(contradicts?|conflicts?\s+with|disagrees?\s+with|challenges))\b/i, label: 'direct_conflict' },
  { pattern: /\b(not\s+(all|everyone|universally|every\s+study|all\s+experts))\b/i, label: 'lack_of_uniformity' },
  { pattern: /\b(debate|debated|controversial|disputed|contentious)\b/i, label: 'disputed' },
  { pattern: /\b(divergent|disagreement|conflicting|contradictory)\b/i, label: 'divergent' },
  { pattern: /\b(mixed\s+(evidence|results|findings|signals|reviews))\b/i, label: 'mixed_evidence' },
  { pattern: /\b(on\s+the\s+flip\s+side|then\s+again|having\s+said\s+that)\b/i, label: 'counterpoint' },
  // Data-point divergence — estimates/varying numbers indicate conflicting evidence
  { pattern: /\b(rang(e|ing)\s+(from|between)|vary(|ing)\s+(between|from|across)|estimates?\s+(range|vary|differ))\b/i, label: 'data_divergence' },
  // Explicit "X vs Y" comparisons
  { pattern: /\b(while\s+some|whereas\s+others|compared\s+to|in\s+comparison|by\s+contrast)\b/i, label: 'comparison' },
  // Contradictory statistics — percentage clashes
  { pattern: /\b(\d+\s*%\s*(say|report|show|indicate|find)\s+.*?while\s+.*?\d+\s*%\s*(say|report|show|indicate|find))\b/i, label: 'statistical_conflict' },
];

const STANCE_KEYWORDS = {
  positive: [
    'increase', 'improve', 'benefit', 'positive', 'effective', 'success',
    'advantage', 'growth', 'better', 'higher', 'boost', 'enhance',
    'optimistic', 'promising', 'breakthrough', 'accelerate', 'advance',
    'opportunity', 'solution', 'progress', 'innovation', 'leader',
    'support', 'proven', 'strong', 'gain', 'upward', 'boom',
  ] as readonly string[],
  negative: [
    'decrease', 'decline', 'harm', 'negative', 'ineffective', 'fail',
    'disadvantage', 'risk', 'danger', 'threat', 'worse', 'lower', 'reduce',
    'pessimistic', 'concern', 'controversial', 'debate', 'disagree',
    'uncertain', 'unclear', 'conflict', 'crisis', 'loss', 'warning',
    'problem', 'issue', 'struggle', 'difficult', 'challenge', 'downside',
    'downward', 'bust', 'trouble', 'slowdown', 'setback', 'fear',
  ] as readonly string[],
};

/**
 * Extract sentences from text using sentence-boundary splitting.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);
}

/**
 * Detect conflicts by analyzing the full_synthesis text for hedging/contrastive
 * language that indicates the AI recognized disagreement but didn't surface it
 * as a structured conflict entry.
 *
 * When 2+ distinct hedge signals are found in different sentences, generates
 * a conflict entry showing the contrasting sentences.
 *
 * Mutates report.conflicts in place. Does nothing if conflicts already exist
 * or if full_synthesis is empty.
 */
function detectSynthesisConflicts(report: COGNAPSE_Output): void {
  const synthesis = report.summary?.full_synthesis;
  if (!synthesis || synthesis.length < 100) return;
  if ((report.conflicts?.length ?? 0) > 0) return;

  const sentences = splitSentences(synthesis);
  // Lowered threshold: need at least 2 sentences to detect contrasting views
  if (sentences.length < 2) return;

  // Find hedge signals across sentences
  const hedgeMatches: { sentence: string; label: string; idx: number }[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const lower = sentence.toLowerCase();

    // Check all hedging patterns against this sentence
    for (const hp of HEDGING_PATTERNS) {
      if (hp.pattern.test(lower)) {
        hedgeMatches.push({ sentence, label: hp.label, idx: i });
        break; // only one label per sentence
      }
    }
  }

  // Need at least 2 hedge signals in different sentences to indicate a conflict
  if (hedgeMatches.length < 2) return;

  // Check that the matches involve contrasting positions (not all from same label type)
  const uniqueLabels = new Set(hedgeMatches.map(m => m.label));
  if (uniqueLabels.size < 2) {
    // All matches are the same label type (e.g., all "contrast") — weak signal
    // Only generate conflict if we have 3+ matches
    if (hedgeMatches.length < 3) return;
  }

  // Group into "claim_a" (first half) and "claim_b" (second half)
  const mid = Math.floor(hedgeMatches.length / 2);
  const firstHalf = hedgeMatches.slice(0, mid);
  const secondHalf = hedgeMatches.slice(mid);

  report.conflicts = [
    {
      claim_a: firstHalf.map(m => m.sentence).join(' ').substring(0, 300),
      source_a: 'synthesis text',
      claim_b: secondHalf.map(m => m.sentence).join(' ').substring(0, 300),
      source_b: 'synthesis text',
      explanation:
        `Synthesis text analysis detected ${hedgeMatches.length} instances of hedging ` +
        `or contrastive language (e.g., "${hedgeMatches[0].label}", "${hedgeMatches[1].label}") ` +
        `across the report. This suggests the AI identified nuanced or contradictory ` +
        `evidence that may not be fully captured by the consensus label alone. ` +
        `Review the conflicting claims above for a more complete picture.`,
    },
  ];
}

/**
 * Given a report, analyze its sources for divergent stances.
 * Only generates conflicts if:
 * 1. There are at least 2 sources
 * 2. No conflicts already exist
 * 3. At least one source has positive stance AND one has negative stance
 *
 * Falls back to synthesis text analysis if source-stance analysis yields no conflicts.
 *
 * Mutates report.conflicts in place.
 */
export function generateMissingConflicts(report: COGNAPSE_Output): void {
  const sources = report.sources || [];
  const existingConflicts = report.conflicts || [];

  // Skip if we already have conflicts or too few sources
  if (sources.length < 2 || existingConflicts.length > 0) return;

  // Classify each source by stance
  const positiveSources: typeof sources = [];
  const negativeSources: typeof sources = [];

  for (const source of sources) {
    const text = ((source.key_finding || '') + ' ' + (source.title || '')).toLowerCase();

    let posScore = 0;
    let negScore = 0;

    // Word-boundary check to avoid substring false matches
    for (const kw of STANCE_KEYWORDS.positive) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) posScore++;
    }
    for (const kw of STANCE_KEYWORDS.negative) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) negScore++;
    }

    // A source is classified as positive/negative if it has at least 1 keyword
    // match in the dominant direction. This is intentionally sensitive — even
    // a single word like "risk" or "benefit" can signal stance.
    if (posScore >= 1 && posScore > negScore) {
      positiveSources.push(source);
    } else if (negScore >= 1 && negScore > posScore) {
      negativeSources.push(source);
    }
  }

  // ─── Priority 1: Source-Stance Analysis ───
  // If both positive and negative stances are found among sources, generate
  // a conflict based on the actual source titles and domains. This is the
  // most specific and useful type of conflict.
  if (positiveSources.length > 0 && negativeSources.length > 0) {
    const posSamples = positiveSources.slice(0, 3);
    const negSamples = negativeSources.slice(0, 3);

    report.conflicts = [
      {
        claim_a: posSamples.map(s => s.title).join('; '),
        source_a: posSamples.map(s => s.domain).join(', '),
        claim_b: negSamples.map(s => s.title).join('; '),
        source_b: negSamples.map(s => s.domain).join(', '),
        explanation:
          `Source analysis detected divergent stances on this topic. ` +
          `${positiveSources.length} source(s) present supporting or optimistic evidence ` +
          `while ${negativeSources.length} source(s) highlight concerns, risks, or counter-evidence. ` +
          `This suggests mixed or contested findings that warrant further investigation.`,
      },
    ];
    return; // Best possible signal — done
  }

  // ─── Priority 2: Synthesis Text Analysis ───
  // If source-stance analysis didn't find opposing sides, scan the synthesis
  // text for hedging/contrastive language that indicates the AI itself
  // detected disagreement but didn't report it as a conflict.
  if (positiveSources.length === 0 || negativeSources.length === 0) {
    detectSynthesisConflicts(report);
  }

  // Priority 3 (consensus-label fallback) removed — produced low-quality noise
  // by stitching together random synthesis sentences that weren't actually
  // contradictory. The Metrics sidebar already shows 'mixed'/'contested'
  // consensus labels, which communicates the same signal without the noise.
}

