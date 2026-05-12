import React from 'react';
import { ResearchScore } from '../types';
import { ShieldCheck, AlertTriangle, Globe, TrendingUp } from 'lucide-react';

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
        <span className="text-[11px] font-black font-mono" style={{ color }}>
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

export default function ResearchScoreCard({ scores }: Props) {
  return (
    <div className="mt-8 p-6 border border-my-border bg-white/5 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <TrendingUp size={16} className="text-my-accent" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-my-accent">
          Intelligence Quality Report
        </h3>
      </div>

      <ScoreMeter
        value={scores.accuracy}
        max={10}
        label="Accuracy Score"
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

      <p className="text-[9px] text-my-muted uppercase tracking-widest pt-2 border-t border-my-border/50 leading-relaxed">
        Scores derived from cross-verification of two independent AI-generated drafts via reference Jaccard similarity, credibility variance analysis, and domain diversity profiling.
      </p>
    </div>
  );
}
