/**
 * Universal score-to-label helpers — presentation-layer only.
 *
 * All underlying numeric scores remain untouched. These functions
 * transform raw values into human-readable labels for display.
 */

/* ─── Source Credibility (0–100) ─── */

export function getCredibilityLabel(score: number): string {
  if (score >= 81) return 'Very High';
  if (score >= 61) return 'High';
  if (score >= 41) return 'Moderate';
  if (score >= 21) return 'Low';
  return 'Very Low';
}

export function getCredibilityColor(score: number): string {
  if (score >= 81) return 'text-green-600 dark:text-green-400';
  if (score >= 61) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 41) return 'text-amber-600 dark:text-amber-400';
  if (score >= 21) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function getCredibilityBg(score: number): string {
  if (score >= 81) return 'bg-green-500/10';
  if (score >= 61) return 'bg-emerald-500/10';
  if (score >= 41) return 'bg-amber-500/10';
  if (score >= 21) return 'bg-orange-500/10';
  return 'bg-red-500/10';
}

/* ─── Evidence Consensus (label-based → mapped to 0–100 equivalent) ─── */

const CONSENSUS_SCORE_MAP: Record<string, number> = {
  strong: 85,
  mixed: 55,
  contested: 30,
  insufficient: 15,
};

export function getConsensusLabel(consensus: string): string {
  const score = CONSENSUS_SCORE_MAP[consensus] ?? 0;
  if (score >= 81) return 'Very Strong';
  if (score >= 61) return 'Strong';
  if (score >= 41) return 'Mixed';
  if (score >= 21) return 'Weak';
  return 'Contested';
}

export function getConsensusColor(consensus: string): string {
  const score = CONSENSUS_SCORE_MAP[consensus] ?? 0;
  if (score >= 81) return 'text-green-600 dark:text-green-400';
  if (score >= 61) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 41) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/* ─── Confidence (0–1 → mapped to 0–100) ─── */

export function getConfidenceLabel(score: number): string {
  const pct = score * 100;
  if (pct >= 76) return 'High';
  if (pct >= 51) return 'Medium';
  if (pct >= 26) return 'Low';
  return 'Insufficient';
}

export function getConfidenceColor(score: number): string {
  const pct = score * 100;
  if (pct >= 76) return 'text-green-600 dark:text-green-400';
  if (pct >= 51) return 'text-amber-600 dark:text-amber-400';
  if (pct >= 26) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/* ─── Source Diversity (0–1 → mapped to 0–100) ─── */

export function getDiversityLabel(score: number): string {
  const pct = score * 100;
  if (pct >= 76) return 'Broad';
  if (pct >= 51) return 'Moderate';
  if (pct >= 26) return 'Limited';
  return 'Narrow';
}

export function getDiversityColor(score: number): string {
  const pct = score * 100;
  if (pct >= 76) return 'text-green-600 dark:text-green-400';
  if (pct >= 51) return 'text-amber-600 dark:text-amber-400';
  if (pct >= 26) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/* ─── Bias Risk (0–1 → bias RISK, where higher = worse) ─── */

export function getBiasLabel(biasScore: number): string {
  const pct = biasScore * 100;
  if (pct <= 20) return 'Minimal';
  if (pct <= 40) return 'Low';
  if (pct <= 60) return 'Moderate';
  if (pct <= 80) return 'Elevated';
  return 'High';
}

export function getBiasColor(biasScore: number): string {
  const pct = biasScore * 100;
  if (pct <= 20) return 'text-green-600 dark:text-green-400';
  if (pct <= 40) return 'text-emerald-600 dark:text-emerald-400';
  if (pct <= 60) return 'text-amber-600 dark:text-amber-400';
  if (pct <= 80) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/* ─── Research / Overall Quality (0–100 derived score → letter + label) ─── */

export function getQualityGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function getQualityLabel(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 70) return 'High';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Poor';
  return 'Very Poor';
}

export function getQualityColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  if (score >= 30) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/* ─── Overall Credibility (0–100 from report.scores.overall_credibility) ─── */

export function getOverallCredibilityLabel(score: number): string {
  if (score >= 81) return 'Very High';
  if (score >= 61) return 'High';
  if (score >= 41) return 'Moderate';
  if (score >= 21) return 'Low';
  return 'Very Low';
}

/* ─── Relevance (0–100) ─── */

export function getRelevanceLabel(score: number): string {
  if (score >= 81) return 'Very High';
  if (score >= 61) return 'High';
  if (score >= 41) return 'Moderate';
  if (score >= 21) return 'Low';
  return 'Very Low';
}

/* ─── Consensus variance (low/moderate/high → descriptive label) ─── */

export function getConsensusVarianceLabel(level: string): string {
  switch (level) {
    case 'low': return 'Models closely agree on credibility and relevance assessments';
    case 'moderate': return 'Models show moderate disagreement — cross-check critical claims';
    case 'high': return 'Models significantly disagree — verify findings independently';
    default: return 'Consensus data unavailable';
  }
}
