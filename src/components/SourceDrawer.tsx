import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExternalLink, Globe, Search, Clock, 
  Building2, Newspaper, Hash, GraduationCap
} from 'lucide-react';
import type { GroundedSource, RetrievalTrace } from '../types';
import { getCredibilityLabel } from '../utils/scoreLabels';
import clsx from 'clsx';

interface SourceDrawerProps {
  sources: GroundedSource[];
  retrievalTrace?: RetrievalTrace | null;
  isPremium?: boolean;
}

function getSourceIcon(type: string) {
  switch (type) {
    case 'academic': return <GraduationCap size={12} />;
    case 'government': return <Building2 size={12} />;
    case 'journalism': return <Newspaper size={12} />;
    case 'industry': return <Building2 size={12} />;
    default: return <Globe size={12} />;
  }
}

function getSourceColor(type: string): string {
  // Use theme-aware CSS variable colors via Tailwind arbitrary values
  switch (type) {
    case 'academic': return 'text-emerald-600 dark:text-emerald-400';
    case 'government': return 'text-sky-600 dark:text-sky-400';
    case 'journalism': return 'text-amber-600 dark:text-amber-400';
    case 'industry': return 'text-violet-600 dark:text-violet-400';
    default: return 'text-my-muted';
  }
}

function getSourceBg(type: string): string {
  switch (type) {
    case 'academic': return 'bg-emerald-50 dark:bg-emerald-900/30';
    case 'government': return 'bg-sky-50 dark:bg-sky-900/30';
    case 'journalism': return 'bg-amber-50 dark:bg-amber-900/30';
    case 'industry': return 'bg-violet-50 dark:bg-violet-900/30';
    default: return 'bg-my-callout';
  }
}

function getSourceLabel(type: string): string {
  switch (type) {
    case 'academic': return 'Academic';
    case 'government': return 'Government';
    case 'journalism': return 'Journalism';
    case 'industry': return 'Industry';
    case 'Document': return 'Document';
    default: return 'Web';
  }
}

function CredibilityBar({ score, showRaw }: { score: number; showRaw?: boolean }) {
  const barColor = score >= 81 ? 'bg-green-500' : score >= 61 ? 'bg-emerald-500' : score >= 41 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 81 ? 'text-green-600 dark:text-green-400' : score >= 61 ? 'text-emerald-600 dark:text-emerald-400' : score >= 41 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const label = getCredibilityLabel(score);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-16 h-1.5 bg-my-border rounded-full overflow-hidden shrink-0">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <div className="flex items-center gap-1.5">
        {showRaw && (
          <span className={clsx(
            'text-[9px] font-bold font-mono tabular-nums shrink-0',
            textColor
          )}>
            {score}
          </span>
        )}
        <span className="text-[7px] font-bold uppercase tracking-wider text-my-muted/50 hidden sm:inline">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function SourceDrawer({ sources, retrievalTrace, isPremium }: SourceDrawerProps) {
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="border border-my-border bg-my-callout/50">
      {/* Header Bar */}
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search size={14} className="text-my-accent" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-my-ink">
            Sources ({sources.length})
          </span>
          {retrievalTrace && (
            <span className="text-[8px] font-mono text-my-muted hidden sm:inline">
              {retrievalTrace.search_provider} · {retrievalTrace.latency_ms}ms
            </span>
          )}
        </div>
      </div>

      {/* Source List - always visible */}
      <div className="px-4 pb-4 space-y-2">
              {sources.map((source) => (
                <div key={source.id} className="border border-my-border bg-my-bg/50">
                  <button
                    onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
                    className="w-full px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-my-callout/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className={clsx(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black shrink-0',
                        getSourceColor(source.type)
                      )}>
                        {source.id}
                      </span>
                      <span className="text-[11px] font-medium text-my-ink truncate">
                        {source.title}
                      </span>
                      <span className={clsx(
                        'text-[8px] font-bold uppercase tracking-wider shrink-0',
                        getSourceColor(source.type)
                      )}>
                        {getSourceLabel(source.type)}
                      </span>
                    </div>
                    <CredibilityBar score={source.credibility_score} showRaw={isPremium} />
                  </button>

                  <AnimatePresence>
                    {expandedSource === source.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                      >
                        <div className="px-3 pb-3 space-y-2">
                          <p className="text-[11px] leading-relaxed text-my-syn">
                            {source.snippet || source.key_finding}
                          </p>
                          <div className="flex items-center gap-3 text-[9px] text-my-muted font-mono">
                            <span className="flex items-center gap-1">
                              <Globe size={9} />
                              {source.domain}
                            </span>
                            {source.published_date && source.published_date !== 'unknown' && (
                              <span className="flex items-center gap-1">
                                <Clock size={9} />
                                {source.published_date}
                              </span>
                            )}
                          </div>
                          <a
                            href={source.url || `https://www.google.com/search?q=${encodeURIComponent(source.domain ? `site:${source.domain} "${source.title}"` : `"${source.title}"`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[8px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                          >
                            <ExternalLink size={10} /> {source.url ? 'Open Source' : 'Find Source'}
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Retrieval Trace */}
              {retrievalTrace && (
                <div className="mt-3 pt-3 border-t border-my-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash size={10} className="text-my-muted" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted">Retrieval Trace</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <TraceStat label="Provider" value={retrievalTrace.search_provider} />
                    <TraceStat label="Retrieved" value={`${retrievalTrace.sources_retrieved}`} />
                    <TraceStat label="Duplicates Removed" value={`${retrievalTrace.dedup_removed || 0}`} />
                    <TraceStat label="Latency" value={`${retrievalTrace.latency_ms}ms`} />
                  </div>
                </div>
              )}
            </div>
    </div>
  );
}

function TraceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 bg-my-bg border border-my-border/50">
      <span className="block text-[7px] font-bold uppercase tracking-widest text-my-muted">{label}</span>
      <span className="block text-[10px] font-mono text-my-ink font-medium mt-0.5">{value}</span>
    </div>
  );
}
