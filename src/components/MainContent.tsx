import { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useStore } from '../store';
import { Search, Menu, Send, AlertCircle, Loader2, Compass, Hexagon, Cpu, Database, Fingerprint, Terminal, ChevronRight, Zap } from 'lucide-react';
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
    addToArchive, currentChat, addChatMessage, deepResearch, setDeepResearch,
    investigationStack, pushToStack, popFromStack, clearStack
  } = useStore();

  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);

  const contentAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

    setLoadingPhase("Analyzing objective...");

    try {
      // update phrases purely for UX
      setTimeout(() => setLoadingPhase("Scanning intelligence pool..."), 1500);
      setTimeout(() => setLoadingPhase("Synthesizing primary sources..."), 3500);
      setTimeout(() => setLoadingPhase("Detecting contradictions..."), 5000);
      setTimeout(() => setLoadingPhase("Structuring intelligence..."), 6500);

      const report = await executeCognapseResearch(targetQuery, { xp, count: searchCount, rank });

      if (!report || !report.summary) {
        throw new Error("Intelligence synthesis yielded incomplete data. Retrying may resolve this.");
      }

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

      // Add to archive
      if (report.archive_entry) {
        const reportId = Date.now().toString();
        addToArchive({
          id: reportId,
          query: report.archive_entry.query || targetQuery,
          timestamp: report.archive_entry.timestamp || new Date().toISOString(),
          topic_cluster: report.archive_entry.topic_cluster || "General",
          tags: report.archive_entry.tags || [],
          summary_snippet: report.archive_entry.summary_snippet || "",
          report
        });

        // Save to SQLite Vault if logged in
        const user = useStore.getState().user;
        if (user) {
          dbService.saveReport(reportId, user.id, targetQuery, report);
        }
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
      await executeDeepResearch(targetQuery);
    } catch (err: any) {
      console.error("Deep Research Trigger Failed:", err);
    }
  };

  return (
    <ErrorBoundary>
      <MusicVisualizer />
      <div className="flex-1 flex flex-col h-full bg-white/20 backdrop-blur-xl relative overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-my-border z-10 shrink-0 bg-white/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-my-muted hover:text-my-ink md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:block text-[11px] text-my-muted uppercase tracking-wider">
              SYSTEM: {currentReport?.mode || 'IDLE'} // NEURAL LINK: ACTIVE
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setCurrentReport(null);
                setError(null);
                useStore.setState({ currentChat: [] });
              }}
              className="px-3 py-1 border border-my-border bg-transparent text-[11px] text-my-muted uppercase cursor-pointer hover:bg-black/5 transition-colors font-bold"
            >
              NEW SEARCH
            </button>
            <button
              onClick={startDeepResearch}
              disabled={deepResearch.status === 'running' || (!query.trim() && !currentReport)}
              className="px-3 py-1 bg-my-accent text-white text-[11px] uppercase cursor-pointer hover:bg-my-ink transition-colors font-bold disabled:opacity-50 flex items-center gap-2"
            >
              <Cpu size={14} /> DEEP RESEARCH
            </button>
          </div>
        </header>

        {/* Investigation Stack / Umbrella UI */}
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
                  {report.query_understood?.substring(0, 20) || 'Investigation'}...
                </button>
                {idx < investigationStack.length - 1 && <ChevronRight size={12} className="text-my-muted/40" />}
              </div>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div ref={contentAreaRef} className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar relative">
          {/* Deep Research Progress Banner */}
          {deepResearch.status === 'running' && (
            <div className="sticky top-0 left-0 right-0 z-20 bg-my-accent text-white py-2 px-8 flex items-center justify-between animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-4">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Stage {deepResearch.stage}/5: {deepResearch.progress}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <div key={s} className={clsx("h-1 w-8 rounded-full", s <= deepResearch.stage ? "bg-white" : "bg-white/20")} />
                ))}
              </div>
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

                <div className="relative z-10 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-[-100px]">
                  <div className="w-24 h-24 mb-10 relative flex items-center justify-center">
                    <div className="absolute inset-0 border border-my-accent/30 rounded-full animate-[spin_4s_linear_infinite]" />
                    <div className="absolute inset-2 border border-my-ink/10 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
                    <Compass size={36} className="text-my-accent opacity-80" strokeWidth={1} />
                  </div>

                  <h1 className="text-3xl font-serif font-light text-my-ink mb-3 tracking-wide">
                    COGNAPSE SYSTEM <span className="text-my-accent font-bold">ONLINE</span>
                  </h1>

                  <p className="text-[11px] font-mono tracking-widest uppercase text-my-muted mb-12 opacity-80">
                    Awaiting user directives & operational constraints
                  </p>

                  <button
                    onClick={() => {
                      const rabbitHoles = [
                        "Synthesize the history of the Voyager Golden Record and its cultural impact.",
                        "What are the leading theories on what happened to the Bronze Age collapse?",
                        "How does the mycelial network in forests compare to neural networks?",
                        "Analyze the strategic brilliance of the Mongol Empire's postal system (Yam).",
                        "Explain the concept of 'Time Crystals' in quantum physics."
                      ];
                      const randomQuery = rabbitHoles[Math.floor(Math.random() * rabbitHoles.length)];
                      handleSearch(randomQuery);
                    }}
                    className="group relative px-8 py-3.5 border border-my-border hover:border-my-accent bg-white/50 backdrop-blur-sm shadow-sm flex items-center justify-center gap-2 overflow-hidden cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-my-accent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                    <span className="relative z-10 text-[11px] font-bold uppercase tracking-widest text-my-ink group-hover:text-white transition-colors duration-300">
                      Take Me Down a Rabbit Hole
                    </span>
                  </button>
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
                  <h4 className="text-xs uppercase tracking-widest font-bold text-my-muted mb-6">Investigative Thread</h4>
                  {useStore.getState().currentChat?.length > 0 ? (
                    <div className="space-y-6 mb-6">
                      {useStore.getState().currentChat.map(msg => (
                        <div key={msg.id} className={clsx("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                          <div className={clsx(
                            "max-w-[85%] px-4 py-3 rounded-[4px] text-[13px] leading-relaxed relative",
                            msg.role === 'user'
                              ? "bg-my-ink text-white"
                              : "bg-white border border-my-border text-my-ink shadow-sm"
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
                      <div className="max-w-[85%] px-5 py-4 rounded-[4px] bg-white border border-my-border shadow-sm flex items-center gap-4">
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
                      width: loadingPhase === "Analyzing objective..." ? "20%" :
                        loadingPhase === "Scanning intelligence pool..." ? "40%" :
                          loadingPhase === "Synthesizing primary sources..." ? "60%" :
                            loadingPhase === "Detecting contradictions..." ? "80%" : "100%"
                    }}></div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col items-center max-w-sm text-center">
                   <div className="flex items-center gap-2 mb-3 text-my-accent">
                      <Zap size={14} className="animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Neural Diversion Active</span>
                   </div>
                   <p className="text-[11px] text-my-muted leading-relaxed italic mb-6">
                      High-fidelity synthesis in progress. Because we prioritize academic-grade accuracy and professional verification, local processing may take a moment. We recommend a neural diversion in the <span className="text-my-ink font-bold">Playground</span> while our engine validates its findings.
                   </p>
                   <button 
                     onClick={() => useStore.getState().setView('games')}
                     className="px-8 py-3 bg-my-ink text-white dark:bg-white dark:text-my-ink text-[10px] font-bold uppercase tracking-widest hover:bg-my-accent hover:text-white transition-all flex items-center gap-2 group shadow-xl"
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
            <form onSubmit={onSubmit} className="relative shadow-[0_4px_24px_rgba(42,67,101,0.06)]">
              <div className="relative">


                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={currentReport ? "Ask a follow up question..." : "What do you need to know?"}
                  disabled={loading}
                  className="w-full bg-white border border-my-border rounded-none py-4 pl-6 pr-14 text-my-ink focus:outline-none focus:border-my-accent transition-all disabled:opacity-50 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="absolute right-2 top-2 bottom-2 aspect-square text-my-accent hover:text-my-ink hover:bg-my-callout flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} className="translate-x-[1px]" />
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
