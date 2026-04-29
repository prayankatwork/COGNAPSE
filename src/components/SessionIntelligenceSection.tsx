import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, Loader2, AlertTriangle, CheckCircle2,
  ArrowRight, FlaskConical, SearchX, Search, GitMerge,
  GitBranch, Maximize2, X, ChevronDown, ChevronUp, SquareCheck, Square, Copy, Bookmark
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { executeSessionSynthesis, type SessionSynthesisResult } from '../services/geminiService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MomentumBadge({ m }: { m: SessionSynthesisResult['researchMomentum'] }) {
  const cfg = {
    converging: { icon: <GitMerge size={11} />, label: 'CONVERGING',  cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', tip: 'Evidence aligns toward one conclusion' },
    diverging:  { icon: <GitBranch size={11} />, label: 'DIVERGING',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   tip: 'Growing complexity, no clear answer' },
    expanding:  { icon: <Maximize2 size={11} />,  label: 'EXPANDING',   cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20',     tip: 'Each search opened more questions' },
  }[m];
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('flex items-center gap-1.5 text-[9px] font-black px-2 py-1 border rounded-sm', cfg.cls)}>
        {cfg.icon} {cfg.label}
      </span>
      <span className="text-[9px] text-my-muted">{cfg.tip}</span>
    </div>
  );
}

function SynthesisResult({
  result,
  onDrillDown,
}: {
  result: SessionSynthesisResult;
  onDrillDown: (q: string) => void;
}) {
  const addNote = useStore(s => s.addNote);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    const text = `OVERARCHING THEME:\n${result.overarchingTheme}\n\nUNIFIED INSIGHT:\n${result.unifiedInsight}\n\nFORWARD HYPOTHESIS:\n${result.forwardHypothesis}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToNotebook = () => {
    const content = `**Session Synthesis**\n*Theme:* ${result.overarchingTheme}\n*Insight:* ${result.unifiedInsight}\n*Hypothesis:* ${result.forwardHypothesis}`;
    addNote(content, "Session Intelligence");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4 pt-2"
    >
      {/* Overarching theme */}
      <div className="bg-purple-500/10 border border-purple-500/20 px-4 py-3 rounded-[2px]">
        <p className="text-[9px] uppercase tracking-widest font-bold text-purple-400 mb-1">Overarching Theme</p>
        <p className="font-serif italic text-[14px] text-my-ink leading-snug">{result.overarchingTheme}</p>
      </div>

      {/* Momentum */}
      <MomentumBadge m={result.researchMomentum} />

      {/* Unified insight */}
      <div>
        <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 mb-2">Unified Intelligence</p>
        <div className="text-[12px] text-my-syn leading-relaxed border-l-2 border-purple-500/40 pl-3 space-y-2">
          {result.unifiedInsight.split('\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>

      {/* Key patterns */}
      {result.keyPatterns?.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 mb-2">Recurring Patterns</p>
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
          <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 mb-2">Cross-Report Contradictions</p>
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

      {/* Forward hypothesis */}
      <div className="bg-my-callout border border-my-border px-4 py-3 rounded-[2px]">
        <div className="flex items-center gap-2 mb-1.5">
          <FlaskConical size={11} className="text-my-accent" />
          <p className="text-[9px] uppercase tracking-widest font-bold text-my-accent">Forward Hypothesis</p>
        </div>
        <p className="text-[12px] font-medium italic text-my-ink leading-snug">"{result.forwardHypothesis}"</p>
      </div>

      {/* Knowledge gaps — drill-down buttons */}
      {result.knowledgeGaps?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <SearchX size={11} className="text-my-muted" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60">Investigate Next</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {result.knowledgeGaps.map((gap, i) => (
              <button
                key={i}
                onClick={() => onDrillDown(gap)}
                className="flex items-center gap-2 text-[11px] text-my-ink bg-my-bg hover:bg-my-accent hover:text-white border border-my-border hover:border-my-accent px-3 py-2 transition-all group rounded-[2px] text-left"
              >
                <Search size={10} className="shrink-0 text-my-muted group-hover:text-white" />
                <span className="flex-1">{gap}</span>
                <ArrowRight size={10} className="shrink-0 text-my-muted group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-2 border-t border-purple-500/20 pt-4">
        <button 
          onClick={handleSaveToNotebook}
          className="flex-1 flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-widest py-2 rounded-[2px] transition-colors"
        >
          {saved ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Bookmark size={12} />}
          {saved ? "Saved to Notebook" : "Save to Notebook"}
        </button>
        <button 
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 bg-my-bg hover:bg-my-callout border border-my-border hover:border-my-accent text-my-muted hover:text-my-ink text-[10px] font-bold uppercase tracking-widest py-2 rounded-[2px] transition-colors"
        >
          {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy Insight"}
        </button>
      </div>
    </motion.div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function SessionIntelligenceSection({
  onDrillDown,
}: {
  onDrillDown: (q: string) => void;
}) {
  const sessionMemory = useStore(s => s.sessionMemory);
  const clearSessionMemory = useStore(s => s.clearSessionMemory);
  const setInitialQuery = useStore(s => s.setInitialQuery);
  const setCurrentReport = useStore(s => s.setCurrentReport);

  const [open, setOpen] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesis, setSynthesis] = useState<SessionSynthesisResult | null>(null);
  const [synthError, setSynthError] = useState<string | null>(null);

  const { entries, crossLinks } = sessionMemory;

  // Only show if we have crossLinks that connect at least 2 entries
  const selectedEntries = useMemo(() => {
    return entries.filter(e =>
      crossLinks.some(l => l.queryA === e.query || l.queryB === e.query)
    );
  }, [entries, crossLinks]);

  const canSynthesize = selectedEntries.length >= 2;

  // If there are no related entries, don't show the Session Intelligence feature at all.
  if (!canSynthesize) return null;

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setSynthesizing(true);
    setSynthError(null);
    setSynthesis(null);
    try {
      const result = await executeSessionSynthesis(
        selectedEntries.map(e => ({
          query: e.query,
          bottomLine: e.bottomLine,
          topicCluster: e.topicCluster,
          credibility: e.credibility,
        })),
        crossLinks
      );
      setSynthesis(result);
    } catch (e: any) {
      setSynthError(e.message || 'Synthesis failed. Please retry.');
    } finally {
      setSynthesizing(false);
    }
  };

  const handleDrillDown = (q: string) => {
    setCurrentReport(null);
    setInitialQuery(q);
    onDrillDown(q);
  };

  return (
    <div className="mt-10 border border-purple-500/25 rounded-[4px] overflow-hidden bg-purple-500/[0.03] shadow-[0_0_40px_rgba(168,85,247,0.06)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-500/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain size={16} className="text-purple-400" />
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute -inset-1.5 rounded-full bg-purple-500/20 pointer-events-none"
            />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">
              Session Intelligence
            </p>
            <p className="text-[9px] text-purple-300/50 font-mono">
              {selectedEntries.length} connected findings detected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); clearSessionMemory(); }}
            className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-sm hover:bg-red-500/20 transition-colors uppercase tracking-widest"
          >
            Clear Session
          </button>
          {!open && (
            <span className="text-[9px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-sm">
              Ready to Synthesize
            </span>
          )}
          {open
            ? <ChevronUp size={14} className="text-purple-400/60" />
            : <ChevronDown size={14} className="text-purple-400/60" />
          }
        </div>
      </button>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 flex flex-col gap-5 pt-3">
              {/* Synthesize button */}
              <AnimatePresence>
                {canSynthesize && !synthesizing && !synthesis && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex flex-col gap-4 items-start"
                  >
                    <div className="bg-purple-500/10 border border-purple-500/20 p-3 text-[11px] text-purple-300/80 leading-relaxed rounded-[2px] w-full">
                      <p className="mb-2">The system has detected semantic connections between the following <strong>{selectedEntries.length}</strong> queries:</p>
                      <ul className="list-disc pl-5 space-y-1 mb-3 text-purple-200 font-bold">
                        {selectedEntries.map(e => (
                          <li key={e.id}>{e.query}</li>
                        ))}
                      </ul>
                      <p>You can now synthesize them into a unified intelligence report.</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSynthesize}
                      className="flex items-center gap-2.5 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 rounded-[2px] w-full justify-center"
                    >
                      <Sparkles size={13} />
                      Synthesize Connected Reports
                      <ArrowRight size={13} />
                    </motion.button>
                    <p className="text-[9px] text-my-muted mt-2">
                      AI will find patterns, contradictions, and a unified conclusion across these connected research nodes.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Synthesizing loader */}
              {synthesizing && (
                <div className="flex flex-col items-center gap-4 py-8 border border-purple-500/20 rounded-[2px] bg-purple-500/5">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 size={28} className="text-purple-400" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-purple-300 animate-pulse">
                      Synthesizing {selectedEntries.length} related research reports...
                    </p>
                    <p className="text-[9px] text-my-muted mt-1">Connecting dots across related queries</p>
                  </div>
                  <div className="flex flex-col gap-1 w-full max-w-sm px-4">
                    {selectedEntries.map((e, i) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-2 text-[9px] text-my-muted"
                      >
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"
                        />
                        {e.query.substring(0, 60)}{e.query.length > 60 ? '...' : ''}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {synthError && (
                <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-[2px]">
                  <AlertTriangle size={11} className="shrink-0" />
                  <span className="flex-1">{synthError}</span>
                  <button
                    onClick={handleSynthesize}
                    className="text-[9px] font-bold uppercase tracking-widest underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Synthesis result */}
              {synthesis && !synthesizing && (
                <>
                  <div className="border-t border-purple-500/20 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-purple-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                          Synthesis · {selectedEntries.length} Connected Reports
                        </span>
                      </div>
                      <button
                        onClick={() => { setSynthesis(null); setSynthError(null); }}
                        className="flex items-center gap-1 text-[9px] font-bold text-my-muted hover:text-purple-300 transition-colors"
                      >
                        <X size={10} /> Regenerate
                      </button>
                    </div>
                    <SynthesisResult result={synthesis} onDrillDown={handleDrillDown} />
                  </div>
                </>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
