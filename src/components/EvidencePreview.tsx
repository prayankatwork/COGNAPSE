import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ShieldCheck, Clock, Globe, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { GroundedSource, CitationVerification } from '../types';

import clsx from 'clsx';

interface EvidencePreviewProps {
  source: GroundedSource;
  isVisible: boolean;
  position?: 'top' | 'bottom';
  verification?: CitationVerification | null;
}

function getCredibilityColor(score: number): string {
  if (score >= 81) return 'border-green-500/30 bg-green-500/5';
  if (score >= 61) return 'border-emerald-500/30 bg-emerald-500/5';
  if (score >= 41) return 'border-amber-500/30 bg-amber-500/5';
  if (score >= 21) return 'border-orange-500/30 bg-orange-500/5';
  return 'border-red-500/30 bg-red-500/5';
}

function getCredibilityLabel(score: number): string {
  // Use shared labels from scoreLabels.ts
  if (score >= 81) return 'Superior';
  if (score >= 61) return 'High';
  if (score >= 41) return 'Moderate';
  if (score >= 21) return 'Limited';
  return 'Insufficient';
}

function VerdictBadge({ verdict }: { verdict: string }) {
  switch (verdict) {
    case 'supported':
      return (
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-500/10 px-1 py-0.5">
          <CheckCircle2 size={8} /> Verified
        </span>
      );
    case 'partial':
      return (
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5">
          <AlertTriangle size={8} /> Partial
        </span>
      );
    case 'contradicted':
    case 'unrelated':
      return (
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-500/10 px-1 py-0.5">
          <XCircle size={8} /> Unsupported
        </span>
      );
    default:
      return null;
  }
}

export default function EvidencePreview({ source, isVisible, position = 'bottom', verification }: EvidencePreviewProps) {
  if (!source) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'bottom' ? 8 : -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'bottom' ? 8 : -8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={clsx(
            'absolute z-50 w-80 border shadow-xl',
            getCredibilityColor(source.credibility_score),
            position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
            'right-0 sm:right-auto'
          )}
        >
          <div className="p-3 bg-my-bg/95 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-start gap-2 mb-2">
              <ShieldCheck size={12} className={clsx(
                'shrink-0 mt-0.5',
                source.credibility_score >= 81 ? 'text-green-500' :
                source.credibility_score >= 61 ? 'text-emerald-500' :
                source.credibility_score >= 41 ? 'text-amber-500' : 'text-red-500'
              )} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-my-ink leading-tight line-clamp-2">
                  {source.title}
                </p>
                <span className="text-[8px] font-mono text-my-muted mt-0.5 block">
                  {source.domain}
                </span>
              </div>
            </div>

            {/* Snippet */}
            <p className="text-[10px] leading-relaxed text-my-syn mb-3 line-clamp-3">
              {source.snippet || source.key_finding}
            </p>

            {/* Verification Badge */}
            {verification && (
              <div className="mb-2">
                <VerdictBadge verdict={verification.verdict} />
                <span className="text-[8px] text-my-muted ml-2 font-mono">
                  {verification.confidence >= 0.7 ? 'High confidence' : verification.confidence >= 0.4 ? 'Medium confidence' : 'Low confidence'}
                </span>
              </div>
            )}

            {/* Meta Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[8px] text-my-muted">
                <span className={clsx(
                  'px-1 py-0.5 font-bold uppercase tracking-wider',
                  source.credibility_score >= 81 ? 'text-green-600 dark:text-green-400 bg-green-500/10' :
                  source.credibility_score >= 61 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' :
                  source.credibility_score >= 41 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' :
                  'text-red-600 dark:text-red-400 bg-red-500/10'
                )}>
                  {getCredibilityLabel(source.credibility_score)}
                </span>
                {source.published_date && source.published_date !== 'unknown' && (
                  <span className="flex items-center gap-1">
                    <Clock size={8} /> {source.published_date}
                  </span>
                )}
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-my-accent hover:underline"
              >
                <ExternalLink size={9} /> Visit
              </a>
            </div>
          </div>

          {/* Arrow */}
          <div className={clsx(
            'absolute left-4 w-2 h-2 bg-my-bg border-l border-t rotate-45',
            position === 'bottom'
              ? '-top-1 border-my-border/50'
              : '-bottom-1 border-my-border/50'
          )} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
