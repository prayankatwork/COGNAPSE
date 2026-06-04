/**
 * Universal score-to-label helpers — presentation-layer only.
 *
 * All underlying numeric scores remain untouched. These functions
 * transform raw values into human-readable labels for display.
 */

/* ─── Source Credibility (0–100) ─── */

export function getCredibilityLabel(score: number): string {
  if (score >= 81) return 'Superior';
  if (score >= 61) return 'High';
  if (score >= 41) return 'Moderate';
  if (score >= 21) return 'Limited';
  return 'Insufficient';
}

export function getCredibilityColor(score: number): string {
  if (score >= 81) return 'ds-text-success';
  if (score >= 61) return 'ds-text-success';
  if (score >= 41) return 'ds-text-warning';
  if (score >= 21) return 'ds-text-warning';
  return 'ds-text-danger';
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
  if (score >= 81) return 'Strong';
  if (score >= 61) return 'Moderate';
  if (score >= 41) return 'Mixed';
  if (score >= 21) return 'Weak';
  return 'Contested';
}

export function getConsensusColor(consensus: string): string {
  const score = CONSENSUS_SCORE_MAP[consensus] ?? 0;
  if (score >= 81) return 'ds-text-success';
  if (score >= 61) return 'ds-text-success';
  if (score >= 41) return 'ds-text-warning';
  return 'ds-text-danger';
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
  if (pct >= 76) return 'ds-text-success';
  if (pct >= 51) return 'ds-text-warning';
  if (pct >= 26) return 'ds-text-warning';
  return 'ds-text-danger';
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
  if (pct >= 76) return 'ds-text-success';
  if (pct >= 51) return 'ds-text-warning';
  if (pct >= 26) return 'ds-text-warning';
  return 'ds-text-danger';
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
  if (pct <= 20) return 'ds-text-success';
  if (pct <= 40) return 'ds-text-success';
  if (pct <= 60) return 'ds-text-warning';
  if (pct <= 80) return 'ds-text-warning';
  return 'ds-text-danger';
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
  if (score >= 30) return 'Limited';
  return 'Insufficient';
}

export function getQualityColor(score: number): string {
  if (score >= 90) return 'ds-text-success';
  if (score >= 70) return 'ds-text-success';
  if (score >= 50) return 'ds-text-warning';
  if (score >= 30) return 'ds-text-warning';
  return 'ds-text-danger';
}

/* ─── Overall Credibility (0–100 from report.scores.overall_credibility) ─── */

export function getOverallCredibilityLabel(score: number): string {
  if (score >= 81) return 'Superior';
  if (score >= 61) return 'High';
  if (score >= 41) return 'Moderate';
  if (score >= 21) return 'Limited';
  return 'Insufficient';
}

/* ─── Relevance (0–100) ─── */

export function getRelevanceLabel(score: number): string {
  if (score >= 81) return 'Superior';
  if (score >= 61) return 'High';
  if (score >= 41) return 'Moderate';
  if (score >= 21) return 'Limited';
  return 'Insufficient';
}

/* ─── Model Agreement / Consensus Variance (low/moderate/high → display label) ─── */

/**
 * Transforms the internal variance level into a human-friendly label
 * with the SAME directionality as evidence_consensus labels.
 *   low variance → "Strong" agreement (models closely agreed)
 *   moderate    → "Moderate"
 *   high        → "Low" agreement
 */
export function getModelAgreementLabel(level: string): string {
  switch (level) {
    case 'low': return 'Strong';
    case 'moderate': return 'Moderate';
    case 'high': return 'Low';
    default: return 'Unknown';
  }
}

export function getModelAgreementColor(level: string): string {
  switch (level) {
    case 'low': return 'ds-text-success';
    case 'moderate': return 'ds-text-warning';
    case 'high': return 'ds-text-danger';
    default: return 'text-my-muted';
  }
}

/* ─── Consensus variance narrative (low/moderate/high → descriptive text) ─── */

export function getConsensusVarianceNarrative(level: string): string {
  switch (level) {
    case 'low': return 'Models closely agree on credibility and relevance assessments';
    case 'moderate': return 'Models show moderate disagreement — cross-check critical claims';
    case 'high': return 'Models significantly disagree — verify findings independently';
    default: return 'Consensus data unavailable';
  }
}
