import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { Brain, Link2, AlertTriangle, TrendingUp, Tags, UserX, FileSymlink, Layers } from 'lucide-react';
import clsx from 'clsx';

/**
 * Premium-only Session Memory Synthesis Panel.
 * Visualises cross-query intelligence: topic clustering, cross-links, bias detection.
 */
export default function SessionMemoryPanel() {
  const { sessionMemory, user } = useStore();
  const isPremium = !!user?.premium;

  const stats = useMemo(() => {
    const entries = sessionMemory.entries;
    const crossLinks = sessionMemory.crossLinks;
    const topics = sessionMemory.dominantTopics;

    return {
      totalEntries: entries.length,
      reinforcementLinks: crossLinks.filter(l => l.type === 'reinforcement').length,
      conflictLinks: crossLinks.filter(l => l.type === 'conflict').length,
      expansionLinks: crossLinks.filter(l => l.type === 'expansion').length,
      topTopics: topics.slice(0, 5),
    };
  }, [sessionMemory]);

  if (!isPremium) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <Brain size={14} className="text-my-signal dark:text-my-accent" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-signal dark:text-my-accent">
          Session Memory Synthesis
        </h3>
        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-my-accent/10 text-my-accent border border-my-accent/20 rounded-sm">
          Premium
        </span>
      </div>

      <div className="border border-my-border bg-my-callout/50 p-4 space-y-4">
        {/* Overview stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Queries" value={stats.totalEntries} icon={<FileSymlink size={12} />} />
          <StatCard label="Reinforcements" value={stats.reinforcementLinks} icon={<Link2 size={12} />} />
          <StatCard label="Conflicts" value={stats.conflictLinks} icon={<AlertTriangle size={12} />} />
        </div>

        {/* Dominant Topics */}
        {stats.topTopics.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-my-muted mb-2">
              <Tags size={10} /> Dominant Topics
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stats.topTopics.map((topic, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-[9px] font-bold bg-my-accent/10 text-my-accent border border-my-accent/20 rounded-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Researcher Bias */}
        {sessionMemory.researcherBias && (
          <div className="flex items-start gap-2 p-2 bg-my-conflict-bg border border-my-conflict-border">
            <UserX size={12} className="text-my-conflict-text mt-0.5 shrink-0" />
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-my-conflict-text block mb-0.5">
                Detected Bias Pattern
              </span>
              <p className="text-[10px] text-my-ink leading-relaxed">{sessionMemory.researcherBias}</p>
            </div>
          </div>
        )}

        {/* Cross-link timeline */}
        {sessionMemory.crossLinks.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-my-muted mb-2">
              <Layers size={10} /> Cross-Query Intelligence
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {sessionMemory.crossLinks.slice(0, 8).map((link, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={clsx(
                    "p-2 border-l-2 text-[9px] leading-relaxed",
                    link.type === 'reinforcement' && "border-l-green-500 bg-green-500/5",
                    link.type === 'conflict' && "border-l-red-500 bg-red-500/5",
                    link.type === 'expansion' && "border-l-blue-500 bg-blue-500/5",
                  )}
                >
                  <span className="font-bold text-my-ink block">
                    {link.queryA} ↔ {link.queryB}
                  </span>
                  <span className="text-my-muted">{link.insight}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Synthesis readiness indicator */}
        <div className="flex items-center justify-between pt-1 border-t border-my-border">
          <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted">
            Synthesis Readiness
          </span>
          <div className="flex items-center gap-1.5">
            <div className={clsx(
              "w-1.5 h-1.5 rounded-full",
              sessionMemory.synthesisReady ? "bg-green-500 animate-pulse" : "bg-my-border"
            )} />
            <span className={clsx(
              "text-[9px] font-bold uppercase tracking-wider",
              sessionMemory.synthesisReady ? "text-green-500" : "text-my-muted"
            )}>
              {sessionMemory.synthesisReady ? 'Ready' : 'Accumulating'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-my-bg border border-my-border p-2 flex flex-col items-center text-center">
      <div className="text-my-accent mb-1">{icon}</div>
      <span className="text-[12px] font-black text-my-ink">{value}</span>
      <span className="text-[7px] font-bold uppercase tracking-widest text-my-muted">{label}</span>
    </div>
  );
}
