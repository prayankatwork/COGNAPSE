import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, AlertCircle, ChevronDown, ChevronUp,
  FileSearch, CheckCircle2, XCircle, ExternalLink, Search,
  Link2, ArrowUpDown, Filter
} from 'lucide-react';
import clsx from 'clsx';
import type { COGNAPSE_Output } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerifiedClaim {
  text: string;
  cleanText: string;         // text with [n] markers stripped
  citations: number[];       // source IDs referenced
  confidence: number;        // 0–100 derived from cited source credibility
  isOrphan: boolean;
}

type FilterMode = 'all' | 'cited' | 'orphan';
type SortMode  = 'default' | 'confidence_asc' | 'confidence_desc';

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseClaims(synthesis: string, sources: COGNAPSE_Output['sources']): VerifiedClaim[] {
  const sentences = synthesis
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 25);  // slightly higher threshold for quality

  return sentences.map(sentence => {
    const matches = [...sentence.matchAll(/\[(\d+)\]/g)];
    const citationIds = [...new Set(matches.map(m => parseInt(m[1])))];

    let confidence = 45; // default for orphan
    if (citationIds.length > 0 && sources && sources.length > 0) {
      const cited = sources.filter(s => citationIds.includes(s.id));
      if (cited.length > 0) {
        confidence = Math.round(
          cited.reduce((sum, s) => sum + (s.credibility_score || 50), 0) / cited.length
        );
      }
    }

    return {
      text: sentence,
      cleanText: sentence.replace(/\[\d+\]/g, '').trim(),
      citations: citationIds,
      confidence,
      isOrphan: citationIds.length === 0,
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRealUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.toLowerCase().includes('unavailable')) return false;
  if (url.toLowerCase().includes('n/a')) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function credibilityColor(score: number) {
  if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'HIGH' };
  if (score >= 60) return { bar: 'bg-blue-400',    text: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    label: 'MED'  };
  return              { bar: 'bg-red-400',     text: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     label: 'LOW'  };
}

function confidenceColor(score: number, isOrphan: boolean) {
  if (isOrphan) return { border: 'border-l-my-conflict-border', bg: 'bg-my-conflict-bg/40', badge: 'bg-my-conflict-bg text-my-conflict-text border-my-conflict-border' };
  if (score >= 80) return { border: 'border-l-emerald-400/70', bg: '', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' };
  if (score >= 60) return { border: 'border-l-blue-400/60',    bg: '', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30'         };
  return                   { border: 'border-l-red-400/60',     bg: 'bg-red-500/[0.03]', badge: 'bg-red-500/10 text-red-400 border-red-500/30' };
}

// ─── Citation chip (inline clickable) ────────────────────────────────────────

function CitationChip({
  id,
  sources,
  onOpen,
}: {
  id: number;
  sources: COGNAPSE_Output['sources'];
  onOpen: (id: number) => void;
}) {
  const src = sources?.find(s => s.id === id);
  if (!src) return (
    <span className="inline-flex items-center text-[8px] font-black text-my-muted bg-my-callout border border-my-border px-1 py-0.5 rounded-sm mx-0.5 align-middle">
      [{id}]
    </span>
  );

  const col = credibilityColor(src.credibility_score || 0);
  return (
    <button
      onClick={() => onOpen(id)}
      title={`[${id}] ${src.title}`}
      className={clsx(
        'inline-flex items-center gap-0.5 text-[8px] font-black px-1 py-0.5 rounded-sm mx-0.5 align-middle border transition-all hover:scale-105 active:scale-95 cursor-pointer',
        col.bg, col.text
      )}
    >
      [{id}]
    </button>
  );
}

// ─── Source card (expanded, anti-hallucination links) ─────────────────────────

function SourceCard({ src }: { src: NonNullable<COGNAPSE_Output['sources']>[number] }) {
  const col = credibilityColor(src.credibility_score || 0);
  const realUrl = isRealUrl(src.url);

  const googleVerifyUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${src.title ?? ''} ${src.domain ?? ''}`
  )}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 bg-my-callout border border-my-border rounded-[2px] px-3 py-2.5"
    >
      {/* Title + badge row */}
      <div className="flex items-start gap-2">
        <span className={clsx('text-[9px] font-black px-1.5 py-0.5 rounded-sm border shrink-0 mt-0.5', col.bg, col.text)}>
          [{src.id}] {col.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-my-ink leading-tight line-clamp-2">{src.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[9px] text-my-muted">{src.domain}</span>
            {src.type && <span className="text-[9px] text-my-muted/60">· {src.type}</span>}
            {src.published_date && <span className="text-[9px] text-my-muted/60">· {src.published_date}</span>}
          </div>
        </div>
      </div>

      {/* Credibility bar */}
      <div className="flex items-center gap-2">
        <span className="text-[8px] text-my-muted uppercase tracking-wider w-14 shrink-0">Credibility</span>
        <div className="flex-1 h-1 bg-my-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${src.credibility_score ?? 0}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={clsx('h-full rounded-full', col.bar)}
          />
        </div>
        <span className={clsx('text-[9px] font-black w-8 text-right', col.text)}>
          {src.credibility_score ?? '?'}
        </span>
      </div>

      {/* Key finding */}
      {src.key_finding && (
        <p className="text-[10px] text-my-syn leading-snug italic border-l border-my-accent/30 pl-2">
          {src.key_finding}
        </p>
      )}

      {/* Bias flag */}
      {src.bias_flag && (
        <div className="flex items-center gap-1 text-[9px] text-my-conflict-text bg-my-conflict-bg border border-my-conflict-border px-2 py-1 rounded-[2px]">
          <AlertCircle size={9} />
          <span>Bias flagged: {src.bias_flag}</span>
        </div>
      )}

      {/* Actions — zero hallucination: Google Search is always safe; Direct Access only if URL is real */}
      <div className="flex items-center gap-2 pt-1 border-t border-my-border">
        <a
          href={googleVerifyUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 rounded-[2px] transition-colors"
        >
          <Search size={9} /> Verify on Google
        </a>
        {realUrl ? (
          <a
            href={src.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-my-ink border border-my-border hover:border-my-accent hover:text-my-accent px-2.5 py-1.5 rounded-[2px] transition-colors"
          >
            <ExternalLink size={9} /> Direct Access
          </a>
        ) : (
          <span
            className="flex items-center gap-1.5 text-[9px] text-my-muted/50 border border-my-border/40 px-2.5 py-1.5 rounded-[2px] cursor-not-allowed"
            title="Direct URL could not be verified — use Google Verify instead"
          >
            <Link2 size={9} /> URL Unverified
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Claim Row ────────────────────────────────────────────────────────────────

function ClaimRow({
  claim,
  sources,
  index,
  expandedSourceId,
  onToggleSource,
}: {
  claim: VerifiedClaim;
  sources: COGNAPSE_Output['sources'];
  index: number;
  expandedSourceId: number | null;
  onToggleSource: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const col = confidenceColor(claim.confidence, claim.isOrphan);
  const citedSources = useMemo(
    () => (Array.isArray(sources) ? sources : []).filter(s => s && claim.citations.includes(s.id)),
    [sources, claim.citations]
  );
  const canExpand = citedSources.length > 0 || claim.isOrphan;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.5), duration: 0.25 }}
      className={clsx('border-l-2 rounded-r-[2px] px-3 py-2 group transition-colors', col.border, col.bg)}
    >
      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2">
        {/* Sentence index */}
        <span className="text-[8px] font-black text-my-muted/40 shrink-0 mt-1 w-4 text-right">{index + 1}</span>

        {/* Claim text with inline citation chips */}
        <p className="text-[12px] text-my-syn leading-relaxed flex-1 flex flex-wrap items-baseline gap-x-0.5">
          {/* Render text with [n] replaced by interactive chips */}
          {renderClaimWithChips(claim.text, sources, onToggleSource)}
        </p>

        {/* Confidence badge */}
        <span className={clsx(
          'shrink-0 mt-0.5 text-[9px] font-black px-1.5 py-0.5 border rounded-sm flex items-center gap-0.5',
          col.badge
        )}>
          {claim.isOrphan ? <AlertCircle size={8} /> : <ShieldCheck size={8} />}
          {claim.isOrphan ? '?' : `${claim.confidence}%`}
        </span>

        {/* Expand toggle */}
        {canExpand && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 mt-0.5 text-my-muted/40 hover:text-my-accent transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* ── Expanded source cards ─────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden mt-2 ml-6"
          >
            {claim.isOrphan ? (
              <div className="flex items-start gap-2 text-[10px] text-my-conflict-text bg-my-conflict-bg border border-my-conflict-border px-3 py-2 rounded-[2px]">
                <AlertCircle size={10} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">Orphan Claim</span>
                  <span className="opacity-70"> — No inline citation found for this assertion. Use "Verify on Google" from any source to cross-check, or treat with caution.</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {citedSources.map(src => (
                  <SourceCard key={src.id} src={src} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Render claim text with interactive citation chips ────────────────────────

function renderClaimWithChips(
  text: string,
  sources: COGNAPSE_Output['sources'],
  onOpen: (id: number) => void
): React.ReactNode[] {
  // Split on [n] markers, rebuilding as text + chip alternations
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const id = parseInt(match[1]);
      return <CitationChip key={i} id={id} sources={sources} onOpen={onOpen} />;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClaimVerifier({ report }: { report: COGNAPSE_Output }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('default');
  const [expandedSourceId, setExpandedSourceId] = useState<number | null>(null);

  const synthesis = report.summary?.full_synthesis || '';
  const sources = Array.isArray(report.sources) ? report.sources : [];
  const allClaims = useMemo(() => parseClaims(synthesis, sources), [synthesis, sources]);

  const orphanCount = allClaims.filter(c => c.isOrphan).length;
  const citedCount  = allClaims.filter(c => !c.isOrphan).length;
  const avgConfidence = citedCount > 0
    ? Math.round(allClaims.filter(c => !c.isOrphan).reduce((s, c) => s + c.confidence, 0) / citedCount)
    : 0;

  const displayedClaims = useMemo(() => {
    let list = [...allClaims];

    // Filter
    if (filter === 'cited')  list = list.filter(c => !c.isOrphan);
    if (filter === 'orphan') list = list.filter(c => c.isOrphan);

    // Sort
    if (sort === 'confidence_desc') list.sort((a, b) => b.confidence - a.confidence);
    if (sort === 'confidence_asc')  list.sort((a, b) => a.confidence - b.confidence);

    return list;
  }, [allClaims, filter, sort]);

  const handleToggleSource = (id: number) => {
    setExpandedSourceId(prev => prev === id ? null : id);
  };

  if (!synthesis || allClaims.length === 0) return null;

  const orphanPct = allClaims.length > 0 ? Math.round((orphanCount / allClaims.length) * 100) : 0;
  const auditGrade =
    avgConfidence >= 80 && orphanPct <= 20 ? { label: 'A', cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' } :
    avgConfidence >= 65 && orphanPct <= 40 ? { label: 'B', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30'          } :
    avgConfidence >= 50                     ? { label: 'C', cls: 'text-my-conflict-text bg-my-conflict-bg border-my-conflict-border'       } :
                                             { label: 'D', cls: 'text-red-400 bg-red-500/10 border-red-500/30'             };

  return (
    <div className="mt-6 border border-my-border rounded-[4px] overflow-hidden shadow-sm">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-my-callout hover:bg-my-callout/70 transition-colors group"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <FileSearch size={14} className="text-my-accent shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-my-ink">Claim Audit Trail</span>

          {/* Audit grade badge */}
          <span className={clsx('text-[10px] font-black px-2 py-0.5 border rounded-sm', auditGrade.cls)}>
            {auditGrade.label}
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm border border-emerald-500/20">
              <CheckCircle2 size={8} /> {citedCount} cited
            </span>
            {orphanCount > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-my-conflict-text bg-my-conflict-bg px-1.5 py-0.5 rounded-sm border border-my-conflict-border">
                <XCircle size={8} /> {orphanCount} unverified
              </span>
            )}
            <span className="text-[9px] text-my-muted">
              avg <span className="text-my-accent font-bold">{avgConfidence}%</span> confidence
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ShieldCheck size={12} className="text-my-muted group-hover:text-my-accent transition-colors" />
          {open ? <ChevronUp size={13} className="text-my-muted" /> : <ChevronDown size={13} className="text-my-muted" />}
        </div>
      </button>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {/* Controls bar */}
            <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-my-border bg-my-callout/50 flex-wrap">
              {/* Filter tabs */}
              <div className="flex items-center gap-0 text-[9px] font-black uppercase tracking-widest">
                {(['all', 'cited', 'orphan'] as FilterMode[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      'px-2.5 py-1.5 border-b-2 transition-colors',
                      filter === f
                        ? f === 'orphan'
                          ? 'text-my-conflict-text border-my-conflict-text'
                          : 'text-my-accent border-my-accent'
                        : 'text-my-muted border-transparent hover:text-my-ink'
                    )}
                  >
                    {f === 'all'    ? `All (${allClaims.length})` :
                     f === 'cited'  ? `Cited (${citedCount})` :
                                     `Unverified (${orphanCount})`}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown size={10} className="text-my-muted" />
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortMode)}
                  className="text-[9px] font-bold text-my-ink bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value="default">Document order</option>
                  <option value="confidence_desc">Highest confidence first</option>
                  <option value="confidence_asc">Lowest confidence first</option>
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className="px-4 py-2 border-b border-my-border flex items-center gap-4 flex-wrap">
              <p className="text-[9px] text-my-muted font-mono">
                Click <span className="text-my-accent font-bold">[n]</span> chips inline to inspect sources · Expand rows for full provenance · Links open real verified sources only
              </p>
              <div className="flex items-center gap-3 ml-auto">
                {[
                  { col: 'bg-emerald-400/60', label: '≥80% High' },
                  { col: 'bg-blue-400/60',    label: '≥60% Med'  },
                  { col: 'bg-red-400/60',     label: '<60% Low'  },
                  { col: 'bg-my-conflict-text/60', label: 'Unverified'},
                ].map(({ col, label }) => (
                  <span key={label} className="flex items-center gap-1 text-[8px] text-my-muted">
                    <span className={clsx('w-2 h-2 rounded-full shrink-0', col)} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Claims list */}
            <div className="p-4 flex flex-col gap-1.5 max-h-[520px] overflow-y-auto custom-scrollbar">
              {displayedClaims.length === 0 ? (
                <p className="text-[10px] text-my-muted text-center py-6 italic">
                  No claims match the current filter.
                </p>
              ) : (
                displayedClaims.map((claim, i) => (
                  <ClaimRow
                    key={i}
                    claim={claim}
                    sources={sources}
                    index={i}
                    expandedSourceId={expandedSourceId}
                    onToggleSource={handleToggleSource}
                  />
                ))
              )}
            </div>

            {/* Footer summary */}
            <div className="px-4 py-2 border-t border-my-border bg-my-callout/30 flex items-center justify-between">
              <span className="text-[9px] text-my-muted font-mono">
                {citedCount}/{allClaims.length} sentences cited · {orphanPct}% unverified
              </span>
              <span className="text-[9px] text-my-muted font-mono">
                All source links are verified against the report's real source list — no AI-invented URLs
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
