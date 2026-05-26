import React, { useEffect, useState, useMemo } from 'react';
import { ResearchScore } from '../types';
import { ShieldCheck, AlertTriangle, Globe, TrendingUp, BarChart3, Layers, ArrowUp, ArrowDown, Minus, Crown, Loader2, BrainCircuit } from 'lucide-react';
import { useStore } from '../store';
import { callCloudAI } from '../services/aiService';
import { lookupDomain, factualToScore, biasToBiasScore, credibilityTrendFromHistory } from '../utils/domainCredibility';
import { computeAllScores, computeEntityDiversity } from '../utils/scoringEngine';
import { dbService } from '../services/dbService';
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
  const sources = currentReport?.sources || [];
  const conflicts = currentReport?.conflicts || [];
  const reportScores = currentReport?.scores;
  const query = currentReport?.query_understood || currentReport?.archive_entry?.query || '';
  const topicCluster = currentReport?.archive_entry?.topic_cluster || query.substring(0, 60);

  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
    if (user?.id && topicCluster) {
      setHistory(dbService.getScoreHistory(user.id, topicCluster));
    }
  }, [user?.id, topicCluster]);

  // Neural scoring engine
  const [enhanced, setEnhanced] = useState<{
    accuracy: number; bias: number; sourceDiversity: number; confidenceInterval: number;
    consensusScore: number; relevanceScore: number; entityDiversity: number;
    sentimentBias: number; enhancedCredibility: number; credibilityStdDev: number;
    overallQuality: number; usingEmbeddings: boolean;
  } | null>(null);
  const [neuralLoading, setNeuralLoading] = useState(false);

  useEffect(() => {
    if (sources.length === 0) return;
    setNeuralLoading(true);
    computeAllScores(
      query,
      { accuracy: scores.accuracy, bias: scores.bias, sourceDiversity: scores.sourceDiversity, confidenceInterval: scores.confidenceInterval },
      sources, conflicts, reportScores?.evidence_consensus
    ).then(setEnhanced).catch(() => setEnhanced(null))
    .finally(() => setNeuralLoading(false));
  }, [sources.length, query, reportScores?.evidence_consensus]);

  // Domain-only fallback computation (same as before)
  const credScores = sources.map(s => {
    const domainInfo = lookupDomain(s.domain || '');
    if (domainInfo) return factualToScore(domainInfo.factual) * 0.7 + (s.credibility_score || 5) * 0.3;
    return s.credibility_score ?? 5;
  });
  const relevanceScores = sources.map(s => s.relevance_score ?? 5);
  const avgCredibility = sources.length > 0 ? credScores.reduce((a, b) => a + b, 0) / credScores.length : 5;
  const credStdDev = sources.length > 1
    ? Math.sqrt(credScores.reduce((sum, s) => sum + (s - avgCredibility) ** 2, 0) / credScores.length)
    : 0;

  const biasFromDomains = sources.map(s => {
    const d = lookupDomain(s.domain || '');
    return d ? biasToBiasScore(d.bias) : null;
  }).filter((b): b is number => b !== null);
  const realBias = biasFromDomains.length > 0
    ? biasFromDomains.reduce((a, b) => a + b, 0) / biasFromDomains.length
    : null;

  const consensusBase = ({ strong: 1, mixed: 0.7, contested: 0.4, insufficient: 0.2 } as Record<string, number>)[reportScores?.evidence_consensus || ''] ?? 0.5;
  const fallbackOverallQ = Math.round((
    (avgCredibility / 10) * 0.40 + consensusBase * 0.30 +
    (relevanceScores.reduce((a, b) => a + b, 0) / (relevanceScores.length || 1)) * 0.15 +
    scores.sourceDiversity * 0.15
  ) * 100);

  // Choose enhanced vs fallback scores
  const es = enhanced;
  const displayAccuracy = es?.accuracy ?? scores.accuracy;
  const displayBias = es?.bias ?? (realBias !== null ? realBias : scores.bias);
  const displayDiversity = es?.sourceDiversity ?? scores.sourceDiversity;
  const displayConfidence = es?.confidenceInterval ?? scores.confidenceInterval;
  const displayCredibility = es?.enhancedCredibility ?? avgCredibility;
  const displayStdDev = es?.credibilityStdDev ?? (credStdDev / (avgCredibility || 1)) * 100;
  const displayOverallQ = es?.overallQuality ?? fallbackOverallQ;

  const entityInfo = useMemo(() => sources.length > 0 ? computeEntityDiversity(sources) : null, [sources]);

  // Trends
  const credTrend = credibilityTrendFromHistory(history.map((h: any) => h.scores?.accuracy ?? 5));
  const biasTrendVal = sources.length > 0
    ? (() => {
        const biasLabels = sources.map(s => lookupDomain(s.domain || '')?.bias).filter(Boolean);
        if (biasLabels.length === 0) return displayBias < 0.3 ? 'up' as const : displayBias < 0.6 ? 'stable' as const : 'down' as const;
        return biasLabels.some(b => b === 'pro-science' || b === 'center') ? 'up' as const
          : biasLabels.some(b => b === 'left-center' || b === 'right-center') ? 'stable' as const : 'down' as const;
      })()
    : (displayBias < 0.3 ? 'up' as const : displayBias < 0.6 ? 'stable' as const : 'down' as const);
  const diversityTrend = history.length >= 2
    ? credibilityTrendFromHistory(history.map((h: any) => h.scores?.sourceDiversity ?? 0))
    : (displayDiversity >= 0.6 ? 'up' as const : displayDiversity >= 0.3 ? 'stable' as const : 'down' as const);
  const confidenceTrend = history.length >= 2
    ? credibilityTrendFromHistory(history.map((h: any) => {
        const cmap: Record<string, number> = { strong: 0.85, mixed: 0.6, contested: 0.4, insufficient: 0.2 };
        return cmap[h.scores?.confidenceInterval || ''] ?? 0.5;
      }))
    : (displayConfidence >= 0.6 ? 'up' as const : displayConfidence >= 0.3 ? 'stable' as const : 'down' as const);

  const [analystInterpretation, setAnalystInterpretation] = useState<string | null>(null);
  const [loadingInterpretation, setLoadingInterpretation] = useState(false);
  const interpretationCacheKey = currentReport?.id || currentReport?.archive_entry?.query || '';

  useEffect(() => {
    if (!isPremium || !interpretationCacheKey) return;
    const cached = localStorage.getItem(`cognapse_analyst_${interpretationCacheKey}`);
    if (cached) { setAnalystInterpretation(cached); return; }
    setLoadingInterpretation(true);
    const context = `Topic: ${currentReport?.query_understood || ''}
Source count: ${sources.length}
Average credibility: ${displayCredibility.toFixed(1)}/10
Evidence consensus: ${reportScores?.evidence_consensus || 'unknown'}
Overall quality: ${displayOverallQ}%
Consensus score: ${es?.consensusScore?.toFixed(2) || 'N/A'}
Relevance score: ${es?.relevanceScore?.toFixed(2) || 'N/A'}
Entity diversity: ${es?.entityDiversity?.toFixed(2) || 'N/A'}
Source domains: ${sources.slice(0, 5).map(s => s.domain).join(', ')}`;
    callCloudAI(
      `You are an intelligence analyst. Write a 2-3 sentence analyst interpretation of this research report's quality and reliability. Be specific — cite trends, source quality, and caveats. No markdown. Under 150 words.\n\n${context}`,
      false, 'groq-llama-3.1-8b-instant'
    ).then((text) => {
      const interpretation = typeof text === 'string' ? text.trim() : 'Analysis based on AI-generated source evaluation and domain credibility signals.';
      setAnalystInterpretation(interpretation);
      localStorage.setItem(`cognapse_analyst_${interpretationCacheKey}`, interpretation);
    }).catch(() => {
      setAnalystInterpretation(
        displayOverallQ >= 70
          ? 'High-confidence synthesis with strong source credibility and broad topical coverage.'
          : displayOverallQ >= 40
          ? 'Moderate confidence synthesis with mixed source quality.'
          : 'Low-confidence synthesis requiring independent verification.'
      );
    }).finally(() => setLoadingInterpretation(false));
  }, [interpretationCacheKey, isPremium, es?.consensusScore]);

  const premiumData = isPremium ? {
    credibilityTrend: credTrend,
    biasTrend: biasTrendVal,
    diversityTrend,
    confidenceTrend,
    overallQuality: displayOverallQ,
    confidenceSpread: Math.round(displayStdDev),
    sourceReliabilityIndex: Math.round(displayCredibility * 10) / 10,
    consensusScore: es?.consensusScore ?? null,
    relevanceScore: es?.relevanceScore ?? null,
    entityInfo,
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
        {neuralLoading && isPremium && (
          <span className="text-[7px] text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Loader2 size={8} className="animate-spin" /> scoring
          </span>
        )}
        {es?.usingEmbeddings && isPremium && !neuralLoading && (
          <span className="text-[7px] text-green-500 uppercase tracking-wider flex items-center gap-1">
            <BrainCircuit size={8} /> neural
          </span>
        )}
      </div>

      <ScoreMeter value={displayAccuracy} max={10} label="Source Credibility Score"
        icon={<ShieldCheck size={12} />} color="#22c55e" />
      <ScoreMeter value={1 - displayBias} label="Objectivity (Low Bias)"
        icon={<AlertTriangle size={12} />}
        color={displayBias < 0.3 ? '#22c55e' : displayBias < 0.6 ? '#f59e0b' : '#ef4444'} />
      <ScoreMeter value={displayDiversity} label="Source Diversity"
        icon={<Globe size={12} />} color="#38bdf8" />
      <ScoreMeter value={displayConfidence} label="Confidence Interval"
        icon={<TrendingUp size={12} />} color="#a78bfa" />

      {isPremium && premiumData && (
        <div className="pt-4 border-t border-my-border space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-2">
            <BarChart3 size={12} className="text-my-accent" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-my-muted">
              Expanded Scoring Depth
            </span>
            {es?.usingEmbeddings && (
              <span className="text-[7px] text-green-500 uppercase tracking-wider">— neural consensus active</span>
            )}
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

          {/* Neural metrics row */}
          {(premiumData.consensusScore !== null || premiumData.relevanceScore !== null) && (
            <div className="grid grid-cols-2 gap-2">
              {premiumData.consensusScore !== null && (
                <div className="p-2 bg-my-bg border border-my-border flex items-center justify-between">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-my-muted">Semantic Consensus</span>
                  <span className={clsx(
                    'text-[10px] font-black font-mono',
                    premiumData.consensusScore! >= 0.7 ? 'text-green-500' : premiumData.consensusScore! >= 0.4 ? 'text-yellow-500' : 'text-red-500'
                  )}>
                    {Math.round(premiumData.consensusScore * 100)}%
                  </span>
                </div>
              )}
              {premiumData.relevanceScore !== null && (
                <div className="p-2 bg-my-bg border border-my-border flex items-center justify-between">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-my-muted">Semantic Relevance</span>
                  <span className={clsx(
                    'text-[10px] font-black font-mono',
                    premiumData.relevanceScore! >= 0.7 ? 'text-green-500' : premiumData.relevanceScore! >= 0.4 ? 'text-yellow-500' : 'text-red-500'
                  )}>
                    {Math.round(premiumData.relevanceScore * 100)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Entity diversity row */}
          {premiumData.entityInfo && (
            <div className="grid grid-cols-4 gap-1">
              {premiumData.entityInfo.orgCount > 0 && (
                <div className="p-1.5 bg-my-bg border border-my-border text-center">
                  <span className="text-[10px] font-black text-my-ink">{premiumData.entityInfo.orgCount}</span>
                  <div className="text-[6px] font-bold uppercase tracking-wider text-my-muted">Orgs</div>
                </div>
              )}
              {premiumData.entityInfo.placeCount > 0 && (
                <div className="p-1.5 bg-my-bg border border-my-border text-center">
                  <span className="text-[10px] font-black text-my-ink">{premiumData.entityInfo.placeCount}</span>
                  <div className="text-[6px] font-bold uppercase tracking-wider text-my-muted">Places</div>
                </div>
              )}
              {premiumData.entityInfo.personCount > 0 && (
                <div className="p-1.5 bg-my-bg border border-my-border text-center">
                  <span className="text-[10px] font-black text-my-ink">{premiumData.entityInfo.personCount}</span>
                  <div className="text-[6px] font-bold uppercase tracking-wider text-my-muted">People</div>
                </div>
              )}
              {premiumData.entityInfo.topicCount > 0 && (
                <div className="p-1.5 bg-my-bg border border-my-border text-center">
                  <span className="text-[10px] font-black text-my-ink">{premiumData.entityInfo.topicCount}</span>
                  <div className="text-[6px] font-bold uppercase tracking-wider text-my-muted">Topics</div>
                </div>
              )}
            </div>
          )}

          {/* Composite scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted mb-1">Overall Quality</span>
              <div className="flex items-end gap-2">
                <span className="text-xl font-black text-my-ink">{premiumData.overallQuality}%</span>
                <div className="flex-1 h-2 bg-my-border rounded-full overflow-hidden self-center mb-1">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${premiumData.overallQuality}%`,
                      background: premiumData.overallQuality >= 70 ? '#22c55e' : premiumData.overallQuality >= 40 ? '#f59e0b' : '#ef4444'
                    }} />
                </div>
              </div>
            </div>
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers size={10} className="text-my-accent" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted">Source Reliability Index</span>
              </div>
              <span className="text-xl font-black text-my-ink">{premiumData.sourceReliabilityIndex}/10</span>
            </div>
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted mb-1">Confidence Spread</span>
              <span className="text-xl font-black text-my-ink">±{premiumData.confidenceSpread}%</span>
            </div>
          </div>

          {/* Analyst interpretation */}
          <div className="p-3 bg-my-accent/5 border border-my-accent/20">
            <p className="text-[9px] text-my-ink leading-relaxed">
              <strong className="uppercase tracking-wider">Analyst Interpretation:</strong>{' '}
              {loadingInterpretation ? (
                <span className="inline-flex items-center gap-1 text-my-muted">
                  <Loader2 size={8} className="animate-spin" /> Generating analysis...
                </span>
              ) : analystInterpretation || (
                  displayOverallQ >= 70
                    ? 'High-confidence synthesis with strong source credibility and broad topical coverage.'
                    : displayOverallQ >= 40
                    ? 'Moderate confidence synthesis with mixed source quality.'
                    : 'Low-confidence synthesis requiring independent verification.'
                )}
            </p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-my-muted uppercase tracking-widest pt-2 border-t border-my-border/50 leading-[1.6]">
        Scores reflect cross-verification of multiple AI-generated analyses, domain credibility data (MBFC), and when available, neural semantic consensus from Transformers.js (browser-side MiniLM-L6-v2 embeddings). Always verify critical claims independently.
      </p>
    </div>
  );
}
