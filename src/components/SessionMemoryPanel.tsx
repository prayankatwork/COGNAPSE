import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Link2,
  Sparkles, X, Loader2, TrendingUp, GitMerge, GitBranch, Maximize2,
  FlaskConical, SearchX, ArrowRight, CheckCircle2, Search
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { executeSessionSynthesis, type SessionSynthesisResult } from '../services/geminiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionCrossLink {
  type: 'reinforcement' | 'conflict' | 'expansion';
  queryA: string;
  queryB: string;
  insight: string;
}

export interface SessionMemoryEntry {
  id: string;
  query: string;
  timestamp: string;
  topicCluster: string;
  tags: string[];
  bottomLine: string;
  credibility: number;
}

export interface SessionMemoryState {
  sessionId: string;
  entries: SessionMemoryEntry[];
  crossLinks: SessionCrossLink[];
  dominantTopics: string[];
  researcherBias: string | null;
  synthesisReady: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LinkIcon({ type }: { type: SessionCrossLink['type'] }) {
  if (type === 'conflict') return <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />;
  if (type === 'reinforcement') return <Lightbulb size={11} className="text-emerald-500 shrink-0 mt-0.5" />;
  return <Link2 size={11} className="text-blue-400 shrink-0 mt-0.5" />;
}

function linkLabel(type: SessionCrossLink['type']) {
  if (type === 'conflict') return { label: 'CONFLICT', cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  if (type === 'reinforcement') return { label: 'REINFORCED', cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  return { label: 'EXPANSION', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
}

function MomentumIcon({ momentum }: { momentum: SessionSynthesisResult['researchMomentum'] }) {
  if (momentum === 'converging') return <GitMerge size={13} className="text-emerald-400" />;
  if (momentum === 'diverging') return <GitBranch size={13} className="text-amber-400" />;
  return <Maximize2 size={13} className="text-blue-400" />;
}

function MomentumBadge({ momentum }: { momentum: SessionSynthesisResult['researchMomentum'] }) {
  const config = {
    converging: { label: 'CONVERGING', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', desc: 'Evidence is aligning toward a conclusion' },
    diverging:  { label: 'DIVERGING',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  desc: 'Growing complexity, no clear answer yet' },
    expanding:  { label: 'EXPANDING',  cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20',    desc: 'Each search opened more questions' },
  }[momentum];
  return (
    <div className="flex items-center gap-2">
      <MomentumIcon momentum={momentum} />
      <span className={clsx('text-[9px] font-black px-1.5 py-0.5 border rounded-sm', config.cls)}>
        {config.label}
      </span>
      <span className="text-[9px] text-my-muted">{config.desc}</span>
    </div>
  );
}

// ─── Synthesis Panel ──────────────────────────────────────────────────────────

function SynthesisView({
  result,
  onDrillDown,
}: {
  result: SessionSynthesisResult;
  onDrillDown: (q: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      {/* Overarching Theme */}
      <div className="bg-purple-500/10 border border-purple-500/20 px-4 py-3 rounded-[2px]">
        <p className="text-[9px] uppercase tracking-widest font-bold text-purple-400 mb-1">Overarching Theme</p>
        <p className="text-[13px] font-serif italic text-my-ink leading-snug">{result.overarchingTheme}</p>
      </div>

      {/* Momentum */}
      <div>
        <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 mb-2">Research Momentum</p>
        <MomentumBadge momentum={result.researchMomentum} />
      </div>

      {/* Unified Insight */}
      <div>
        <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 mb-2">Unified Intelligence</p>
        <p className="text-[12px] text-my-syn leading-relaxed border-l-2 border-purple-500/40 pl-3">
          {result.unifiedInsight}
        </p>
      </div>

      {/* Key Patterns */}
      {result.keyPatterns?.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 mb-2">
            Recurring Patterns
          </p>
          <div className="flex flex-col gap-1.5">
            {result.keyPatterns.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-my-syn">
                <CheckCircle2 size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contradictions */}
      {result.contradictions?.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 mb-2">
            Cross-Session Contradictions
          </p>
          <div className="flex flex-col gap-1.5">
            {result.contradictions.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-my-syn bg-amber-500/5 border border-amber-500/20 px-3 py-2 rounded-[2px]">
                <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forward Hypothesis */}
      <div className="bg-my-callout border border-my-border px-4 py-3 rounded-[2px]">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical size={11} className="text-my-accent" />
          <p className="text-[9px] uppercase tracking-widest font-bold text-my-accent">Forward Hypothesis</p>
        </div>
        <p className="text-[12px] font-medium text-my-ink leading-snug italic">"{result.forwardHypothesis}"</p>
      </div>

      {/* Knowledge Gaps → drill-down buttons */}
      {result.knowledgeGaps?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <SearchX size={11} className="text-my-muted" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60">
              Knowledge Gaps — Investigate Next
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {result.knowledgeGaps.map((gap, i) => (
              <button
                key={i}
                onClick={() => onDrillDown(gap)}
                className="flex items-center gap-2 text-left text-[11px] text-my-ink bg-my-bg hover:bg-my-accent hover:text-white border border-my-border hover:border-my-accent px-3 py-2 transition-all group rounded-[2px]"
              >
                <Search size={10} className="shrink-0 text-my-muted group-hover:text-white" />
                <span className="flex-1">{gap}</span>
                <ArrowRight size={10} className="shrink-0 text-my-muted group-hover:text-white transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SessionMemoryPanel() {
  const sessionMemory = useStore(s => s.sessionMemory);
  const clearSessionMemory = useStore(s => s.clearSessionMemory);
  const setInitialQuery = useStore(s => s.setInitialQuery);
  const setCurrentReport = useStore(s => s.setCurrentReport);

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesis, setSynthesis] = useState<SessionSynthesisResult | null>(null);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'links' | 'synthesis'>('links');

  if (dismissed) return null;

  const { entries, crossLinks, dominantTopics, researcherBias, synthesisReady } = sessionMemory;

  if (entries.length < 2) return null;

  const conflicts = crossLinks.filter(l => l.type === 'conflict');

  const handleGenerateSynthesis = async () => {
    setSynthesizing(true);
    setSynthError(null);
    setActiveTab('synthesis');
    try {
      const result = await executeSessionSynthesis(
        entries.map(e => ({ query: e.query, bottomLine: e.bottomLine, topicCluster: e.topicCluster, credibility: e.credibility })),
        crossLinks
      );
      setSynthesis(result);
    } catch (e: any) {
      setSynthError(e.message || 'Synthesis failed. Please retry.');
    } finally {
      setSynthesizing(false);
    }
  };

  // Drill down into a knowledge gap — fire a new search
  const handleDrillDown = (query: string) => {
    setCurrentReport(null);
    setInitialQuery(query);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 border border-purple-500/30 rounded-[4px] overflow-hidden bg-purple-500/5 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.08)]"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center gap-3 text-left group"
        >
          <div className="relative">
            <Brain size={16} className="text-purple-400" />
            {synthesisReady && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-1 rounded-full bg-purple-500/30"
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
              Session Intelligence · {entries.length} Searches
            </span>
            <span className="text-[9px] text-purple-300/60 font-mono">
              {crossLinks.length} cross-query link{crossLinks.length !== 1 ? 's' : ''} detected
              {dominantTopics.length > 0 && ` · ${dominantTopics.slice(0, 2).join(', ')}`}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 mr-3">
            {conflicts.length > 0 && (
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-sm">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
              </span>
            )}
            {synthesis && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm">
                <CheckCircle2 size={8} /> Synthesized
              </span>
            )}
            {synthesisReady && !synthesis && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-sm">
                <Sparkles size={8} /> Synthesis ready
              </span>
            )}
          </div>
          {open ? <ChevronUp size={13} className="text-purple-400 shrink-0" /> : <ChevronDown size={13} className="text-purple-400 shrink-0" />}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 text-my-muted hover:text-my-ink transition-colors"
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>

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
            <div className="px-4 pb-4 flex flex-col gap-4">

              {/* Researcher Bias */}
              {researcherBias && (
                <div className="flex items-start gap-2 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-[2px]">
                  <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                  <span>
                    <span className="font-black">Pattern Detected:</span> Your research leans toward{' '}
                    <span className="font-bold">{researcherBias}</span>. Consider diversifying your sources.
                  </span>
                </div>
              )}

              {/* ── Tabs ──────────────────────────────────────────────────── */}
              <div className="flex items-center gap-0 border-b border-purple-500/20">
                <button
                  onClick={() => setActiveTab('links')}
                  className={clsx(
                    'text-[9px] font-black uppercase tracking-widest px-3 py-2 border-b-2 transition-colors',
                    activeTab === 'links'
                      ? 'text-purple-300 border-purple-400'
                      : 'text-my-muted border-transparent hover:text-purple-300'
                  )}
                >
                  Cross-Links
                </button>
                <button
                  onClick={() => setActiveTab('synthesis')}
                  className={clsx(
                    'flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-2 border-b-2 transition-colors',
                    activeTab === 'synthesis'
                      ? 'text-purple-300 border-purple-400'
                      : 'text-my-muted border-transparent hover:text-purple-300'
                  )}
                >
                  <Sparkles size={9} />
                  AI Synthesis
                  {synthesisReady && !synthesis && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </button>
              </div>

              {/* ── TAB: Cross-Links ──────────────────────────────────────── */}
              {activeTab === 'links' && (
                <div className="flex flex-col gap-4">
                  {/* Cross-query links */}
                  {crossLinks.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {crossLinks.map((link, i) => {
                        const { label, cls } = linkLabel(link.type);
                        return (
                          <div key={i} className="flex items-start gap-2 bg-my-callout/50 border border-my-border px-3 py-2 rounded-[2px]">
                            <LinkIcon type={link.type} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={clsx('text-[8px] font-black px-1 py-0.5 rounded-sm border', cls)}>{label}</span>
                                <span className="text-[9px] text-my-muted truncate max-w-[130px]">"{link.queryA.substring(0, 35)}{link.queryA.length > 35 ? '...' : ''}"</span>
                                <span className="text-[9px] text-my-muted">↔</span>
                                <span className="text-[9px] text-my-muted truncate max-w-[130px]">"{link.queryB.substring(0, 35)}{link.queryB.length > 35 ? '...' : ''}"</span>
                              </div>
                              <p className="text-[10px] text-my-syn leading-snug">{link.insight}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-my-muted italic text-center py-2">
                      No cross-links yet. Keep researching to build connections.
                    </p>
                  )}

                  {/* Session Thread */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 mb-2">Session Thread</p>
                    <div className="relative border-l border-purple-500/30 ml-1 space-y-2">
                      {entries.map((entry, i) => (
                        <div key={entry.id} className="pl-4 relative">
                          <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-purple-500/40 border border-purple-500 flex items-center justify-center">
                            <span className="text-[6px] font-black text-purple-200">{i + 1}</span>
                          </div>
                          <p className="text-[10px] font-bold text-my-ink leading-tight">{entry.query}</p>
                          <p className="text-[9px] text-my-muted">{entry.topicCluster} · Credibility {entry.credibility}%</p>
                          {entry.bottomLine && (
                            <p className="text-[9px] text-my-syn mt-0.5 line-clamp-2">{entry.bottomLine}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: AI Synthesis ─────────────────────────────────────── */}
              {activeTab === 'synthesis' && (
                <div className="flex flex-col gap-4">
                  {!synthesis && !synthesizing && (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      <div className="relative">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                          className="w-16 h-16 rounded-full border border-dashed border-purple-500/40"
                        />
                        <Brain size={24} className="text-purple-400 absolute inset-0 m-auto" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-my-ink mb-1">
                          {synthesisReady
                            ? 'Your session is ready for AI synthesis'
                            : `${3 - entries.length} more search${3 - entries.length !== 1 ? 'es' : ''} needed to unlock synthesis`}
                        </p>
                        <p className="text-[10px] text-my-muted max-w-xs">
                          COGNAPSE will connect all {entries.length} of your searches into a unified intelligence brief — revealing patterns, contradictions, and gaps you haven't noticed.
                        </p>
                      </div>
                      {synthesisReady && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleGenerateSynthesis}
                          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20"
                        >
                          <Sparkles size={13} />
                          Generate Session Synthesis
                          <ArrowRight size={13} />
                        </motion.button>
                      )}
                    </div>
                  )}

                  {synthesizing && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 size={28} className="text-purple-400" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-[11px] font-bold text-purple-300 animate-pulse">Synthesizing {entries.length} research sessions...</p>
                        <p className="text-[9px] text-my-muted mt-1">Connecting dots across your queries</p>
                      </div>
                      {/* Animated dots showing search titles */}
                      <div className="flex flex-col gap-1 w-full max-w-xs">
                        {entries.map((e, i) => (
                          <motion.div
                            key={e.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="flex items-center gap-2 text-[9px] text-my-muted"
                          >
                            <motion.div
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"
                            />
                            {e.query.substring(0, 50)}{e.query.length > 50 ? '...' : ''}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {synthError && (
                    <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-[2px]">
                      <AlertTriangle size={11} className="shrink-0" />
                      <span>{synthError}</span>
                      <button
                        onClick={handleGenerateSynthesis}
                        className="ml-auto text-[9px] font-bold uppercase tracking-widest underline text-red-400 hover:text-red-300"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {synthesis && !synthesizing && (
                    <>
                      <SynthesisView result={synthesis} onDrillDown={handleDrillDown} />
                      <div className="flex items-center justify-between border-t border-purple-500/20 pt-3">
                        <button
                          onClick={() => { setSynthesis(null); setSynthError(null); }}
                          className="text-[9px] font-bold uppercase tracking-widest text-my-muted hover:text-purple-300 transition-colors"
                        >
                          Regenerate
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Clear session */}
              <div className="flex justify-end border-t border-my-border pt-3">
                <button
                  onClick={() => { clearSessionMemory(); setSynthesis(null); setSynthError(null); }}
                  className="text-[9px] font-bold uppercase tracking-widest text-my-muted hover:text-red-500 transition-colors"
                >
                  Clear session memory
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
