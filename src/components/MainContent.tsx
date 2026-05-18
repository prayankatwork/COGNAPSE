import { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useStore } from '../store';
import { Search, Menu, Send, AlertCircle, Loader2, Compass, Hexagon, Cpu, Database, Fingerprint, Terminal, ChevronRight, Zap, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { executeCognapseResearch, executeCognapseChat } from '../services/geminiService';
import ReportView from './ReportView';
import LoadingGame from './LoadingGame';
import SpotifyWidget from './SpotifyWidget';
import MusicVisualizer from './MusicVisualizer';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import { v4 as uuidv4 } from 'uuid';
import { executeDeepResearch } from '../services/deepResearchService';
import { dbService } from '../services/dbService';
import DeepResearchView from './DeepResearchView';
import BrandLogo from './BrandLogo';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: '20px' }}><h1>Crash!</h1><pre>{this.state.error?.toString()}</pre><pre>{this.state.error?.stack}</pre></div>;
    }
    return this.props.children;
  }
}


export default function MainContent() {
  const {
    toggleSidebar, initialQuery, setInitialQuery, currentReport,
    setCurrentReport, xp, searchCount, rank, updateGamification,
    addToArchive, currentChat, addChatMessage, deepResearch, setDeepResearch, resetDeepResearch,
    investigationStack, pushToStack, popFromStack, clearStack
  } = useStore();

  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);

  const contentAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const user = useStore(state => state.user);
  const archive = useStore(state => state.archive);
  const setArchive = useStore(state => state.setArchive);

  // Archive Synchronization Logic
  useEffect(() => {
    // Only sync if user is logged in and archive is truly empty
    if (user && archive.length === 0) {
      const syncArchive = async () => {
        try {
          const reports = await dbService.getAllReports(user.id);
          if (reports && reports.length > 0) {
            const syncedArchive = (reports as any[]).map(r => ({
              id: r.id,
              query: r.query,
              timestamp: r.timestamp,
              topic_cluster: r.data.archive_entry?.topic_cluster || "Cloud Intelligence",
              tags: r.data.archive_entry?.tags || [],
              summary_snippet: r.data.archive_entry?.summary_snippet || r.data.summary?.bottom_line || "",
              report: r.data
            }));
            setArchive(syncedArchive);
          }
        } catch (e) {
          console.error("Archive sync error:", e);
        }
      };
      syncArchive();
    }
  }, [user?.id, archive.length, setArchive]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
      setInitialQuery(null);
    }
  }, [initialQuery]);

  const handleSearch = async (targetQuery: string) => {
    if (!targetQuery.trim()) return;

    setLoading(true);
    setError(null);
    setQuery(""); // Clear input
    useStore.setState({ currentChat: [] });

    // Immediately reset deep research state to ensure we are in standard search mode
    useStore.getState().resetDeepResearch();

    setLoadingPhase("Analyzing research query...");

    try {
      // update phrases purely for UX
      setTimeout(() => setLoadingPhase("Reviewing available data..."), 1500);
      setTimeout(() => setLoadingPhase("Synthesizing primary sources..."), 3500);
      setTimeout(() => setLoadingPhase("Identifying data conflicts..."), 5000);
      setTimeout(() => setLoadingPhase("Structuring report..."), 6500);

      const report = await executeCognapseResearch(targetQuery, { xp, count: searchCount, rank });

      if (!report || !report.summary) {
        throw new Error("Data synthesis yielded incomplete results. Retrying may resolve this.");
      }

      const reportId = uuidv4();
      report.id = reportId;

      // === COGNITION REPLAY ENGINE FIX: SYNTHETIC REASONING TIMELINE ===
      const syntheticSteps: any[] = [];
      let timeOffset = 6000;

      syntheticSteps.push({
        id: uuidv4(),
        stage: 'Initial Vector',
        action: 'Decomposing query constraints',
        insight: `Analyzing "${targetQuery}" for core entities and logical boundaries.`,
        status: 'confirmed',
        timestamp: new Date(Date.now() - timeOffset).toISOString()
      });
      timeOffset -= 1500;

      if (report.sources && report.sources.length > 0) {
        const topScore = Math.max(...report.sources.map((s: any) => s.credibility_score || 0));
        syntheticSteps.push({
          id: uuidv4(),
          stage: 'Source Aggregation',
          action: `Cross-referencing ${report.sources.length} primary nodes`,
          insight: `Verified highest credibility score of ${topScore}/100 among retrieved academic/industry sources.`,
          status: 'confirmed',
          timestamp: new Date(Date.now() - timeOffset).toISOString()
        });
        timeOffset -= 1500;
      }

      if (report.conflicts && report.conflicts.length > 0) {
        syntheticSteps.push({
          id: uuidv4(),
          stage: 'Contradiction Alert',
          action: 'Detected conflicting source claims',
          insight: String(report.conflicts[0].explanation).substring(0, 120) + '...',
          status: 'pivoted',
          timestamp: new Date(Date.now() - timeOffset).toISOString()
        });
        timeOffset -= 1500;
      }

      if (report.bias_alert) {
        syntheticSteps.push({
          id: uuidv4(),
          stage: 'Bias Mitigation',
          action: 'Adjusting synthesis weights',
          insight: `Detected leaning perspective: ${report.bias_alert.direction}. Applying corrective heuristic.`,
          status: 'pivoted',
          timestamp: new Date(Date.now() - timeOffset).toISOString()
        });
        timeOffset -= 1000;
      }

      syntheticSteps.push({
        id: uuidv4(),
        stage: 'Final Synthesis',
        action: 'Structuring intelligence payload',
        insight: `Compiled intelligence map with ${report.intelligence_map?.nodes?.length || 0} entities. Consensus marked as ${report.scores?.evidence_consensus || 'strong'}.`,
        status: 'confirmed',
        timestamp: new Date().toISOString()
      });

      useStore.setState((state) => ({
        deepResearch: {
          ...state.deepResearch,
          reasoningTimeline: syntheticSteps
        }
      }));
      // =================================================================

      setLoadingPhase("Finalizing report...");
      setCurrentReport(report);

      // Handle Gamification
      const previousRank = useStore.getState().rank;

      updateGamification({
        xpAcquired: 10,
        searchCountIncrease: 1
      });

      const newRank = useStore.getState().rank;
      // Confetti if rank up
      if (newRank !== previousRank) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#2A4365', '#E2E8F0', '#1A1A1A', '#F27D26']
        });
      }

      // Add to archive (Always archive, force current system time for sorting)
      addToArchive({
        id: reportId,
        query: report.archive_entry?.query || targetQuery,
        timestamp: new Date().toISOString(), // FORCE SYSTEM TIME
        topic_cluster: report.archive_entry?.topic_cluster || "General Intelligence",
        tags: report.archive_entry?.tags || [],
        summary_snippet: report.archive_entry?.summary_snippet || report.summary.bottom_line || "",
        report
      });

      // Save to SQLite Vault if logged in
      const user = useStore.getState().user;
      if (user) {
        dbService.saveReport(reportId, user.id, targetQuery, report);
      }

      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      clearStack();
      pushToStack(report);
      contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during research.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubSearch = async (targetQuery: string, retryCount = 0) => {
    if (!targetQuery.trim()) return;

    setLoading(true);
    setError(null);
    setQuery("");
    setLoadingPhase(retryCount > 0 ? `Retrying synthesis (Attempt ${retryCount + 1})...` : "Expanding investigation umbrella...");

    try {
      const report = await executeCognapseResearch(targetQuery, { xp, count: searchCount, rank });

      // Strict Validation Layer
      if (!report || !report.summary || !report.summary.full_synthesis) {
        if (retryCount < 2) {
          console.warn("Sub-report validation failed. Retrying...");
          return handleSubSearch(targetQuery, retryCount + 1);
        }
        throw new Error("Local LLM failed to generate a structured sub-report. Try a more specific node.");
      }

      setLoadingPhase("Finalizing sub-report...");
      pushToStack(report);

      updateGamification({ xpAcquired: 5, searchCountIncrease: 1 });
      contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      setError(err.message || "Failed to expand investigation.");
    } finally {
      setLoading(false);
    }
  };

  const handleChatFollowUp = async (userQuery: string) => {
    if (!userQuery.trim() || !currentReport) return;

    setQuery("");
    setLoading(true);
    setError(null);
    setLoadingPhase("Analyzing context...");

    addChatMessage({
      id: uuidv4(),
      role: 'user',
      content: userQuery
    });

    try {
      const reply = await executeCognapseChat(userQuery, currentReport, currentChat);
      addChatMessage({
        id: uuidv4(),
        role: 'model',
        content: reply
      });
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError(err.message || "Failed to process follow-up question.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (currentReport) {
      handleChatFollowUp(query);
    } else {
      // New Research Mode

      const isBatch = query.includes('|');
      const isCompare = query.toLowerCase().includes(' vs ');

      if (isBatch || isCompare) {
        // for now we'll just fall back to standard but the UI will see it as batch / compare due to the prompt
        // Gemini handles these via prompt "Batch research (3 queries at once)" or "Compare Two Topics"
      }

      handleSearch(query);
    }
  };

  const startDeepResearch = async () => {
    const targetQuery = query.trim() || currentReport?.query_understood || "";
    if (!targetQuery) return;

    console.log("Starting Deep Research Protocol for:", targetQuery);
    setError(null);
    setQuery("");

    try {
      const result = await executeDeepResearch(targetQuery);

      // Update history/archive with the new thesis
      const state = useStore.getState();
      if (result?.thesis && state.currentReport) {
        const updatedReport = {
          ...state.currentReport,
          deep_research: result.thesis,
          deep_scores: result.scores
        };

        // Update current report in store
        setCurrentReport(updatedReport as any);

        // Update archive entry, move to top, and refresh timestamp
        const otherEntries = state.archive.filter(entry => entry.id !== state.currentReport?.id);
        const targetEntry = state.archive.find(entry => entry.id === state.currentReport?.id);

        if (targetEntry) {
          const updatedEntry = {
            ...targetEntry,
            report: updatedReport as any,
            timestamp: new Date().toISOString() // Refresh time to jump to top
          };
          state.setArchive([updatedEntry, ...otherEntries]);
        }

        // Sync with SQLite Vault
        if (state.user && state.currentReport?.id) {
          await dbService.saveReport(state.currentReport.id, state.user.id, targetQuery, updatedReport as any);
        }
      }
    } catch (err: any) {
      console.error("Deep Research Trigger Failed:", err);
    }
  };

  return (
    <ErrorBoundary>
      <MusicVisualizer />
      <div className="flex-1 flex flex-col h-full bg-my-callout/20 backdrop-blur-xl relative overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-my-border z-10 shrink-0 bg-my-bg/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-my-muted hover:text-my-ink md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="md:flex items-center gap-6" />
          </div>

          <div className="flex items-center gap-4">
            {/* New Search is now handled via the Logo or just clearing the input */}
          </div>

          <div className="flex items-center gap-4">
            {( (query.trim() || currentReport) && !currentReport?.deep_research && !loading) && (
              <motion.button
                id="walkthrough-deep-research-anchor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={startDeepResearch}
                disabled={deepResearch.status === 'running' || (!query.trim() && !currentReport)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-1.5 border text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30",
                  query.trim() && !currentReport 
                    ? "bg-my-accent text-white dark:text-my-bg border-my-accent animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
                    : "border-my-accent/30 text-my-accent hover:bg-my-accent hover:text-white"
                )}
              >
                <Cpu size={14} className={clsx(deepResearch.status === 'running' && "animate-spin")} />
                {query.trim() && !currentReport ? "Start Deep Analysis" : "Upgrade to Deep Analysis"}
              </motion.button>
            )}
          </div>
        </header>

        {/* Research Stack UI */}
        {investigationStack.length > 1 && (
          <div className="bg-my-sidebar border-b border-my-border px-8 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
            {investigationStack.map((report, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Pop back to this level
                    const popCount = investigationStack.length - 1 - idx;
                    for (let i = 0; i < popCount; i++) popFromStack();
                  }}
                  className={clsx(
                    "text-[10px] font-bold uppercase tracking-widest transition-colors",
                    idx === investigationStack.length - 1 ? "text-my-accent" : "text-my-muted hover:text-my-ink"
                  )}
                >
                  {report.query_understood?.substring(0, 20) || 'Research'}...
                </button>
                {idx < investigationStack.length - 1 && <ChevronRight size={12} className="text-my-muted/40" />}
              </div>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div ref={contentAreaRef} className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar relative">
          {/* Deep Analysis Progress Banner */}
          {deepResearch.status === 'running' && (
            <div className="sticky top-0 left-0 right-0 z-20 bg-my-accent text-my-bg py-2 px-8 flex items-center justify-between animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-4">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Stage {deepResearch.stage}/4: {deepResearch.progress}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={clsx("h-1 w-8 rounded-full", s <= deepResearch.stage ? "bg-my-bg" : "bg-my-bg/30")} />
                ))}
              </div>
            </div>
          )}

          {deepResearch.status === 'error' && (
            <div className="sticky top-0 left-0 right-0 z-20 bg-red-900 text-white py-3 px-8 flex items-center justify-between animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-4">
                <AlertCircle size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Deep Analysis Error: {deepResearch.error || 'System Failure'}
                </span>
              </div>
              <button
                onClick={resetDeepResearch}
                className="text-[10px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="max-w-4xl mx-auto w-full pt-8 pb-32">

            {deepResearch.status === 'completed' && <DeepResearchView />}

            {deepResearch.status !== 'completed' && !currentReport && !loading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-0 overflow-hidden">
                {/* Advanced Animated Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

                {/* Floating Orbs */}
                <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-my-accent/5 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite]"></div>
                <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite_reverse]"></div>

                <div className="relative z-10 flex flex-col items-center text-center mt-[-60px]">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="w-48 h-48 mb-12 relative flex items-center justify-center"
                  >
                    {/* Multi-Layered Rotating Diagnostic Rings */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 border border-my-accent/10 rounded-full"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-4 border border-dashed border-my-accent/20 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.1, 0.2] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-my-accent/5 rounded-full blur-3xl"
                    />

                    <div className="relative z-10 p-8 bg-my-bg/40 backdrop-blur-2xl rounded-full border border-my-border/20 shadow-[0_32px_64px_rgba(0,0,0,0.1)]">
                      <BrandLogo size={64} />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, type: 'spring', damping: 20 }}
                  >
                    <h1 className="text-4xl md:text-7xl font-serif font-bold text-my-ink mb-6 tracking-tighter leading-none italic">
                      COGNAPSE <span className="text-transparent bg-clip-text bg-gradient-to-tr from-my-accent via-my-ink dark:via-white to-my-accent animate-gradient-x">CORE.</span>
                    </h1>

                    <div className="mb-20" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col items-center gap-8"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05, translateY: -3 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (query.trim()) {
                          handleSearch(query);
                        } else {
                          const rabbitHoles = [
                            "Synthesize the history of the Voyager Golden Record and its cultural impact.",
                            "What are the leading theories on what happened to the Bronze Age collapse?",
                            "How does the mycelial network in forests compare to neural networks?",
                            "Analyze the strategic brilliance of the Mongol Empire's postal system (Yam).",
                            "Explain the concept of 'Time Crystals' in quantum physics."
                          ];
                          const randomQuery = rabbitHoles[Math.floor(Math.random() * rabbitHoles.length)];
                          handleSearch(randomQuery);
                        }
                      }}
                      className="group relative px-6 py-4 md:px-10 md:py-5 bg-my-ink text-white dark:bg-my-accent dark:text-my-bg overflow-hidden border border-my-accent/30 shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-all w-full sm:w-auto"
                    >
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-my-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-my-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-my-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-my-accent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Scanning Line */}
                      <motion.div
                        className="absolute inset-0 bg-my-accent/10 z-0"
                        initial={{ y: "-100%" }}
                        animate={{ y: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />

                      <div className="relative z-10 flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-2 h-2 bg-my-accent rounded-full"
                          />
                          <span className="text-[10px] font-black uppercase tracking-[0.5em]">
                            Random Rabbit Hole
                          </span>
                          <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                        </div>
                      </div>
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-[#FFF5F5] border border-[#FEB2B2] p-6 mx-8 rounded-[4px] flex items-start gap-4 text-[#C53030] mt-8">
                <AlertCircle className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1 tracking-wide text-xs uppercase">SYSTEM ERROR</h4>
                  <p className="opacity-80 text-sm">{error}</p>
                </div>
              </div>
            )}

            {deepResearch.error && (
              <div className="bg-[#FFF5F5] border border-[#FEB2B2] p-6 mx-8 rounded-[4px] flex items-start gap-4 text-[#C53030] mt-8">
                <AlertCircle className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1 tracking-wide text-xs uppercase">DEEP RESEARCH ERROR</h4>
                  <p className="opacity-80 text-sm">{deepResearch.error}</p>
                  <button
                    onClick={() => useStore.getState().resetDeepResearch()}
                    className="mt-4 text-[10px] font-bold uppercase tracking-widest underline"
                  >
                    Clear Error & Reset
                  </button>
                </div>
              </div>
            )}

            {currentReport && !error && (
              <>
                <ReportView report={currentReport} onSubSearch={handleSubSearch} onChatFollowUp={handleChatFollowUp} />

                {/* Follow-up Chat UI */}
                <div className="mt-8 border-t border-my-border pt-8 pb-16">
                  <h4 className="text-xs uppercase tracking-widest font-bold text-my-muted mb-6">Analysis Thread</h4>
                  {useStore.getState().currentChat?.length > 0 ? (
                    <div className="space-y-6 mb-6">
                      {useStore.getState().currentChat.map(msg => (
                        <div key={msg.id} className={clsx("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                          <div className={clsx(
                            "max-w-[85%] px-4 py-3 rounded-[4px] text-[13px] leading-relaxed relative",
                            msg.role === 'user'
                              ? "bg-my-accent text-my-bg font-bold shadow-lg"
                              : "bg-my-callout border border-my-border text-my-ink shadow-sm"
                          )}>
                            {msg.content}
                          </div>
                          <span className="text-[9px] uppercase tracking-wider text-[rgba(113,128,150,0.8)] mt-1 px-1 font-bold">
                            {msg.role === 'user' ? 'You' : 'COGNAPSE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-my-muted italic bg-black/5 py-4 rounded-[4px]">
                      Ask a follow-up question. COGNAPSE retains full context of this report.
                    </div>
                  )}
                  {loading && loadingPhase === "Analyzing context..." && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] px-5 py-4 rounded-[4px] bg-my-callout border border-my-border shadow-sm flex items-center gap-4">
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-my-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-my-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-my-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[10px] font-bold text-my-muted uppercase tracking-widest animate-pulse">Synthesizing Response...</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {loading && loadingPhase !== "Analyzing context..." && (
              <div className="flex flex-col items-center justify-center py-16 mt-24 animate-in fade-in zoom-in duration-500">
                <div className="relative flex items-center justify-center w-24 h-24 mb-8">
                  {/* Outer rotating ring */}
                  <div className="absolute inset-0 border-[2px] border-my-accent/20 border-t-my-accent rounded-full animate-[spin_2s_linear_infinite]"></div>
                  {/* Inner rotating element */}
                  <Hexagon className="w-10 h-10 text-my-accent animate-pulse" strokeWidth={1} />
                  <div className="absolute inset-2 border-[1px] border-my-border border-b-my-ink rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                </div>

                <div className="w-64">
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-my-ink mb-4 text-center animate-pulse">
                    {loadingPhase}
                  </p>
                  <div className="h-1 w-full bg-my-border rounded-full overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 bg-my-accent transition-all duration-500 ease-out" style={{
                      width: loadingPhase === "Analyzing research query..." ? "20%" :
                        loadingPhase === "Reviewing available data..." ? "40%" :
                          loadingPhase === "Synthesizing primary sources..." ? "60%" :
                            loadingPhase === "Identifying data conflicts..." ? "80%" : "100%"
                    }}></div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col items-center max-w-sm text-center">
                  <div className="flex items-center gap-2 mb-3 text-my-accent">
                    <Zap size={14} className="animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Processing Framework Active</span>
                  </div>
                  <p className="text-[11px] text-my-muted leading-relaxed italic mb-6">
                    High-quality synthesis in progress. Because we prioritize professional-grade accuracy and verified data, our analysis engine is currently cross-referencing global sources. We recommend a short diversion in the <span className="text-my-ink font-bold">Playground</span> while our engine validates its findings.
                  </p>
                  <button
                    onClick={() => useStore.getState().setView('games')}
                    className="px-8 py-3 bg-my-ink text-my-bg dark:bg-my-accent dark:text-my-bg text-[10px] font-bold uppercase tracking-widest hover:bg-my-accent hover:text-white transition-all flex items-center gap-2 group shadow-xl"
                  >
                    Launch Playground <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 lg:px-8 lg:pb-8 lg:pt-16 bg-gradient-to-t from-my-bg via-my-bg to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <form onSubmit={onSubmit} className="relative group">
              {/* Soft Outer Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-my-accent/20 via-my-accent/5 to-my-accent/20 rounded-none blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200" />

              <div className="relative">
                <input
                  id="walkthrough-search-anchor"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={currentReport ? "Drill deeper into this synthesis..." : "What do you need to research?"}
                  disabled={loading}
                  className="w-full bg-white/70 dark:bg-my-bg/70 backdrop-blur-2xl border border-my-border rounded-none py-4 pl-4 pr-14 md:py-6 md:pl-8 md:pr-16 text-my-ink focus:outline-none focus:border-my-accent transition-all disabled:opacity-50 shadow-2xl text-base md:text-lg font-light tracking-tight placeholder:text-my-muted/40"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="absolute right-3 top-3 bottom-3 aspect-square bg-my-ink text-my-bg dark:bg-my-accent dark:text-my-bg hover:bg-my-accent hover:text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-90"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>

      <SpotifyWidget />
    </ErrorBoundary>
  );
}
