import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Search, Menu, Send, AlertCircle, Compass, Hexagon, Cpu, Database, Fingerprint, Terminal, ChevronRight, Zap, ArrowRight, Upload, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { executeCognapseResearch, executeCognapseChat } from '../services/geminiService';
import ReportView from './ReportView';
import SpotifyWidget from './SpotifyWidget';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import { v4 as uuidv4 } from 'uuid';
import { executeDeepResearch } from '../services/deepResearchService';
import { analyzeDocument } from '../services/documentRagService';
import { dbService } from '../services/dbService';
import DeepResearchView from './DeepResearchView';
import DeepResearchLoader from './DeepResearchLoader';
import BrandLogo from './BrandLogo';
import ErrorBoundary from './ErrorBoundary';


export default function MainContent() {
  const {
    toggleSidebar, initialQuery, setInitialQuery, currentReport,
    setCurrentReport, xp, searchCount, rank, updateGamification,
    addToArchive, currentChat, addChatMessage, deepResearch, setDeepResearch, resetDeepResearch,
    investigationStack, pushToStack, popFromStack, clearStack, walkthroughCompleted, setIsLoading
  } = useStore(useShallow((state) => ({
    toggleSidebar: state.toggleSidebar,
    initialQuery: state.initialQuery,
    setInitialQuery: state.setInitialQuery,
    currentReport: state.currentReport,
    setCurrentReport: state.setCurrentReport,
    xp: state.xp,
    searchCount: state.searchCount,
    rank: state.rank,
    updateGamification: state.updateGamification,
    addToArchive: state.addToArchive,
    currentChat: state.currentChat,
    addChatMessage: state.addChatMessage,
    deepResearch: state.deepResearch,
    setDeepResearch: state.setDeepResearch,
    resetDeepResearch: state.resetDeepResearch,
    investigationStack: state.investigationStack,
    pushToStack: state.pushToStack,
    popFromStack: state.popFromStack,
    clearStack: state.clearStack,
    walkthroughCompleted: state.walkthroughCompleted,
    setIsLoading: state.setIsLoading
  })));

  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [docFileName, setDocFileName] = useState<string | null>(null);

  const contentAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = useStore(state => state.user);
  const isPremium = !!user?.premium;
  const loadingPhaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearLoadingPhaseTimers = () => {
    loadingPhaseTimers.current.forEach(clearTimeout);
    loadingPhaseTimers.current = [];
  };

  useEffect(() => {
    return () => {
      clearLoadingPhaseTimers();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
      setInitialQuery(null);
    }
  }, [initialQuery]);

  const handleSearch = async (targetQuery: string) => {
    if (!targetQuery.trim()) return;
    
    const benchmarkStart = performance.now();
    console.log(`[Benchmark] Starting main search for query: "${targetQuery}"`);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setIsLoading(true);
    setError(null);
    setQuery(""); // Clear input
    useStore.setState({ currentChat: [] });

    // Immediately reset deep research state to ensure we are in standard search mode
    useStore.getState().resetDeepResearch();

    setLoadingPhase("Analyzing research query...");
    clearLoadingPhaseTimers();
    loadingPhaseTimers.current = [
      setTimeout(() => setLoadingPhase('Reviewing available data...'), 1500),
      setTimeout(() => setLoadingPhase('Synthesizing primary sources...'), 3500),
      setTimeout(() => setLoadingPhase('Identifying data conflicts...'), 5000),
      setTimeout(() => setLoadingPhase('Structuring report...'), 6500),
    ];

    try {

      const report = await executeCognapseResearch(targetQuery, { xp, count: searchCount, rank }, abortControllerRef.current.signal);

      if (!report || !report.summary) {
        throw new Error("Data synthesis yielded incomplete results. Retrying may resolve this.");
      }

      const reportId = uuidv4();
      report.id = reportId;

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

      // Add to archive (logged-in users only)
      const storeUser = useStore.getState().user;
      if (storeUser) {
        addToArchive({
          id: reportId,
          query: report.archive_entry?.query || targetQuery,
          timestamp: new Date().toISOString(),
          topic_cluster: report.archive_entry?.topic_cluster || "General Intelligence",
          tags: report.archive_entry?.tags || [],
          summary_snippet: report.archive_entry?.summary_snippet || report.summary.bottom_line || "",
          report
        });
        dbService.saveReport(reportId, storeUser.id, targetQuery, report);
      }

      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      clearStack();
      pushToStack(report);
      contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || "An unexpected error occurred during research.");
    } finally {
      clearLoadingPhaseTimers();
      setLoading(false);
      setIsLoading(false);
      const benchmarkEnd = performance.now();
      console.log(`[Benchmark] Main search completed in ${((benchmarkEnd - benchmarkStart) / 1000).toFixed(3)} seconds.`);
    }
  };

  const handleSubSearch = async (targetQuery: string, retryCount = 0) => {
    if (!targetQuery.trim()) return;

    const benchmarkStart = performance.now();
    if (retryCount === 0) {
      console.log(`[Benchmark] Starting sub-search for query: "${targetQuery}"`);
    }

    if (retryCount === 0 && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryCount === 0) {
      abortControllerRef.current = new AbortController();
    }

    setLoading(true);
    setError(null);
    setQuery("");
    setLoadingPhase(retryCount > 0 ? `Retrying synthesis (Attempt ${retryCount + 1})...` : "Expanding investigation umbrella...");

    try {
      const report = await executeCognapseResearch(targetQuery, { xp, count: searchCount, rank }, abortControllerRef.current?.signal);

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
      if (err.name === 'AbortError') return;
      setError(err.message || "Failed to expand investigation.");
    } finally {
      if (retryCount === 0) {
        const benchmarkEnd = performance.now();
        console.log(`[Benchmark] Sub-search completed in ${((benchmarkEnd - benchmarkStart) / 1000).toFixed(3)} seconds.`);
      }
      setLoading(false);
    }
  };

  const handleChatFollowUp = async (userQuery: string) => {
    if (!userQuery.trim() || !currentReport) return;

    setQuery("");
    setLoading(true);
    setIsLoading(true);
    setError(null);
    setLoadingPhase("Analyzing context...");

    const userMsg = {
      id: uuidv4(),
      role: 'user' as const,
      content: userQuery,
    };
    const chatWithUser = [...currentChat, userMsg];
    addChatMessage(userMsg);

    try {
      const reply = await executeCognapseChat(userQuery, currentReport, chatWithUser);
      addChatMessage({
        id: uuidv4(),
        role: 'model',
        content: reply
      });
      // Single scroll call — no duplicate jitter
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (err: any) {
      setError(err.message || "Failed to process follow-up question.");
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setDocFileName(file.name);
    setError(null);
    setLoading(true);
    setIsLoading(true);
    useStore.getState().resetDeepResearch();

    setLoadingPhase("Reading document...");
    clearLoadingPhaseTimers();
    loadingPhaseTimers.current = [
      setTimeout(() => setLoadingPhase('Extracting document text...'), 1000),
      setTimeout(() => setLoadingPhase('Analyzing document content...'), 3000),
      setTimeout(() => setLoadingPhase('Structuring intelligence report...'), 5500),
    ];

    try {
      let fileData: string | undefined;
      let text: string | undefined;
      const mimeType = file.type || 'application/octet-stream';

      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        text = await file.text();
      } else {
        // Read as base64 for server-side extraction
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        fileData = btoa(binary);
      }

      const { report } = await analyzeDocument(
        user.id,
        fileData ? { fileData, mimeType, fileName: file.name } : { text: text! },
        undefined
      );

      if (!report || !report.summary) {
        throw new Error("Document analysis yielded incomplete results.");
      }

      const reportId = uuidv4();
      report.id = reportId;

      setLoadingPhase("Finalizing report...");
      setCurrentReport(report);

      updateGamification({ xpAcquired: 10, searchCountIncrease: 1 });
      const storeUser = useStore.getState().user;
      if (storeUser) {
        addToArchive({
          id: reportId,
          query: report.archive_entry?.query || `Document: ${file.name}`,
          timestamp: new Date().toISOString(),
          topic_cluster: "Document Analysis",
          tags: ["document", "analysis"],
          summary_snippet: report.summary?.bottom_line || "",
          report
        });
      }
    } catch (err: any) {
      console.error('[Document Analysis Error]', err);
      setError(err.message || "Failed to analyze document.");
      setDocFileName(null);
    } finally {
      setLoading(false);
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !query.trim()) return;

    // Main input bar ALWAYS triggers fresh research.
    // Follow-up chat is handled exclusively via the Analysis Thread section
    // below the report (handleChatFollowUp), which keeps the ReportView in view
    // and provides contextual Q&A without re-running research.
    // This ensures users can always start a new investigation by typing in the
    // main input, even when a report is already displayed.
    handleSearch(query);
  };

  const startDeepResearch = async () => {
    setError(null);
    const user = useStore.getState().user;
    if (!user) {
      setError("Sign in to use Deep Analysis");
      useStore.getState().setAuthOpen(true);
      return;
    }
    const archiveEntry = currentReport?.id
      ? useStore.getState().archive.find(e => e.id === currentReport.id)
      : null;
    const targetQuery = query.trim() || archiveEntry?.query || currentReport?.query_understood || "";
    if (!targetQuery) return;

    const benchmarkStart = performance.now();
    console.log(`[Benchmark] Starting Deep Research Protocol for: "${targetQuery}"`);
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
    } finally {
      const benchmarkEnd = performance.now();
      console.log(`[Benchmark] Deep Research completed in ${((benchmarkEnd - benchmarkStart) / 1000).toFixed(3)} seconds.`);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-full bg-my-callout/20 backdrop-blur-md md:backdrop-blur-xl relative overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-my-border z-10 shrink-0 bg-my-bg/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Open research archive"
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
            {( (query.trim() || currentReport) && !currentReport?.deep_research && !loading && !currentReport?.archive_entry?.tags?.includes('document')) && (
              <motion.button
                id="walkthrough-deep-research-anchor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={startDeepResearch}
                disabled={
                  deepResearch.status === 'running' || 
                  (!query.trim() && !currentReport) ||
                  (!walkthroughCompleted && !currentReport)
                }
                className={clsx(
                  "flex items-center gap-2 px-4 py-1.5 border text-xs font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30",
                  query.trim() && !currentReport 
                    ? "bg-my-accent text-white dark:text-black border-my-accent animate-pulse shadow-signal" 
                    : "border-my-accent/30 text-my-accent hover:bg-my-accent hover:text-white",
                  (!walkthroughCompleted && !currentReport) && "opacity-25 cursor-not-allowed hover:bg-transparent"
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
                    "text-xs font-bold uppercase tracking-widest transition-colors",
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
            <DeepResearchLoader stage={deepResearch.stage} progress={deepResearch.progress} />
          )}

          {deepResearch.status === 'error' && (
            <div className="sticky top-0 left-0 right-0 z-20 bg-red-900 text-white py-3 px-8 flex items-center justify-between animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-4">
                <AlertCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">
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
                {/* Floating Orbs - Hidden on mobile to save GPU */}
                <div className="hidden md:block absolute top-[20%] left-[20%] w-64 h-64 bg-my-accent/5 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite]"></div>
                <div className="hidden md:block absolute bottom-[20%] right-[20%] w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite_reverse]"></div>

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

                    <div className="relative z-10 p-8 bg-my-bg/40 backdrop-blur-sm md:backdrop-blur-2xl rounded-full border border-my-border/20 shadow-[0_32px_64px_rgba(0,0,0,0.1)]">
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
                            // History & Archaeology
                            "Synthesize the history of the Voyager Golden Record and its cultural impact.",
                            "What are the leading theories on what happened to the Bronze Age collapse?",
                            "Analyze the strategic brilliance of the Mongol Empire's postal system (Yam).",
                            "Trace the lost libraries of the ancient world from Alexandria to Timbuktu.",
                            "What really happened during the Dancing Plague of 1518 in Strasbourg?",
                            "Investigate the Antikythera mechanism and what it reveals about ancient Greek engineering.",
                            "How did the Chernobyl exclusion zone become an unexpected wildlife sanctuary?",
                            "Examine the rise and fall of the Khmer Empire and the mysteries of Angkor Wat.",
                            "What were the real causes of the fall of the Western Roman Empire?",
                            "Explore the history and cultural significance of the Silk Road.",
                            // Science & Nature
                            "How does the mycelial network in forests compare to neural networks?",
                            "Explain the concept of 'Time Crystals' in quantum physics.",
                            "How do tardigrades survive extreme environments that would kill most life?",
                            "Investigate the Great Oxidation Event and how it shaped life on Earth.",
                            "What is the Fermi Paradox and what are the most compelling resolutions?",
                            "How do bioluminescent organisms produce light and why did it evolve?",
                            "Explore the science behind the 'Wow!' signal and the search for extraterrestrial intelligence.",
                            "How does epigenetics challenge our understanding of heredity and evolution?",
                            "What is dark matter and what evidence supports its existence?",
                            "Examine the symbiotic relationship between clownfish and sea anemones.",
                            // Technology & Computing
                            "Trace the history of cryptography from the Caesar cipher to quantum encryption.",
                            "How do Large Language Models like GPT actually 'understand' language?",
                            "What was the Silk Road darknet marketplace and how did law enforcement shut it down?",
                            "Explain the mechanics of the MP3 compression algorithm and its impact on music.",
                            "How did the Apollo Guidance Computer land humans on the moon with less power than a calculator?",
                            "Investigate the potential and challenges of quantum computing.",
                            // Philosophy & Psychology
                            "Analyze the Ship of Theseus paradox in the context of modern identity and consciousness.",
                            "What is the 'hard problem of consciousness' and why does it resist scientific explanation?",
                            "Examine the Stanford prison experiment through a modern ethical lens.",
                            "How does the placebo effect work and what does it reveal about the mind-body connection?",
                            "Explore the concept of 'effective altruism' — its promise and its criticisms.",
                            "What is solipsism and why has it persisted as a philosophical problem for centuries?",
                            // Art & Culture
                            "Trace the evolution of Japanese woodblock printing (ukiyo-e) and its influence on Western art.",
                            "How did the BBC Radiophonic Workshop pioneer electronic music?",
                            "Analyze the Bauhaus movement and its lasting impact on modern design.",
                            "What is Kintsugi and what does it teach about imperfection and repair?",
                            "Explore the history of typography from Gutenberg to digital fonts.",
                            "How did Studio Ghibli redefine animation as a serious artistic medium?",
                            // Espionage & Mystery
                            "What really happened to the crew of the SS Ourang Medan?",
                            "Investigate the Cambridge Five spy ring and how they infiltrated British intelligence.",
                            "What was the CIA's MKUltra program and what did it actually accomplish?",
                            "Examine the Dyatlov Pass incident and the most plausible explanations.",
                            "How did the Enigma machine work and how did the Allies break it?",
                            // Economics & Society
                            "Analyze the economic causes and global consequences of the 2008 financial crisis.",
                            "How does the concept of 'Universal Basic Income' work and where has it been tested?",
                            "What caused the Dutch Tulip Mania and how does it compare to modern speculative bubbles?",
                            "Examine the game theory behind nuclear deterrence and Mutually Assured Destruction.",
                            "How did the Marshall Plan reshape post-war Europe?",
                            // Curiosities
                            "Why do cats purr and what are the leading theories about its function?",
                            "Investigate the phenomenon of 'false memories' and how they form.",
                            "What is the 'Coolidge effect' and what does it reveal about evolutionary biology?",
                            "How do migrating birds navigate across thousands of miles with such precision?",
                            "Explore the science and history of fermentation — from beer to kimchi."
                          ];
                          const randomQuery = rabbitHoles[Math.floor(Math.random() * rabbitHoles.length)];
                          handleSearch(randomQuery);
                        }
                      }}
                      className="group relative px-6 py-4 md:px-10 md:py-5 bg-my-ink text-white dark:bg-my-accent dark:text-black overflow-hidden border border-my-accent/30 shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-all w-full sm:w-auto"
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
                          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white dark:text-black">
                            Random Rabbit Hole
                          </span>
                          <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300 text-white dark:text-black" />
                        </div>
                      </div>
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-my-conflict-bg border border-my-conflict-border p-6 mx-8 rounded-[6px] flex items-start gap-4 text-my-conflict-text mt-8">
                <AlertCircle className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1 tracking-wide text-xs uppercase">SYSTEM ERROR</h4>
                  <p className="opacity-80 text-sm">{error}</p>
                </div>
              </div>
            )}

            {deepResearch.error && (
              <div className="bg-my-conflict-bg border border-my-conflict-border p-6 mx-8 rounded-[6px] flex items-start gap-4 text-my-conflict-text mt-8">
                <AlertCircle className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1 tracking-wide text-xs uppercase">DEEP RESEARCH ERROR</h4>
                  <p className="opacity-80 text-sm">{deepResearch.error}</p>
                  <button
                    onClick={() => useStore.getState().resetDeepResearch()}
                    className="mt-4 text-xs font-bold uppercase tracking-widest underline"
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
                  {currentChat?.length > 0 ? (
                    <div className="space-y-6 mb-6">
                      {currentChat.map(msg => (
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
                      Submit a follow-up query. The system retains the full context of this report.
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
                        <span className="text-[10px] font-bold text-my-muted uppercase tracking-widest animate-pulse">Synthesizing response...</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {loading && loadingPhase !== "Analyzing context..." && (
              <div className="flex flex-col items-center justify-center py-12 mt-16 animate-in fade-in duration-500">
                {/* Neural Orbital Scanner */}
                <div className="relative flex items-center justify-center w-28 h-28 mb-8">
                  {/* Outer glow pulse */}
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.08, 0.15] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 bg-my-accent rounded-full blur-3xl"
                  />

                  {/* Orbit ring 1 — outer, slow clockwise */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 border border-my-accent/20 rounded-full"
                  >
                    {/* Orbital particle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2">
                      <div className="w-full h-full rounded-full bg-my-accent" style={{ boxShadow: '0 0 10px color-mix(in srgb, var(--accent) 90%, transparent)' }} />
                      <div className="w-4 h-4 -top-1 -left-1 absolute rounded-full bg-my-accent/20 animate-ping" />
                    </div>
                  </motion.div>

                  {/* Orbit ring 2 — middle, dashed, counter-clockwise */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-3 border border-dashed border-my-accent/15 rounded-full"
                  >
                    {/* Orbital particle */}
                    <div className="absolute top-1/2 -right-1.5 w-1.5 h-1.5">
                      <div className="w-full h-full rounded-full bg-my-signal" style={{ boxShadow: '0 0 8px color-mix(in srgb, var(--signal) 80%, transparent)' }} />
                    </div>
                  </motion.div>

                  {/* Orbit ring 3 — inner, faster */}
                  <motion.div
                    animate={{ rotate: 480 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-6 border border-my-accent/10 rounded-full"
                  >
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1">
                      <div className="w-full h-full rounded-full bg-my-success" style={{ boxShadow: '0 0 6px color-mix(in srgb, var(--success) 80%, transparent)' }} />
                    </div>
                  </motion.div>

                  {/* Scanning line sweep */}
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <motion.div
                      initial={{ y: '-100%' }}
                      animate={{ y: '100%' }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                      className="w-full h-[3px] bg-gradient-to-r from-transparent via-my-accent/80 to-transparent blur-[2px]"
                    />
                  </div>

                  {/* Core hexagon */}
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative z-10"
                  >
                    <Hexagon className="w-10 h-10 text-my-accent" strokeWidth={1.5} />
                  </motion.div>
                </div>

                {/* Neural pulse dots — wave effect */}
                <div className="flex items-center gap-2 mb-6 h-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--accent)',
                      }}
                      animate={{
                        scale: [0.4, 1.2, 0.4],
                        opacity: [0.2, 0.9, 0.2],
                        backgroundColor: [
                          'color-mix(in srgb, var(--accent) 40%, transparent)',
                          'var(--accent)',
                          'color-mix(in srgb, var(--accent) 40%, transparent)'
                        ]
                      }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut'
                      }}
                    />
                  ))}
                </div>

                {/* Loading phase text with cursor */}
                <div className="w-64">
                  <div className="flex items-center justify-center mb-3">
                    <p className="text-sm font-bold tracking-[0.2em] uppercase text-my-ink text-center">
                      {loadingPhase}
                    </p>
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block w-[2px] h-3 bg-my-accent ml-1"
                    />
                  </div>

                  {/* Enhanced gradient progress bar */}
                  <div className="relative h-1.5 w-full bg-my-border/50 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, var(--accent), var(--signal))'
                      }}
                      animate={{
                        width: loadingPhase === "Analyzing research query..." ? "20%" :
                          loadingPhase === "Reviewing available data..." ? "40%" :
                            loadingPhase === "Synthesizing primary sources..." ? "60%" :
                              loadingPhase === "Identifying data conflicts..." ? "80%" : ["90%", "100%"],
                      }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                    {/* Glow overlay */}
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full blur-sm"
                      style={{
                        background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 30%, transparent), transparent)',
                        width: loadingPhase === "Analyzing research query..." ? "20%" :
                          loadingPhase === "Reviewing available data..." ? "40%" :
                            loadingPhase === "Synthesizing primary sources..." ? "60%" :
                              loadingPhase === "Identifying data conflicts..." ? "80%" : "100%"
                      }}
                    />
                  </div>

                  {/* Subtle status hint */}
                  <motion.p
                    animate={{ opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-[8px] font-mono text-my-muted/40 text-center mt-2 tracking-[0.3em] uppercase"
                  >
                    {loadingPhase === "Analyzing research query..." && "▸ vectorizing query"}
                    {loadingPhase === "Reviewing available data..." && "▸ aggregating sources"}
                    {loadingPhase === "Synthesizing primary sources..." && "▸ processing corpus"}
                    {loadingPhase === "Identifying data conflicts..." && "▸ cross-referencing"}
                    {loadingPhase === "Structuring report..." && "▸ compiling dossier"}
                    {loadingPhase === "Finalizing report..." && "▸ encrypting payload"}
                  </motion.p>
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
              {/* Input Mode Badge */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={clsx(
                  "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 border",
                  !currentReport
                    ? "text-my-accent border-my-accent/30 bg-my-accent/5"
                    : !walkthroughCompleted
                    ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
                    : "text-green-600 border-green-600/30 bg-green-600/5"
                )}>
                  {!currentReport ? 'New Research' : !walkthroughCompleted ? 'Locked' : 'Follow-up Chat'}
                </span>
              </div>
              {/* Soft Outer Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-my-accent/20 via-my-accent/5 to-my-accent/20 rounded-none blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200" />

              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx,.doc,.pptx,.ppt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  id="walkthrough-search-anchor"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    !walkthroughCompleted && currentReport
                      ? "Onboarding Active: Standard chat follow-up is locked."
                      : currentReport 
                        ? "Drill deeper into this synthesis..." 
                        : "What do you need to research?"
                  }
                  disabled={loading || (!walkthroughCompleted && !!currentReport)}
                  className="w-full bg-white/70 dark:bg-my-bg/70 backdrop-blur-md md:backdrop-blur-2xl border border-my-border rounded-none py-4 pl-4 pr-14 md:py-6 md:pl-8 md:pr-16 text-my-ink focus:outline-none focus:border-my-accent transition-all disabled:opacity-50 shadow-2xl text-base md:text-lg font-light tracking-tight placeholder:text-my-muted/40"
                />
                {isPremium && !currentReport && !loading && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-16 top-3 bottom-3 aspect-square flex items-center justify-center text-my-muted hover:text-my-accent transition-colors"
                    title="Upload document for analysis"
                  >
                    <Upload size={16} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!query.trim() || loading || (!walkthroughCompleted && !!currentReport)}
                  className="absolute right-3 top-3 bottom-3 aspect-square bg-my-ink text-white dark:bg-my-accent dark:text-black hover:bg-my-accent hover:text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-90"
                >
                  <Send size={20} className="text-white dark:text-black" />
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
