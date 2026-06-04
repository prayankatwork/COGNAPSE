import React, { useEffect, useState, useMemo } from 'react';
import { ResearchScore } from '../types';
import { Globe, TrendingUp, BarChart3, Layers, Crown, Loader2, BrainCircuit } from 'lucide-react';
import { useStore } from '../store';
import { lookupDomain, factualToScore } from '../utils/domainCredibility';
import { computeAllScores, computeEntityDiversity, normalizeCredScore } from '../utils/scoringEngine';
import { getCredibilityLabel, getConfidenceLabel, getDiversityLabel, getQualityLabel, getQualityGrade, getQualityColor, getCredibilityColor, getConfidenceColor, getDiversityColor } from '../utils/scoreLabels';
import clsx from 'clsx';

interface Props { scores: ResearchScore; }

function ScoreMeter({ value, max = 1, label, icon, color, labelText, showRaw }: {
  value: number; max?: number; label: string; icon: React.ReactNode; color: string; labelText?: string; showRaw?: boolean;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-my-muted">
          {icon}{label}
        </div>
        <div className="flex items-center gap-2">
          {labelText && (
            <span className="text-[11px] font-bold text-my-ink leading-none">{labelText}</span>
          )}
          {showRaw && (
            <span className="text-[8px] font-mono text-my-muted/40" title="Raw score">
              {max === 10 ? `${value}/10` : `${Math.round(value * 100)}%`}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full bg-my-border/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
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
    const cred = normalizeCredScore(s.credibility_score);
    const domainInfo = lookupDomain(s.domain || '');
    if (domainInfo) return factualToScore(domainInfo.factual) * 0.7 + (cred ?? 5) * 0.3;
    return cred ?? 5;
  });
  const relevanceScores = sources.map(s => s.relevance_score ?? 5);
  const avgCredibility = sources.length > 0 ? credScores.reduce((a, b) => a + b, 0) / credScores.length : 5;
  const credStdDev = sources.length > 1
    ? Math.sqrt(credScores.reduce((sum, s) => sum + (s - avgCredibility) ** 2, 0) / credScores.length)
    : 0;

  const avgRelevance = relevanceScores.length > 0 ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length / 100 : 0.5;
  const consensusBase = ({ strong: 1, mixed: 0.7, contested: 0.4, insufficient: 0.2 } as Record<string, number>)[reportScores?.evidence_consensus || ''] ?? 0.5;
  const fallbackOverallQ = Math.round((
    (avgCredibility / 10) * 0.40 + consensusBase * 0.30 +
    avgRelevance * 0.15 +
    scores.sourceDiversity * 0.15
  ) * 100);

  // Choose enhanced vs fallback scores
  const es = enhanced;
  const displayDiversity = es?.sourceDiversity ?? scores.sourceDiversity;
  const displayConfidence = es?.confidenceInterval ?? scores.confidenceInterval;
  const displayCredibility = es?.enhancedCredibility ?? avgCredibility;
  const displayStdDev = es?.credibilityStdDev ?? (credStdDev / (avgCredibility || 1)) * 100;
  const displayOverallQ = es?.overallQuality ?? fallbackOverallQ;

  const entityInfo = useMemo(() => sources.length > 0 ? computeEntityDiversity(sources) : null, [sources]);

  const premiumData = isPremium ? {
    overallQuality: displayOverallQ,
    confidenceSpread: Math.round(displayStdDev),
    sourceReliabilityIndex: Math.round(displayCredibility * 10) / 10,
    consensusScore: es?.consensusScore ?? null,
    relevanceScore: es?.relevanceScore ?? null,
    entityInfo,
  } : null;

  return (
    <div className="mt-8 p-6 border border-my-border bg-my-callout/50 space-y-5">
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
          <span className="text-[7px] ds-text-success uppercase tracking-wider flex items-center gap-1">
            <BrainCircuit size={8} /> neural
          </span>
        )}
      </div>

      <ScoreMeter value={displayDiversity} label="Source Diversity"
        icon={<Globe size={12} />} color="#38bdf8"
        labelText={getDiversityLabel(displayDiversity)}
        showRaw={isPremium} />
      <ScoreMeter value={displayConfidence} label="Confidence Interval"
        icon={<TrendingUp size={12} />} color="#a78bfa"
        labelText={getConfidenceLabel(displayConfidence)}
        showRaw={isPremium} />

      {isPremium && premiumData && (
        <div className="pt-4 border-t border-my-border space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-2">
            <BarChart3 size={12} className="text-my-accent" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-my-muted">
              Expanded Scoring Depth
            </span>
            {es?.usingEmbeddings && (
              <span className="text-[7px] ds-text-success uppercase tracking-wider">— neural consensus active</span>
            )}
          </div>



          {/* Neural metrics row */}
          {(premiumData.consensusScore !== null || premiumData.relevanceScore !== null) && (
            <div className="grid grid-cols-2 gap-2">
              {premiumData.consensusScore !== null && (
                <div className="p-2 bg-my-bg border border-my-border flex items-center justify-between">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-my-muted">Semantic Consensus</span>
                  <span className={clsx(
                    'text-[10px] font-black font-mono',
                    premiumData.consensusScore! >= 0.7 ? 'ds-text-success' : premiumData.consensusScore! >= 0.4 ? 'ds-text-warning' : 'ds-text-danger'
                  )}>
                    {premiumData.consensusScore! >= 0.7 ? 'High' : premiumData.consensusScore! >= 0.4 ? 'Medium' : 'Low'}
                  </span>
                </div>
              )}
              {premiumData.relevanceScore !== null && (
                <div className="p-2 bg-my-bg border border-my-border flex items-center justify-between">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-my-muted">Semantic Relevance</span>
                  <span className={clsx(
                    'text-[10px] font-black font-mono',
                    premiumData.relevanceScore! >= 0.7 ? 'ds-text-success' : premiumData.relevanceScore! >= 0.4 ? 'ds-text-warning' : 'ds-text-danger'
                  )}>
                    {premiumData.relevanceScore! >= 0.7 ? 'High' : premiumData.relevanceScore! >= 0.4 ? 'Medium' : 'Low'}
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
                <div className="flex flex-col">
                  <span className="text-xl font-black text-my-ink">
                    {getQualityGrade(premiumData.overallQuality)}
                  </span>
                  <span className={clsx('text-[9px] font-bold', getQualityColor(premiumData.overallQuality))}>
                    {getQualityLabel(premiumData.overallQuality)}
                  </span>
                </div>
                <div className="flex-1 h-2 bg-my-border rounded-full overflow-hidden self-center mb-1">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${premiumData.overallQuality}%`,
                      background: premiumData.overallQuality >= 70 ? '#22c55e' : premiumData.overallQuality >= 40 ? '#f59e0b' : '#ef4444'
                    }} />
                </div>
                <span className="text-[8px] font-mono text-my-muted/40" title="Raw score">
                  {premiumData.overallQuality}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers size={10} className="text-my-accent" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted">Source Reliability Index</span>
              </div>
              <span className="text-xl font-black text-my-ink">{premiumData.sourceReliabilityIndex}/10</span>
              <span className={clsx('text-[9px] font-bold', getCredibilityColor(Math.round(premiumData.sourceReliabilityIndex * 10)))}>
                {getCredibilityLabel(Math.round(premiumData.sourceReliabilityIndex * 10))}
              </span>
            </div>
            <div className="p-3 bg-my-bg border border-my-border flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted mb-1">Confidence Spread</span>
              <span className="text-xl font-black text-my-ink">±{premiumData.confidenceSpread}%</span>
              {(() => {
                // Invert: low spread = high confidence (sources agree)
                const inverted = Math.max(0, Math.min(1, 1 - (premiumData.confidenceSpread / 100)));
                return (
                  <span className={clsx('text-[9px] font-bold', getConfidenceColor(inverted))}>
                    {getConfidenceLabel(inverted)}
                  </span>
                );
              })()}
            </div>
          </div>


        </div>
      )}

      <p className="text-[10px] text-my-muted uppercase tracking-widest pt-2 border-t border-my-border/50 leading-[1.6]">
        Scores reflect cross-verification of multiple AI-generated analyses, domain credibility data (MBFC), and when available, neural semantic consensus from Transformers.js (browser-side MiniLM-L6-v2 embeddings). Always verify critical claims independently.
      </p>
    </div>
  );
}
