import React from 'react';
import { ResearchScore } from '../types';
import { ShieldCheck, AlertTriangle, Globe, TrendingUp, BarChart3, Layers, ArrowUp, ArrowDown, Minus, Crown } from 'lucide-react';
import { useStore } from '../store';
import clsx from 'clsx';

interface Props { scores: ResearchScore; }

function ScoreMeter({ value, max = 1, label, icon, color }: {
  value: number; max?: number; label: string; icon: React.ReactNode; color: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-my-muted">
          {icon}{label}
        </div>
        <span className="text-[12px] font-black font-mono" style={{ color }}>
          {max === 10 ? `${value}/10` : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TrendBadge({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  const [icon, color, label] = direction === 'up'
    ? [<ArrowUp size={10} />, 'text-green-500', 'Improving']
    : direction === 'down'
    ? [<ArrowDown size={10} />, 'text-red-500', 'Declining']
    : [<Minus size={10} />, 'text-yellow-500', 'Stable'];
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest', color)}>
      {icon} {label}
    </span>
  );
}

export default function ResearchScoreCard({ scores }: Props) {
  const { user, currentReport } = useStore();
  const isPremium = !!user?.premium;

  // Compute real premium scores from actual per-source data
  const sources = currentReport?.sources || [];
  const conflicts = currentReport?.conflicts || [];
  const reportScores = currentReport?.scores;

  const credScores = sources.map(s => s.credibility_score ?? 5);
  const relevanceScores = sources.map(s => s.relevance_score ?? 5);
  const avgCredibility = sources.length > 0 ? credScores.reduce((a, b) => a + b, 0) / credScores.length : 5;
  const avgRelevance = sources.length > 0 ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length : 5;

  // Standard deviation of credibility scores — real confidence spread
  const credStdDev = sources.length > 1
    ? Math.sqrt(credScores.reduce((sum, s) => sum + (s - avgCredibility) ** 2, 0) / credScores.length)
    : 0;

  // Cross-validation: average credibility penalized by conflicts
  const conflictPenalty = Math.min((conflicts?.length || 0) * 0.15, 0.45);
  const crossValidation = Math.max(0, Math.min(1, (avgCredibility / 10) - conflictPenalty));

  // Overall quality: weighted composite from real source data
  const consensusBase = ({ strong: 1, mixed: 0.7, contested: 0.4, insufficient: 0.2 } as Record<string, number>)[reportScores?.evidence_consensus || ''] ?? 0.5;
  const overallQ = Math.round((
    (avgCredibility / 10) * 0.40 +
    consensusBase * 0.30 +
    avgRelevance * 0.15 +
    scores.sourceDiversity * 0.15
  ) * 100);

  const premiumData = isPremium ? {
    credibilityTrend: (scores.accuracy >= 7 ? 'up' : scores.accuracy >= 4 ? 'stable' : 'down') as 'up' | 'down' | 'stable',
    biasTrend: (scores.bias < 0.3 ? 'up' : scores.bias < 0.6 ? 'stable' : 'down') as 'up' | 'down' | 'stable',
    diversityTrend: (scores.sourceDiversity >= 0.6 ? 'up' : scores.sourceDiversity >= 0.3 ? 'stable' : 'down') as 'up' | 'down' | 'stable',
    confidenceTrend: (scores.confidenceInterval >= 0.6 ? 'up' : scores.confidenceInterval >= 0.3 ? 'stable' : 'down') as 'up' | 'down' | 'stable',
    overallQuality: overallQ,
    confidenceSpread: Math.round(credStdDev / (avgCredibility || 1) * 100),
    sourceReliabilityIndex: Math.round(avgCredibility * 10) / 10,
    crossValidationScore: Math.round(crossValidation * 100),
  } : null;

  return (
    <div className="mt-8 p-6 border border-my-border bg-white/5 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <TrendingUp size={16} className="text-my-accent" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-my-accent">
          Intelligence Quality Report
        </h3>
        {isPremium && (
          <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-my-accent/10 text-my-accent border border-my-accent/20 rounded-sm flex items-center gap-1">
            <Crown size={8} /> Premium
          </span>
        )}
      </div>

      <ScoreMeter
        value={scores.accuracy}
        max={10}
        label="Source Credibility Score"
        icon={<ShieldCheck size={12} />}
        color="#22c55e"
      />
      <ScoreMeter
        value={1 - scores.bias}
        label="Objectivity (Low Bias)"
        icon={<AlertTriangle size={12} />}
        color={scores.bias < 0.3 ? '#22c55e' : scores.bias < 0.6 ? '#f59e0b' : '#ef4444'}
      />
      <ScoreMeter
        value={scores.sourceDiversity}
        label="Source Diversity"
        icon={<Globe size={12} />}
        color="#38bdf8"
      />
      <ScoreMeter
        value={scores.confidenceInterval}
        label="Confidence Interval"
        icon={<TrendingUp size={12} />}
        color="#a78bfa"
      />

      {/* #7: Premium-only expanded scoring depth */}
      {isPremium && premiumData && (
        <div className="pt-4 border-t border-my-border space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-2">
            <BarChart3 size={12} className="text-my-accent" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-my-muted">
              Expanded Scoring Depth
            </span>
          </div>

          {/* Trend indicators */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-my-bg border border-my-border flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-wider text-my-muted">Credibility Trend</span>
              <TrendBadge direction={premiumData.credibilityTrend} />
            </div>
            <div className="p-2 bg-my-bg border border-my-border flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-wider text-my-muted">Bias Direction</span>
              <TrendBadge direction={premiumData.biasTrend} />
            </div>
            <div className="p-2 bg-my-bg border border-my-border flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-wider text-my-muted">Diversity Trend</span>
              <TrendBadge direction={premiumData.diversityTrend} />
            </div>
            <div className="p-2 bg-my-bg border border-my-border flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-wider text-my-muted">Confidence Trend</span>
              <TrendBadge direction={premiumData.confidenceTrend} />
            </div>
          </div>

          {/* Composite scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted mb-1">Overall Quality</span>
              <div className="flex items-end gap-2">
                <span className="text-xl font-black text-my-ink">{premiumData.overallQuality}%</span>
                <div className="flex-1 h-2 bg-my-border rounded-full overflow-hidden self-center mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${premiumData.overallQuality}%`,
                      background: premiumData.overallQuality >= 70 ? '#22c55e' : premiumData.overallQuality >= 40 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted mb-1">Cross-Validation Score</span>
              <span className="text-xl font-black text-my-ink">{premiumData.crossValidationScore}%</span>
            </div>
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers size={10} className="text-my-accent" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted">Source Reliability Index</span>
              </div>
              <span className="text-xl font-black text-my-ink">{premiumData.sourceReliabilityIndex}/100</span>
            </div>
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted mb-1">Confidence Spread</span>
              <span className="text-xl font-black text-my-ink">±{premiumData.confidenceSpread}%</span>
            </div>
          </div>

          {/* Summary interpretation */}
          <div className="p-3 bg-my-accent/5 border border-my-accent/20">
            <p className="text-[9px] text-my-ink leading-relaxed">
              <strong className="uppercase tracking-wider">Analyst Interpretation:</strong>{' '}
              {premiumData.overallQuality >= 70
                ? 'High-confidence synthesis with strong source credibility and broad topical coverage. Recommended for strategic decision-making.'
                : premiumData.overallQuality >= 40
                ? 'Moderate confidence synthesis. Some sources may have limited credibility or narrow topical coverage. Cross-reference with domain expertise.'
                : 'Low-confidence synthesis. Significant limitations in source quality, diversity, or objectivity. Requires independent verification before use.'}
            </p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-my-muted uppercase tracking-widest pt-2 border-t border-my-border/50 leading-[1.6]">
        Scores reflect cross-verification of multiple AI-generated analyses. Confidence ratings indicate internal consistency, not ground-truth validation. Always verify critical claims independently.
      </p>
    </div>
  );
}
